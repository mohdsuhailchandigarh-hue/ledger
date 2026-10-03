'use client';

import { useState, useTransition, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LedgerTimeline from '@/components/ledger/LedgerTimeline';
import CreateTransactionSheet from '@/components/ledger/CreateTransactionSheet';
import AnimatedCounter from '@/components/motion/AnimatedCounter';
import { Plus, ArrowLeft, Trash2, AlertTriangle, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { deleteLedgerAction } from '@/lib/actions/connection.actions';
import { loadMoreTransactionsAction } from '@/lib/actions/transaction.actions';

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
  peer: { id: string; name: string; username: string; avatar_url?: string | null; isPersonal?: boolean };
  currentUserId: string;
  transactions: Transaction[];
  netBalance: number;
  isDisconnected?: boolean;
  initialHasMore?: boolean;
  onBack?: () => void;
  onRefresh?: () => void | Promise<void>;
};

export default function LedgerClient({
  connectionId,
  peer,
  currentUserId,
  transactions,
  netBalance,
  isDisconnected = false,
  initialHasMore,
  onBack,
  onRefresh,
}: Props) {
  const [items, setItems] = useState<Transaction[]>(transactions);
  const [hasMore, setHasMore] = useState(initialHasMore ?? (transactions.length >= 50));
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    setItems(transactions);
    setHasMore(initialHasMore ?? (transactions.length >= 50));
  }, [transactions, initialHasMore]);

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const res = await loadMoreTransactionsAction(connectionId, items.length, 50);
      if (res && res.transactions && res.transactions.length > 0) {
        setItems((prev) => {
          const existingIds = new Set(prev.map((t) => t.id));
          const newEntries = res.transactions.filter((t) => !existingIds.has(t.id));
          return [...prev, ...newEntries];
        });
        setHasMore(res.hasMore);
      } else {
        setHasMore(false);
      }
    } catch (e) {
      console.error('Failed to load more transactions:', e);
    } finally {
      setIsLoadingMore(false);
    }
  }, [connectionId, items.length, hasMore, isLoadingMore]);

  function handleSuccess() {
    setShowCreate(false);
    if (onRefresh) {
      startTransition(() => {
        void onRefresh();
      });
    } else {
      startTransition(() => router.refresh());
    }
  }

  function handleDelete() {
    setDeleteError(null);
    startDeleteTransition(async () => {
      const result = await deleteLedgerAction(connectionId);
      if (result.error) {
        setDeleteError(result.error);
      } else {
        if (onBack) {
          onBack();
        } else {
          router.push('/dashboard');
        }
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
          className="apple-glass-bar"
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 30,
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
                gap: '0.75rem',
                minWidth: 0,
              }}
            >
              <motion.button
                onClick={() => {
                  if (onBack) {
                    onBack();
                  } else if (typeof window !== 'undefined' && window.history.length > 1) {
                    router.back();
                  } else {
                    router.push('/dashboard');
                  }
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
                aria-label="Back"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 38,
                  height: 38,
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
                  color: '#ffffff',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s',
                  padding: 0,
                }}
              >
                <ArrowLeft size={18} strokeWidth={2.2} />
              </motion.button>

              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #065DE8, #3897f0)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  color: 'white',
                  flexShrink: 0,
                  overflow: 'hidden',
                }}
              >
                {peer.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={peer.avatar_url}
                    alt={peer.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: '50%' }}
                  />
                ) : (
                  peer.name.charAt(0).toUpperCase()
                )}
              </div>

              <div style={{ minWidth: 0 }}>
                <h1
                  style={{
                    fontSize: '0.9375rem',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    letterSpacing: '-0.015em',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    margin: 0,
                  }}
                >
                  {peer.name}
                  {peer.isPersonal && (
                    <span style={{ fontSize: '0.625rem', padding: '1px 6px', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em' }}>
                      Personal
                    </span>
                  )}
                </h1>
                <p
                  style={{
                    fontSize: '0.75rem',
                    color: isDisconnected ? 'var(--danger)' : 'rgba(255, 255, 255, 0.5)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    margin: '1px 0 0 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: isDisconnected
                        ? '#ef4444'
                        : peer.isPersonal
                        ? '#64748b'
                        : '#10b981',
                      display: 'inline-block',
                      boxShadow: isDisconnected
                        ? '0 0 6px rgba(239, 68, 68, 0.6)'
                        : peer.isPersonal
                        ? 'none'
                        : '0 0 6px rgba(16, 185, 129, 0.6)',
                      flexShrink: 0,
                    }}
                  />
                  <span>
                    {peer.isPersonal 
                      ? `${peer.username} · Offline` 
                      : isDisconnected 
                      ? `@${peer.username} · Disconnected` 
                      : `@${peer.username} · Shared Ledger`}
                  </span>
                </p>
              </div>
            </div>

            {/* Actions: High-visibility premium Delete button */}
            <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <motion.button
                onClick={() => { setDeleteError(null); setShowDelete(true); }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
                aria-label={peer.isPersonal ? 'Delete contact permanently' : 'Remove ledger'}
                title={peer.isPersonal ? 'Delete contact permanently' : 'Remove ledger'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 38,
                  height: 38,
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.12) 0%, rgba(225, 29, 72, 0.04) 100%)',
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                  boxShadow: '0 2px 10px rgba(244, 63, 94, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
                  color: '#fb7185',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s',
                  padding: 0,
                }}
              >
                <Trash2 size={17} strokeWidth={2} />
              </motion.button>
            </div>
          </div>
        </div>

        {/* Balance summary - Premium Centered Net Position Hero */}
        <div style={{ padding: 'clamp(0.75rem, 2.5vw, 1.25rem) clamp(0.75rem, 3vw, 1.25rem) 0.5rem', maxWidth: '720px', margin: '0 auto', width: '100%' }}>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: 'relative',
              overflow: 'hidden',
              padding: 'clamp(1.25rem, 4vw, 1.75rem) clamp(0.875rem, 3vw, 1.5rem)',
              borderRadius: '24px',
              background: settled
                ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, rgba(18, 18, 22, 0.9) 100%)'
                : willGet
                ? 'linear-gradient(180deg, rgba(16, 185, 129, 0.09) 0%, rgba(18, 18, 22, 0.9) 100%)'
                : 'linear-gradient(180deg, rgba(244, 63, 94, 0.09) 0%, rgba(18, 18, 22, 0.9) 100%)',
              border: `1px solid ${
                settled
                  ? 'rgba(255, 255, 255, 0.1)'
                  : willGet
                  ? 'rgba(16, 185, 129, 0.25)'
                  : 'rgba(244, 63, 94, 0.25)'
              }`,
              boxShadow: settled
                ? '0 12px 32px -8px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08)'
                : willGet
                ? '0 12px 36px -8px rgba(16, 185, 129, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                : '0 12px 36px -8px rgba(244, 63, 94, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            {/* Ambient backlight glow centered behind net position */}
            <div
              style={{
                position: 'absolute',
                top: '42%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 220,
                height: 90,
                borderRadius: '50%',
                background: settled
                  ? 'transparent'
                  : willGet
                  ? 'radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, transparent 70%)'
                  : 'radial-gradient(circle, rgba(244, 63, 94, 0.2) 0%, transparent 70%)',
                filter: 'blur(22px)',
                pointerEvents: 'none',
                zIndex: 0,
              }}
            />

            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
              {/* Centered Status Capsule Badge */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.3rem 0.85rem',
                  borderRadius: '9999px',
                  background: settled
                    ? 'rgba(255, 255, 255, 0.06)'
                    : willGet
                    ? 'rgba(16, 185, 129, 0.12)'
                    : 'rgba(244, 63, 94, 0.12)',
                  border: `1px solid ${
                    settled
                      ? 'rgba(255, 255, 255, 0.1)'
                      : willGet
                      ? 'rgba(16, 185, 129, 0.28)'
                      : 'rgba(244, 63, 94, 0.28)'
                  }`,
                  marginBottom: '0.75rem',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: settled
                      ? '#94a3b8'
                      : willGet
                      ? '#10b981'
                      : '#f43f5e',
                    boxShadow: settled
                      ? 'none'
                      : willGet
                      ? '0 0 8px rgba(16, 185, 129, 0.7)'
                      : '0 0 8px rgba(244, 63, 94, 0.7)',
                    display: 'inline-block',
                  }}
                />
                <span
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: settled
                      ? 'var(--text-muted)'
                      : willGet
                      ? '#34d399'
                      : '#fb7185',
                  }}
                >
                  {settled ? 'All Settled Up' : willGet ? 'You Will Receive' : 'You Will Give'}
                </span>
              </div>

              {/* Centered Hero Amount */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'center',
                  gap: '4px',
                  marginBottom: '1rem',
                }}
              >
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', -apple-system, monospace",
                    fontSize: 'clamp(1.5rem, 5vw, 2rem)',
                    fontWeight: 600,
                    color: settled
                      ? 'var(--text-muted)'
                      : willGet
                      ? '#10b981'
                      : '#f43f5e',
                    opacity: 0.9,
                    lineHeight: 1,
                  }}
                >
                  ₹
                </span>
                <AnimatedCounter
                  value={Math.abs(netBalance)}
                  duration={1.2}
                  style={{
                    fontFamily: "'JetBrains Mono', -apple-system, monospace",
                    fontSize: 'clamp(2.5rem, 8.5vw, 3.5rem)',
                    fontWeight: 800,
                    letterSpacing: '-0.04em',
                    lineHeight: 1,
                    color: settled
                      ? 'var(--text-muted)'
                      : willGet
                      ? '#10b981'
                      : '#f43f5e',
                    textShadow: settled
                      ? 'none'
                      : willGet
                      ? '0 2px 24px rgba(16, 185, 129, 0.28)'
                      : '0 2px 24px rgba(244, 63, 94, 0.28)',
                  }}
                  formatFn={(v) =>
                    new Intl.NumberFormat('en-IN').format(Math.round(v))
                  }
                />
              </div>

              {/* Centered Pills: Entries & Status */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.625rem',
                  flexWrap: 'wrap',
                }}
              >
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.35rem 0.85rem',
                    borderRadius: '9999px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'rgba(255, 255, 255, 0.75)',
                    letterSpacing: '0.02em',
                  }}
                >
                  <span>{transactions.length}</span>
                  <span style={{ color: 'rgba(255, 255, 255, 0.45)' }}>
                    {transactions.length === 1 ? 'transaction' : 'transactions'}
                  </span>
                </div>

                {transactions.filter((t) => t.status === 'pending').length > 0 ? (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.35rem 0.85rem',
                      borderRadius: '9999px',
                      background: 'rgba(245, 158, 11, 0.1)',
                      border: '1px solid rgba(245, 158, 11, 0.28)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#fbbf24',
                      letterSpacing: '0.02em',
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: '#f59e0b',
                        boxShadow: '0 0 6px rgba(245, 158, 11, 0.8)',
                        display: 'inline-block',
                      }}
                    />
                    <span>
                      {transactions.filter((t) => t.status === 'pending').length} pending
                    </span>
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.35rem 0.85rem',
                      borderRadius: '9999px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      color: 'rgba(255, 255, 255, 0.45)',
                    }}
                  >
                    <span>0 pending</span>
                  </div>
                )}
              </div>
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

        {/* Timeline Card */}
        <div
          style={{
            maxWidth: '720px',
            width: 'calc(100% - clamp(1rem, 4vw, 2rem))',
            margin: '0 auto 6.5rem',
            overflow: 'hidden',
            borderRadius: '20px',
            background: 'linear-gradient(180deg, rgba(20, 20, 26, 0.75) 0%, rgba(14, 14, 18, 0.9) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
          }}
        >
          <div
            style={{
              padding: '1rem 1.25rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <h2
              style={{
                fontSize: '0.9375rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '-0.01em',
                margin: 0,
              }}
            >
              Transaction History
            </h2>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                color: 'rgba(255, 255, 255, 0.6)',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '2px 8px',
                borderRadius: '9999px',
              }}
            >
              {items.length} {items.length === 1 ? 'entry' : 'entries'}
            </span>
          </div>

          <LedgerTimeline
            transactions={items}
            currentUserId={currentUserId}
            connectionId={connectionId}
            netBalance={netBalance}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
            onLoadMore={handleLoadMore}
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

      {/* Floating Action Button (New Entry) */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => setShowCreate(true)}
        aria-label="New Entry"
        title="Add new entry"
        style={{
          position: 'fixed',
          bottom: 'max(1.5rem, calc(env(safe-area-inset-bottom, 0px) + 1.5rem))',
          right: '1.5rem',
          width: 54,
          height: 54,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #065DE8 0%, #3897f0 100%)',
          border: '1px solid rgba(255, 255, 255, 0.22)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 8px 24px -2px rgba(56, 151, 240, 0.55), 0 2px 8px rgba(0, 0, 0, 0.3)',
          zIndex: 40,
          color: 'white',
        }}
      >
        <Plus size={24} strokeWidth={2.4} />
      </motion.button>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
