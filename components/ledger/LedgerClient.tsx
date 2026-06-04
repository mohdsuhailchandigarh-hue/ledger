'use client';

import { useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LedgerTimeline from '@/components/ledger/LedgerTimeline';
import CreateTransactionSheet from '@/components/ledger/CreateTransactionSheet';
import AnimatedCounter from '@/components/motion/AnimatedCounter';
import { Plus, ArrowLeft, RefreshCw, Trash2, AlertTriangle, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { deleteLedgerAction } from '@/lib/actions/connection.actions';

type Transaction = {
  id: string;
  amount: number;
  direction: 'give' | 'get';
  note?: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'canceled';
  created_at: string;
  creator: { id: string; name: string; username: string };
  counterparty: { id: string; name: string; username: string };
};

type Props = {
  connectionId: string;
  peer: { id: string; name: string; username: string; isPersonal?: boolean };
  currentUserId: string;
  transactions: Transaction[];
  netBalance: number;
  isDisconnected?: boolean;
};

export default function LedgerClient({
  connectionId,
  peer,
  currentUserId,
  transactions,
  netBalance,
  isDisconnected = false,
}: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const router = useRouter();

  function handleSuccess() {
    setShowCreate(false);
    startTransition(() => router.refresh());
  }

  function handleDelete() {
    setDeleteError(null);
    startDeleteTransition(async () => {
      const result = await deleteLedgerAction(connectionId);
      if (result.error) {
        setDeleteError(result.error);
      } else {
        router.push('/dashboard');
      }
    });
  }

  const willGet = netBalance > 0;
  const willGive = netBalance < 0;
  const settled = netBalance === 0;

  return (
    <>
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 30,
            background: 'rgba(6,6,8,0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid var(--border-subtle)',
            padding: '0 1.5rem',
          }}
        >
          <div
            style={{
              maxWidth: '720px',
              margin: '0 auto',
              height: 64,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
            }}
          >
            {/* Back + peer info */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.875rem',
                minWidth: 0,
              }}
            >
              <Link
                href="/dashboard"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 34,
                  height: 34,
                  borderRadius: '9px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  textDecoration: 'none',
                  flexShrink: 0,
                  transition: 'all 0.15s',
                }}
              >
                <ArrowLeft size={16} />
              </Link>

              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  color: 'white',
                  flexShrink: 0,
                }}
              >
                {peer.name.charAt(0).toUpperCase()}
              </div>

              <div style={{ minWidth: 0 }}>
                <h1
                  style={{
                    fontSize: '0.9375rem',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    letterSpacing: '-0.01em',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem'
                  }}
                >
                  {peer.name}
                  {peer.isPersonal && (
                    <span style={{ fontSize: '0.625rem', padding: '1px 5px', background: 'var(--bg-elevated)', borderRadius: '4px', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                      Personal
                    </span>
                  )}
                </h1>
                <p
                  style={{
                    fontSize: '0.75rem',
                    color: isDisconnected ? 'var(--danger)' : 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {peer.isPersonal 
                    ? `${peer.username} · Offline Ledger` 
                    : isDisconnected 
                    ? `@${peer.username} · Disconnected` 
                    : `@${peer.username} · Shared Ledger`}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
              <button
                onClick={() => startTransition(() => router.refresh())}
                className="btn btn-ghost btn-icon"
                title="Refresh"
                disabled={isPending}
                style={{ opacity: isPending ? 0.5 : 1 }}
              >
                <RefreshCw
                  size={16}
                  style={{
                    animation: isPending ? 'spin 0.7s linear infinite' : 'none',
                  }}
                />
              </button>
              <button
                onClick={() => { setDeleteError(null); setShowDelete(true); }}
                className="btn btn-ghost btn-icon"
                title={peer.isPersonal ? 'Delete contact permanently' : 'Remove ledger'}
                style={{ color: peer.isPersonal ? 'var(--danger)' : 'var(--text-muted)' }}
              >
                <Trash2 size={16} />
              </button>
              <button
                onClick={() => setShowCreate(true)}
                className="btn btn-primary btn-sm"
                style={{ gap: '0.375rem' }}
              >
                <Plus size={15} />
                New Entry
              </button>
            </div>
          </div>
        </div>

        {/* Balance summary */}
        <div style={{ padding: '1.5rem', maxWidth: '720px', margin: '0 auto', width: '100%' }}>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{
              padding: '1.5rem',
              borderRadius: 'var(--radius-xl)',
              background: settled
                ? 'var(--bg-elevated)'
                : willGet
                ? 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.03))'
                : 'linear-gradient(135deg, rgba(244,63,94,0.08), rgba(244,63,94,0.03))',
              border: `1px solid ${
                settled
                  ? 'var(--border-default)'
                  : willGet
                  ? 'var(--success-border)'
                  : 'var(--danger-border)'
              }`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <p
                className="text-label"
                style={{
                  marginBottom: '0.375rem',
                  color: settled
                    ? 'var(--text-muted)'
                    : willGet
                    ? 'var(--success)'
                    : 'var(--danger)',
                }}
              >
                {settled ? 'All Settled' : willGet ? 'You Will Get' : 'You Will Give'}
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '1.125rem',
                    color: settled
                      ? 'var(--text-muted)'
                      : willGet
                      ? 'var(--success)'
                      : 'var(--danger)',
                    opacity: 0.8,
                  }}
                >
                  ₹
                </span>
                <AnimatedCounter
                  value={Math.abs(netBalance)}
                  duration={1.2}
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 'clamp(1.75rem, 5vw, 2.5rem)',
                    fontWeight: 800,
                    letterSpacing: '-0.04em',
                    color: settled
                      ? 'var(--text-muted)'
                      : willGet
                      ? 'var(--success)'
                      : 'var(--danger)',
                  }}
                  formatFn={(v) =>
                    new Intl.NumberFormat('en-IN').format(Math.round(v))
                  }
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <span
                className={`badge ${
                  settled
                    ? 'badge-info'
                    : willGet
                    ? 'badge-accepted'
                    : 'badge-rejected'
                }`}
              >
                {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
              </span>
              <span className="badge badge-pending">
                {transactions.filter((t) => t.status === 'pending').length} pending
              </span>
            </div>
          </motion.div>
        </div>

        {/* Disconnected Alert Banner */}
        {isDisconnected && (
          <div style={{ padding: '0 1.5rem', maxWidth: '720px', margin: '0 auto 1.5rem', width: '100%' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.875rem 1rem',
                borderRadius: '12px',
                background: 'rgba(239,68,68,0.06)',
                border: '1px solid rgba(239,68,68,0.15)',
                color: 'var(--danger)',
                fontSize: '0.875rem',
              }}
            >
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <span>
                <strong>Connection Disconnected.</strong> {peer.name} has removed this ledger. New entries you add will be accepted automatically.
              </span>
            </div>
          </div>
        )}

        {/* Timeline */}
        <div
          className="card"
          style={{
            maxWidth: '720px',
            margin: '0 1.5rem 2rem',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '1rem 1.5rem',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <h2
              style={{
                fontSize: '0.9375rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              Transaction History
            </h2>
            <span className="text-label">
              {transactions.length} entries
            </span>
          </div>

          <LedgerTimeline
            transactions={transactions}
            currentUserId={currentUserId}
            connectionId={connectionId}
          />
        </div>
      </div>

      {/* Create sheet */}
      <AnimatePresence>
        {showCreate && (
          <CreateTransactionSheet
            connectionId={connectionId}
            peerName={peer.name}
            onClose={() => setShowCreate(false)}
            onSuccess={handleSuccess}
          />
        )}
      </AnimatePresence>

      {/* Delete confirmation sheet */}
      <AnimatePresence>
        {showDelete && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDeleting && setShowDelete(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 60 }}
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 340 }}
              style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'var(--bg-surface)',
                borderTop: '1px solid var(--border-subtle)',
                borderRadius: '20px 20px 0 0',
                padding: '1.5rem 1.5rem calc(2rem + env(safe-area-inset-bottom, 0px))',
                zIndex: 61,
                maxWidth: '560px',
                margin: '0 auto',
              }}
            >
              {/* Drag handle */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <div style={{ width: 40, height: 4, borderRadius: 9999, background: 'var(--border-default)' }} />
              </div>

              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '12px',
                      background: peer.isPersonal ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.1)',
                      border: `1px solid ${peer.isPersonal ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {peer.isPersonal
                      ? <Trash2 size={20} color="var(--danger)" />
                      : <AlertTriangle size={20} color="#f59e0b" />}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>
                      {peer.isPersonal ? 'Delete Contact?' : 'Remove Ledger?'}
                    </h3>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      {peer.name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDelete(false)}
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '8px', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}
                >
                  <X size={15} />
                </button>
              </div>

              {/* Warning message */}
              <div
                style={{
                  padding: '1rem',
                  borderRadius: '12px',
                  background: peer.isPersonal ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)',
                  border: `1px solid ${peer.isPersonal ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`,
                  marginBottom: '1.5rem',
                  fontSize: '0.875rem',
                  lineHeight: 1.6,
                  color: 'var(--text-secondary)',
                }}
              >
                {peer.isPersonal ? (
                  <>
                    <strong style={{ color: 'var(--danger)', display: 'block', marginBottom: '0.375rem' }}>⚠️ This is permanent and cannot be undone.</strong>
                    All transactions with <strong>{peer.name}</strong> will be permanently deleted. You will lose all history.
                  </>
                ) : (
                  <>
                    <strong style={{ color: '#f59e0b', display: 'block', marginBottom: '0.375rem' }}>Your history is preserved.</strong>
                    This ledger will be removed from <strong>your</strong> view only. <strong>{peer.name}</strong> will still see their full history.
                    If you reconnect in the future, you can continue from where you left off.
                  </>
                )}
              </div>

              {/* Error */}
              <AnimatePresence>
                {deleteError && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ padding: '0.75rem 1rem', background: 'var(--danger-muted)', border: '1px solid var(--danger-border)', borderRadius: '8px', fontSize: '0.875rem', color: 'var(--danger)', marginBottom: '1rem' }}
                  >
                    {deleteError}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => setShowDelete(false)}
                  disabled={isDeleting}
                  className="btn btn-ghost"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  Cancel
                </button>
                <motion.button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  whileHover={{ scale: isDeleting ? 1 : 1.02 }}
                  whileTap={{ scale: isDeleting ? 1 : 0.98 }}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.25rem',
                    borderRadius: '10px',
                    border: 'none',
                    cursor: isDeleting ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    fontSize: '0.9375rem',
                    opacity: isDeleting ? 0.7 : 1,
                    background: peer.isPersonal
                      ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                      : 'linear-gradient(135deg, #f59e0b, #d97706)',
                    color: 'white',
                    boxShadow: peer.isPersonal
                      ? '0 4px 14px rgba(239,68,68,0.35)'
                      : '0 4px 14px rgba(245,158,11,0.35)',
                    transition: 'opacity 0.15s',
                  }}
                >
                  {isDeleting ? (
                    <>
                      <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                      {peer.isPersonal ? 'Deleting...' : 'Removing...'}
                    </>
                  ) : (
                    <>
                      {peer.isPersonal ? <Trash2 size={15} /> : <AlertTriangle size={15} />}
                      {peer.isPersonal ? 'Delete Permanently' : 'Remove from My View'}
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile FAB */}
      <motion.button
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setShowCreate(true)}
        style={{
          position: 'fixed',
          bottom: 'calc(var(--bottomnav-height) + env(safe-area-inset-bottom, 0px) + 1rem)',
          right: '1.25rem',
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          border: 'none',
          display: 'none',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(99,102,241,0.5)',
          zIndex: 40,
          color: 'white',
        }}
        className="mobile-fab"
      >
        <Plus size={22} />
      </motion.button>

      <style>{`
        @media (max-width: 768px) {
          .mobile-fab { display: flex !important; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
