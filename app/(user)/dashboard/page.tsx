import { Metadata } from 'next';
import { getUserFromSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase/server';
import BalanceCard from '@/components/dashboard/BalanceCard';
import ConnectionGrid from '@/components/dashboard/ConnectionGrid';
import { getDashboardSummaryAction, getMonthlyFinancialSummaryAction } from '@/lib/actions/transaction.actions';
import { Activity } from 'lucide-react';

import DashboardPendingActions from '@/components/dashboard/DashboardPendingActions';
import { getPendingActionsAction } from '@/lib/actions/transaction.actions';
import MonthlyPnLCard from '@/components/dashboard/MonthlyPnLCard';

export const metadata: Metadata = { title: 'Dashboard | Shared Ledger' };
export const revalidate = 30;

export default async function DashboardPage() {
  const user = await getUserFromSession();
  if (!user) redirect('/login');

  const [summaryResult, platformConnsResult, personalConnsResult, recentTxns, balancesResult, pendingActionsResult, monthlyResult] = await Promise.all([
    getDashboardSummaryAction(),
    supabaseAdmin
      .from('connections')
      .select(`
        id, created_at, contact_name, contact_phone,
        user_a:users!connections_user_a_id_fkey(id, username, name, avatar_url),
        user_b:users!connections_user_b_id_fkey(id, username, name, avatar_url)
      `)
      .not('user_b_id', 'is', null)
      .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`),
    supabaseAdmin
      .from('connections')
      .select(`
        id, created_at, contact_name, contact_phone,
        user_a:users!connections_user_a_id_fkey(id, username, name, avatar_url),
        user_b:users!connections_user_b_id_fkey(id, username, name, avatar_url)
      `)
      .is('user_b_id', null)
      .eq('user_a_id', user.id),
    supabaseAdmin
      .from('transactions')
      .select(`
        id, amount, direction, note, status, created_at, transaction_date,
        creator:users!transactions_creator_id_fkey(id, name, username),
        counterparty:users!transactions_counterparty_id_fkey(id, name, username)
      `)
      .or(`creator_id.eq.${user.id},counterparty_id.eq.${user.id}`)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(8),
    supabaseAdmin
      .from('connection_balances')
      .select('*')
      .eq('user_id', user.id),
    getPendingActionsAction(),
    getMonthlyFinancialSummaryAction(),
  ]);

  const summary = summaryResult;
  let platformConns: any[] = [];
  let personalConns: any[] = [];

  if (platformConnsResult.error && platformConnsResult.error.code === '42703') {
    const fallbackPlatformResult = await supabaseAdmin
      .from('connections')
      .select(`
        id, created_at,
        user_a:users!connections_user_a_id_fkey(id, username, name, avatar_url),
        user_b:users!connections_user_b_id_fkey(id, username, name, avatar_url)
      `)
      .not('user_b_id', 'is', null)
      .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`);
      
    platformConns = fallbackPlatformResult.data ?? [];
  } else {
    platformConns = (platformConnsResult.data ?? []) as any[];
    personalConns = (personalConnsResult.data ?? []) as any[];
  }

  const connections = [...platformConns, ...personalConns].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const transactions = (recentTxns.data ?? []) as any[];
  const balanceMap: Record<string, number> = {};
  for (const b of (balancesResult.data ?? [])) {
    balanceMap[b.connection_id] = Number(b.net_amount);
  }
  const pendingActions = pendingActionsResult.actions as any[];

  const monthlyGet  = 'monthlyGet'  in monthlyResult ? (monthlyResult.monthlyGet  as number) : 0;
  const monthlyGive = 'monthlyGive' in monthlyResult ? (monthlyResult.monthlyGive as number) : 0;
  const now = new Date();
  const monthLabel = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <div style={{ padding: 'clamp(1.25rem, 3vw, 2rem)', maxWidth: '1400px', margin: '0 auto' }}>
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
          Good {getGreeting()}, {user.name.split(' ')[0]} 👋
        </h1>
        <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
          Here&apos;s your financial overview
        </p>
      </div>

      {/* Monthly P&L Summary */}
      <MonthlyPnLCard
        monthlyGet={monthlyGet}
        monthlyGive={monthlyGive}
        monthLabel={monthLabel}
      />

      {/* Balance Cards */}
      <div style={{ marginBottom: '2rem' }}>
        <BalanceCard
          totalGet={'totalGet' in summary ? (summary.totalGet as number) : 0}
          totalGive={'totalGive' in summary ? (summary.totalGive as number) : 0}
          netPosition={'netPosition' in summary ? (summary.netPosition as number) : 0}
          pendingActions={'pendingActions' in summary ? (summary.pendingActions as number) : 0}
        />
      </div>

      {/* Main grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '1.5rem',
          alignItems: 'start',
        }}
        className="dashboard-grid"
      >
        {/* Left Column (Connections & Pending Actions) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <DashboardPendingActions actions={pendingActions} currentUserId={user.id} />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem',
            }}
          >
            <h2
              style={{
                fontSize: '1rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                letterSpacing: '-0.01em',
              }}
            >
              Connections
            </h2>
            <a
              href="/connections"
              style={{
                fontSize: '0.8125rem',
                color: 'var(--accent-primary)',
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              View all
            </a>
          </div>
          <ConnectionGrid
            connections={connections}
            currentUserId={user.id}
            balances={balanceMap}
          />
        </div>

        {/* Recent Activity */}
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1rem',
            }}
          >
            <Activity size={16} color="var(--text-muted)" />
            <h2
              style={{
                fontSize: '1rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                letterSpacing: '-0.01em',
              }}
            >
              Recent Activity
            </h2>
          </div>

          <div
            className="card"
            style={{ overflow: 'hidden' }}
          >
            {transactions.length === 0 ? (
              <div
                style={{
                  padding: '2rem',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.875rem',
                }}
              >
                No transactions yet
              </div>
            ) : (
              transactions.map((txn, i) => {
                const isCreator = txn.creator?.id === user.id;
                const peer = isCreator ? txn.counterparty : txn.creator;
                const willGet = isCreator
                  ? txn.direction === 'get'
                  : txn.direction === 'give';

                return (
                  <div
                    key={txn.id}
                    className="hover-bg-elevated"
                    style={{
                      padding: '0.875rem 1.25rem',
                      borderBottom:
                        i < transactions.length - 1
                          ? '1px solid var(--border-subtle)'
                          : 'none',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: '0.8125rem',
                          fontWeight: 500,
                          color: 'var(--text-primary)',
                          marginBottom: '2px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {peer?.name ?? 'Unknown'}
                      </div>
                       <div
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.375rem',
                        }}
                      >
                        {formatTxnDate(txn.transaction_date, txn.created_at)}
                      </div>
                    </div>

                    <div
                      style={{
                        textAlign: 'right',
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontWeight: 700,
                          fontSize: '0.875rem',
                          color: willGet
                            ? 'var(--success)'
                            : 'var(--danger)',
                          marginBottom: '2px',
                        }}
                      >
                        {willGet ? '+' : '-'}₹
                        {Number(txn.amount).toLocaleString('en-IN')}
                      </div>
                      <span
                        className={`badge badge-${txn.status}`}
                        style={{ fontSize: '0.5625rem' }}
                      >
                        {txn.status}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (min-width: 901px) {
          .dashboard-grid {
            grid-template-columns: minmax(0, 1fr) 320px !important;
          }
        }
      `}</style>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function formatTxnDate(dateStr: string | null | undefined, fallback: string): string {
  const raw = dateStr || fallback?.slice(0, 10);
  if (!raw) return '—';
  const [year, month, day] = raw.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return raw;
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

