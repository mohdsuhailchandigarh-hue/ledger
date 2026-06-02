import { Metadata } from 'next';
import { getUserFromSession } from '@/lib/auth/session';
import { redirect, notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase/server';
import LedgerClient from '@/components/ledger/LedgerClient';

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
  if (!user) redirect('/login');

  // Get connection and verify user is a member
  let connectionResult = await supabaseAdmin
    .from('connections')
    .select(`
      id, user_a_id, user_b_id, contact_name, contact_phone,
      user_a:users!connections_user_a_id_fkey(id, username, name, avatar_url),
      user_b:users!connections_user_b_id_fkey(id, username, name, avatar_url)
    `)
    .eq('id', connectionId)
    .single();

  if (connectionResult.error && connectionResult.error.code === '42703') {
    connectionResult = await supabaseAdmin
      .from('connections')
      .select(`
        id, user_a_id, user_b_id,
        user_a:users!connections_user_a_id_fkey(id, username, name, avatar_url),
        user_b:users!connections_user_b_id_fkey(id, username, name, avatar_url)
      `)
      .eq('id', connectionId)
      .single();
  }

  const connection = connectionResult.data;
  if (!connection) notFound();

  const conn = connection as any;
  const isUserA = conn.user_a_id === user.id;
  const isUserB = conn.user_b_id === user.id;
  
  if (!isUserA && !isUserB) notFound();

  const isPersonal = conn.user_b_id === null;
  const peer = isPersonal
    ? { id: 'offline', name: conn.contact_name || 'Contact', username: conn.contact_phone || 'Offline', isPersonal: true }
    : (isUserA ? conn.user_b : conn.user_a);

  // Get transactions
  const { data: transactions } = await supabaseAdmin
    .from('transactions')
    .select(`
      id, amount, direction, note, status, created_at, transaction_date,
      creator:users!transactions_creator_id_fkey(id, name, username),
      counterparty:users!transactions_counterparty_id_fkey(id, name, username)
    `)
    .eq('connection_id', connectionId)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false });

  // Calculate net balance for this connection
  const { data: balanceData } = await supabaseAdmin
    .from('connection_balances')
    .select('net_amount')
    .eq('connection_id', connectionId)
    .eq('user_id', user.id)
    .single();

  const netBalance = Number((balanceData as any)?.net_amount ?? 0);

  return (
    <LedgerClient
      connectionId={connectionId}
      peer={peer}
      currentUserId={user.id}
      transactions={(transactions ?? []) as any[]}
      netBalance={netBalance}
    />
  );
}
