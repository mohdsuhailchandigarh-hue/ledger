'use client';

import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  animate,
} from 'framer-motion';
import {
  CheckCircle2,
  Clock,
  XCircle,
  ArrowDownLeft,
  ArrowUpRight,
  MinusCircle,
  Trash2,
} from 'lucide-react';
import ApprovalOverlay from './ApprovalOverlay';
import { cancelPendingTransactionAction } from '@/lib/actions/transaction.actions';
import { useRouter } from 'next/navigation';

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
  onPendingTxnDeleted?: (txnId: string) => void;
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

interface SwipeablePendingRowProps {
  txn: Transaction;
  amount: number;
  willGet: boolean;
  timeStr: string;
  status: (typeof statusConfig)[keyof typeof statusConfig];
  displayBal: number;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
}

function SwipeablePendingRow({
  txn,
  amount,
  willGet,
  timeStr,
  status,
  displayBal,
  isOpen,
  onOpenChange,
  onDelete,
}: SwipeablePendingRowProps) {
  const x = useMotionValue(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Dynamic transforms based on drag distance
  const iconScale = useTransform(x, [-160, -88, 0], [1.2, 1, 0.8]);
  const actionOpacity = useTransform(x, [-88, -20, 0], [1, 0.85, 0.3]);

  // Keep in sync with external open state (e.g. if another row opens or closes)
  useEffect(() => {
    if (!isOpen && x.get() !== 0) {
      animate(x, 0, { type: 'spring', stiffness: 450, damping: 32 });
    }
  }, [isOpen, x]);

  const triggerDelete = () => {
    if (isDeleting) return;
    setIsDeleting(true);
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(20);
      } catch {}
    }
    let called = false;
    const safeDelete = () => {
      if (!called) {
        called = true;
        onDelete();
      }
    };
    // Slide completely offscreen with spring-like velocity, then invoke optimistic delete
    animate(x, -380, {
      duration: 0.18,
      ease: [0.32, 0.72, 0, 1],
      onComplete: safeDelete,
    });
    // Safety fallback so delete is never dropped
    setTimeout(safeDelete, 220);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{
        opacity: 0,
        height: 0,
        overflow: 'hidden',
        transition: {
          height: { duration: 0.28, ease: [0.32, 0.72, 0, 1] },
          opacity: { duration: 0.18, ease: 'easeOut' },
        },
      }}
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
        background: '#15151c',
      }}
    >
      {/* iOS Red Destructive Background Action */}
      <motion.div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'stretch',
          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          zIndex: 1,
          opacity: actionOpacity,
        }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            triggerDelete();
          }}
          disabled={isDeleting}
          aria-label="Delete sent request"
          style={{
            width: 88,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            background: 'transparent',
            border: 'none',
            color: '#ffffff',
            cursor: 'pointer',
            padding: '0 8px',
            userSelect: 'none',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {isDeleting ? (
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.35)',
                borderTopColor: '#ffffff',
                animation: 'spin 0.6s linear infinite',
              }}
            />
          ) : (
            <>
              <motion.div style={{ scale: iconScale }}>
                <Trash2 size={20} strokeWidth={2.3} color="#ffffff" />
              </motion.div>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  letterSpacing: '-0.01em',
                  color: '#ffffff',
                }}
              >
                Delete
              </span>
            </>
          )}
        </button>
      </motion.div>

      {/* Foreground Swipeable Item */}
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -140, right: 0 }}
        dragElastic={{ left: 0.25, right: 0.04 }}
        style={{
          x,
          touchAction: 'pan-y',
          position: 'relative',
          zIndex: 2,
          background: isHovered ? '#1c1b24' : '#15151c',
          padding: 'clamp(0.75rem, 2.5vw, 1rem) clamp(0.875rem, 3vw, 1.25rem)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.875rem',
          cursor: 'grab',
          userSelect: 'none',
          transition: 'background 0.15s ease',
        }}
        whileDrag={{ cursor: 'grabbing' }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => {
          if (isOpen) {
            animate(x, 0, { type: 'spring', stiffness: 450, damping: 32 });
            onOpenChange(false);
          }
        }}
        onDragEnd={(_, info) => {
          const curX = x.get();
          if (curX < -95 || info.velocity.x < -300) {
            // Full swipe or high-velocity flick past delete threshold
            triggerDelete();
          } else if (curX < -35 || info.velocity.x < -150) {
            // Snap open to reveal Delete button
            animate(x, -88, { type: 'spring', stiffness: 450, damping: 32 });
            onOpenChange(true);
          } else {
            // Snap closed
            animate(x, 0, { type: 'spring', stiffness: 450, damping: 32 });
            onOpenChange(false);
          }
        }}
      >
        {/* Direction Icon */}
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: '12px',
            background: willGet
              ? 'rgba(16, 185, 129, 0.1)'
              : 'rgba(244, 63, 94, 0.1)',
            border: `1px solid ${
              willGet
                ? 'rgba(16, 185, 129, 0.22)'
                : 'rgba(244, 63, 94, 0.22)'
            }`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            marginTop: '2px',
          }}
        >
          {willGet ? (
            <ArrowDownLeft size={17} color="var(--success, #10b981)" />
          ) : (
            <ArrowUpRight size={17} color="var(--danger, #f43f5e)" />
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0, paddingRight: '0.5rem' }}>
          <p
            style={{
              fontSize: '0.9375rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              letterSpacing: '-0.01em',
              marginBottom: '4px',
              wordBreak: 'break-word',
              lineHeight: 1.35,
            }}
          >
            {txn.note || 'Entry created'}
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
            <span>You</span>
            {timeStr && (
              <>
                <span>·</span>
                <span>{timeStr}</span>
              </>
            )}
            <span>·</span>
            <span
              style={{
                color: '#fbbf24',
                fontSize: '0.7rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <Trash2 size={10} />
              Slide left to delete
            </span>
          </p>
        </div>

        {/* Right side: Amount, Status Tag, Balance Tag, and Desktop Cancel button */}
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
          {/* Amount */}
          <p
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 700,
              fontSize: '0.95rem',
              color: willGet ? 'var(--success, #10b981)' : 'var(--danger, #f43f5e)',
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            {willGet ? '+' : '-'}₹{amount.toLocaleString('en-IN')}
          </p>

          {/* Status Tag */}
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

          {/* Balance Tag */}
          <span
            title="Pending review: shows calculated balance if this entry is accepted"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.6875rem',
              fontWeight: 600,
              color: '#fbbf24',
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.38)',
              boxShadow: '0 0 8px rgba(245, 158, 11, 0.18)',
              padding: '1.5px 6px',
              borderRadius: '4px',
              letterSpacing: '-0.02em',
              whiteSpace: 'nowrap',
              marginTop: '1px',
            }}
          >
            Bal {displayBal > 0 ? `+₹${Math.abs(displayBal).toLocaleString('en-IN')}` : displayBal < 0 ? `-₹${Math.abs(displayBal).toLocaleString('en-IN')}` : '₹0'}
          </span>

          {/* Desktop Hover Cancel Action */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              triggerDelete();
            }}
            title="Cancel this pending request"
            style={{
              display: isHovered ? 'inline-flex' : 'none',
              alignItems: 'center',
              gap: '3px',
              fontSize: '0.625rem',
              fontWeight: 600,
              color: '#fb7185',
              background: 'rgba(244, 63, 94, 0.12)',
              border: '1px solid rgba(244, 63, 94, 0.28)',
              padding: '1px 6px',
              borderRadius: '4px',
              cursor: 'pointer',
              marginTop: '2px',
              transition: 'all 0.15s ease',
            }}
          >
            <Trash2 size={9} />
            Cancel
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function LedgerTimeline({
  transactions,
  currentUserId,
  netBalance,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  onPendingTxnDeleted,
}: Props) {
  const router = useRouter();
  const [approvalTxn, setApprovalTxn] = useState<Transaction | null>(null);
  const [swipedOpenTxnId, setSwipedOpenTxnId] = useState<string | null>(null);
  const [deletedTxnIds, setDeletedTxnIds] = useState<Set<string>>(new Set());
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Compute active transactions excluding any optimistically deleted pending transactions
  const visibleTransactions = useMemo(() => {
    if (deletedTxnIds.size === 0) return transactions;
    return transactions.filter((t) => !deletedTxnIds.has(t.id));
  }, [transactions, deletedTxnIds]);

  const handleDeletePending = useCallback(
    async (txnId: string) => {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(20);
        } catch {}
      }

      // Close swiped open state and remove immediately from visible items (0ms latency!)
      setSwipedOpenTxnId((cur) => (cur === txnId ? null : cur));
      setDeletedTxnIds((prev) => new Set(prev).add(txnId));

      // Optimistically remove from state in parent so counts/items update instantly
      if (onPendingTxnDeleted) {
        onPendingTxnDeleted(txnId);
      }

      // Execute server action
      try {
        const res = await cancelPendingTransactionAction(txnId);
        if (res && res.error) {
          alert(res.error);
          // Rollback on server error
          setDeletedTxnIds((prev) => {
            const next = new Set(prev);
            next.delete(txnId);
            return next;
          });
          if (onLoadMore) onLoadMore();
        } else {
          // Refresh background caches seamlessly
          router.refresh();
        }
      } catch (err: any) {
        alert(err?.message || 'Failed to cancel request');
        // Rollback on network failure
        setDeletedTxnIds((prev) => {
          const next = new Set(prev);
          next.delete(txnId);
          return next;
        });
      }
    },
    [onPendingTxnDeleted, onLoadMore, router]
  );

  // 1. Compute running balance after each transaction (backwards from current netBalance)
  // For pending transactions: calculate the potential balance if this pending entry were accepted, and flag as pending
  const balanceDataMap = useMemo(() => {
    const map = new Map<string, { balance: number; isPending: boolean }>();
    let currentConfirmed = netBalance;

    for (const txn of visibleTransactions) {
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
  }, [visibleTransactions, currentUserId, netBalance]);

  // 2. Group transactions by date (Today, Yesterday, Date) maintaining descending order
  const groupedSections = useMemo(() => {
    type Section = {
      key: string;
      label: string;
      items: Transaction[];
    };
    const sections: Section[] = [];
    let currentSection: Section | null = null;

    for (const txn of visibleTransactions) {
      const { groupKey, groupLabel } = getTxnDateInfo(txn);
      if (!currentSection || currentSection.key !== groupKey) {
        currentSection = { key: groupKey, label: groupLabel, items: [] };
        sections.push(currentSection);
      }
      currentSection.items.push(txn);
    }
    return sections;
  }, [visibleTransactions]);

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

  if (visibleTransactions.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '4rem 2rem calc(env(safe-area-inset-bottom, 0px) + 5rem)',
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
      <div style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 5rem)' }}>
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
            <AnimatePresence initial={false} mode="popLayout">
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

                // Swipeable row for pending requests created by current user (iOS-style swipe to delete)
                if (isCreator && txn.status === 'pending') {
                  return (
                    <SwipeablePendingRow
                      key={txn.id}
                      txn={txn}
                      amount={amount}
                      willGet={willGet}
                      timeStr={timeStr}
                      status={status}
                      displayBal={displayBal}
                      isOpen={swipedOpenTxnId === txn.id}
                      onOpenChange={(open) => setSwipedOpenTxnId(open ? txn.id : null)}
                      onDelete={() => handleDeletePending(txn.id)}
                    />
                  );
                }

                return (
                  <motion.div
                    key={txn.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{
                      opacity: 0,
                      height: 0,
                      overflow: 'hidden',
                      transition: {
                        height: { duration: 0.28, ease: [0.32, 0.72, 0, 1] },
                        opacity: { duration: 0.18 },
                      },
                    }}
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
            </AnimatePresence>
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
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
