import React from 'react';
import { supabaseAdmin } from '@/lib/supabase/server';
import DashboardHero from '@/components/dashboard/DashboardHero';
import ConnectionGrid from '@/components/dashboard/ConnectionGrid';
import { getDashboardSummaryAction, getMonthlyFinancialSummaryAction } from '@/lib/actions/transaction.actions';
import { getPendingActionsAction } from '@/lib/actions/transaction.actions';
import MonthlyPnLCard from '@/components/dashboard/MonthlyPnLCard';
import AddConnectionCTA from '@/components/dashboard/AddConnectionCTA';

interface DashboardDataProps {
  user: {
    id: string;
    username: string;
    name: string;
    phone?: string | null;
    avatar_url?: string | null;
  };
}

export default async function DashboardData({ user }: DashboardDataProps) {
  const [
    summaryResult,
    platformConnsResult,
    personalConnsResult,
    balancesResult,
    pendingActionsResult,
    monthlyResult,
    recentTxnsResult,
  ] = await Promise.all([
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
      .from('connection_balances')
      .select('*')
      .eq('user_id', user.id),
    getPendingActionsAction(),
    getMonthlyFinancialSummaryAction(),
    supabaseAdmin
      .from('transactions')
      .select('id, connection_id, amount, direction, note, status, created_at, transaction_date, creator_id')
      .order('created_at', { ascending: false })
      .limit(300),
  ]);

  const summary = summaryResult;
  let platformConns: any[] = [];
  let personalConns: any[] = [];

  if (
    platformConnsResult.error &&
    (platformConnsResult.error.code === '42703' || platformConnsResult.error.code === 'PGRST204')
  ) {
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
    const rawPlatform = (platformConnsResult.data ?? []) as any[];
    platformConns = rawPlatform.filter((c) => {
      if (c.user_a_id === user.id) return !c.deleted_by_a;
      if (c.user_b_id === user.id) return !c.deleted_by_b;
      return true;
    });
    personalConns = (personalConnsResult.data ?? []) as any[];
  }

  // Find offline contacts created by other users matching this user's registered phone
  let unclaimedConns: any[] = [];
  if (user.phone) {
    const cleanDigits = user.phone.replace(/\D/g, '').slice(-10);
    if (cleanDigits.length === 10) {
      const { data: unclaimedData } = await supabaseAdmin
        .from('connections')
        .select(`
          id, created_at, contact_name, contact_phone,
          user_a_id, user_b_id,
          user_a:users!connections_user_a_id_fkey(id, username, name, avatar_url)
        `)
        .is('user_b_id', null)
        .neq('user_a_id', user.id)
        .or(`contact_phone.eq.${cleanDigits},contact_phone.eq.+91${cleanDigits},contact_phone.ilike.%${cleanDigits}`);

      if (unclaimedData && unclaimedData.length > 0) {
        const userAIds = unclaimedData.map((c) => c.user_a_id).filter(Boolean);
        const { data: reqs } = await supabaseAdmin
          .from('connection_requests')
          .select('id, status, from_user_id, to_user_id')
          .or(
            `and(from_user_id.eq.${user.id},to_user_id.in.(${userAIds.join(',')})),and(to_user_id.eq.${user.id},from_user_id.in.(${userAIds.join(',')}))`
          )
          .in('status', ['pending', 'accepted']);

        const reqMap: Record<string, { id: string; status: string; isFromMe: boolean }> = {};
        for (const r of (reqs || []) as any[]) {
          const otherId = r.from_user_id === user.id ? r.to_user_id : r.from_user_id;
          reqMap[otherId] = {
            id: r.id,
            status: r.status,
            isFromMe: r.from_user_id === user.id,
          };
        }

        unclaimedConns = unclaimedData.map((c) => ({
          ...c,
          isUnclaimedForMe: true,
          requestInfo: reqMap[c.user_a_id] || null,
        }));
      }
    }
  }

  // Build latest transaction preview map per connection
  const latestTxnMap: Record<
    string,
    {
      id: string;
      note?: string | null;
      amount: number;
      direction: 'give' | 'get';
      creator_id: string;
      created_at: string;
      transaction_date?: string | null;
      status: 'pending' | 'accepted' | 'rejected' | 'canceled';
    }
  > = {};

  for (const txn of ((recentTxnsResult?.data as any[]) ?? [])) {
    if (!latestTxnMap[txn.connection_id]) {
      latestTxnMap[txn.connection_id] = txn;
    } else if (txn.status === 'pending' && latestTxnMap[txn.connection_id].status !== 'pending') {
      latestTxnMap[txn.connection_id].status = 'pending';
    }
  }

  // Sort like WhatsApp: most recent message/activity bubbles to the top
  const connections = [...unclaimedConns, ...platformConns, ...personalConns].sort((a, b) => {
    if (a.isUnclaimedForMe && !b.isUnclaimedForMe) return -1;
    if (!a.isUnclaimedForMe && b.isUnclaimedForMe) return 1;
    const timeA = latestTxnMap[a.id]?.created_at || a.created_at;
    const timeB = latestTxnMap[b.id]?.created_at || b.created_at;
    return new Date(timeB).getTime() - new Date(timeA).getTime();
  });

  const balanceMap: Record<string, number> = {};
  for (const b of balancesResult.data ?? []) {
    balanceMap[b.connection_id] = Number(b.net_amount);
  }

  const monthlyGet = 'monthlyGet' in monthlyResult ? (monthlyResult.monthlyGet as number) : 0;
  const monthlyGive = 'monthlyGive' in monthlyResult ? (monthlyResult.monthlyGive as number) : 0;
  const now = new Date();
  const monthLabel = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const netAmount = 'netPosition' in summary ? (summary.netPosition as number) : 0;

  return (
    <>
      {/* Unified Hero: Ambient Net Position + Get/Give Breakdown */}
      <DashboardHero
        totalGet={'totalGet' in summary ? (summary.totalGet as number) : 0}
        totalGive={'totalGive' in summary ? (summary.totalGive as number) : 0}
        netPosition={'netPosition' in summary ? (summary.netPosition as number) : 0}
        pendingActions={'pendingActions' in summary ? (summary.pendingActions as number) : 0}
      />

      {/* Monthly P&L Summary (Desktop Only) */}
      <div className="desktop-only" style={{ marginBottom: '1.5rem' }}>
        <MonthlyPnLCard monthlyGet={monthlyGet} monthlyGive={monthlyGive} monthLabel={monthLabel} />
      </div>

      {/* Main accounts content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative', zIndex: 10 }}>
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
                fontWeight: 600,
                color: 'var(--text-primary)',
                letterSpacing: '-0.01em',
              }}
            >
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
          latestTransactions={latestTxnMap}
        />
      </div>

      {/* Floating Add Connection CTA */}
      <AddConnectionCTA currentUserId={user.id} avatarUrl={user.avatar_url} netPosition={netAmount} />
    </>
  );
}
