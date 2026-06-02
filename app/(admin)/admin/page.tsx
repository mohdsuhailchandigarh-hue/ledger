import { Metadata } from 'next';
import Link from 'next/link';
import { adminGetAnalyticsAction } from '@/lib/actions/admin.actions';
import { supabaseAdmin } from '@/lib/supabase/server';
import { formatAmount } from '@/lib/utils/currency';
import { Users, Link2, Receipt, Clock, TrendingUp, AlertCircle } from 'lucide-react';

export const metadata: Metadata = { title: 'Admin Overview | Shared Ledger' };
export const revalidate = 60;

export default async function AdminDashboard() {
  const [analytics, recentUsers, recentTxns] = await Promise.all([
    adminGetAnalyticsAction(),
    supabaseAdmin
      .from('users')
      .select('id, username, name, is_active, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
    supabaseAdmin
      .from('transactions')
      .select(`
        id, amount, direction, status, created_at, note,
        creator:users!transactions_creator_id_fkey(name, username),
        counterparty:users!transactions_counterparty_id_fkey(name, username)
      `)
      .order('created_at', { ascending: false })
      .limit(8),
  ]);

  const stats = [
    {
      label: 'Total Users',
      value: analytics.totalUsers,
      icon: Users,
      color: '#6366f1',
      bg: 'rgba(99,102,241,0.1)',
      border: 'rgba(99,102,241,0.2)',
      format: (v: number) => v.toString(),
    },
    {
      label: 'Connections',
      value: analytics.totalConnections,
      icon: Link2,
      color: '#10b981',
      bg: 'rgba(16,185,129,0.1)',
      border: 'rgba(16,185,129,0.2)',
      format: (v: number) => v.toString(),
    },
    {
      label: 'Transactions',
      value: analytics.totalTransactions,
      icon: Receipt,
      color: '#3b82f6',
      bg: 'rgba(59,130,246,0.1)',
      border: 'rgba(59,130,246,0.2)',
      format: (v: number) => v.toString(),
    },
    {
      label: 'Pending',
      value: analytics.pendingTransactions,
      icon: Clock,
      color: '#f59e0b',
      bg: 'rgba(245,158,11,0.1)',
      border: 'rgba(245,158,11,0.2)',
      format: (v: number) => v.toString(),
    },
    {
      label: 'Total Volume',
      value: analytics.totalVolume,
      icon: TrendingUp,
      color: '#8b5cf6',
      bg: 'rgba(139,92,246,0.1)',
      border: 'rgba(139,92,246,0.2)',
      format: (v: number) => formatAmount(v),
    },
  ];

  return (
    <div style={{ padding: 'clamp(1.25rem, 3vw, 2rem)', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1
          style={{
            fontSize: 'clamp(1.375rem, 3vw, 1.75rem)',
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
            marginBottom: '0.25rem',
          }}
        >
          Admin Overview
        </h1>
        <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
          Platform-wide financial activity and user management
        </p>
      </div>

      {/* Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className="card animate-slide-up"
            style={{
              padding: '1.375rem',
              animationDelay: `${i * 60}ms`,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem',
              }}
            >
              <span className="text-label">{stat.label}</span>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '9px',
                  background: stat.bg,
                  border: `1px solid ${stat.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <stat.icon size={16} color={stat.color} />
              </div>
            </div>
            <p
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '1.75rem',
                fontWeight: 800,
                color: stat.color,
                letterSpacing: '-0.03em',
                lineHeight: 1,
              }}
            >
              {stat.format(stat.value)}
            </p>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '1.5rem',
          alignItems: 'start',
        }}
        className="admin-grid"
      >
        {/* Recent Users */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Recent Users
            </h2>
            <Link href="/admin/users" style={{ fontSize: '0.8125rem', color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 500 }}>
              Manage all →
            </Link>
          </div>
          <div className="card" style={{ overflow: 'hidden' }}>
            {(recentUsers.data ?? []).map((user: any, i: number) => (
              <div
                key={user.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.875rem 1.25rem',
                  borderBottom: i < (recentUsers.data?.length ?? 0) - 1 ? '1px solid var(--border-subtle)' : 'none',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: '9px',
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                      color: 'white',
                    }}
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1px' }}>
                      {user.name}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      @{user.username}
                    </p>
                  </div>
                </div>
                <span className={`badge ${user.is_active ? 'badge-accepted' : 'badge-rejected'}`}>
                  {user.is_active ? 'Active' : 'Disabled'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Transactions */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Recent Transactions
            </h2>
            <Link href="/admin/transactions" style={{ fontSize: '0.8125rem', color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 500 }}>
              View all →
            </Link>
          </div>
          <div className="card" style={{ overflow: 'hidden' }}>
            {(recentTxns.data ?? []).map((txn: any, i: number) => (
              <div
                key={txn.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.875rem 1.25rem',
                  borderBottom: i < (recentTxns.data?.length ?? 0) - 1 ? '1px solid var(--border-subtle)' : 'none',
                  gap: '0.75rem',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {txn.creator?.name} → {txn.counterparty?.name}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {txn.note || 'No note'}
                  </p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '2px' }}>
                    ₹{Number(txn.amount).toLocaleString('en-IN')}
                  </p>
                  <span className={`badge badge-${txn.status}`} style={{ fontSize: '0.5625rem' }}>
                    {txn.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (min-width: 901px) {
          .admin-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </div>
  );
}
