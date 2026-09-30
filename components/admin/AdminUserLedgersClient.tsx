'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Search, ArrowRight, User, Link2, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { formatAmount } from '@/lib/utils/currency';

type Peer = {
  id: string;
  name: string;
  username: string;
  phone?: string;
};

type ConnectionItem = {
  id: string;
  created_at: string;
  is_personal: boolean;
  peer: Peer;
  net_balance: number;
  transaction_count: number;
};

type UserInfo = {
  id: string;
  name: string;
  username: string;
  phone?: string | null;
  is_active: boolean;
};

type Props = {
  user: UserInfo;
  connections: ConnectionItem[];
};

export default function AdminUserLedgersClient({ user, connections }: Props) {
  const [search, setSearch] = useState('');

  // Calculations
  let totalReceivable = 0;
  let totalPayable = 0;
  connections.forEach((c) => {
    if (c.net_balance > 0) {
      totalReceivable += c.net_balance;
    } else if (c.net_balance < 0) {
      totalPayable += Math.abs(c.net_balance);
    }
  });
  const netPosition = totalReceivable - totalPayable;

  // Filter connections by Name, Username, Phone, Contact Name
  const filtered = connections.filter((conn) => {
    const q = search.toLowerCase();
    const peer = conn.peer;
    return (
      peer.name.toLowerCase().includes(q) ||
      peer.username.toLowerCase().includes(q) ||
      (peer.phone && peer.phone.includes(q))
    );
  });

  return (
    <div style={{ padding: 'clamp(1.25rem, 3vw, 2rem)', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Back to Users */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link
          href="/admin/users"
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
          <ArrowLeft size={16} /> Back to Users
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem',
                fontWeight: 700,
                color: 'white',
              }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1
                style={{
                  fontSize: 'clamp(1.375rem, 3vw, 1.75rem)',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.1,
                }}
              >
                {user.name}’s Ledgers
              </h1>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                @{user.username} • {user.phone || 'No phone'}
              </p>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className={`badge ${user.is_active ? 'badge-accepted' : 'badge-rejected'}`}>
            {user.is_active ? 'Active User' : 'Disabled User'}
          </span>
          <span className="badge badge-info" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
            Admin View
          </span>
        </div>
      </div>

      {/* Summary Header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        {/* Net Position */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <span className="text-label" style={{ display: 'block', marginBottom: '0.5rem' }}>Net Position</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '1rem', fontWeight: 600, color: netPosition > 0 ? 'var(--success)' : netPosition < 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
              ₹
            </span>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '1.75rem',
                fontWeight: 800,
                color: netPosition > 0 ? 'var(--success)' : netPosition < 0 ? 'var(--danger)' : 'var(--text-muted)',
              }}
            >
              {formatAmount(Math.abs(netPosition))}
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
            {netPosition > 0 ? 'Net Receivable' : netPosition < 0 ? 'Net Payable' : 'Fully Settled'}
          </span>
        </div>

        {/* Receivable */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <span className="text-label" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--success)' }}>Total Receivable</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '1rem', color: 'var(--success)', opacity: 0.8 }}>₹</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '1.75rem', fontWeight: 800, color: 'var(--success)' }}>
              {formatAmount(totalReceivable)}
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
            Across all positive balances
          </span>
        </div>

        {/* Payable */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <span className="text-label" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--danger)' }}>Total Payable</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '1rem', color: 'var(--danger)', opacity: 0.8 }}>₹</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '1.75rem', fontWeight: 800, color: 'var(--danger)' }}>
              {formatAmount(totalPayable)}
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
            Across all negative balances
          </span>
        </div>

        {/* Connections / Relationships */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <span className="text-label" style={{ display: 'block', marginBottom: '0.5rem' }}>Relationships</span>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {connections.length}
          </p>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
            {connections.filter(c => !c.is_personal).length} Platform • {connections.filter(c => c.is_personal).length} Personal
          </span>
        </div>
      </div>

      {/* Search Relationships */}
      <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
        <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
        <input
          type="text"
          className="input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search connections by name, username, or phone number..."
          style={{ paddingLeft: '2.75rem' }}
        />
      </div>

      {/* Connections List */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '3.5rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Link2 size={32} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
            <p style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--text-secondary)' }}>No relationships found</p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Try clearing your search or connect users to get started</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="desktop-table" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    {['Connection', 'Type', 'Net Balance', 'Transactions', 'Action'].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: '0.75rem 1.25rem',
                          textAlign: 'left',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: 'var(--text-muted)',
                          letterSpacing: '0.05em',
                          textTransform: 'uppercase',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((conn, i) => {
                    const isReceivable = conn.net_balance > 0;
                    const isPayable = conn.net_balance < 0;
                    const isSettled = conn.net_balance === 0;

                    return (
                      <tr
                        key={conn.id}
                        style={{
                          borderBottom: i < filtered.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        {/* Connection Peer Info */}
                        <td style={{ padding: '0.875rem 1.25rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                            <div
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: '9px',
                                background: conn.is_personal
                                  ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                                  : 'linear-gradient(135deg, #10b981, #059669)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: 'white',
                                flexShrink: 0,
                              }}
                            >
                              {conn.peer.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1px' }}>
                                {conn.peer.name}
                              </p>
                              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {conn.is_personal ? conn.peer.username : `@${conn.peer.username}`}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Connection Type */}
                        <td style={{ padding: '0.875rem 1.25rem' }}>
                          <span className={`badge ${conn.is_personal ? 'badge-warning' : 'badge-accepted'}`}>
                            {conn.is_personal ? 'Personal Contact' : 'Platform User'}
                          </span>
                        </td>

                        {/* Net Balance */}
                        <td style={{ padding: '0.875rem 1.25rem' }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                            <span
                              style={{
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: '0.8125rem',
                                fontWeight: 600,
                                color: isReceivable ? 'var(--success)' : isPayable ? 'var(--danger)' : 'var(--text-muted)',
                              }}
                            >
                              {isSettled ? '' : isReceivable ? '+' : '-'}₹
                            </span>
                            <span
                              style={{
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: '0.9375rem',
                                fontWeight: 700,
                                color: isReceivable ? 'var(--success)' : isPayable ? 'var(--danger)' : 'var(--text-muted)',
                              }}
                            >
                              {formatAmount(Math.abs(conn.net_balance))}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                            {isReceivable ? 'Receivable' : isPayable ? 'Payable' : 'Settled'}
                          </span>
                        </td>

                        {/* Transaction Count */}
                        <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.8125rem', color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}>
                          {conn.transaction_count} txn{conn.transaction_count !== 1 ? 's' : ''}
                        </td>

                        {/* Action Link */}
                        <td style={{ padding: '0.875rem 1.25rem' }}>
                          <Link
                            href={`/admin/users/${user.id}/ledgers/${conn.id}`}
                            className="btn btn-ghost btn-sm"
                            style={{ gap: '0.25rem', fontWeight: 600 }}
                          >
                            Open Ledger <ArrowRight size={13} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile List View */}
            <div className="mobile-list" style={{ display: 'none', flexDirection: 'column' }}>
              {filtered.map((conn, i) => {
                const isReceivable = conn.net_balance > 0;
                const isPayable = conn.net_balance < 0;

                return (
                  <div
                    key={conn.id}
                    style={{
                      padding: '1.25rem',
                      borderBottom: i < filtered.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem',
                    }}
                  >
                    {/* Header: Peer + Badge */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', minWidth: 0 }}>
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: '9px',
                            background: conn.is_personal
                              ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                              : 'linear-gradient(135deg, #10b981, #059669)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: 'white',
                            flexShrink: 0,
                          }}
                        >
                          {conn.peer.name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {conn.peer.name}
                          </p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {conn.is_personal ? conn.peer.username : `@${conn.peer.username}`}
                          </p>
                        </div>
                      </div>
                      <span className={`badge ${conn.is_personal ? 'badge-warning' : 'badge-accepted'}`} style={{ flexShrink: 0, fontSize: '0.625rem' }}>
                        {conn.is_personal ? 'Personal' : 'Platform'}
                      </span>
                    </div>

                    {/* Balance Info & Transaction Count */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'var(--bg-elevated)',
                        padding: '0.75rem 1rem',
                        borderRadius: '10px',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div>
                        <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Balance</span>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px', marginTop: '2px' }}>
                          <span
                            style={{
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              color: isReceivable ? 'var(--success)' : isPayable ? 'var(--danger)' : 'var(--text-muted)',
                            }}
                          >
                            {conn.net_balance === 0 ? '' : isReceivable ? '+' : '-'}₹
                          </span>
                          <span
                            style={{
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: '0.875rem',
                              fontWeight: 700,
                              color: isReceivable ? 'var(--success)' : isPayable ? 'var(--danger)' : 'var(--text-muted)',
                            }}
                          >
                            {formatAmount(Math.abs(conn.net_balance))}
                          </span>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.02em' }}>History</span>
                        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {conn.transaction_count} txn{conn.transaction_count !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>

                    {/* Open Button */}
                    <Link
                      href={`/admin/users/${user.id}/ledgers/${conn.id}`}
                      className="btn btn-secondary btn-sm"
                      style={{
                        height: '38px',
                        width: '100%',
                        justifyContent: 'center',
                        gap: '0.375rem',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <BookOpen size={14} /> Open Ledger History
                    </Link>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <style>{`
        .desktop-table { display: block; }
        .mobile-list { display: none !important; }
        @media (max-width: 768px) {
          .desktop-table { display: none; }
          .mobile-list { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
