'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, X, Check, AlertCircle, Edit2, RotateCcw, BellOff, Calendar } from 'lucide-react';
import { respondToTransactionAction, handleRejectedTransactionAction } from '@/lib/actions/transaction.actions';
import { useRouter } from 'next/navigation';

type Transaction = {
  id: string;
  amount: number;
  direction: 'give' | 'get';
  note?: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'canceled';
  created_at: string;
  transaction_date?: string | null;
  creator_id: string;
  counterparty_id: string;
  creator: { id: string; name: string; username: string };
  counterparty: { id: string; name: string; username: string };
};

function formatTxnDate(dateStr: string | null | undefined, fallback: string): string {
  const raw = dateStr || fallback?.slice(0, 10);
  if (!raw) return '—';
  const [year, month, day] = raw.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return raw;
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

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

export default function GlobalPendingOverlay({
  actions,
  currentUserId,
}: {
  actions: Transaction[];
  currentUserId: string;
}) {
  const [snoozedIds, setSnoozedIds]       = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds]   = useState<Set<string>>(new Set());
  const [doneMap, setDoneMap]             = useState<Map<string, 'accepted' | 'rejected'>>(new Map());
  const [loadingId, setLoadingId]         = useState<string | null>(null);
  const [confirmRejectId, setConfirmRejectId] = useState<string | null>(null);
  const [editingId, setEditingId]         = useState<string | null>(null);
  const [editForm, setEditForm]           = useState({ amount: '', note: '' });
  const [toast, setToast]                 = useState<string | null>(null);
  const router = useRouter();

  const activeActions = actions.filter((a) => {
    if (snoozedIds.has(a.id) || dismissedIds.has(a.id)) return false;
    if (a.status === 'pending'  && a.counterparty_id === currentUserId) return true;
    if (a.status === 'rejected' && a.creator_id     === currentUserId) return true;
    return false;
  });

  if (activeActions.length === 0) return null;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  const handleSnooze = (id: string) => {
    setSnoozedIds((prev) => new Set(prev).add(id));
    showToast('Will remind you again next login');
  };

  const finishCard = (id: string, state: 'accepted' | 'rejected') => {
    setDoneMap((prev) => new Map(prev).set(id, state));
    setTimeout(() => {
      setDismissedIds((prev) => new Set(prev).add(id));
      router.refresh();
    }, 1700);
  };

  const handleRespond = async (id: string, action: 'accepted' | 'rejected') => {
    setLoadingId(id);
    setConfirmRejectId(null);
    await respondToTransactionAction(id, action);
    setLoadingId(null);
    finishCard(id, action);
  };

  const handleRejectedAction = async (
    id: string,
    action: 'cancel' | 're_request' | 'edit'
  ) => {
    setLoadingId(id);
    let updates = undefined;
    if (action === 'edit') {
      updates = { amount: Number(editForm.amount), note: editForm.note };
    }
    await handleRejectedTransactionAction(id, action, updates);
    setEditingId(null);
    setLoadingId(null);
    finishCard(id, action === 'cancel' ? 'rejected' : 'accepted');
  };

  return (
    <AnimatePresence>
      {activeActions.length > 0 && (
        <motion.div
          key="overlay-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.88)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}
        >
          {/* Toast */}
          <AnimatePresence>
            {toast && (
              <motion.div
                key="snooze-toast"
                initial={{ opacity: 0, y: 16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.3, ...SPRING }}
                style={{
                  position: 'absolute',
                  bottom: '2rem',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '9999px',
                  padding: '0.625rem 1.25rem',
                  fontSize: '0.8125rem',
                  color: 'var(--text-secondary)',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  boxShadow: 'var(--shadow-xl)',
                  zIndex: 10001,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <BellOff size={13} />
                {toast}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Panel */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 28 }}
            animate={{ scale: 1,    opacity: 1, y: 0  }}
            exit={  { scale: 0.95, opacity: 0, y: 12 }}
            transition={{ duration: 0.42, ...SPRING }}
            style={{
              width: '100%',
              maxWidth: 500,
              maxHeight: '90vh',
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-2xl)',
              border: '1px solid var(--border-default)',
              boxShadow: 'var(--shadow-xl), 0 0 80px rgba(0,0,0,0.5)',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Sticky header */}
            <div
              style={{
                padding: '1.375rem 1.5rem 1.125rem',
                borderBottom: '1px solid var(--border-subtle)',
                position: 'sticky',
                top: 0,
                background: 'var(--bg-surface)',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                gap: '0.875rem',
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg,rgba(245,158,11,0.18),rgba(245,158,11,0.06))',
                  border: '1px solid rgba(245,158,11,0.28)',
                  boxShadow: '0 0 28px rgba(245,158,11,0.14)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <AlertCircle size={20} color="var(--warning)" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <h2 style={{
                    fontSize: '1.0625rem',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    letterSpacing: '-0.015em',
                  }}>
                    Action Required
                  </h2>
                  <motion.span
                    animate={{ scale: [1, 1.12, 1] }}
                    transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                    style={{
                      background: 'var(--danger-muted)',
                      color: 'var(--danger)',
                      border: '1px solid var(--danger-border)',
                      borderRadius: '9999px',
                      fontSize: '0.6875rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                    }}
                  >
                    {activeActions.length}
                  </motion.span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                  {activeActions.length === 1
                    ? '1 transaction needs your response'
                    : `${activeActions.length} transactions need your response`}
                </p>
              </div>
            </div>

            {/* Cards list */}
            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <AnimatePresence mode="popLayout">
                {activeActions.map((txn, i) => {
                  const isPending          = txn.status === 'pending';
                  const isRejectedStatus   = txn.status === 'rejected';
                  const iAmCreator         = txn.creator_id === currentUserId;
                  const peer               = iAmCreator ? txn.counterparty : txn.creator;
                  const iWillGive          = iAmCreator ? txn.direction === 'give' : txn.direction === 'get';
                  const amount             = Number(txn.amount);
                  const isEditing          = editingId === txn.id;
                  const isLoading          = loadingId === txn.id;
                  const isConfirmingReject = confirmRejectId === txn.id;
                  const doneState          = doneMap.get(txn.id);

                  const accentColor = isRejectedStatus
                    ? 'var(--danger)'
                    : iWillGive
                    ? 'var(--danger)'
                    : 'var(--success)';

                  const stripeGradient = isRejectedStatus || doneState === 'rejected'
                    ? 'linear-gradient(90deg,var(--danger),#fb7185)'
                    : doneState === 'accepted'
                    ? 'linear-gradient(90deg,var(--success),#34d399)'
                    : iWillGive
                    ? 'linear-gradient(90deg,var(--danger),#fb7185)'
                    : 'linear-gradient(90deg,var(--success),#34d399)';

                  return (
                    <motion.div
                      key={txn.id}
                      layout
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0  }}
                      exit={{   opacity: 0, x: 48, scale: 0.95 }}
                      transition={{ delay: i * 0.055, duration: 0.42, ...SPRING }}
                      style={{
                        background: 'var(--bg-elevated)',
                        border: `1px solid ${
                          isRejectedStatus || doneState === 'rejected'
                            ? 'var(--danger-border)'
                            : doneState === 'accepted'
                            ? 'var(--success-border)'
                            : 'var(--border-subtle)'
                        }`,
                        borderRadius: 'var(--radius-xl)',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Colour stripe */}
                      <div style={{ height: 3, background: stripeGradient }} />

                      <div style={{ padding: '1.125rem' }}>
                        <AnimatePresence mode="wait">
                          {/* ─── DONE STATE ─── */}
                          {doneState ? (
                            <motion.div
                              key="done"
                              initial={{ opacity: 0, scale: 0.92 }}
                              animate={{ opacity: 1, scale: 1 }}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '1.25rem 0',
                              }}
                            >
                              <motion.div
                                initial={{ scale: 0, rotate: -25 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: 'spring', stiffness: 440, damping: 22, delay: 0.08 }}
                                style={{
                                  width: 60,
                                  height: 60,
                                  borderRadius: '50%',
                                  background: doneState === 'accepted' ? 'var(--success-muted)' : 'var(--danger-muted)',
                                  border: `2px solid ${doneState === 'accepted' ? 'var(--success-border)' : 'var(--danger-border)'}`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                {doneState === 'accepted'
                                  ? <Check size={28} color="var(--success)" strokeWidth={2.5} />
                                  : <X     size={28} color="var(--danger)"  strokeWidth={2.5} />}
                              </motion.div>
                              <div style={{ textAlign: 'center' }}>
                                <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>
                                  {doneState === 'accepted' ? 'Accepted!' : 'Done'}
                                </p>
                                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                                  {doneState === 'accepted'
                                    ? 'Ledger updated for both parties'
                                    : 'Transaction has been handled'}
                                </p>
                              </div>
                            </motion.div>
                          ) : (
                          /* ─── ACTIVE STATE ─── */
                          <motion.div key="active" initial={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.15 } }}>

                            {/* Peer row */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div
                                  style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: '12px',
                                    background: isRejectedStatus ? 'var(--danger-muted)' : avatarGradient(peer.name),
                                    border: isRejectedStatus ? '1px solid var(--danger-border)' : '1px solid rgba(255,255,255,0.08)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '1.0625rem',
                                    fontWeight: 800,
                                    color: isRejectedStatus ? 'var(--danger)' : 'white',
                                    flexShrink: 0,
                                    letterSpacing: '-0.02em',
                                  }}
                                >
                                  {peer.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: isRejectedStatus ? 'var(--danger)' : 'var(--text-primary)', marginBottom: '1px', letterSpacing: '-0.01em' }}>
                                    {peer.name}
                                  </p>
                                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <Calendar size={10} />
                                    {formatTxnDate(txn.transaction_date, txn.created_at)}
                                  </p>
                                </div>
                              </div>
                              <span style={{
                                fontSize: '0.625rem',
                                fontWeight: 700,
                                letterSpacing: '0.06em',
                                textTransform: 'uppercase',
                                padding: '3px 8px',
                                borderRadius: '9999px',
                                background: isRejectedStatus ? 'var(--danger-muted)' : 'var(--warning-muted)',
                                color:      isRejectedStatus ? 'var(--danger)'       : 'var(--warning)',
                                border: `1px solid ${isRejectedStatus ? 'var(--danger-border)' : 'var(--warning-border)'}`,
                              }}>
                                {isRejectedStatus ? 'Rejected' : 'Pending'}
                              </span>
                            </div>

                            {/* Amount block or edit form */}
                            {isEditing ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '1rem' }}>
                                <div className="input-group">
                                  <span className="input-prefix">₹</span>
                                  <input
                                    type="number"
                                    className="input"
                                    value={editForm.amount}
                                    onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                                    placeholder="Amount"
                                    min="1"
                                  />
                                </div>
                                <input
                                  type="text"
                                  className="input"
                                  value={editForm.note}
                                  onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                                  placeholder="Add a note (optional)"
                                />
                              </div>
                            ) : (
                              <div
                                style={{
                                  textAlign: 'center',
                                  padding: '1.125rem 1rem',
                                  borderRadius: 'var(--radius-lg)',
                                  background: isRejectedStatus
                                    ? 'transparent'
                                    : iWillGive
                                    ? 'rgba(244,63,94,0.06)'
                                    : 'rgba(16,185,129,0.06)',
                                  border: isRejectedStatus
                                    ? '1px dashed var(--border-subtle)'
                                    : `1px solid ${iWillGive ? 'var(--danger-border)' : 'var(--success-border)'}`,
                                  marginBottom: '1rem',
                                }}
                              >
                                {!isRejectedStatus && (
                                  <p style={{
                                    fontSize: '0.6875rem',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.07em',
                                    color: accentColor,
                                    marginBottom: '0.5rem',
                                  }}>
                                    {iWillGive ? 'You Will Give' : 'You Will Get'}
                                  </p>
                                )}
                                <div style={{
                                  fontFamily: "'JetBrains Mono', monospace",
                                  fontSize: 'clamp(1.875rem, 6vw, 2.375rem)',
                                  fontWeight: 800,
                                  letterSpacing: '-0.04em',
                                  lineHeight: 1,
                                  color: isRejectedStatus ? 'var(--text-secondary)' : accentColor,
                                  display: 'flex',
                                  justifyContent: 'center',
                                  alignItems: 'baseline',
                                  gap: '3px',
                                }}>
                                  <span style={{ fontSize: '1.25rem', opacity: 0.7 }}>₹</span>
                                  {amount.toLocaleString('en-IN')}
                                </div>
                                {txn.note && (
                                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem', fontStyle: 'italic' }}>
                                    &quot;{txn.note}&quot;
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Dedicated Action Section Divider & Spacing */}
                            <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '1.75rem 0 1.25rem' }} />

                            {!doneState && (
                              <h3 style={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                                color: 'var(--text-muted)',
                                marginBottom: '1rem',
                                textAlign: 'left',
                                paddingLeft: '2px',
                              }}>
                                {isConfirmingReject
                                  ? 'Confirm Decision'
                                  : isEditing
                                  ? 'Edit Request details'
                                  : isPending
                                  ? 'Pending Approval'
                                  : 'Update Rejected Request'}
                              </h3>
                            )}

                            <AnimatePresence mode="wait">
                              {isConfirmingReject ? (
                                <motion.div
                                  key="confirm-reject"
                                  initial={{ opacity: 0, y: 8 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0 }}
                                  transition={{ duration: 0.22 }}
                                  style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
                                >
                                  <div style={{
                                    padding: '1rem',
                                    borderRadius: '12px',
                                    background: 'var(--danger-muted)',
                                    border: '1px solid var(--danger-border)',
                                    textAlign: 'center',
                                    fontSize: '0.875rem',
                                    fontWeight: 600,
                                    color: 'var(--danger)',
                                    lineHeight: 1.5,
                                    marginBottom: '0.25rem',
                                  }}>
                                    Reject this transaction?<br />
                                    <span style={{ fontWeight: 400, opacity: 0.8 }}>{peer.name} will be notified.</span>
                                  </div>
                                  <motion.button
                                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                                    transition={BTN_SPRING}
                                    onClick={() => handleRespond(txn.id, 'rejected')}
                                    disabled={isLoading}
                                    className="btn"
                                    style={{
                                      width: '100%',
                                      height: 'clamp(52px, 8vw, 60px)',
                                      background: 'var(--danger)',
                                      color: 'white',
                                      fontSize: '1rem',
                                      fontWeight: 700,
                                      justifyContent: 'center',
                                      gap: '0.5rem',
                                      border: 'none',
                                      borderRadius: '14px',
                                    }}
                                  >
                                    {isLoading ? <span className="spin-indicator" /> : <X size={18} strokeWidth={2.5} />}
                                    Confirm Reject
                                  </motion.button>
                                  <motion.button
                                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                                    transition={BTN_SPRING}
                                    onClick={() => setConfirmRejectId(null)}
                                    className="btn"
                                    style={{
                                      width: '100%',
                                      height: 'clamp(52px, 8vw, 60px)',
                                      background: 'var(--bg-base)',
                                      color: 'var(--text-secondary)',
                                      fontSize: '1rem',
                                      fontWeight: 600,
                                      justifyContent: 'center',
                                      borderRadius: '14px',
                                      border: '1px solid var(--border-default)',
                                    }}
                                  >
                                    Cancel
                                  </motion.button>
                                </motion.div>
                              ) : (
                              /* ─── Normal action buttons ─── */
                              <motion.div
                                key="action-btns"
                                initial={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
                              >
                                {/* PENDING card buttons */}
                                {isPending && !isEditing && (
                                  <>
                                    <motion.button
                                      whileHover={{ scale: 1.01, boxShadow: '0 6px 28px rgba(16,185,129,0.45)' }}
                                      whileTap={{ scale: 0.98 }}
                                      transition={BTN_SPRING}
                                      onClick={() => handleRespond(txn.id, 'accepted')}
                                      disabled={loadingId !== null}
                                      className="btn"
                                      style={{
                                        width: '100%',
                                        height: 'clamp(52px, 8vw, 60px)',
                                        background: 'linear-gradient(135deg,#059669,#10b981)',
                                        color: 'white',
                                        fontSize: '1.0625rem',
                                        fontWeight: 700,
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        boxShadow: '0 2px 14px rgba(16,185,129,0.28)',
                                        border: 'none',
                                        borderRadius: '14px',
                                      }}
                                    >
                                      {isLoading ? <span className="spin-indicator" /> : <Check size={18} strokeWidth={2.5} />}
                                      Accept Transaction
                                    </motion.button>

                                    <motion.button
                                      whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                                      transition={BTN_SPRING}
                                      onClick={() => setConfirmRejectId(txn.id)}
                                      disabled={loadingId !== null}
                                      className="btn"
                                      style={{
                                        width: '100%',
                                        height: 'clamp(52px, 8vw, 60px)',
                                        background: 'var(--danger-muted)',
                                        color: 'var(--danger)',
                                        border: '1px solid var(--danger-border)',
                                        fontSize: '1rem',
                                        fontWeight: 600,
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        borderRadius: '14px',
                                      }}
                                    >
                                      <X size={18} strokeWidth={2.5} /> Reject Request
                                    </motion.button>

                                    <motion.button
                                      initial={{ opacity: 0.6 }}
                                      whileHover={{ opacity: 1, background: 'var(--bg-base)' }}
                                      whileTap={{ scale: 0.98 }}
                                      transition={{ duration: 0.15 }}
                                      onClick={() => handleSnooze(txn.id)}
                                      disabled={loadingId !== null}
                                      style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--text-muted)',
                                        fontSize: '0.875rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        height: 'clamp(48px, 7vw, 54px)',
                                        borderRadius: '12px',
                                        width: '100%',
                                      }}
                                    >
                                      <BellOff size={14} />
                                      Snooze Until Next Login
                                    </motion.button>
                                  </>
                                )}

                                {/* REJECTED card buttons */}
                                {isRejectedStatus && !isEditing && (
                                  <>
                                    <motion.button
                                      whileHover={{ scale: 1.01, boxShadow: '0 6px 24px rgba(99,102,241,0.4)' }}
                                      whileTap={{ scale: 0.98 }}
                                      transition={BTN_SPRING}
                                      onClick={() => handleRejectedAction(txn.id, 're_request')}
                                      disabled={loadingId !== null}
                                      className="btn"
                                      style={{
                                        width: '100%',
                                        height: 'clamp(52px, 8vw, 60px)',
                                        background: 'linear-gradient(135deg,#4f46e5,#6366f1)',
                                        color: 'white',
                                        fontSize: '1.0625rem',
                                        fontWeight: 700,
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        boxShadow: '0 2px 12px rgba(99,102,241,0.22)',
                                        border: 'none',
                                        borderRadius: '14px',
                                      }}
                                    >
                                      {isLoading ? <span className="spin-indicator" /> : <RotateCcw size={16} />}
                                      Resend Transaction
                                    </motion.button>

                                    <motion.button
                                      whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                                      transition={BTN_SPRING}
                                      onClick={() => { setEditForm({ amount: String(amount), note: txn.note || '' }); setEditingId(txn.id); }}
                                      disabled={loadingId !== null}
                                      className="btn"
                                      style={{
                                        width: '100%',
                                        height: 'clamp(52px, 8vw, 60px)',
                                        background: 'var(--bg-base)',
                                        color: 'var(--text-secondary)',
                                        border: '1px solid var(--border-default)',
                                        fontSize: '1rem',
                                        fontWeight: 600,
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        borderRadius: '14px',
                                      }}
                                    >
                                      <Edit2 size={16} /> Edit Request
                                    </motion.button>

                                    <motion.button
                                      whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                                      transition={BTN_SPRING}
                                      onClick={() => handleRejectedAction(txn.id, 'cancel')}
                                      disabled={loadingId !== null}
                                      className="btn"
                                      style={{
                                        width: '100%',
                                        height: 'clamp(48px, 7vw, 54px)',
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--text-muted)',
                                        fontSize: '0.875rem',
                                        fontWeight: 600,
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        borderRadius: '12px',
                                      }}
                                    >
                                      <X size={16} /> Cancel Request
                                    </motion.button>
                                  </>
                                )}

                                {/* EDIT form buttons */}
                                {isEditing && (
                                  <>
                                    <motion.button
                                      whileHover={{ scale: 1.01, boxShadow: '0 6px 24px rgba(99,102,241,0.4)' }}
                                      whileTap={{ scale: 0.98 }}
                                      transition={BTN_SPRING}
                                      onClick={() => handleRejectedAction(txn.id, 'edit')}
                                      disabled={isLoading}
                                      className="btn"
                                      style={{
                                        width: '100%',
                                        height: 'clamp(52px, 8vw, 60px)',
                                        background: 'linear-gradient(135deg,#4f46e5,#6366f1)',
                                        color: 'white',
                                        fontSize: '1.0625rem',
                                        fontWeight: 700,
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        border: 'none',
                                        borderRadius: '14px',
                                      }}
                                    >
                                      {isLoading ? <span className="spin-indicator" /> : <Check size={18} />}
                                      Save & Resend
                                    </motion.button>

                                    <motion.button
                                      whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                                      transition={BTN_SPRING}
                                      onClick={() => setEditingId(null)}
                                      disabled={isLoading}
                                      className="btn"
                                      style={{
                                        width: '100%',
                                        height: 'clamp(52px, 8vw, 60px)',
                                        background: 'var(--bg-base)',
                                        color: 'var(--text-secondary)',
                                        fontSize: '1rem',
                                        fontWeight: 600,
                                        justifyContent: 'center',
                                        borderRadius: '14px',
                                        border: '1px solid var(--border-default)',
                                      }}
                                    >
                                      Cancel
                                    </motion.button>
                                  </>
                                )}
                              </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </motion.div>

          <style>{`
            .spin-indicator {
              width: 16px; height: 16px;
              border-radius: 50%;
              border: 2px solid currentColor;
              border-top-color: transparent;
              display: inline-block;
              animation: gpo-spin 0.7s linear infinite;
              opacity: 0.8;
            }
            @keyframes gpo-spin { to { transform: rotate(360deg); } }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
