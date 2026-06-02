'use client';

import { useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LedgerTimeline from '@/components/ledger/LedgerTimeline';
import CreateTransactionSheet from '@/components/ledger/CreateTransactionSheet';
import AnimatedCounter from '@/components/motion/AnimatedCounter';
import { Plus, ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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
};

export default function LedgerClient({
  connectionId,
  peer,
  currentUserId,
  transactions,
  netBalance,
}: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSuccess() {
    setShowCreate(false);
    startTransition(() => router.refresh());
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
                    color: 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {peer.isPersonal ? `${peer.username} · Offline Ledger` : `@${peer.username} · Shared Ledger`}
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
