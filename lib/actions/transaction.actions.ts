'use server';

import { supabaseAdmin } from '@/lib/supabase/server';
import { getUserFromSession } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { resolveConnectionPeerName, resolveSavedPeerName } from '@/lib/utils/connection';

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
    .select('user_a_id, user_b_id, deleted_by_a, deleted_by_b')
    .eq('id', data.connectionId)
    .single();

  if (!conn) return { error: 'Connection not found' };

  if (conn.user_a_id !== currentUser.id && conn.user_b_id !== currentUser.id) {
    return { error: 'Not authorized for this connection' };
  }

  const isPersonal = conn.user_b_id === null;
  const isDisconnected = conn.deleted_by_a || conn.deleted_by_b;
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
      status: isPersonal || isDisconnected ? 'accepted' : 'pending',
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

// ─── Cancel / Delete pending transaction created by current user ───
export async function cancelPendingTransactionAction(transactionId: string) {
  const currentUser = await getUserFromSession();
  if (!currentUser) return { error: 'Unauthorized' };

  // Fetch transaction to verify ownership and pending status
  const { data: txn, error: fetchError } = await supabaseAdmin
    .from('transactions')
    .select('id, connection_id, creator_id, status')
    .eq('id', transactionId)
    .single();

  if (fetchError || !txn) {
    return { error: 'Transaction not found' };
  }

  if (txn.creator_id !== currentUser.id) {
    return { error: 'Only the creator can cancel this request' };
  }

  if (txn.status !== 'pending') {
    return { error: 'Only pending requests can be canceled' };
  }

  // Delete transaction from database
  const { error: deleteError } = await supabaseAdmin
    .from('transactions')
    .delete()
    .eq('id', transactionId)
    .eq('creator_id', currentUser.id)
    .eq('status', 'pending');

  if (deleteError) {
    console.error('[cancelPendingTransactionAction] Delete error:', deleteError);
    return { error: 'Failed to cancel request' };
  }

  revalidatePath(`/ledger/${txn.connection_id}`);
  revalidatePath('/dashboard');
  revalidatePath('/notifications');
  revalidatePath('/');

  return { success: true };
}

// ─── Get pending actions for current user ───────────────────
export async function getPendingActionsAction() {
  const currentUser = await getUserFromSession();
  if (!currentUser) return { error: 'Unauthorized', actions: [] };

  const { data: deletedConns } = await supabaseAdmin
    .from('connections')
    .select('id')
    .or(`and(user_a_id.eq.${currentUser.id},deleted_by_a.eq.true),and(user_b_id.eq.${currentUser.id},deleted_by_b.eq.true)`);
  
  const deletedIds = deletedConns?.map(c => c.id) || [];

  let query = supabaseAdmin
    .from('transactions')
    .select(`
      *,
      creator:users!transactions_creator_id_fkey(id, username, name, avatar_url, phone),
      counterparty:users!transactions_counterparty_id_fkey(id, username, name, avatar_url, phone)
    `)
    .or(`and(counterparty_id.eq.${currentUser.id},status.eq.pending),and(creator_id.eq.${currentUser.id},status.eq.rejected)`);

  if (deletedIds.length > 0) {
    query = query.not('connection_id', 'in', `(${deletedIds.join(',')})`);
  }

  const [txnRes, reqRes, userConnsRes] = await Promise.all([
    query
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('connection_requests')
      .select(`
        id,
        status,
        created_at,
        from_user:users!connection_requests_from_user_id_fkey(id, username, name, avatar_url, phone),
        to_user:users!connection_requests_to_user_id_fkey(id, username, name, avatar_url, phone)
      `)
      .eq('to_user_id', currentUser.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('connections')
      .select('id, user_a_id, user_b_id, contact_name, contact_phone')
      .or(`user_a_id.eq.${currentUser.id},user_b_id.eq.${currentUser.id}`),
  ]);

  // Ensure any connection referenced by transactions is included in connections list
  const txnConnIds = (txnRes.data ?? []).map((t: any) => t.connection_id).filter(Boolean);
  const knownConnIds = new Set((userConnsRes.data ?? []).map((c: any) => c.id));
  const missingConnIds = txnConnIds.filter((cid: string) => !knownConnIds.has(cid));

  let allConns = [...(userConnsRes.data ?? [])];
  if (missingConnIds.length > 0) {
    const { data: missingConns } = await supabaseAdmin
      .from('connections')
      .select('id, user_a_id, user_b_id, contact_name, contact_phone')
      .in('id', missingConnIds);
    if (missingConns && missingConns.length > 0) {
      allConns = [...allConns, ...missingConns];
    }
  }

  const txns = (txnRes.data ?? []).map((t: any) => {
    const isCreator = t.creator_id === currentUser.id;
    const peer = isCreator ? t.counterparty : t.creator;
    const savedName = resolveSavedPeerName({
      peer,
      connectionId: t.connection_id,
      currentUserId: currentUser.id,
      connections: allConns,
    });

    let updatedCreator = t.creator ? { ...t.creator } : t.creator;
    let updatedCounterparty = t.counterparty ? { ...t.counterparty } : t.counterparty;

    if (savedName) {
      if (isCreator && updatedCounterparty) {
        updatedCounterparty = {
          ...updatedCounterparty,
          real_name: updatedCounterparty.name,
          name: savedName,
        };
      } else if (!isCreator && updatedCreator) {
        updatedCreator = {
          ...updatedCreator,
          real_name: updatedCreator.name,
          name: savedName,
        };
      }
    }

    return {
      ...t,
      creator: updatedCreator,
      counterparty: updatedCounterparty,
      saved_contact_name: savedName || null,
      itemType: 'transaction' as const,
    };
  });

  const reqs = (reqRes.data ?? []).map((r: any) => {
    const savedName = resolveSavedPeerName({
      peer: r.from_user,
      connectionId: null,
      currentUserId: currentUser.id,
      connections: allConns,
    });

    let updatedFromUser = r.from_user ? { ...r.from_user } : r.from_user;
    if (savedName && updatedFromUser) {
      updatedFromUser = {
        ...updatedFromUser,
        real_name: updatedFromUser.name,
        name: savedName,
      };
    }

    return {
      id: r.id,
      itemType: 'connection_request' as const,
      status: r.status as 'pending',
      creator_id: updatedFromUser?.id,
      counterparty_id: currentUser.id,
      creator: updatedFromUser,
      counterparty: r.to_user,
      from_user: updatedFromUser,
      to_user: r.to_user,
      amount: 0,
      direction: 'get' as const,
      note: null,
      transaction_date: r.created_at,
      created_at: r.created_at,
      saved_contact_name: savedName || null,
    };
  });

  const allActions = [...reqs, ...txns];

  return { actions: allActions, connectionRequests: reqRes.data ?? [] };
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

  // Fetch connection to check if it is soft-deleted
  const { data: conn } = await supabaseAdmin
    .from('connections')
    .select('deleted_by_a, deleted_by_b')
    .eq('id', txn.connection_id)
    .single();

  const isDisconnected = conn ? (conn.deleted_by_a || conn.deleted_by_b) : false;

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
        status: isDisconnected ? 'accepted' : 'pending',
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

  const [balancesResult, deletedConnsResult] = await Promise.all([
    supabaseAdmin
      .from('connection_balances')
      .select('*')
      .eq('user_id', currentUser.id),
    supabaseAdmin
      .from('connections')
      .select('id')
      .or(`and(user_a_id.eq.${currentUser.id},deleted_by_a.eq.true),and(user_b_id.eq.${currentUser.id},deleted_by_b.eq.true)`)
  ]);

  const balances = balancesResult.data ?? [];
  const deletedIds = new Set((deletedConnsResult.data ?? []).map(c => c.id));

  // Filter balances to exclude soft-deleted connections
  const filteredBalances = balances.filter(b => !deletedIds.has(b.connection_id));

  const totalGet = filteredBalances
    .filter((b) => b.net_amount > 0)
    .reduce((sum, b) => sum + Number(b.net_amount), 0);

  const totalGive = filteredBalances
    .filter((b) => b.net_amount < 0)
    .reduce((sum, b) => sum + Math.abs(Number(b.net_amount)), 0);

  const netPosition = totalGet - totalGive;

  let pendingQuery = supabaseAdmin
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .or(`and(counterparty_id.eq.${currentUser.id},status.eq.pending),and(creator_id.eq.${currentUser.id},status.eq.rejected)`);

  if (deletedIds.size > 0) {
    pendingQuery = pendingQuery.not('connection_id', 'in', `(${Array.from(deletedIds).join(',')})`);
  }

  const [pendingTxnCountRes, pendingReqCountRes] = await Promise.all([
    pendingQuery,
    supabaseAdmin
      .from('connection_requests')
      .select('id', { count: 'exact', head: true })
      .eq('to_user_id', currentUser.id)
      .eq('status', 'pending'),
  ]);

  const totalPendingActions =
    ((pendingTxnCountRes.data as unknown as { count: number })?.count ?? 0) +
    (pendingReqCountRes.count ?? 0);

  return {
    totalGet,
    totalGive,
    netPosition,
    pendingActions: totalPendingActions,
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

  const [txnsResult, deletedConnsResult] = await Promise.all([
    supabaseAdmin
      .from('transactions')
      .select('amount, direction, creator_id, counterparty_id, status, connection_id')
      .eq('status', 'accepted')
      .gte('transaction_date', monthStart)
      .lte('transaction_date', monthEnd)
      .or(`creator_id.eq.${currentUser.id},counterparty_id.eq.${currentUser.id}`),
    supabaseAdmin
      .from('connections')
      .select('id')
      .or(`and(user_a_id.eq.${currentUser.id},deleted_by_a.eq.true),and(user_b_id.eq.${currentUser.id},deleted_by_b.eq.true)`)
  ]);

  if (txnsResult.error) return { error: txnsResult.error.message, monthlyGet: 0, monthlyGive: 0 };

  const deletedIds = new Set((deletedConnsResult.data ?? []).map(c => c.id));
  const filteredTxns = (txnsResult.data ?? []).filter(t => !deletedIds.has(t.connection_id));

  let monthlyGet  = 0;
  let monthlyGive = 0;

  for (const txn of filteredTxns) {
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

// ─── Get Single Ledger Details (Instant In-App SPA Transition) ──
export async function getLedgerDetailsAction(connectionId: string) {
  try {
    const currentUser = await getUserFromSession();
    if (!currentUser) return { error: 'Unauthorized' };

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
        .maybeSingle(),
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
        .eq('user_id', currentUser.id)
        .maybeSingle(),
      supabaseAdmin
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('connection_id', connectionId),
      supabaseAdmin
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('connection_id', connectionId)
        .eq('status', 'pending'),
    ]);

    let connection: any = connectionResultRaw.data;
    if (!connection) {
      const fallback = await supabaseAdmin
        .from('connections')
        .select('id, user_a_id, user_b_id, contact_name, contact_phone, deleted_by_a, deleted_by_b')
        .eq('id', connectionId)
        .maybeSingle();

      if (fallback.data) {
        const raw = fallback.data;
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

    if (!connection) return { error: 'Ledger not found' };

    const conn = connection as any;
    const isUserA = conn.user_a_id === currentUser.id;
    const isUserB = conn.user_b_id === currentUser.id;

    // Check if it's an offline contact registered matching this user's phone number
    let isPhoneMatch = false;
    if (!isUserA && !isUserB && conn.user_b_id === null && conn.contact_phone && currentUser.phone) {
      const cleanUserPhone = currentUser.phone.replace(/\D/g, '').slice(-10);
      const cleanContactPhone = conn.contact_phone.replace(/\D/g, '').slice(-10);
      isPhoneMatch = cleanUserPhone.length === 10 && cleanUserPhone === cleanContactPhone;
    }

    if (!isUserA && !isUserB && !isPhoneMatch) return { error: 'Unauthorized' };

    // Ensure connection is not soft-deleted (non-blocking)
    if ((isUserA && conn.deleted_by_a) || (isUserB && conn.deleted_by_b)) {
      void supabaseAdmin
        .from('connections')
        .update(isUserA ? { deleted_by_a: false } : { deleted_by_b: false })
        .eq('id', connectionId);
    }

    const isPersonal = conn.user_b_id === null;
    const isDisconnected = !isPersonal && ((isUserA && conn.deleted_by_b) || (isUserB && conn.deleted_by_a));
    const resolvedName = resolveConnectionPeerName(conn, currentUser.id);
    const rawPeer = isPersonal
      ? { id: 'offline', name: resolvedName, username: conn.contact_phone || 'Offline', isPersonal: true }
      : (isUserA ? conn.user_b : conn.user_a);
    const peer = {
      ...rawPeer,
      name: resolvedName,
      isPersonal,
    };

    let rawTransactions = (transactionsResult.data ?? []) as any[];
    if (transactionsResult.error && (!rawTransactions || rawTransactions.length === 0)) {
      const fallbackTxns = await supabaseAdmin
        .from('transactions')
        .select('id, amount, direction, note, status, created_at, transaction_date, creator_id, counterparty_id')
        .eq('connection_id', connectionId)
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50);
      rawTransactions = (fallbackTxns.data ?? []) as any[];
    }

    const transactions = rawTransactions.map((t: any) => {
      if (t.creator && t.creator.id !== currentUser.id && resolvedName) {
        return {
          ...t,
          creator: { ...t.creator, real_name: t.creator.name, name: resolvedName },
        };
      }
      if (t.counterparty && t.counterparty.id !== currentUser.id && resolvedName) {
        return {
          ...t,
          counterparty: { ...t.counterparty, real_name: t.counterparty.name, name: resolvedName },
        };
      }
      return t;
    });
    const netBalance = Number((balanceResult.data as any)?.net_amount ?? 0);
    const hasMore = transactions.length === 50;
    const totalCount = countResult.count ?? transactions.length;
    const totalPendingCount = pendingCountResult.count ?? transactions.filter((t) => t.status === 'pending').length;

    return {
      connectionId,
      peer,
      transactions,
      netBalance,
      isDisconnected,
      hasMore,
      totalCount,
      totalPendingCount,
    };
  } catch (err: any) {
    console.error('[getLedgerDetailsAction] Unexpected error:', err);
    return { error: err?.message || 'Failed to load ledger details' };
  }
}

export async function loadMoreTransactionsAction(
  connectionId: string,
  offset: number = 0,
  limit: number = 50
) {
  const currentUser = await getUserFromSession();
  if (!currentUser) return { error: 'Unauthorized', transactions: [], hasMore: false };

  const { data, error } = await supabaseAdmin
    .from('transactions')
    .select(`
      id, amount, direction, note, status, created_at, transaction_date,
      creator:users!transactions_creator_id_fkey(id, name, username),
      counterparty:users!transactions_counterparty_id_fkey(id, name, username)
    `)
    .eq('connection_id', connectionId)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return { error: error.message, transactions: [], hasMore: false };
  }

  const { data: conn } = await supabaseAdmin
    .from('connections')
    .select('id, user_a_id, user_b_id, contact_name, contact_phone')
    .eq('id', connectionId)
    .maybeSingle();

  const resolvedName = conn ? resolveConnectionPeerName(conn, currentUser.id) : null;

  const transactions = ((data || []) as any[]).map((t: any) => {
    if (t.creator && t.creator.id !== currentUser.id && resolvedName) {
      return { ...t, creator: { ...t.creator, real_name: t.creator.name, name: resolvedName } };
    }
    if (t.counterparty && t.counterparty.id !== currentUser.id && resolvedName) {
      return { ...t, counterparty: { ...t.counterparty, real_name: t.counterparty.name, name: resolvedName } };
    }
    return t;
  });
  const hasMore = transactions.length === limit;

  return {
    transactions,
    hasMore,
  };
}


