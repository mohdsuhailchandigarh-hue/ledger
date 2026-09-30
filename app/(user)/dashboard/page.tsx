import { Metadata } from 'next';
import { getUserFromSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase/server';
<<<<<<< HEAD
import DashboardHero from '@/components/dashboard/DashboardHero';
import DashboardTopBar from '@/components/dashboard/DashboardTopBar';
import ConnectionGrid from '@/components/dashboard/ConnectionGrid';
import { getDashboardSummaryAction, getMonthlyFinancialSummaryAction } from '@/lib/actions/transaction.actions';
import DashboardPendingActions from '@/components/dashboard/DashboardPendingActions';
import { getPendingActionsAction } from '@/lib/actions/transaction.actions';
import MonthlyPnLCard from '@/components/dashboard/MonthlyPnLCard';
import AddConnectionCTA from '@/components/dashboard/AddConnectionCTA';
import InteractiveTouchAura from '@/components/dashboard/InteractiveTouchAura';
=======
import BalanceCard from '@/components/dashboard/BalanceCard';
import ConnectionGrid from '@/components/dashboard/ConnectionGrid';
import { getDashboardSummaryAction, getMonthlyFinancialSummaryAction } from '@/lib/actions/transaction.actions';
import { Activity } from 'lucide-react';

import DashboardPendingActions from '@/components/dashboard/DashboardPendingActions';
import { getPendingActionsAction } from '@/lib/actions/transaction.actions';
import MonthlyPnLCard from '@/components/dashboard/MonthlyPnLCard';
>>>>>>> 90955cf5404937548f44cc14d69b3374d37d4fde

export const metadata: Metadata = { title: 'Dashboard | Shared Ledger' };
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await getUserFromSession();
  if (!user) redirect('/login');

<<<<<<< HEAD
  const [summaryResult, platformConnsResult, personalConnsResult, balancesResult, pendingActionsResult, monthlyResult] = await Promise.all([
=======
  const [summaryResult, platformConnsResult, personalConnsResult, recentTxns, balancesResult, pendingActionsResult, monthlyResult] = await Promise.all([
>>>>>>> 90955cf5404937548f44cc14d69b3374d37d4fde
    getDashboardSummaryAction(),
    supabaseAdmin
      .from('connections')
      .select(`
        id, created_at, contact_name, contact_phone,
        user_a_id, user_b_id, deleted_by_a, deleted_by_b,
        user_a:users!connections_user_a_id_fkey(id, username, name, avatar_url),
        user_b:users!connections_user_b_id_fkey(id, username, name, avatar_url)
      `)
      .not('user_b_id', 'is', null)
      .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`),
    supabaseAdmin
      .from('connections')
      .select(`
        id, created_at, contact_name, contact_phone,
        user_a_id, user_b_id,
        user_a:users!connections_user_a_id_fkey(id, username, name, avatar_url),
        user_b:users!connections_user_b_id_fkey(id, username, name, avatar_url)
      `)
      .is('user_b_id', null)
      .eq('user_a_id', user.id),
    supabaseAdmin
<<<<<<< HEAD
=======
      .from('transactions')
      .select(`
        id, connection_id, amount, direction, note, status, created_at, transaction_date,
        creator:users!transactions_creator_id_fkey(id, name, username),
        counterparty:users!transactions_counterparty_id_fkey(id, name, username)
      `)
      .or(`creator_id.eq.${user.id},counterparty_id.eq.${user.id}`)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(8),
    supabaseAdmin
>>>>>>> 90955cf5404937548f44cc14d69b3374d37d4fde
      .from('connection_balances')
      .select('*')
      .eq('user_id', user.id),
    getPendingActionsAction(),
    getMonthlyFinancialSummaryAction(),
  ]);

  const summary = summaryResult;
  let platformConns: any[] = [];
  let personalConns: any[] = [];

  if (platformConnsResult.error && (platformConnsResult.error.code === '42703' || platformConnsResult.error.code === 'PGRST204')) {
    const fallbackPlatformResult = await supabaseAdmin
      .from('connections')
      .select(`
        id, created_at, user_a_id, user_b_id,
        user_a:users!connections_user_a_id_fkey(id, username, name, avatar_url),
        user_b:users!connections_user_b_id_fkey(id, username, name, avatar_url)
      `)
      .not('user_b_id', 'is', null)
      .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`);

    platformConns = fallbackPlatformResult.data ?? [];
  } else {
    // Filter out rows where this user has soft-deleted their side
    const rawPlatform = (platformConnsResult.data ?? []) as any[];
    platformConns = rawPlatform.filter((c) => {
      if (c.user_a_id === user.id) return !c.deleted_by_a;
      if (c.user_b_id === user.id) return !c.deleted_by_b;
      return true;
    });
    personalConns = (personalConnsResult.data ?? []) as any[];
  }

  const connections = [...platformConns, ...personalConns].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
<<<<<<< HEAD
=======
  const deletedConnectionIds = new Set(
    (platformConnsResult.data ?? [])
      .filter((c) => (c.user_a_id === user.id ? c.deleted_by_a : c.deleted_by_b))
      .map((c) => c.id)
  );
  const transactions = ((recentTxns.data ?? []) as any[]).filter(
    (txn) => !deletedConnectionIds.has(txn.connection_id)
  );
>>>>>>> 90955cf5404937548f44cc14d69b3374d37d4fde
  const balanceMap: Record<string, number> = {};
  for (const b of (balancesResult.data ?? [])) {
    balanceMap[b.connection_id] = Number(b.net_amount);
  }
  const pendingActions = pendingActionsResult.actions as any[];

  const monthlyGet  = 'monthlyGet'  in monthlyResult ? (monthlyResult.monthlyGet  as number) : 0;
  const monthlyGive = 'monthlyGive' in monthlyResult ? (monthlyResult.monthlyGive as number) : 0;
<<<<<<< HEAD
  const monthlyNet  = monthlyGet - monthlyGive;
  const now = new Date();
  const monthLabel = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const netAmount = 'netPosition' in summary ? (summary.netPosition as number) : 0;
  const isPositive = netAmount > 0;
  const isNegative = netAmount < 0;

  return (
    <>
      {/* Permanent Fixed/Sticky Top Bar attached flush to top with Windows 11 acrylic blur */}
      <DashboardTopBar
        userName={user.name}
        userUsername={user.username}
        greeting={getGreeting()}
        pendingActions={pendingActions.length}
        netPosition={netAmount}
        monthlyNet={monthlyNet}
      />

      {/* Dynamic Interactive Touch/Click/Swipe/Scroll 3s Ambient Color Tint Canvas */}
      <InteractiveTouchAura netPosition={netAmount} />

      {/* Subtle Ambient Atmosphere in Bottom Section (Zero cutting edges, continuous soft tint) */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100vw',
          height: '45vh',
          pointerEvents: 'none',
          zIndex: 0,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: isPositive
              ? 'radial-gradient(ellipse 100% 70% at 50% 100%, rgba(16, 185, 129, 0.11) 0%, rgba(16, 185, 129, 0.035) 45%, transparent 75%)'
              : isNegative
              ? 'radial-gradient(ellipse 100% 70% at 50% 100%, rgba(244, 63, 94, 0.11) 0%, rgba(244, 63, 94, 0.035) 45%, transparent 75%)'
              : 'radial-gradient(ellipse 100% 70% at 50% 100%, rgba(99, 102, 241, 0.09) 0%, rgba(99, 102, 241, 0.025) 45%, transparent 75%)',
          }}
        />
      </div>

      <div style={{ padding: '0 clamp(0.875rem, 2.5vw, 2rem) 4rem', maxWidth: '1400px', width: '100%', boxSizing: 'border-box', margin: '0 auto' }}>
        {/* Unified Hero: Ambient Net Position + Get/Give Breakdown */}
        <DashboardHero
=======
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
>>>>>>> 90955cf5404937548f44cc14d69b3374d37d4fde
          totalGet={'totalGet' in summary ? (summary.totalGet as number) : 0}
          totalGive={'totalGive' in summary ? (summary.totalGive as number) : 0}
          netPosition={'netPosition' in summary ? (summary.netPosition as number) : 0}
          pendingActions={'pendingActions' in summary ? (summary.pendingActions as number) : 0}
        />
<<<<<<< HEAD

      {/* Monthly P&L Summary (Desktop Only) */}
      <div className="desktop-only" style={{ marginBottom: '1.5rem' }}>
        <MonthlyPnLCard
          monthlyGet={monthlyGet}
          monthlyGive={monthlyGive}
          monthLabel={monthLabel}
        />
      </div>

      {/* Main accounts content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative', zIndex: 10 }}>
        <DashboardPendingActions actions={pendingActions} currentUserId={user.id} />
        
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '0.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h2
              style={{
                fontSize: '0.9375rem',
=======
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
>>>>>>> 90955cf5404937548f44cc14d69b3374d37d4fde
                fontWeight: 600,
                color: 'var(--text-primary)',
                letterSpacing: '-0.01em',
              }}
            >
<<<<<<< HEAD
              Accounts &amp; Connections
            </h2>
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: '9999px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)',
              }}
            >
              {connections.length}
            </span>
          </div>
          <a
            href="/connections"
            className="desktop-only"
            style={{
              fontSize: '0.8125rem',
              color: 'var(--accent-primary)',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            Manage all →
          </a>
        </div>

        <ConnectionGrid
          connections={connections}
          currentUserId={user.id}
          balances={balanceMap}
        />
      </div>

      {/* Floating Add Connection CTA */}
      <AddConnectionCTA currentUserId={user.id} />
    </div>
    </>
=======
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
>>>>>>> 90955cf5404937548f44cc14d69b3374d37d4fde
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

<<<<<<< HEAD
=======
function formatTxnDate(dateStr: string | null | undefined, fallback: string): string {
  const raw = dateStr || fallback?.slice(0, 10);
  if (!raw) return '—';
  const [year, month, day] = raw.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return raw;
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

>>>>>>> 90955cf5404937548f44cc14d69b3374d37d4fde
