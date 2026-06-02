'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  MinusCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Database,
  Calendar,
  User,
  ShieldAlert,
  Info,
} from 'lucide-react';
import Link from 'next/link';
import { formatAmount } from '@/lib/utils/currency';

type UserMin = {
  id: string;
  name: string;
  username: string;
};

type Transaction = {
  id: string;
  amount: number;
  direction: 'give' | 'get';
  note?: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'canceled';
  created_at: string;
  updated_at: string;
  transaction_date?: string | null;
  creator_id: string;
  counterparty_id?: string | null;
  creator: UserMin;
  counterparty?: UserMin | null;
};

type ConnectionInfo = {
  id: string;
  user_a_id: string;
  user_b_id?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  created_at: string;
  user_a: UserMin & { phone?: string };
  user_b?: (UserMin & { phone?: string }) | null;
};

type Props = {
  userId: string;
  connection: ConnectionInfo;
  transactions: Transaction[];
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

export default function AdminLedgerTimelineClient({ userId, connection, transactions }: Props) {
  const [search, setSearch] = useState('');
  const [expandedTxn, setExpandedTxn] = useState<string | null>(null);

  // Subject User is the one whose perspective we are viewing (userId)
  const isUserA = connection.user_a_id === userId;
  const subjectUser = isUserA ? connection.user_a : (connection.user_b || connection.user_a);
  const isPersonal = connection.user_b_id === null;

  // Determine peer name/details
  let peerName = '';
  let peerUsername = '';
  if (isPersonal) {
    peerName = connection.contact_name || 'Contact';
    peerUsername = connection.contact_phone || 'Offline Contact';
  } else {
    const peer = isUserA ? connection.user_b : connection.user_a;
    peerName = peer?.name || '';
    peerUsername = peer?.username ? `@${peer.username}` : '';
  }

  // Calculate Running Balances (oldest to newest)
  const runningBalances: Record<string, number> = {};
  let currentRunning = 0;
  
  // Reverse transactions to compute running balances from oldest to newest
  const reversedTxns = [...transactions].reverse();
  reversedTxns.forEach((t) => {
    if (t.status === 'accepted') {
      const amt = Number(t.amount);
      if (t.creator_id === userId) {
        currentRunning += t.direction === 'get' ? amt : -amt;
      } else {
        currentRunning += t.direction === 'give' ? amt : -amt;
      }
    }
    runningBalances[t.id] = currentRunning;
  });

  // Calculate stats for this ledger (accepted only)
  let totalReceivable = 0;
  let totalPayable = 0;
  transactions.forEach((t) => {
    if (t.status === 'accepted') {
      const amt = Number(t.amount);
      let isGet = false;
      if (t.creator_id === userId) {
        isGet = t.direction === 'get';
      } else {
        isGet = t.direction === 'give';
      }

      if (isGet) {
        totalReceivable += amt;
      } else {
        totalPayable += amt;
      }
    }
  });
  const netPosition = totalReceivable - totalPayable;

  // Filter transactions by note, amount, date, status
  const filtered = transactions.filter((t) => {
    const q = search.toLowerCase();
    const note = t.note?.toLowerCase() || '';
    const amtStr = t.amount.toString();
    const dateStr = t.transaction_date || '';
    const status = t.status.toLowerCase();
    const creatorName = t.creator.name.toLowerCase();

    return (
      note.includes(q) ||
      amtStr.includes(q) ||
      dateStr.includes(q) ||
      status.includes(q) ||
      creatorName.includes(q)
    );
  });

  function formatLocalTime(isoStr: string) {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  }

  function formatTxnDateOnly(dateStr: string | null | undefined, fallback: string) {
    if (!dateStr) return formatLocalTime(fallback).split(',')[0];
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  return (
    <div style={{ padding: 'clamp(1.25rem, 3vw, 2rem)', maxWidth: '800px', margin: '0 auto' }}>
      {/* Back to User's Relationships */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link
          href={`/admin/users/${userId}/ledgers`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: 500,
            transition: 'color 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
        >
          <ArrowLeft size={16} /> Back to Relationships
        </Link>
      </div>

      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '1.5rem',
          flexWrap: 'wrap',
          marginBottom: '2rem',
        }}
      >
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Ledger Overview (Viewing as {subjectUser.name})
          </span>
          <h1
            style={{
              fontSize: 'clamp(1.25rem, 2.5vw, 1.5rem)',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              marginTop: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              flexWrap: 'wrap',
            }}
          >
            <span>{subjectUser.name}</span>
            <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>↔</span>
            <span>{peerName}</span>
          </h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Connection ID: <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', background: 'var(--bg-elevated)', padding: '2px 4px', borderRadius: '4px' }}>{connection.id}</code>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <span className={`badge ${isPersonal ? 'badge-warning' : 'badge-accepted'}`}>
            {isPersonal ? 'Personal Contact' : 'Platform User'}
          </span>
        </div>
      </div>

      {/* Stats Summary Card */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <div className="card" style={{ padding: '1.25rem' }}>
          <span className="text-label" style={{ display: 'block', marginBottom: '0.375rem' }}>Net Position</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.875rem', fontWeight: 600, color: netPosition > 0 ? 'var(--success)' : netPosition < 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
              ₹
            </span>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '1.5rem',
                fontWeight: 800,
                color: netPosition > 0 ? 'var(--success)' : netPosition < 0 ? 'var(--danger)' : 'var(--text-muted)',
              }}
            >
              {formatAmount(Math.abs(netPosition))}
            </span>
          </div>
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
            {netPosition > 0 ? 'Receivable' : netPosition < 0 ? 'Payable' : 'Settled'}
          </span>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <span className="text-label" style={{ display: 'block', marginBottom: '0.375rem', color: 'var(--success)' }}>Receivable</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.875rem', color: 'var(--success)', opacity: 0.8 }}>₹</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)' }}>
              {formatAmount(totalReceivable)}
            </span>
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <span className="text-label" style={{ display: 'block', marginBottom: '0.375rem', color: 'var(--danger)' }}>Payable</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.875rem', color: 'var(--danger)', opacity: 0.8 }}>₹</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '1.5rem', fontWeight: 800, color: 'var(--danger)' }}>
              {formatAmount(totalPayable)}
            </span>
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <span className="text-label" style={{ display: 'block', marginBottom: '0.375rem' }}>Transactions</span>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {transactions.length}
          </p>
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
            {transactions.filter(t => t.status === 'pending').length} pending
          </span>
        </div>
      </div>

      {/* Search Transactions */}
      <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
        <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
        <input
          type="text"
          className="input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search ledger entries by note, amount, creator..."
          style={{ paddingLeft: '2.75rem' }}
        />
      </div>

      {/* Ledger History List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        {filtered.length === 0 ? (
          <div className="card" style={{ padding: '3.5rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Info size={28} style={{ opacity: 0.3, marginBottom: '0.5rem', margin: '0 auto 0.5rem' }} />
            <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>No transactions found</p>
            {search && <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Try clearing your search query</p>}
          </div>
        ) : (
          filtered.map((t) => {
            const isCreator = t.creator_id === userId;
            let willGet = false;
            if (isCreator) {
              willGet = t.direction === 'get';
            } else {
              willGet = t.direction === 'give';
            }

            const status = statusConfig[t.status];
            const isExpanded = expandedTxn === t.id;
            const tBal = runningBalances[t.id] ?? 0;

            return (
              <div
                key={t.id}
                className="card"
                style={{
                  padding: '1.25rem',
                  cursor: 'pointer',
                  border: isExpanded ? '1px solid var(--accent-primary)' : '1px solid var(--border-default)',
                  background: isExpanded ? 'var(--bg-elevated)' : 'var(--bg-surface)',
                  transition: 'all 0.2s ease',
                }}
                onClick={() => setExpandedTxn(isExpanded ? null : t.id)}
              >
                {/* Main Row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem' }}>
                  {/* Direction Indicator */}
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '10px',
                      background: willGet ? 'var(--success-muted)' : 'var(--danger-muted)',
                      border: `1px solid ${willGet ? 'var(--success-border)' : 'var(--danger-border)'}`,
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

                  {/* Transaction Metadata */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t.note || 'No note'}
                      </p>
                      <p
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: '1rem',
                          fontWeight: 700,
                          color: willGet ? 'var(--success)' : 'var(--danger)',
                          flexShrink: 0,
                        }}
                      >
                        {willGet ? '+' : '-'}₹{formatAmount(t.amount)}
                      </p>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem 0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span>{formatTxnDateOnly(t.transaction_date, t.created_at)}</span>
                      <span>•</span>
                      <span>By {t.creator_id === userId ? 'You' : t.creator.name}</span>
                      <span>•</span>
                      <span
                        style={{
                          color: status.color,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          fontWeight: 500,
                        }}
                      >
                        <status.icon size={11} />
                        {status.label}
                      </span>
                      {t.status === 'accepted' && (
                        <>
                          <span>•</span>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-secondary)' }}>
                            Bal: ₹{formatAmount(tBal)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Debug / Audit Info (Admin Override Visibility) */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div
                        style={{
                          marginTop: '1.25rem',
                          paddingTop: '1rem',
                          borderTop: '1px solid var(--border-subtle)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.75rem',
                        }}
                        onClick={(e) => e.stopPropagation()} // Prevent collapsing when clicking debug info
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--text-primary)', fontSize: '0.8125rem', fontWeight: 600 }}>
                          <Database size={13} color="var(--accent-primary)" />
                          <span>Admin Investigation Tools</span>
                        </div>

                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '0.75rem',
                            background: 'var(--bg-surface)',
                            padding: '0.875rem',
                            borderRadius: '8px',
                            border: '1px solid var(--border-subtle)',
                            fontSize: '0.8125rem',
                          }}
                        >
                          {/* Left Column */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div>
                              <span style={{ color: 'var(--text-muted)' }}>Transaction ID:</span>
                              <code style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '1px' }}>{t.id}</code>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-muted)' }}>Created At (Database Time):</span>
                              <span style={{ display: 'block', color: 'var(--text-secondary)', marginTop: '1px' }}>{formatLocalTime(t.created_at)}</span>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-muted)' }}>Transaction Date (Book Date):</span>
                              <span style={{ display: 'block', color: 'var(--text-secondary)', marginTop: '1px' }}>{t.transaction_date || 'Not set'}</span>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-muted)' }}>Created By:</span>
                              <span style={{ display: 'block', color: 'var(--text-secondary)', marginTop: '1px' }}>
                                {t.creator.name} (@{t.creator.username})
                              </span>
                            </div>
                          </div>

                          {/* Right Column */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div>
                              <span style={{ color: 'var(--text-muted)' }}>Relationship Type:</span>
                              <span style={{ display: 'block', color: 'var(--text-secondary)', marginTop: '1px' }}>
                                {isPersonal ? 'Personal Connection (Offline)' : 'Platform Connection (Shared)'}
                              </span>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-muted)' }}>Running Balance:</span>
                              <span style={{ display: 'block', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: tBal >= 0 ? 'var(--success)' : 'var(--danger)', marginTop: '1px' }}>
                                ₹{formatAmount(tBal)}
                              </span>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-muted)' }}>Approval Details:</span>
                              <span style={{ display: 'block', color: 'var(--text-secondary)', marginTop: '1px' }}>
                                {isPersonal
                                  ? 'Auto-approved (Personal Connection)'
                                  : t.status === 'accepted'
                                  ? `Approved by ${t.counterparty?.name || 'Counterparty'} on ${formatLocalTime(t.updated_at)}`
                                  : t.status === 'pending'
                                  ? `Awaiting approval from ${t.counterparty?.name || 'Counterparty'}`
                                  : 'Not approved'}
                              </span>
                            </div>
                            {(t.status === 'rejected' || t.status === 'canceled') && (
                              <div>
                                <span style={{ color: 'var(--text-muted)' }}>{t.status === 'rejected' ? 'Rejection' : 'Cancellation'} Details:</span>
                                <span style={{ display: 'block', color: 'var(--text-secondary)', marginTop: '1px' }}>
                                  {t.status === 'rejected'
                                    ? `Rejected by ${t.counterparty?.name || 'Counterparty'} on ${formatLocalTime(t.updated_at)}`
                                    : `Canceled by creator (${t.creator.name}) on ${formatLocalTime(t.updated_at)}`}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
