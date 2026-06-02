'use client';

import { useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminForceTransactionAction } from '@/lib/actions/transaction.actions';
import { Check, X, Search, ArrowDownLeft, ArrowUpRight, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';

type Txn = {
  id: string;
  amount: number;
  direction: 'give' | 'get';
  note?: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  transaction_date?: string | null;
  creator: { name: string; username: string };
  counterparty: { name: string; username: string };
};

function formatTxnDate(dateStr: string | null | undefined, fallback: string): string {
  const raw = dateStr || fallback?.slice(0, 10);
  if (!raw) return '—';
  const [year, month, day] = raw.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return raw;
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

type Props = { transactions: Txn[]; total: number };

export default function AdminTransactionsClient({ transactions, total }: Props) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleForce(id: string, action: 'accepted' | 'rejected') {
    await adminForceTransactionAction(id, action);
    startTransition(() => router.refresh());
  }

  const filtered = transactions.filter((t) => {
    const matchStatus = filter === 'all' || t.status === filter;
    const matchSearch =
      !search ||
      t.creator?.name?.toLowerCase().includes(search.toLowerCase()) ||
      t.counterparty?.name?.toLowerCase().includes(search.toLowerCase()) ||
      t.note?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div style={{ padding: 'clamp(1.25rem, 3vw, 2rem)', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: 'clamp(1.375rem, 3vw, 1.75rem)', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
          All Transactions
        </h1>
        <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
          {total} total transactions · Force approve or reject pending entries
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input type="text" className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." style={{ paddingLeft: '2.5rem', height: 38 }} />
        </div>
        {(['all', 'pending', 'accepted', 'rejected'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`badge ${filter === f ? (f === 'pending' ? 'badge-pending' : f === 'accepted' ? 'badge-accepted' : f === 'rejected' ? 'badge-rejected' : 'badge-info') : ''}`}
            style={{ cursor: 'pointer', background: filter === f ? undefined : 'var(--bg-elevated)', color: filter === f ? undefined : 'var(--text-secondary)', border: filter === f ? undefined : '1px solid var(--border-subtle)', padding: '0.375rem 0.875rem', fontSize: '0.8125rem', borderRadius: '9999px' }}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {/* Desktop Table View */}
        <div className="desktop-table-view" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                {['From → To', 'Amount', 'Note', 'Status', 'Txn Date', 'Admin Actions'].map((h) => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((txn, i) => (
                <tr
                  key={txn.id}
                  style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border-subtle)' : 'none', transition: 'background 0.15s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '0.875rem 1rem' }}>
                    <div style={{ fontSize: '0.8125rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{txn.creator?.name}</span>
                      <span style={{ color: 'var(--text-muted)', margin: '0 0.375rem' }}>→</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{txn.counterparty?.name}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {txn.direction === 'get' ? '(Creator gets paid)' : '(Creator pays)'}
                    </div>
                  </td>
                  <td style={{ padding: '0.875rem 1rem' }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                      ₹{Number(txn.amount).toLocaleString('en-IN')}
                    </span>
                  </td>
                  <td style={{ padding: '0.875rem 1rem', fontSize: '0.8125rem', color: 'var(--text-secondary)', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {txn.note || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>}
                  </td>
                  <td style={{ padding: '0.875rem 1rem' }}>
                    <span className={`badge badge-${txn.status}`}>{txn.status}</span>
                  </td>
                  <td style={{ padding: '0.875rem 1rem', fontSize: '0.8125rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {formatTxnDate(txn.transaction_date, txn.created_at)}
                  </td>
                  <td style={{ padding: '0.875rem 1rem' }}>
                    {txn.status === 'pending' ? (
                      <div style={{ display: 'flex', gap: '0.375rem' }}>
                        <button
                          onClick={() => handleForce(txn.id, 'rejected')}
                          className="btn btn-danger btn-sm"
                          title="Force reject"
                          style={{ gap: '0.25rem' }}
                        >
                          <X size={12} /> Reject
                        </button>
                        <button
                          onClick={() => handleForce(txn.id, 'accepted')}
                          className="btn btn-success btn-sm"
                          title="Force approve"
                          style={{ gap: '0.25rem' }}
                        >
                          <Check size={12} /> Approve
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Resolved</span>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    No transactions found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List View */}
        <div className="mobile-list-view" style={{ display: 'flex', flexDirection: 'column' }}>
          {filtered.map((txn, i) => (
            <div
              key={txn.id}
              style={{
                padding: '1.25rem',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {txn.creator?.name} → {txn.counterparty?.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {txn.direction === 'get' ? '(Creator gets paid)' : '(Creator pays)'}
                  </div>
                </div>
                <span className={`badge badge-${txn.status}`} style={{ flexShrink: 0 }}>{txn.status}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '1rem', margin: '0.25rem 0' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {txn.note || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No note</span>}
                  </p>
                </div>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, fontSize: '1.125rem', color: 'var(--text-primary)', flexShrink: 0 }}>
                  ₹{Number(txn.amount).toLocaleString('en-IN')}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', marginTop: '0.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {formatTxnDate(txn.transaction_date, txn.created_at)}
                </span>

                <div>
                  {txn.status === 'pending' ? (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleForce(txn.id, 'rejected')}
                        className="btn btn-danger btn-sm"
                        style={{ height: '36px', padding: '0 0.75rem', gap: '0.375rem', fontSize: '0.8125rem' }}
                      >
                        <X size={13} /> Reject
                      </button>
                      <button
                        onClick={() => handleForce(txn.id, 'accepted')}
                        className="btn btn-success btn-sm"
                        style={{ height: '36px', padding: '0 0.75rem', gap: '0.375rem', fontSize: '0.8125rem' }}
                      >
                        <Check size={13} /> Approve
                      </button>
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Resolved</span>
                  )}
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              No transactions found
            </div>
          )}
        </div>
      </div>

      <style>{`
        .desktop-table-view { display: none; }
        .mobile-list-view { display: flex; }
        @media (min-width: 769px) {
          .desktop-table-view { display: block; }
          .mobile-list-view { display: none !important; }
        }
      `}</style>
    </div>
  );
}
