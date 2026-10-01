import { Metadata } from 'next';
import { getUserFromSession } from '@/lib/auth/session';
import { redirect, notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase/server';
import LedgerClient from '@/components/ledger/LedgerClient';

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

  // Query connection details, transactions list, and net balance in parallel to eliminate sequential database latency
  const [connectionResultRaw, transactionsResult, balanceResult] = await Promise.all([
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
      .single()
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
  const peer = isPersonal
    ? { id: 'offline', name: conn.contact_name || 'Contact', username: conn.contact_phone || 'Offline', isPersonal: true }
    : (isUserA ? conn.user_b : conn.user_a);

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
      />
    </div>
  );
}
