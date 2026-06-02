'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { respondToTransactionAction } from '@/lib/actions/transaction.actions';
import { useState } from 'react';
import { Check, X, AlertCircle, BellOff } from 'lucide-react';
import { useRouter } from 'next/navigation';

type Transaction = {
  id: string;
  amount: number;
  direction: 'give' | 'get';
  note?: string | null;
  creator: { id: string; name: string; username: string };
};

type Props = {
  transaction: Transaction;
  currentUserId: string;
  onClose: () => void;
};

const SPRING = { ease: [0.22, 1, 0.36, 1] as const };
const BTN_SPRING = { type: 'spring' as const, stiffness: 420, damping: 26 };

function avatarGradient(name: string) {
  const palettes = [
    'linear-gradient(135deg,#6366f1,#8b5cf6)',
    'linear-gradient(135deg,#0ea5e9,#6366f1)',
    'linear-gradient(135deg,#f59e0b,#ef4444)',
    'linear-gradient(135deg,#10b981,#0ea5e9)',
    'linear-gradient(135deg,#ec4899,#8b5cf6)',
    'linear-gradient(135deg,#f97316,#ef4444)',
  ];
  return palettes[name.charCodeAt(0) % palettes.length];
}

export default function ApprovalOverlay({ transaction, currentUserId, onClose }: Props) {
  const [loading, setLoading] = useState<'accept' | 'reject' | null>(null);
  const [done, setDone] = useState<'accepted' | 'rejected' | null>(null);
  const [confirmReject, setConfirmReject] = useState(false);
  const router = useRouter();

  // From counterparty perspective:
  // creator 'get' → counterparty (me) owes creator → I will GIVE
  // creator 'give' → creator owes counterparty (me) → I will GET
  const iWillGive = transaction.direction === 'get';
  const amount = Number(transaction.amount);

  async function handleRespond(action: 'accepted' | 'rejected') {
    setLoading(action === 'accepted' ? 'accept' : 'reject');
    const result = await respondToTransactionAction(transaction.id, action);
    setLoading(null);

    if (!result.error) {
      setDone(action);
      setTimeout(() => {
        onClose();
        router.refresh();
      }, 1800);
    }
  }

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="approval-overlay-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          zIndex: 70,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
        }}
        onClick={onClose}
      >
        {/* Panel */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 24 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ duration: 0.45, ...SPRING }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: 'min(420px, 92vw)',
            maxHeight: '90dvh',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-2xl)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-xl)',
            overflowY: 'auto',
            position: 'relative',
          }}
        >
          {/* Top decoration */}
          <div
            style={{
              height: 4,
              background: iWillGive
                ? 'linear-gradient(90deg, var(--danger), #fb7185)'
                : 'linear-gradient(90deg, var(--success), #34d399)',
            }}
          />

          <div style={{ padding: '2rem' }}>
            {/* Success / Rejected state */}
            <AnimatePresence mode="wait">
              {done ? (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  style={{
                    textAlign: 'center',
                    padding: '1rem 0',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1rem',
                  }}
                >
                  <motion.div
                    initial={{ scale: 0, rotate: -30 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.1, type: 'spring', stiffness: 400 }}
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: '50%',
                      background:
                        done === 'accepted'
                          ? 'var(--success-muted)'
                          : 'var(--danger-muted)',
                      border: `2px solid ${
                        done === 'accepted'
                          ? 'var(--success-border)'
                          : 'var(--danger-border)'
                      }`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {done === 'accepted' ? (
                      <Check size={32} color="var(--success)" strokeWidth={2.5} />
                    ) : (
                      <X size={32} color="var(--danger)" strokeWidth={2.5} />
                    )}
                  </motion.div>
                  <div>
                    <h3
                      style={{
                        fontSize: '1.25rem',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        marginBottom: '0.375rem',
                        letterSpacing: '-0.015em',
                      }}
                    >
                      {done === 'accepted' ? 'Transaction Accepted' : 'Transaction Rejected'}
                    </h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      {done === 'accepted'
                        ? 'Ledger has been updated for both parties'
                        : 'Transaction has been declined'}
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="pending" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {/* Creator info */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      marginBottom: '1.5rem',
                    }}
                  >
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: '12px',
                        background: avatarGradient(transaction.creator.name),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.9375rem',
                        fontWeight: 800,
                        color: 'white',
                      }}
                    >
                      {transaction.creator.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: '0.9375rem',
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {transaction.creator.name}
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                        is requesting your approval
                      </div>
                    </div>
                  </div>

                  {/* Amount display */}
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '1.75rem 1rem',
                      marginBottom: '1.25rem',
                      borderRadius: 'var(--radius-xl)',
                      background: iWillGive
                        ? 'rgba(244,63,94,0.06)'
                        : 'rgba(16,185,129,0.06)',
                      border: `1px solid ${
                        iWillGive ? 'var(--danger-border)' : 'var(--success-border)'
                      }`,
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <p
                      className="text-label"
                      style={{
                        marginBottom: '0.75rem',
                        color: iWillGive ? 'var(--danger)' : 'var(--success)',
                        fontWeight: 700,
                        fontSize: '0.6875rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.07em',
                      }}
                    >
                      {iWillGive ? 'You Will Give' : 'You Will Get'}
                    </p>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        justifyContent: 'center',
                        gap: '4px',
                        marginBottom: '0.5rem',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: '1.5rem',
                          fontWeight: 600,
                          color: iWillGive ? 'var(--danger)' : 'var(--success)',
                          opacity: 0.8,
                        }}
                      >
                        ₹
                      </span>
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 'clamp(2rem, 8vw, 3rem)',
                          fontWeight: 800,
                          color: iWillGive ? 'var(--danger)' : 'var(--success)',
                          letterSpacing: '-0.04em',
                          lineHeight: 1,
                        }}
                      >
                        {amount.toLocaleString('en-IN')}
                      </span>
                    </div>

                    {transaction.note && (
                      <p
                        style={{
                          fontSize: '0.9375rem',
                          color: 'var(--text-secondary)',
                          fontStyle: 'italic',
                          marginTop: '0.5rem',
                        }}
                      >
                        &quot;{transaction.note}&quot;
                      </p>
                    )}
                  </div>

                  {/* Warning */}
                  {!confirmReject && (
                    <div
                      style={{
                        display: 'flex',
                        gap: '0.5rem',
                        alignItems: 'flex-start',
                        padding: '0.75rem',
                        background: 'var(--warning-muted)',
                        border: '1px solid var(--warning-border)',
                        borderRadius: '8px',
                        marginBottom: '1.5rem',
                      }}
                    >
                      <AlertCircle size={15} color="var(--warning)" style={{ flexShrink: 0, marginTop: 1 }} />
                      <p style={{ fontSize: '0.8125rem', color: 'var(--warning)', lineHeight: 1.5 }}>
                        Once accepted, this entry will update your shared ledger and cannot be easily reversed.
                      </p>
                    </div>
                  )}

                  {/* Actions / Confirmation */}
                  <AnimatePresence mode="wait">
                    {confirmReject ? (
                      <motion.div
                        key="confirm-reject"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.22 }}
                        style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}
                      >
                        <div style={{
                          padding: '0.75rem 1rem',
                          borderRadius: 'var(--radius-lg)',
                          background: 'var(--danger-muted)',
                          border: '1px solid var(--danger-border)',
                          textAlign: 'center',
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          color: 'var(--danger)',
                          lineHeight: 1.5,
                        }}>
                          Reject this transaction?<br />
                          <span style={{ fontWeight: 400, opacity: 0.8 }}>{transaction.creator.name} will be notified.</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <motion.button
                            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                            transition={BTN_SPRING}
                            onClick={() => setConfirmReject(false)}
                            className="btn"
                            style={{ flex: 1, background: 'var(--bg-base)', color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 600, justifyContent: 'center' }}
                          >
                            Cancel
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                            transition={BTN_SPRING}
                            onClick={() => handleRespond('rejected')}
                            disabled={!!loading}
                            className="btn"
                            style={{ flex: 1.5, background: 'var(--danger)', color: 'white', fontSize: '0.875rem', fontWeight: 700, justifyContent: 'center', gap: '0.375rem', border: 'none' }}
                          >
                            {loading === 'reject' ? (
                              <span className="spin-indicator" />
                            ) : (
                              <X size={15} strokeWidth={2.5} />
                            )}
                            Confirm Reject
                          </motion.button>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div key="action-btns" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            transition={BTN_SPRING}
                            onClick={() => setConfirmReject(true)}
                            disabled={!!loading}
                            className="btn"
                            style={{
                              justifyContent: 'center',
                              background: 'var(--danger-muted)',
                              color: 'var(--danger)',
                              border: '1px solid var(--danger-border)',
                              fontWeight: 600,
                              gap: '0.375rem',
                            }}
                          >
                            <X size={16} strokeWidth={2.5} />
                            Reject
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.02, boxShadow: '0 6px 24px rgba(16,185,129,0.45)' }}
                            whileTap={{ scale: 0.96 }}
                            transition={BTN_SPRING}
                            onClick={() => handleRespond('accepted')}
                            disabled={!!loading}
                            className="btn"
                            style={{
                              justifyContent: 'center',
                              background: 'linear-gradient(135deg,#059669,#10b981)',
                              color: 'white',
                              fontWeight: 700,
                              gap: '0.375rem',
                              boxShadow: '0 2px 12px rgba(16,185,129,0.25)',
                              border: 'none',
                            }}
                          >
                            {loading === 'accept' ? (
                              <span className="spin-indicator" />
                            ) : (
                              <Check size={16} strokeWidth={2.5} />
                            )}
                            Accept
                          </motion.button>
                        </div>

                        {/* Snooze button */}
                        <motion.button
                          initial={{ opacity: 0.65 }}
                          whileHover={{ opacity: 1, background: 'var(--bg-base)' }}
                          whileTap={{ scale: 0.97 }}
                          transition={{ duration: 0.15 }}
                          onClick={onClose}
                          disabled={!!loading}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            fontSize: '0.8125rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.375rem',
                            padding: '0.5rem',
                            borderRadius: '8px',
                            width: '100%',
                          }}
                        >
                          <BellOff size={13} />
                          Snooze for this session
                        </motion.button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
        
        <style>{`
          .spin-indicator {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            border: 2px solid currentColor;
            border-top-color: transparent;
            display: inline-block;
            animation: spin 0.7s linear infinite;
            opacity: 0.7;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </motion.div>
    </AnimatePresence>
  );
}
