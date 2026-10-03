'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  Clock,
  XCircle,
  ArrowDownLeft,
  ArrowUpRight,
  MinusCircle,
} from 'lucide-react';
import ApprovalOverlay from './ApprovalOverlay';

type Transaction = {
  id: string;
  amount: number;
  direction: 'give' | 'get';
  note?: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'canceled';
  created_at: string;
  transaction_date?: string | null; // YYYY-MM-DD
  creator: { id: string; name: string; username: string };
  counterparty: { id: string; name: string; username: string };
};

type Props = {
  transactions: Transaction[];
  currentUserId: string;
  connectionId: string;
  netBalance: number;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
};

const statusConfig = {
  pending: {
    icon: Clock,
    color: '#fbbf24',
    bg: 'rgba(245, 158, 11, 0.1)',
    border: 'rgba(245, 158, 11, 0.28)',
    label: 'Pending',
  },
  accepted: {
    icon: CheckCircle2,
    color: '#34d399',
    bg: 'rgba(16, 185, 129, 0.1)',
    border: 'rgba(16, 185, 129, 0.28)',
    label: 'Accepted',
  },
  rejected: {
    icon: XCircle,
    color: '#fb7185',
    bg: 'rgba(244, 63, 94, 0.1)',
    border: 'rgba(244, 63, 94, 0.28)',
    label: 'Rejected',
  },
  canceled: {
    icon: MinusCircle,
    color: 'rgba(255, 255, 255, 0.55)',
    bg: 'rgba(255, 255, 255, 0.05)',
    border: 'rgba(255, 255, 255, 0.12)',
    label: 'Canceled',
  },
};

function getConfirmedTxnDelta(txn: Transaction, currentUserId: string): number {
  if (txn.status !== 'accepted') return 0;
  const isCreator = txn.creator?.id === currentUserId;
  const isCounterparty = txn.counterparty?.id === currentUserId;
  const amount = Number(txn.amount);

  let willGet = false;
  if (isCreator) {
    willGet = txn.direction === 'get';
  } else if (isCounterparty) {
    willGet = txn.direction === 'give';
  }
  return willGet ? amount : -amount;
}

function getTxnPotentialDelta(txn: Transaction, currentUserId: string): number {
  const isCreator = txn.creator?.id === currentUserId;
  const isCounterparty = txn.counterparty?.id === currentUserId;
  const amount = Number(txn.amount);

  let willGet = false;
  if (isCreator) {
    willGet = txn.direction === 'get';
  } else if (isCounterparty) {
    willGet = txn.direction === 'give';
  }
  return willGet ? amount : -amount;
}

function getTxnDateInfo(txn: Transaction) {
  const dateStr = txn.transaction_date || txn.created_at?.slice(0, 10);
  let groupLabel = 'Earlier';
  let groupKey = 'earlier';

  if (dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    if (year && month && day) {
      const txnDate = new Date(year, month - 1, day);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const txnMidnight = new Date(txnDate.getFullYear(), txnDate.getMonth(), txnDate.getDate());
      const diffDays = Math.round((today.getTime() - txnMidnight.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        groupLabel = 'Today';
        groupKey = 'today';
      } else if (diffDays === 1) {
        groupLabel = 'Yesterday';
        groupKey = 'yesterday';
      } else {
        groupLabel = txnDate.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
        groupKey = dateStr;
      }
    }
  }

  // Proper formatted time
  let timeStr = '';
  if (txn.created_at) {
    const d = new Date(txn.created_at);
    if (!isNaN(d.getTime())) {
      timeStr = d.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    }
  }

  return { groupLabel, groupKey, timeStr };
}

export default function LedgerTimeline({
  transactions,
  currentUserId,
  netBalance,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
}: Props) {
  const [approvalTxn, setApprovalTxn] = useState<Transaction | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // 1. Compute running balance after each transaction (backwards from current netBalance)
  // For pending transactions: calculate the potential balance if this pending entry were accepted, and flag as pending
  const balanceDataMap = useMemo(() => {
    const map = new Map<string, { balance: number; isPending: boolean }>();
    let currentConfirmed = netBalance;

    for (const txn of transactions) {
      if (txn.status === 'pending') {
        const potentialDelta = getTxnPotentialDelta(txn, currentUserId);
        const pendingEstimatedBal = currentConfirmed + potentialDelta;
        map.set(txn.id, { balance: pendingEstimatedBal, isPending: true });
      } else {
        map.set(txn.id, { balance: currentConfirmed, isPending: false });
        currentConfirmed -= getConfirmedTxnDelta(txn, currentUserId);
      }
    }
    return map;
  }, [transactions, currentUserId, netBalance]);

  // 2. Group transactions by date (Today, Yesterday, Date) maintaining descending order
  const groupedSections = useMemo(() => {
    type Section = {
      key: string;
      label: string;
      items: Transaction[];
    };
    const sections: Section[] = [];
    let currentSection: Section | null = null;

    for (const txn of transactions) {
      const { groupKey, groupLabel } = getTxnDateInfo(txn);
      if (!currentSection || currentSection.key !== groupKey) {
        currentSection = { key: groupKey, label: groupLabel, items: [] };
        sections.push(currentSection);
      }
      currentSection.items.push(txn);
    }
    return sections;
  }, [transactions]);

  // Infinite scroll trigger via IntersectionObserver
  useEffect(() => {
    if (!hasMore || isLoadingMore || !onLoadMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadMore();
        }
      },
      { rootMargin: '250px' }
    );
    const el = sentinelRef.current;
    if (el) observer.observe(el);
    return () => {
      if (el) observer.unobserve(el);
    };
  }, [hasMore, isLoadingMore, onLoadMore]);

  if (transactions.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '4rem 2rem',
          color: 'var(--text-muted)',
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
          }}
        >
          <ArrowDownLeft size={28} color="rgba(255, 255, 255, 0.4)" />
        </div>
        <h3
          style={{
            fontSize: '1rem',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            marginBottom: '0.375rem',
          }}
        >
          No transactions yet
        </h3>
        <p style={{ fontSize: '0.875rem' }}>
          Create the first entry to get started
        </p>
      </div>
    );
  }

  return (
    <>
      <div>
        {groupedSections.map((section) => (
          <div key={section.key}>
            {/* Date Section Header */}
            <div
              style={{
                padding: '0.75rem 1.25rem 0.35rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                background: 'rgba(255, 255, 255, 0.02)',
              }}
            >
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color:
                    section.label === 'Today'
                      ? 'var(--accent-primary, #818cf8)'
                      : 'rgba(255, 255, 255, 0.45)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                {section.label === 'Today' && (
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      background: 'var(--accent-primary, #818cf8)',
                      display: 'inline-block',
                    }}
                  />
                )}
                {section.label}
              </span>
              <div
                style={{
                  flex: 1,
                  height: '1px',
                  background: 'rgba(255, 255, 255, 0.05)',
                }}
              />
            </div>

            {/* Section Items */}
            {section.items.map((txn) => {
              const isCreator = txn.creator?.id === currentUserId;
              const isCounterparty = txn.counterparty?.id === currentUserId;
              const amount = Number(txn.amount);

              let willGet = false;
              if (isCreator) {
                willGet = txn.direction === 'get';
              } else if (isCounterparty) {
                willGet = txn.direction === 'give';
              }

              const status = statusConfig[txn.status];
              const canApprove = isCounterparty && txn.status === 'pending';
              const { timeStr } = getTxnDateInfo(txn);
              const balData = balanceDataMap.get(txn.id) ?? { balance: 0, isPending: false };
              const displayBal = balData.balance;
              const isPendingTxn = balData.isPending || txn.status === 'pending';
              const isDimmed = txn.status === 'rejected' || txn.status === 'canceled';

              return (
                <motion.div
                  key={txn.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    padding: 'clamp(0.75rem, 2.5vw, 1rem) clamp(0.875rem, 3vw, 1.25rem)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.875rem',
                    transition: 'background 0.15s',
                    cursor: canApprove ? 'pointer' : 'default',
                  }}
                  onClick={() => canApprove && setApprovalTxn(txn)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {/* Direction Icon */}
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: '12px',
                      background: isDimmed
                        ? 'rgba(255, 255, 255, 0.04)'
                        : willGet
                        ? 'rgba(16, 185, 129, 0.1)'
                        : 'rgba(244, 63, 94, 0.1)',
                      border: `1px solid ${
                        isDimmed
                          ? 'rgba(255, 255, 255, 0.08)'
                          : willGet
                          ? 'rgba(16, 185, 129, 0.22)'
                          : 'rgba(244, 63, 94, 0.22)'
                      }`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px',
                      opacity: isDimmed ? 0.5 : 1,
                    }}
                  >
                    {willGet ? (
                      <ArrowDownLeft
                        size={17}
                        color={isDimmed ? 'rgba(255, 255, 255, 0.4)' : 'var(--success, #10b981)'}
                      />
                    ) : (
                      <ArrowUpRight
                        size={17}
                        color={isDimmed ? 'rgba(255, 255, 255, 0.4)' : 'var(--danger, #f43f5e)'}
                      />
                    )}
                  </div>

                  {/* Content: Left side note and timestamp with full readability */}
                  <div style={{ flex: 1, minWidth: 0, paddingRight: '0.5rem' }}>
                    <p
                      style={{
                        fontSize: '0.9375rem',
                        fontWeight: 600,
                        color: isDimmed ? 'rgba(255, 255, 255, 0.6)' : 'var(--text-primary)',
                        letterSpacing: '-0.01em',
                        marginBottom: '4px',
                        wordBreak: 'break-word',
                        lineHeight: 1.35,
                      }}
                    >
                      {txn.note || (isCreator ? 'Entry created' : 'Entry received')}
                    </p>
                    <p
                      style={{
                        fontSize: '0.75rem',
                        color: 'rgba(255, 255, 255, 0.45)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        margin: 0,
                        flexWrap: 'wrap',
                      }}
                    >
                      <span>{isCreator ? 'You' : (txn.creator?.name || 'Platform User')}</span>
                      {timeStr && (
                        <>
                          <span>·</span>
                          <span>{timeStr}</span>
                        </>
                      )}
                    </p>

                    {/* Approve CTA */}
                    {canApprove && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        style={{
                          marginTop: '0.625rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                        }}
                      >
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.375rem',
                            padding: '0.3rem 0.75rem',
                            borderRadius: '9999px',
                            background: 'rgba(56,151,240,0.1)',
                            border: '1px solid rgba(56,151,240,0.25)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: 'var(--accent-primary)',
                            animation: 'pulse-border 2s infinite',
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: 'var(--accent-primary)',
                              display: 'inline-block',
                            }}
                          />
                          Tap to review & approve
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Right side: Amount, Status Tag, and Balance Tag (under the status tag!) */}
                  <div
                    style={{
                      textAlign: 'right',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      gap: '3px',
                      flexShrink: 0,
                      minWidth: 'fit-content',
                    }}
                  >
                    {/* Line 1: Amount */}
                    <p
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        color: willGet ? 'var(--success, #10b981)' : 'var(--danger, #f43f5e)',
                        opacity: isDimmed ? 0.45 : 1,
                        textDecoration: isDimmed ? 'line-through' : 'none',
                        margin: 0,
                        lineHeight: 1.2,
                      }}
                    >
                      {willGet ? '+' : '-'}₹{amount.toLocaleString('en-IN')}
                    </p>

                    {/* Line 2: Status Tag */}
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        fontSize: '0.625rem',
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        padding: '2px 7px',
                        borderRadius: '9999px',
                        background: status.bg,
                        color: status.color,
                        border: `1px solid ${status.border}`,
                        lineHeight: 1.1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <status.icon size={9} strokeWidth={2.5} />
                      {status.label}
                    </span>

                    {/* Line 3: Balance Tag - positioned under the status tag! Yellow if pending with calculated amount */}
                    <span
                      title={
                        isPendingTxn
                          ? 'Pending review: shows calculated balance if this entry is accepted'
                          : 'Balance after this entry'
                      }
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        color: isPendingTxn
                          ? '#fbbf24'
                          : displayBal > 0
                          ? 'rgba(52, 211, 153, 0.95)'
                          : displayBal < 0
                          ? 'rgba(251, 113, 133, 0.95)'
                          : 'rgba(255, 255, 255, 0.5)',
                        background: isPendingTxn
                          ? 'rgba(245, 158, 11, 0.12)'
                          : 'rgba(255, 255, 255, 0.04)',
                        border: isPendingTxn
                          ? '1px solid rgba(245, 158, 11, 0.38)'
                          : '1px solid rgba(255, 255, 255, 0.07)',
                        boxShadow: isPendingTxn
                          ? '0 0 8px rgba(245, 158, 11, 0.18)'
                          : 'none',
                        padding: '1.5px 6px',
                        borderRadius: '4px',
                        letterSpacing: '-0.02em',
                        whiteSpace: 'nowrap',
                        marginTop: '1px',
                      }}
                    >
                      Bal {displayBal > 0 ? `+₹${Math.abs(displayBal).toLocaleString('en-IN')}` : displayBal < 0 ? `-₹${Math.abs(displayBal).toLocaleString('en-IN')}` : '₹0'}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ))}

        {/* Sentinel for infinite scroll */}
        {hasMore && <div ref={sentinelRef} style={{ height: 1 }} />}

        {/* Skeleton loading for Load More */}
        {isLoadingMore && (
          <div style={{ padding: '0.5rem 0' }}>
            {/* Shimmering section header skeleton */}
            <div
              style={{
                padding: '0.75rem 1.25rem 0.35rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <div
                className="skeleton"
                style={{ width: 65, height: 12, borderRadius: '4px' }}
              />
              <div
                style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.05)' }}
              />
            </div>

            {/* 3 Skeleton Transaction Rows */}
            {[1, 2, 3].map((k) => (
              <div
                key={k}
                style={{
                  padding: 'clamp(0.75rem, 2.5vw, 1rem) clamp(0.875rem, 3vw, 1.25rem)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.875rem',
                }}
              >
                {/* Icon skeleton */}
                <div
                  className="skeleton"
                  style={{ width: 38, height: 38, borderRadius: '12px', flexShrink: 0, marginTop: '2px' }}
                />

                {/* Left content skeleton */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div
                    className="skeleton"
                    style={{ width: k % 2 === 0 ? '140px' : '100px', height: '15px', borderRadius: '4px' }}
                  />
                  <div
                    className="skeleton"
                    style={{ width: '80px', height: '11px', borderRadius: '4px' }}
                  />
                </div>

                {/* Right content skeleton: Amount on line 1, status on line 2, balance on line 3 */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <div
                    className="skeleton"
                    style={{ width: '60px', height: '16px', borderRadius: '4px' }}
                  />
                  <div
                    className="skeleton"
                    style={{ width: '55px', height: '14px', borderRadius: '9999px' }}
                  />
                  <div
                    className="skeleton"
                    style={{ width: '50px', height: '14px', borderRadius: '4px' }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load more button if not currently loading */}
        {hasMore && !isLoadingMore && onLoadMore && (
          <div style={{ padding: '1rem', textAlign: 'center' }}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={onLoadMore}
              style={{
                padding: '0.45rem 1.25rem',
                borderRadius: '9999px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              Load earlier transactions
            </motion.button>
          </div>
        )}

        {/* End of history indicator if >= 50 transactions loaded */}
        {!hasMore && transactions.length >= 50 && (
          <div
            style={{
              padding: '1.25rem',
              textAlign: 'center',
              fontSize: '0.75rem',
              color: 'rgba(255, 255, 255, 0.35)',
            }}
          >
            All {transactions.length} transactions loaded
          </div>
        )}
      </div>

      {/* Approval overlay */}
      <AnimatePresence>
        {approvalTxn && (
          <ApprovalOverlay
            transaction={approvalTxn}
            currentUserId={currentUserId}
            onClose={() => setApprovalTxn(null)}
          />
        )}
      </AnimatePresence>

      <style>{`
        @keyframes pulse-border {
          0%, 100% { border-color: rgba(56,151,240,0.25); }
          50% { border-color: rgba(56,151,240,0.55); }
        }
      `}</style>
    </>
  );
}
