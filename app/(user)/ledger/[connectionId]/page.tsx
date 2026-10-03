import { Metadata } from 'next';
import { getUserFromSession } from '@/lib/auth/session';
import { redirect, notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase/server';
import LedgerClient from '@/components/ledger/LedgerClient';
import { resolveConnectionPeerName } from '@/lib/utils/connection';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ connectionId: string }>;
}): Promise<Metadata> {
  return { title: 'Ledger | Shared Ledger' };
}

export default async function LedgerPage({
  params,
}: {
  params: Promise<{ connectionId: string }>;
}) {
  const { connectionId } = await params;
  const user = await getUserFromSession();
  console.log('[DEBUG LedgerPage] connectionId:', connectionId, 'user:', user?.username, user?.id);
  if (!user) redirect('/login');

  // Query connection details, transactions list, net balance, and exact counts in parallel to eliminate sequential database latency
  const [connectionResultRaw, transactionsResult, balanceResult, countResult, pendingCountResult] = await Promise.all([
    supabaseAdmin
      .from('connections')
      .select(`
        id, user_a_id, user_b_id, contact_name, contact_phone,
        deleted_by_a, deleted_by_b,
        user_a:users!connections_user_a_id_fkey(id, username, name, avatar_url),
        user_b:users!connections_user_b_id_fkey(id, username, name, avatar_url)
      `)
      .eq('id', connectionId)
      .single(),
    supabaseAdmin
      .from('transactions')
      .select(`
        id, amount, direction, note, status, created_at, transaction_date,
        creator:users!transactions_creator_id_fkey(id, name, username),
        counterparty:users!transactions_counterparty_id_fkey(id, name, username)
      `)
      .eq('connection_id', connectionId)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50),
    supabaseAdmin
      .from('connection_balances')
      .select('net_amount')
      .eq('connection_id', connectionId)
      .eq('user_id', user.id)
      .single(),
    supabaseAdmin
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('connection_id', connectionId),
    supabaseAdmin
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('connection_id', connectionId)
      .eq('status', 'pending'),
  ]);

  let connection: any = connectionResultRaw.data;
  
  // Handle database schema fallback gracefully in case migration columns or FK errors occur
  if (connectionResultRaw.error || !connection) {
    console.warn('[LedgerPage] connectionResultRaw error, trying safe fallback:', connectionResultRaw.error?.message);
    const fallbackResult = await supabaseAdmin
      .from('connections')
      .select('id, user_a_id, user_b_id, contact_name, contact_phone, deleted_by_a, deleted_by_b')
      .eq('id', connectionId)
      .maybeSingle();

    if (fallbackResult.data) {
      const raw = fallbackResult.data;
      const userIds = [raw.user_a_id, raw.user_b_id].filter(Boolean);
      const { data: usersList } = await supabaseAdmin
        .from('users')
        .select('id, username, name, avatar_url')
        .in('id', userIds);

      const userMap = new Map((usersList || []).map((u) => [u.id, u]));
      connection = {
        ...raw,
        user_a: userMap.get(raw.user_a_id) || null,
        user_b: raw.user_b_id ? userMap.get(raw.user_b_id) || null : null,
      };
    }
  }

  if (!connection) notFound();

  const conn = connection as any;
  const isUserA = conn.user_a_id === user.id;
  const isUserB = conn.user_b_id === user.id;

  if (!isUserA && !isUserB) notFound();

  // If user opens this account, ensure it is active and not soft-deleted
  if ((isUserA && conn.deleted_by_a) || (isUserB && conn.deleted_by_b)) {
    await supabaseAdmin
      .from('connections')
      .update(isUserA ? { deleted_by_a: false } : { deleted_by_b: false })
      .eq('id', connectionId);
  }

  const isPersonal = conn.user_b_id === null;
  const isDisconnected = !isPersonal && ((isUserA && conn.deleted_by_b) || (isUserB && conn.deleted_by_a));
  const resolvedName = resolveConnectionPeerName(conn, user.id);
  const rawPeer = isPersonal
    ? { id: 'offline', name: resolvedName, username: conn.contact_phone || 'Offline', phone: conn.contact_phone || '', isPersonal: true }
    : (isUserA ? conn.user_b : conn.user_a);
  const peer = {
    ...rawPeer,
    name: resolvedName,
    phone: isPersonal ? (conn.contact_phone || '') : ((isUserA ? conn.user_b?.phone : conn.user_a?.phone) || ''),
    isPersonal,
  };

  // Check if contact_phone belongs to a registered user on the platform
  let registeredUser: {
    id: string;
    name: string;
    username: string;
    avatar_url?: string | null;
  } | null = null;
  let initialRequestStatus: {
    status: 'none' | 'pending_sent' | 'pending_received';
    requestId?: string;
  } | null = null;

  if (isPersonal && conn.contact_phone) {
    const cleanDigits = conn.contact_phone.replace(/\D/g, '').slice(-10);
    if (cleanDigits.length === 10) {
      const { data: matchedUser } = await supabaseAdmin
        .from('users')
        .select('id, username, name, avatar_url, phone')
        .or(`phone.eq.${cleanDigits},phone.eq.+91${cleanDigits},phone.ilike.%${cleanDigits}`)
        .neq('id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (matchedUser) {
        registeredUser = {
          id: matchedUser.id,
          name: matchedUser.name,
          username: matchedUser.username,
          avatar_url: matchedUser.avatar_url,
        };

        const { data: req } = await supabaseAdmin
          .from('connection_requests')
          .select('id, status, from_user_id, to_user_id')
          .or(`and(from_user_id.eq.${user.id},to_user_id.eq.${matchedUser.id}),and(from_user_id.eq.${matchedUser.id},to_user_id.eq.${user.id})`)
          .eq('status', 'pending')
          .maybeSingle();

        if (req) {
          initialRequestStatus = {
            requestId: req.id,
            status: req.from_user_id === user.id ? 'pending_sent' : 'pending_received',
          };
        } else {
          initialRequestStatus = {
            status: 'none',
          };
        }
      }
    }
  }

  const transactions = transactionsResult.data ?? [];
  const netBalance = Number((balanceResult.data as any)?.net_amount ?? 0);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'var(--bg-base)',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <LedgerClient
        connectionId={connectionId}
        peer={peer}
        currentUserId={user.id}
        transactions={transactions as any[]}
        netBalance={netBalance}
        isDisconnected={isDisconnected}
        initialHasMore={transactions.length === 50}
        totalCount={countResult?.count ?? transactions.length}
        totalPendingCount={pendingCountResult?.count ?? 0}
        registeredUser={registeredUser}
        initialRequestStatus={initialRequestStatus}
      />
    </div>
  );
}
