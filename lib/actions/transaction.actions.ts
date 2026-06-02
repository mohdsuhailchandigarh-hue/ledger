'use server';

import { supabaseAdmin } from '@/lib/supabase/server';
import { getUserFromSession } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const createTxnSchema = z.object({
  connectionId: z.string().uuid(),
  amount: z.number().positive(),
  direction: z.enum(['give', 'get']),
  note: z.string().max(200).optional(),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

function getLocalDateString(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── Create transaction ───────────────────────────────────────
export async function createTransactionAction(data: {
  connectionId: string;
  amount: number;
  direction: 'give' | 'get';
  note?: string;
  transactionDate?: string; // YYYY-MM-DD, defaults to today
}) {
  const currentUser = await getUserFromSession();
  if (!currentUser) return { error: 'Unauthorized' };

  const parsed = createTxnSchema.safeParse(data);
  if (!parsed.success) return { error: 'Invalid data' };

  // Validate transaction date is not in the future (timezone-aware)
  // To handle timezone differences where the client is ahead of the server's UTC time,
  // we check against the maximum current date on Earth (UTC+14).
  const today = getLocalDateString();
  const txnDate = data.transactionDate || today;
  const maxDate = new Date(Date.now() + 14 * 60 * 60 * 1000).toISOString().slice(0, 10);
  if (txnDate > maxDate) {
    return { error: 'Transaction date cannot be in the future' };
  }

  // Verify user is part of this connection
  const { data: conn } = await supabaseAdmin
    .from('connections')
    .select('user_a_id, user_b_id')
    .eq('id', data.connectionId)
    .single();

  if (!conn) return { error: 'Connection not found' };

  if (conn.user_a_id !== currentUser.id && conn.user_b_id !== currentUser.id) {
    return { error: 'Not authorized for this connection' };
  }

  const isPersonal = conn.user_b_id === null;
  const counterpartyId = isPersonal 
    ? null 
    : (conn.user_a_id === currentUser.id ? conn.user_b_id : conn.user_a_id);

  const { data: txn, error } = await supabaseAdmin
    .from('transactions')
    .insert({
      connection_id: data.connectionId,
      creator_id: currentUser.id,
      counterparty_id: counterpartyId,
      amount: data.amount,
      direction: data.direction,
      note: data.note,
      transaction_date: txnDate,
      status: isPersonal ? 'accepted' : 'pending',
    })
    .select()
    .single();

  if (error) return { error: 'Failed to create transaction' };

  revalidatePath(`/ledger/${data.connectionId}`);
  return { transaction: txn };
}

// ─── Get ledger transactions ──────────────────────────────────
export async function getLedgerTransactionsAction(connectionId: string) {
  const currentUser = await getUserFromSession();
  if (!currentUser) return { error: 'Unauthorized', transactions: [] };

  const { data: transactions } = await supabaseAdmin
    .from('transactions')
    .select(`
      *,
      creator:users!transactions_creator_id_fkey(id, username, name, avatar_url),
      counterparty:users!transactions_counterparty_id_fkey(id, username, name, avatar_url)
    `)
    .eq('connection_id', connectionId)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false });

  return { transactions: transactions ?? [] };
}

// ─── Respond to transaction (approve/reject) ──────────────────
export async function respondToTransactionAction(
  transactionId: string,
  action: 'accepted' | 'rejected'
) {
  const currentUser = await getUserFromSession();
  if (!currentUser) return { error: 'Unauthorized' };

  const { data: txn } = await supabaseAdmin
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .eq('counterparty_id', currentUser.id)
    .eq('status', 'pending')
    .single();

  if (!txn) return { error: 'Transaction not found or not pending' };

  const { error } = await supabaseAdmin
    .from('transactions')
    .update({ status: action })
    .eq('id', transactionId);

  if (error) return { error: 'Failed to update transaction' };

  revalidatePath(`/ledger/${txn.connection_id}`);
  revalidatePath('/dashboard');
  revalidatePath('/notifications');
  return { success: true };
}

// ─── Get pending actions for current user ───────────────────
export async function getPendingActionsAction() {
  const currentUser = await getUserFromSession();
  if (!currentUser) return { error: 'Unauthorized', actions: [] };

  const { data } = await supabaseAdmin
    .from('transactions')
    .select(`
      *,
      creator:users!transactions_creator_id_fkey(id, username, name, avatar_url),
      counterparty:users!transactions_counterparty_id_fkey(id, username, name, avatar_url)
    `)
    .or(`and(counterparty_id.eq.${currentUser.id},status.eq.pending),and(creator_id.eq.${currentUser.id},status.eq.rejected)`)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false });

  return { actions: data ?? [] };
}


// ─── Handle rejected transaction (cancel/re-request/edit) ─────────
export async function handleRejectedTransactionAction(
  transactionId: string,
  action: 'cancel' | 're_request' | 'edit',
  updates?: { amount?: number; note?: string | null }
) {
  const currentUser = await getUserFromSession();
  if (!currentUser) return { error: 'Unauthorized' };

  const { data: txn } = await supabaseAdmin
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .eq('creator_id', currentUser.id)
    .eq('status', 'rejected')
    .single();

  if (!txn) return { error: 'Transaction not found or not rejected' };

  if (action === 'cancel') {
    const { error } = await supabaseAdmin
      .from('transactions')
      .update({ status: 'canceled' })
      .eq('id', transactionId);
    if (error) return { error: 'Failed to cancel' };
  } else if (action === 're_request' || action === 'edit') {
    await supabaseAdmin
      .from('transactions')
      .update({ status: 'canceled' })
      .eq('id', transactionId);

    const amount = action === 'edit' && updates?.amount ? updates.amount : txn.amount;
    const note = action === 'edit' && updates?.note !== undefined ? updates.note : txn.note;

    const { error: insertError } = await supabaseAdmin
      .from('transactions')
      .insert({
        connection_id: txn.connection_id,
        creator_id: txn.creator_id,
        counterparty_id: txn.counterparty_id,
        amount,
        direction: txn.direction,
        note,
        status: 'pending',
      });
      
    if (insertError) return { error: 'Failed to create new request' };
  }

  revalidatePath(`/ledger/${txn.connection_id}`);
  revalidatePath('/dashboard');
  revalidatePath('/notifications');
  return { success: true };
}

// ─── Get dashboard summary ────────────────────────────────────
export async function getDashboardSummaryAction() {
  const currentUser = await getUserFromSession();
  if (!currentUser) return { error: 'Unauthorized' };

  const { data: balances } = await supabaseAdmin
    .from('connection_balances')
    .select('*')
    .eq('user_id', currentUser.id);

  const totalGet = (balances ?? [])
    .filter((b) => b.net_amount > 0)
    .reduce((sum, b) => sum + Number(b.net_amount), 0);

  const totalGive = (balances ?? [])
    .filter((b) => b.net_amount < 0)
    .reduce((sum, b) => sum + Math.abs(Number(b.net_amount)), 0);

  const netPosition = totalGet - totalGive;

  const { data: pendingCount } = await supabaseAdmin
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .or(`and(counterparty_id.eq.${currentUser.id},status.eq.pending),and(creator_id.eq.${currentUser.id},status.eq.rejected)`);

  return {
    totalGet,
    totalGive,
    netPosition,
    pendingActions: (pendingCount as unknown as { count: number })?.count ?? 0,
  };
}

// ─── Admin: Force approve/reject ──────────────────────────────
export async function adminForceTransactionAction(
  transactionId: string,
  action: 'accepted' | 'rejected'
) {
  const { error } = await supabaseAdmin
    .from('transactions')
    .update({ status: action })
    .eq('id', transactionId);

  if (error) return { error: 'Failed to update transaction' };

  revalidatePath('/admin/transactions');
  return { success: true };
}

// ─── Admin: Get all transactions ──────────────────────────────
export async function adminGetAllTransactionsAction(page = 0, limit = 50) {
  const { data, count } = await supabaseAdmin
    .from('transactions')
    .select(`
      *,
      creator:users!transactions_creator_id_fkey(id, username, name),
      counterparty:users!transactions_counterparty_id_fkey(id, username, name)
    `, { count: 'exact' })
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);

  return { transactions: data ?? [], total: count ?? 0 };
}


// ─── Monthly Financial Summary (current month) ─────────────────
export async function getMonthlyFinancialSummaryAction() {
  const currentUser = await getUserFromSession();
  if (!currentUser) return { error: 'Unauthorized', monthlyGet: 0, monthlyGive: 0 };

  const now = new Date();
  const monthStart = getLocalDateString(new Date(now.getFullYear(), now.getMonth(), 1));
  const monthEnd   = getLocalDateString(new Date(now.getFullYear(), now.getMonth() + 1, 0));

  // Fetch all accepted transactions this month where user is creator or counterparty
  // Filter by transaction_date so backdated entries appear in their correct month
  const { data, error } = await supabaseAdmin
    .from('transactions')
    .select('amount, direction, creator_id, counterparty_id, status')
    .eq('status', 'accepted')
    .gte('transaction_date', monthStart)
    .lte('transaction_date', monthEnd)
    .or(`creator_id.eq.${currentUser.id},counterparty_id.eq.${currentUser.id}`);

  if (error) return { error: error.message, monthlyGet: 0, monthlyGive: 0 };

  let monthlyGet  = 0;
  let monthlyGive = 0;

  for (const txn of data ?? []) {
    const amt = Number(txn.amount);
    if (txn.creator_id === currentUser.id) {
      // I created this transaction
      if (txn.direction === 'get') monthlyGet  += amt; // counterparty owes me
      else                          monthlyGive += amt; // I owe counterparty
    } else {
      // I am the counterparty
      if (txn.direction === 'give') monthlyGet  += amt; // creator owes me
      else                           monthlyGive += amt; // I owe creator
    }
  }

  return { monthlyGet, monthlyGive };
}

