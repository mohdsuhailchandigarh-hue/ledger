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

export default function DashboardPendingActions({
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
    <div style={{ marginBottom: '2rem', position: 'relative' }}>
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="dashboard-snooze-toast"
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.25, ...SPRING }}
            style={{
              position: 'absolute',
              top: '-3.5rem',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              borderRadius: '9999px',
              padding: '0.5rem 1rem',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              boxShadow: 'var(--shadow-md)',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
            }}
          >
            <BellOff size={12} />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.625rem',
          marginBottom: '1rem',
        }}
      >
        <AlertCircle size={16} color="var(--warning)" />
        <h2
          style={{
            fontSize: '1rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.015em',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          Pending Actions
          <motion.span
            animate={{ scale: [1, 1.12, 1] }}
            transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
            style={{
              background: 'var(--warning-muted)',
              color: 'var(--warning)',
              border: '1px solid var(--warning-border)',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 800,
              padding: '1px 6px',
            }}
          >
            {activeActions.length}
          </motion.span>
        </h2>
      </div>

      {/* List of cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
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
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0  }}
                exit={{   opacity: 0, x: 30, scale: 0.98 }}
                transition={{ delay: i * 0.055, duration: 0.35, ...SPRING }}
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
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                {/* Stripe */}
                <div style={{ height: 3, background: stripeGradient }} />

                <div style={{ padding: '1.125rem' }}>
                  <AnimatePresence mode="wait">
                    {/* DONE STATE */}
                    {doneState ? (
                      <motion.div
                        key="done"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '0.625rem',
                          padding: '0.75rem 0',
                        }}
                      >
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 450, damping: 24, delay: 0.05 }}
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: '50%',
                            background: doneState === 'accepted' ? 'var(--success-muted)' : 'var(--danger-muted)',
                            border: `2px solid ${doneState === 'accepted' ? 'var(--success-border)' : 'var(--danger-border)'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {doneState === 'accepted'
                            ? <Check size={22} color="var(--success)" strokeWidth={2.5} />
                            : <X     size={22} color="var(--danger)"  strokeWidth={2.5} />}
                        </motion.div>
                        <div style={{ textAlign: 'center' }}>
                          <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1px' }}>
                            {doneState === 'accepted' ? 'Accepted!' : 'Done'}
                          </p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {doneState === 'accepted'
                              ? 'Ledger updated successfully'
                              : 'Transaction processed'}
                          </p>
                        </div>
                      </motion.div>
                    ) : (
                      /* ACTIVE STATE */
                      <motion.div key="active" initial={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.15 } }}>
                        {/* Peer Info Row */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div
                              style={{
                                width: 38,
                                height: 38,
                                borderRadius: '10px',
                                background: isRejectedStatus ? 'var(--danger-muted)' : avatarGradient(peer.name),
                                border: isRejectedStatus ? '1px solid var(--danger-border)' : '1px solid rgba(255,255,255,0.08)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.9375rem',
                                fontWeight: 800,
                                color: isRejectedStatus ? 'var(--danger)' : 'white',
                                flexShrink: 0,
                                letterSpacing: '-0.02em',
                              }}
                            >
                              {peer.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p style={{ fontSize: '0.875rem', fontWeight: 700, color: isRejectedStatus ? 'var(--danger)' : 'var(--text-primary)', marginBottom: '1px', letterSpacing: '-0.01em' }}>
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
                            padding: '2px 6px',
                            borderRadius: '9999px',
                            background: isRejectedStatus ? 'var(--danger-muted)' : 'var(--warning-muted)',
                            color:      isRejectedStatus ? 'var(--danger)'       : 'var(--warning)',
                            border: `1px solid ${isRejectedStatus ? 'var(--danger-border)' : 'var(--warning-border)'}`,
                          }}>
                            {isRejectedStatus ? 'Rejected' : 'Pending'}
                          </span>
                        </div>

                        {/* Amount or edit form */}
                        {isEditing ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <input
                                type="number"
                                className="input"
                                value={editForm.amount}
                                onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                                placeholder="Amount"
                                style={{ flex: 1, fontSize: '0.875rem' }}
                                min="1"
                              />
                              <input
                                type="text"
                                className="input"
                                value={editForm.note}
                                onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                                placeholder="Add note"
                                style={{ flex: 2, fontSize: '0.875rem' }}
                              />
                            </div>
                          </div>
                        ) : (
                          <div
                            style={{
                              textAlign: 'center',
                              padding: '0.875rem 0.75rem',
                              borderRadius: 'var(--radius-lg)',
                              background: isRejectedStatus
                                ? 'transparent'
                                : iWillGive
                                ? 'rgba(244,63,94,0.04)'
                                : 'rgba(16,185,129,0.04)',
                              border: isRejectedStatus
                                ? '1px dashed var(--border-subtle)'
                                : `1px solid ${iWillGive ? 'var(--danger-border)' : 'var(--success-border)'}`,
                              marginBottom: '1rem',
                            }}
                          >
                            {!isRejectedStatus && (
                              <p style={{
                                fontSize: '0.625rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.07em',
                                color: accentColor,
                                marginBottom: '0.375rem',
                              }}>
                                {iWillGive ? 'You Will Give' : 'You Will Get'}
                              </p>
                            )}
                            <div style={{
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: '1.625rem',
                              fontWeight: 800,
                              letterSpacing: '-0.03em',
                              lineHeight: 1.1,
                              color: isRejectedStatus ? 'var(--text-secondary)' : accentColor,
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'baseline',
                              gap: '2px',
                            }}>
                              <span style={{ fontSize: '1.125rem', opacity: 0.7 }}>₹</span>
                              {amount.toLocaleString('en-IN')}
                            </div>
                            {txn.note && (
                              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.375rem', fontStyle: 'italic' }}>
                                &quot;{txn.note}&quot;
                              </p>
                            )}
                          </div>
                        )}

                        {/* Actions / Confirmation */}
                        <AnimatePresence mode="wait">
                          {isConfirmingReject ? (
                            <motion.div
                              key="confirm-reject"
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.18 }}
                              style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
                            >
                              <div style={{
                                padding: '0.5rem 0.75rem',
                                borderRadius: 'var(--radius-lg)',
                                background: 'var(--danger-muted)',
                                border: '1px solid var(--danger-border)',
                                textAlign: 'center',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: 'var(--danger)',
                                lineHeight: 1.4,
                              }}>
                                Reject this transaction? {peer.name} will be notified.
                              </div>
                              <div style={{ display: 'flex', gap: '0.375rem' }}>
                                <motion.button
                                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                  transition={BTN_SPRING}
                                  onClick={() => setConfirmRejectId(null)}
                                  className="btn"
                                  style={{ flex: 1, background: 'var(--bg-base)', color: 'var(--text-secondary)', fontSize: '0.8125rem', fontWeight: 600, justifyContent: 'center', padding: '0.375rem' }}
                                >
                                  Cancel
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                  transition={BTN_SPRING}
                                  onClick={() => handleRespond(txn.id, 'rejected')}
                                  disabled={isLoading}
                                  className="btn"
                                  style={{ flex: 1.4, background: 'var(--danger)', color: 'white', fontSize: '0.8125rem', fontWeight: 700, justifyContent: 'center', gap: '0.25rem', border: 'none', padding: '0.375rem' }}
                                >
                                  {isLoading ? <span className="dashboard-spin" /> : <X size={13} strokeWidth={2.5} />}
                                  Confirm Reject
                                </motion.button>
                              </div>
                            </motion.div>
                          ) : (
                            <motion.div
                              key="action-btns"
                              initial={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
                            >
                              <div style={{ display: 'flex', gap: '0.375rem' }}>
                                {/* PENDING card buttons */}
                                {isPending && !isEditing && (
                                  <>
                                    <motion.button
                                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                      transition={BTN_SPRING}
                                      onClick={() => setConfirmRejectId(txn.id)}
                                      disabled={loadingId !== null}
                                      className="btn"
                                      style={{
                                        flex: 1,
                                        background: 'var(--danger-muted)',
                                        color: 'var(--danger)',
                                        border: '1px solid var(--danger-border)',
                                        fontSize: '0.8125rem',
                                        fontWeight: 600,
                                        justifyContent: 'center',
                                        gap: '0.25rem',
                                        padding: '0.5rem',
                                      }}
                                    >
                                      <X size={14} strokeWidth={2.5} /> Reject
                                    </motion.button>
                                    <motion.button
                                      whileHover={{ scale: 1.02, boxShadow: '0 4px 18px rgba(16,185,129,0.35)' }}
                                      whileTap={{ scale: 0.96 }}
                                      transition={BTN_SPRING}
                                      onClick={() => handleRespond(txn.id, 'accepted')}
                                      disabled={loadingId !== null}
                                      className="btn"
                                      style={{
                                        flex: 1.4,
                                        background: 'linear-gradient(135deg,#059669,#10b981)',
                                        color: 'white',
                                        fontSize: '0.8125rem',
                                        fontWeight: 700,
                                        justifyContent: 'center',
                                        gap: '0.25rem',
                                        boxShadow: '0 2px 10px rgba(16,185,129,0.2)',
                                        border: 'none',
                                        padding: '0.5rem',
                                      }}
                                    >
                                      {isLoading ? <span className="dashboard-spin" /> : <Check size={14} strokeWidth={2.5} />}
                                      Accept
                                    </motion.button>
                                  </>
                                )}

                                {/* REJECTED card buttons */}
                                {isRejectedStatus && !isEditing && (
                                  <>
                                    <motion.button
                                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                      transition={BTN_SPRING}
                                      onClick={() => handleRejectedAction(txn.id, 'cancel')}
                                      disabled={loadingId !== null}
                                      className="btn"
                                      style={{ flex: 1, background: 'var(--bg-base)', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, justifyContent: 'center', gap: '0.25rem', padding: '0.5rem' }}
                                    >
                                      <X size={12} /> Cancel
                                    </motion.button>
                                    <motion.button
                                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                      transition={BTN_SPRING}
                                      onClick={() => { setEditForm({ amount: String(amount), note: txn.note || '' }); setEditingId(txn.id); }}
                                      disabled={loadingId !== null}
                                      className="btn"
                                      style={{ flex: 1, background: 'var(--bg-base)', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, justifyContent: 'center', gap: '0.25rem', padding: '0.5rem' }}
                                    >
                                      <Edit2 size={12} /> Edit
                                    </motion.button>
                                    <motion.button
                                      whileHover={{ scale: 1.02, boxShadow: '0 4px 18px rgba(99,102,241,0.3)' }}
                                      whileTap={{ scale: 0.96 }}
                                      transition={BTN_SPRING}
                                      onClick={() => handleRejectedAction(txn.id, 're_request')}
                                      disabled={loadingId !== null}
                                      className="btn"
                                      style={{
                                        flex: 1.4,
                                        background: 'linear-gradient(135deg,#4f46e5,#6366f1)',
                                        color: 'white',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        justifyContent: 'center',
                                        gap: '0.25rem',
                                        boxShadow: '0 2px 8px rgba(99,102,241,0.18)',
                                        border: 'none',
                                        padding: '0.5rem',
                                      }}
                                    >
                                      {isLoading ? <span className="dashboard-spin" /> : <RotateCcw size={12} />}
                                      Resend
                                    </motion.button>
                                  </>
                                )}

                                {/* EDIT form buttons */}
                                {isEditing && (
                                  <>
                                    <motion.button
                                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                      transition={BTN_SPRING}
                                      onClick={() => setEditingId(null)}
                                      disabled={isLoading}
                                      className="btn"
                                      style={{ flex: 1, background: 'var(--bg-base)', color: 'var(--text-secondary)', fontSize: '0.8125rem', fontWeight: 600, justifyContent: 'center', padding: '0.5rem' }}
                                    >
                                      Cancel
                                    </motion.button>
                                    <motion.button
                                      whileHover={{ scale: 1.02, boxShadow: '0 4px 18px rgba(99,102,241,0.3)' }}
                                      whileTap={{ scale: 0.96 }}
                                      transition={BTN_SPRING}
                                      onClick={() => handleRejectedAction(txn.id, 'edit')}
                                      disabled={isLoading}
                                      className="btn"
                                      style={{
                                        flex: 1.4,
                                        background: 'linear-gradient(135deg,#4f46e5,#6366f1)',
                                        color: 'white',
                                        fontSize: '0.8125rem',
                                        fontWeight: 700,
                                        justifyContent: 'center',
                                        gap: '0.25rem',
                                        border: 'none',
                                        padding: '0.5rem',
                                      }}
                                    >
                                      {isLoading ? <span className="dashboard-spin" /> : <Check size={14} />}
                                      Save & Resend
                                    </motion.button>
                                  </>
                                )}
                              </div>

                              {/* Snooze button */}
                              {!isEditing && (
                                <motion.button
                                  initial={{ opacity: 0.6 }}
                                  whileHover={{ opacity: 1, background: 'var(--bg-base)' }}
                                  whileTap={{ scale: 0.97 }}
                                  transition={{ duration: 0.15 }}
                                  onClick={() => handleSnooze(txn.id)}
                                  disabled={loadingId !== null}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    fontSize: '0.75rem',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.25rem',
                                    padding: '0.25rem',
                                    borderRadius: '6px',
                                    width: '100%',
                                  }}
                                >
                                  <BellOff size={11} />
                                  Snooze for this session
                                </motion.button>
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

      <style>{`
        .dashboard-spin {
          width: 14px; height: 14px;
          border-radius: 50%;
          border: 2px solid currentColor;
          border-top-color: transparent;
          display: inline-block;
          animation: db-spin 0.7s linear infinite;
          opacity: 0.8;
        }
        @keyframes db-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
