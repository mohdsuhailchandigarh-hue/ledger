'use client';

import { useState } from 'react';
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
  transaction_date?: string | null; // YYYY-MM-DD — the actual date of the transaction
  creator: { id: string; name: string; username: string };
  counterparty: { id: string; name: string; username: string };
};

type Props = {
  transactions: Transaction[];
  currentUserId: string;
  connectionId: string;
};

const statusConfig = {
  pending: {
    icon: Clock,
    color: 'var(--warning)',
    bg: 'var(--warning-muted)',
    border: 'var(--warning-border)',
    label: 'Pending',
  },
  accepted: {
    icon: CheckCircle2,
    color: 'var(--success)',
    bg: 'var(--success-muted)',
    border: 'var(--success-border)',
    label: 'Accepted',
  },
  rejected: {
    icon: XCircle,
    color: 'var(--danger)',
    bg: 'var(--danger-muted)',
    border: 'var(--danger-border)',
    label: 'Rejected',
  },
  canceled: {
    icon: MinusCircle,
    color: 'var(--text-muted)',
    bg: 'var(--bg-elevated)',
    border: 'var(--border-subtle)',
    label: 'Canceled',
  },
};

function formatTxnDate(dateStr: string | null | undefined, fallback: string): string {
  // Always show a formatted calendar date — never relative time
  const raw = dateStr || fallback?.slice(0, 10);
  if (!raw) return '—';
  const [year, month, day] = raw.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return raw;
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function LedgerTimeline({ transactions, currentUserId }: Props) {
  const [approvalTxn, setApprovalTxn] = useState<Transaction | null>(null);

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
            background: 'var(--bg-elevated)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
          }}
        >
          <ArrowDownLeft size={28} color="var(--text-muted)" />
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
        {transactions.map((txn, i) => {
          const isCreator = txn.creator?.id === currentUserId;
          const isCounterparty = txn.counterparty?.id === currentUserId;
          const amount = Number(txn.amount);

          // Determine what this means for the current user
          let willGet = false;
          if (isCreator) {
            willGet = txn.direction === 'get';
          } else if (isCounterparty) {
            willGet = txn.direction === 'give';
          }

          const status = statusConfig[txn.status];
          const canApprove =
            isCounterparty && txn.status === 'pending';

          return (
            <motion.div
              key={txn.id}
              initial={{ opacity: 0, x: isCreator ? -16 : 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                delay: Math.min(i * 0.05, 0.4),
                duration: 0.4,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{
                padding: '1rem 1.5rem',
                borderBottom:
                  i < transactions.length - 1
                    ? '1px solid var(--border-subtle)'
                    : 'none',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '1rem',
                transition: 'background 0.15s',
                cursor: canApprove ? 'pointer' : 'default',
              }}
              onClick={() => canApprove && setApprovalTxn(txn)}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-elevated)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              {/* Direction icon */}
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '10px',
                  background: willGet
                    ? 'var(--success-muted)'
                    : 'var(--danger-muted)',
                  border: `1px solid ${
                    willGet ? 'var(--success-border)' : 'var(--danger-border)'
                  }`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '2px',
                }}
              >
                {willGet ? (
                  <ArrowDownLeft size={16} color="var(--success)" />
                ) : (
                  <ArrowUpRight size={16} color="var(--danger)" />
                )}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    marginBottom: '0.375rem',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: '0.9375rem',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        letterSpacing: '-0.01em',
                        marginBottom: '2px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {txn.note || (isCreator ? 'Entry created' : 'Entry received')}
                    </p>
                    <p
                      style={{
                        fontSize: '0.8125rem',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {isCreator ? 'You' : (txn.creator?.name || 'Platform User')} ·{' '}
                      {formatTxnDate(txn.transaction_date, txn.created_at)}
                    </p>
                  </div>

                  {/* Amount */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontWeight: 700,
                        fontSize: '1rem',
                        color: willGet ? 'var(--success)' : 'var(--danger)',
                        opacity:
                          txn.status === 'rejected' ||
                          txn.status === 'canceled'
                            ? 0.4
                            : 1,
                        textDecoration:
                          txn.status === 'rejected' ||
                          txn.status === 'canceled'
                            ? 'line-through'
                            : 'none',
                        marginBottom: '4px',
                      }}
                    >
                      {willGet ? '+' : '-'}₹
                      {amount.toLocaleString('en-IN')}
                    </p>

                    {/* Status badge */}
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        fontSize: '0.625rem',
                        fontWeight: 600,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        padding: '2px 6px',
                        borderRadius: '9999px',
                        background: status.bg,
                        color: status.color,
                        border: `1px solid ${status.border}`,
                      }}
                    >
                      <status.icon size={9} />
                      {status.label}
                    </span>
                  </div>
                </div>

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
                        background: 'rgba(99,102,241,0.1)',
                        border: '1px solid rgba(99,102,241,0.25)',
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
            </motion.div>
          );
        })}
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
          0%, 100% { border-color: rgba(99,102,241,0.25); }
          50% { border-color: rgba(99,102,241,0.55); }
        }
      `}</style>
    </>
  );
}
