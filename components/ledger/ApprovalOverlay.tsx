'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { respondToTransactionAction } from '@/lib/actions/transaction.actions';
import { useState } from 'react';
import { Check, X, AlertCircle, BellOff, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

type Transaction = {
  id: string;
  amount: number;
  direction: 'give' | 'get';
  note?: string | null;
  status?: 'pending' | 'accepted' | 'rejected' | 'canceled';
  created_at?: string;
  transaction_date?: string | null;
  saved_contact_name?: string | null;
  creator: { id: string; name: string; username: string; avatar_url?: string | null; real_name?: string };
  counterparty?: { id: string; name: string; username: string; avatar_url?: string | null; real_name?: string };
};

type Props = {
  transaction: Transaction;
  currentUserId: string;
  onClose: () => void;
};

const BTN_SPRING = { type: 'spring' as const, stiffness: 420, damping: 26 };

function formatTxnDate(dateStr: string | null | undefined, fallback?: string): string {
  const raw = dateStr || fallback?.slice(0, 10);
  if (!raw) return '—';
  const [year, month, day] = raw.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return raw;
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getInitials(name: string) {
  return (name || 'User')
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function avatarGradient(name: string) {
  const palettes = [
    'linear-gradient(135deg,#065DE8,#3897f0)',
    'linear-gradient(135deg,#0ea5e9,#065DE8)',
    'linear-gradient(135deg,#f59e0b,#ef4444)',
    'linear-gradient(135deg,#10b981,#0ea5e9)',
    'linear-gradient(135deg,#ec4899,#8b5cf6)',
    'linear-gradient(135deg,#f97316,#ef4444)',
  ];
  return palettes[(name || 'U').charCodeAt(0) % palettes.length];
}

export default function ApprovalOverlay({ transaction, currentUserId, onClose }: Props) {
  const [loading, setLoading] = useState<'accept' | 'reject' | null>(null);
  const [done, setDone] = useState<'accepted' | 'rejected' | null>(null);
  const [confirmReject, setConfirmReject] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const router = useRouter();

  // Lock background body scroll completely while bottom sheet is open
  useBodyScrollLock(isOpen);

  const handleClose = () => {
    setIsOpen(false);
  };

  // From counterparty perspective:
  // creator 'get' → counterparty (me) owes creator → I will GIVE
  // creator 'give' → creator owes counterparty (me) → I will GET
  const iWillGive = transaction.direction === 'get';
  const amount = Number(transaction.amount || 0);
  const statusColor = iWillGive ? '#f43f5e' : '#10b981';

  const peerName = transaction.saved_contact_name || transaction.creator?.name || 'Contact';
  const peerUsername = transaction.creator?.username;
  const peerAvatar = transaction.creator?.avatar_url;

  async function handleRespond(action: 'accepted' | 'rejected') {
    setLoading(action === 'accepted' ? 'accept' : 'reject');
    const result = await respondToTransactionAction(transaction.id, action);
    setLoading(null);

    if (!result.error) {
      setDone(action);
      setTimeout(() => {
        handleClose();
        router.refresh();
      }, 1400);
    }
  }

  return (
    <>
      <AnimatePresence onExitComplete={onClose}>
        {isOpen && (
          <motion.div
            key="approval-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={handleClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
              zIndex: 9998,
              touchAction: 'none',
            }}
          />
        )}

        {isOpen && (
          <motion.div
            key="approval-sheet"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              maxWidth: 440,
              margin: '0 auto',
              zIndex: 9999,
              background: 'linear-gradient(180deg, #131622 0%, #090a10 100%)',
              borderTop: '1px solid rgba(255, 255, 255, 0.14)',
              borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
              borderRight: '1px solid rgba(255, 255, 255, 0.08)',
              borderTopLeftRadius: '26px',
              borderTopRightRadius: '26px',
              boxShadow: '0 -24px 64px rgba(0, 0, 0, 0.9), 0 0 50px rgba(0, 0, 0, 0.6)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '92dvh',
              paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom, 1.25rem))',
              touchAction: 'none',
            }}
          >
            {/* Top luminous accent edge */}
            <div
              style={{
                height: 3,
                width: '100%',
                background: iWillGive
                  ? 'linear-gradient(90deg, transparent, #f43f5e, transparent)'
                  : 'linear-gradient(90deg, transparent, #10b981, transparent)',
              }}
            />

            {/* Top Grabber Handle */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                paddingTop: '8px',
                paddingBottom: '2px',
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 4,
                  borderRadius: '9999px',
                  background: 'rgba(255, 255, 255, 0.22)',
                }}
              />
            </div>

          {/* Top Header Row with Action status + Close Button */}
          <div
            style={{
              padding: '0.85rem 1.125rem 0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
              userSelect: 'none',
              gap: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', minWidth: 0 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '11px',
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <AlertCircle size={18} color="#f59e0b" />
              </div>
              <div style={{ minWidth: 0 }}>
                <h2
                  style={{
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    color: '#f8fafc',
                    letterSpacing: '-0.015em',
                    margin: 0,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  Action Required
                </h2>
                <p style={{ fontSize: '0.72rem', color: '#64748b', margin: 0, marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Needs your response
                </p>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={handleClose}
              aria-label="Close"
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.07)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Modal Body */}
          <div style={{ padding: '0.875rem 1.125rem 0.5rem', touchAction: 'none', userSelect: 'none' }}>
            {done ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2.5rem 1rem',
                  gap: '0.85rem',
                }}
              >
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: '50%',
                    background: done === 'accepted' ? 'rgba(16, 185, 129, 0.16)' : 'rgba(244, 63, 94, 0.16)',
                    border: `2px solid ${done === 'accepted' ? '#10b981' : '#f43f5e'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 0 24px ${done === 'accepted' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
                  }}
                >
                  {done === 'accepted' ? (
                    <Check size={28} color="#10b981" strokeWidth={2.5} />
                  ) : (
                    <X size={28} color="#f43f5e" strokeWidth={2.5} />
                  )}
                </motion.div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                    {done === 'accepted' ? 'Accepted!' : 'Transaction Declined'}
                  </p>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0, marginTop: '3px' }}>
                    {done === 'accepted' ? 'Ledger balances updated' : 'Transaction has been declined.'}
                  </p>
                </div>
              </motion.div>
            ) : (
              <>
                {/* User Profile Info */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    marginBottom: '0.85rem',
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      overflow: 'hidden',
                      flexShrink: 0,
                      border: '1.5px solid rgba(255, 255, 255, 0.15)',
                      background: 'rgba(255, 255, 255, 0.05)',
                    }}
                  >
                    {peerAvatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={peerAvatar}
                        alt={peerName}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          background: avatarGradient(peerName),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: '0.95rem',
                        }}
                      >
                        {getInitials(peerName)}
                      </div>
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3
                      style={{
                        fontSize: '1rem',
                        fontWeight: 700,
                        color: '#f8fafc',
                        letterSpacing: '-0.01em',
                        margin: 0,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {peerName}
                    </h3>
                    <p
                      style={{
                        fontSize: '0.75rem',
                        color: '#8696a0',
                        margin: 0,
                        marginTop: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Calendar size={11} color="#64748b" />
                      <span>{formatTxnDate(transaction.transaction_date, transaction.created_at)}</span>
                      {peerUsername && (
                        <span style={{ color: '#64748b', marginLeft: '4px' }}>· @{peerUsername}</span>
                      )}
                    </p>
                  </div>

                  <span
                    style={{
                      fontSize: '0.675rem',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      padding: '3px 8px',
                      borderRadius: '9999px',
                      background: 'rgba(245, 158, 11, 0.15)',
                      color: '#f59e0b',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      textTransform: 'uppercase',
                    }}
                  >
                    Pending
                  </span>
                </div>

                {/* Financial Amount Inset Box */}
                <div
                  style={{
                    background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.015) 100%)',
                    border: `1px solid ${iWillGive ? 'rgba(244, 63, 94, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
                    borderRadius: '18px',
                    padding: '1.125rem 1rem',
                    textAlign: 'center',
                    marginBottom: '0.85rem',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 140,
                      height: 60,
                      background: `radial-gradient(ellipse at center, ${
                        iWillGive ? 'rgba(244, 63, 94, 0.18)' : 'rgba(16, 185, 129, 0.18)'
                      } 0%, transparent 70%)`,
                      pointerEvents: 'none',
                    }}
                  />
                  <div
                    style={{
                      fontSize: '0.725rem',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      color: statusColor,
                      textTransform: 'uppercase',
                      marginBottom: '0.4rem',
                    }}
                  >
                    {iWillGive ? 'You Will Give' : 'You Will Get'}
                  </div>
                  <div
                    style={{
                      fontSize: '2.35rem',
                      fontWeight: 800,
                      fontFamily: "'JetBrains Mono', monospace",
                      color: statusColor,
                      letterSpacing: '-0.035em',
                      lineHeight: 1.1,
                      textShadow: `0 0 28px ${statusColor}33`,
                    }}
                  >
                    <span style={{ fontSize: '1.55rem', marginRight: '2px', opacity: 0.85 }}>₹</span>
                    {amount.toLocaleString('en-IN')}
                  </div>
                  {transaction.note && (
                    <div
                      style={{
                        fontSize: '0.8125rem',
                        color: '#cbd5e1',
                        fontStyle: 'italic',
                        marginTop: '0.5rem',
                        padding: '0.25rem 0.75rem',
                        background: 'rgba(255, 255, 255, 0.04)',
                        borderRadius: '8px',
                        display: 'inline-block',
                        maxWidth: '90%',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      &ldquo;{transaction.note}&rdquo;
                    </div>
                  )}
                </div>

                {/* Warning Banner */}
                {!confirmReject && (
                  <div
                    style={{
                      background: 'rgba(245, 158, 11, 0.08)',
                      border: '1px solid rgba(245, 158, 11, 0.28)',
                      borderRadius: '14px',
                      padding: '0.75rem 0.875rem',
                      display: 'flex',
                      gap: '0.625rem',
                      alignItems: 'flex-start',
                      marginBottom: '0.85rem',
                    }}
                  >
                    <AlertCircle size={16} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <p style={{ fontSize: '0.75rem', color: '#cbd5e1', margin: 0, lineHeight: 1.45 }}>
                      Once accepted, this entry will update your shared ledger for both parties and cannot be easily reversed.
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {!confirmReject ? (
                    <>
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        transition={BTN_SPRING}
                        onClick={() => handleRespond('accepted')}
                        disabled={!!loading}
                        style={{
                          width: '100%',
                          height: 46,
                          background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                          color: '#ffffff',
                          fontSize: '0.95rem',
                          fontWeight: 700,
                          borderRadius: '14px',
                          border: 'none',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem',
                          boxShadow: '0 4px 18px rgba(16, 185, 129, 0.35)',
                        }}
                      >
                        {loading === 'accept' ? (
                          <span className="spin-indicator" />
                        ) : (
                          <Check size={18} strokeWidth={2.5} />
                        )}
                        Accept Transaction
                      </motion.button>

                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        transition={BTN_SPRING}
                        onClick={() => setConfirmReject(true)}
                        disabled={!!loading}
                        style={{
                          width: '100%',
                          height: 42,
                          background: 'rgba(244, 63, 94, 0.12)',
                          color: '#f43f5e',
                          border: '1px solid rgba(244, 63, 94, 0.3)',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          borderRadius: '14px',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem',
                        }}
                      >
                        <X size={16} strokeWidth={2.5} />
                        Reject Request
                      </motion.button>

                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={handleClose}
                        disabled={!!loading}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#64748b',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.375rem',
                          padding: '0.35rem',
                          width: '100%',
                        }}
                      >
                        <BellOff size={12} />
                        Snooze for this session
                      </motion.button>
                    </>
                  ) : (
                    /* Confirm Reject Sub-state */
                    <div
                      style={{
                        background: 'rgba(244, 63, 94, 0.08)',
                        border: '1px solid rgba(244, 63, 94, 0.25)',
                        borderRadius: '14px',
                        padding: '0.85rem',
                        textAlign: 'center',
                      }}
                    >
                      <p style={{ fontSize: '0.825rem', color: '#f8fafc', fontWeight: 600, margin: 0, marginBottom: '0.75rem' }}>
                        Reject this transaction?<br />
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>{peerName} will be notified.</span>
                      </p>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => setConfirmReject(false)}
                          style={{
                            flex: 1,
                            height: 38,
                            borderRadius: '10px',
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: '#e2e8f0',
                            fontSize: '0.825rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Go Back
                        </button>
                        <button
                          onClick={() => handleRespond('rejected')}
                          disabled={!!loading}
                          style={{
                            flex: 1,
                            height: 38,
                            borderRadius: '10px',
                            background: '#f43f5e',
                            border: 'none',
                            color: '#ffffff',
                            fontSize: '0.825rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {loading === 'reject' ? 'Rejecting...' : 'Yes, Reject'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}

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
    </AnimatePresence>
  </>
);
}
