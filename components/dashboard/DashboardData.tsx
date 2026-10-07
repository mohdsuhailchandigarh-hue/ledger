import React from 'react';
import { supabaseAdmin } from '@/lib/supabase/server';
import DashboardHero from '@/components/dashboard/DashboardHero';
import ConnectionGrid from '@/components/dashboard/ConnectionGrid';
import MonthlyPnLCard from '@/components/dashboard/MonthlyPnLCard';

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
  const cleanDigits = user.phone ? user.phone.replace(/\D/g, '').slice(-10) : '';

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  // Parallelize all primary queries concurrently in a single round-trip
  const [
    allConnsResult,
    balancesResult,
    pendingTxnsCountRes,
    pendingReqsCountRes,
    monthlyTxnsResult,
    recentTxnsResult,
    unclaimedResult,
  ] = await Promise.all([
    // 1. Fetch all connections (both platform and personal) in one single query
    supabaseAdmin
      .from('connections')
      .select(`
        id, created_at, contact_name, contact_phone,
        user_a_id, user_b_id, deleted_by_a, deleted_by_b,
        user_a:users!connections_user_a_id_fkey(id, username, name, avatar_url),
        user_b:users!connections_user_b_id_fkey(id, username, name, avatar_url)
      `)
      .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`),

    // 2. Fetch balances for this user
    supabaseAdmin
      .from('connection_balances')
      .select('*')
      .eq('user_id', user.id),

    // 3. Fast count of pending transactions requiring user action
    supabaseAdmin
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .or(`and(counterparty_id.eq.${user.id},status.eq.pending),and(creator_id.eq.${user.id},status.eq.rejected)`),

    // 4. Fast count of incoming pending connection requests
    supabaseAdmin
      .from('connection_requests')
      .select('id', { count: 'exact', head: true })
      .eq('to_user_id', user.id)
      .eq('status', 'pending'),

    // 5. Current month accepted transactions for P&L summary
    supabaseAdmin
      .from('transactions')
      .select('amount, direction, creator_id, counterparty_id, connection_id')
      .eq('status', 'accepted')
      .gte('transaction_date', monthStart)
      .lte('transaction_date', monthEnd)
      .or(`creator_id.eq.${user.id},counterparty_id.eq.${user.id}`),

    // 6. Recent transactions relevant to this user only (limit 100)
    supabaseAdmin
      .from('transactions')
      .select('id, connection_id, amount, direction, note, status, created_at, transaction_date, creator_id')
      .or(`creator_id.eq.${user.id},counterparty_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(100),

    // 7. Find offline contacts registered by others matching user's phone in parallel
    cleanDigits.length === 10
      ? supabaseAdmin
          .from('connections')
          .select(`
            id, created_at, contact_name, contact_phone,
            user_a_id, user_b_id, deleted_by_a,
            user_a:users!connections_user_a_id_fkey(id, username, name, avatar_url)
          `)
          .is('user_b_id', null)
          .neq('user_a_id', user.id)
          .or(`contact_phone.eq.${cleanDigits},contact_phone.eq.+91${cleanDigits},contact_phone.ilike.%${cleanDigits}`)
      : Promise.resolve({ data: [] }),
  ]);

  let rawConns: any[] = (allConnsResult.data as any[]) || [];
  if (
    allConnsResult.error &&
    (allConnsResult.error.code === '42703' || allConnsResult.error.code === 'PGRST204')
  ) {
    const fallbackResult = await supabaseAdmin
      .from('connections')
      .select(`
        id, created_at, user_a_id, user_b_id,
        user_a:users!connections_user_a_id_fkey(id, username, name, avatar_url),
        user_b:users!connections_user_b_id_fkey(id, username, name, avatar_url)
      `)
      .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`);
    rawConns = (fallbackResult.data as any[]) || [];
  }

  // Filter into active platform connections and active personal connections
  const platformConns = rawConns.filter((c) => {
    if (!c.user_b_id) return false;
    if (c.user_a_id === user.id) return !c.deleted_by_a;
    if (c.user_b_id === user.id) return !c.deleted_by_b;
    return true;
  });

  const personalConns = rawConns.filter((c) => {
    if (c.user_b_id) return false;
    return c.user_a_id === user.id && !c.deleted_by_a;
  });

  // Calculate totals and balance map in memory from valid connections
  const activeConnIds = new Set([...platformConns, ...personalConns].map((c) => c.id));
  const balanceMap: Record<string, number> = {};
  let totalGet = 0;
  let totalGive = 0;

  for (const b of (balancesResult.data ?? []) as any[]) {
    balanceMap[b.connection_id] = Number(b.net_amount);
    if (activeConnIds.has(b.connection_id)) {
      const net = Number(b.net_amount);
      if (net > 0) totalGet += net;
      else if (net < 0) totalGive += Math.abs(net);
    }
  }
  const netPosition = totalGet - totalGive;

  const pendingActions =
    ((pendingTxnsCountRes.data as any)?.count ?? pendingTxnsCountRes.count ?? 0) +
    (pendingReqsCountRes.count ?? 0);

  // Process unclaimed connections if present
  let unclaimedConns: any[] = [];
  const filteredUnclaimed = ((unclaimedResult.data ?? []) as any[]).filter((c) => !c.deleted_by_a);

  if (filteredUnclaimed.length > 0) {
    const userAIds = filteredUnclaimed.map((c) => c.user_a_id).filter(Boolean);
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

    unclaimedConns = filteredUnclaimed.map((c) => ({
      ...c,
      isUnclaimedForMe: true,
      requestInfo: reqMap[c.user_a_id] || null,
    }));
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

  let monthlyGet = 0;
  let monthlyGive = 0;
  for (const txn of ((monthlyTxnsResult?.data as any[]) ?? [])) {
    if (!activeConnIds.has(txn.connection_id)) continue;
    const amt = Number(txn.amount);
    if (txn.creator_id === user.id) {
      if (txn.direction === 'get') monthlyGet += amt;
      else monthlyGive += amt;
    } else {
      if (txn.direction === 'give') monthlyGet += amt;
      else monthlyGive += amt;
    }
  }
  const monthLabel = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <>
      {/* Unified Hero: Ambient Net Position + Get/Give Breakdown */}
      <DashboardHero
        totalGet={totalGet}
        totalGive={totalGive}
        netPosition={netPosition}
        pendingActions={pendingActions}
      />

      {/* Monthly P&L Summary (Desktop Only) */}
      <div className="desktop-only" style={{ marginBottom: '1.5rem' }}>
        <MonthlyPnLCard monthlyGet={monthlyGet} monthlyGive={monthlyGive} monthLabel={monthLabel} />
      </div>

      {/* Main accounts content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative', zIndex: 10 }}>
        <ConnectionGrid
          connections={connections}
          currentUserId={user.id}
          balances={balanceMap}
          latestTransactions={latestTxnMap}
        />
      </div>
    </>
  );
}
