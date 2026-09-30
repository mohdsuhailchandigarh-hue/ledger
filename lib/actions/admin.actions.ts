'use server';

import { supabaseAdmin } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { upgradePersonalContactsForPhone } from './connection.actions';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

export async function adminGetAllUsersAction() {
  const { data } = await supabaseAdmin
    .from('users')
    .select('id, username, name, phone, is_active, is_admin, created_at')
    .order('created_at', { ascending: false });
  return { users: data ?? [] };
}

export async function adminGetAnalyticsAction() {
  const [usersRes, connectionsRes, transactionsRes, pendingRes] = await Promise.all([
    supabaseAdmin.from('users').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('connections').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('transactions').select('id', { count: 'exact', head: true }),
    supabaseAdmin
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
  ]);

  const { data: volumeData } = await supabaseAdmin
    .from('transactions')
    .select('amount, status')
    .eq('status', 'accepted');

  const totalVolume = (volumeData ?? []).reduce((sum, t) => sum + Number(t.amount), 0);

  return {
    totalUsers: (usersRes as unknown as { count: number }).count ?? 0,
    totalConnections: (connectionsRes as unknown as { count: number }).count ?? 0,
    totalTransactions: (transactionsRes as unknown as { count: number }).count ?? 0,
    pendingTransactions: (pendingRes as unknown as { count: number }).count ?? 0,
    totalVolume,
  };
}

export async function adminGetAllLedgersAction() {
  const { data } = await supabaseAdmin
    .from('connections')
    .select(`
      id,
      created_at,
      user_a:users!connections_user_a_id_fkey(id, username, name),
      user_b:users!connections_user_b_id_fkey(id, username, name)
    `)
    .order('created_at', { ascending: false });

  return { ledgers: data ?? [] };
}

export async function adminUpdateUserAction(
  userId: string,
  updates: { name?: string; phone?: string; is_active?: boolean }
) {
  const { error } = await supabaseAdmin
    .from('users')
    .update(updates)
    .eq('id', userId);

  if (error) return { error: 'Failed to update user' };

  if (updates.phone) {
    await upgradePersonalContactsForPhone(updates.phone, userId);
  }

  revalidatePath('/admin/users');
  return { success: true };
}

const updateSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30)
    .regex(/^[a-z0-9_]+$/, 'Only lowercase letters, numbers, underscores'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
  phone: z.string().optional(),
  is_active: z.boolean(),
});

export async function adminUpdateUserFullAction(
  userId: string,
  data: {
    name: string;
    username: string;
    phone?: string;
    password?: string;
    is_active: boolean;
  }
) {
  const parsed = updateSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Validation failed' };
  }

  const { username, name, password, phone, is_active } = parsed.data;
  const trimmedPhone = phone?.trim() || null;

  // 1. Check username uniqueness (excluding this user)
  const { data: existingUsername } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('username', username.toLowerCase().trim())
    .neq('id', userId)
    .single();

  if (existingUsername) {
    return { error: 'Username already taken' };
  }

  // 2. Check phone uniqueness among platform users (excluding this user)
  if (trimmedPhone) {
    const { data: existingPhone } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('phone', trimmedPhone)
      .neq('id', userId)
      .single();

    if (existingPhone) {
      return { error: 'Phone number already registered to another user' };
    }
  }

  // 3. Fetch current user data to check if phone number has changed
  const { data: currentUser, error: fetchErr } = await supabaseAdmin
    .from('users')
    .select('phone')
    .eq('id', userId)
    .single();

  if (fetchErr || !currentUser) {
    return { error: 'User not found' };
  }

  // 4. Construct updates object
  const updates: any = {
    username: username.toLowerCase().trim(),
    name: name.trim(),
    phone: trimmedPhone,
    is_active,
    updated_at: new Date().toISOString(),
  };

  // Hash password if provided
  let passwordChanged = false;
  if (password && password.trim().length >= 6) {
    updates.password_hash = await bcrypt.hash(password, 12);
    passwordChanged = true;
  }

  // 5. Perform database update
  const { error: updateErr } = await supabaseAdmin
    .from('users')
    .update(updates)
    .eq('id', userId);

  if (updateErr) {
    return { error: updateErr.message || 'Failed to update user' };
  }

  // 6. Invalidate active sessions if password changed or status is inactive
  if (passwordChanged || !is_active) {
    await supabaseAdmin.from('sessions').delete().eq('user_id', userId);
  }

  // 7. If phone number changed and is non-empty, trigger automatic contact upgrades
  if (trimmedPhone && currentUser.phone !== trimmedPhone) {
    await upgradePersonalContactsForPhone(trimmedPhone, userId);
  }

  revalidatePath('/admin/users');
  return { success: true };
}

// Get all connections/relationships for a specific user
export async function adminGetUserConnectionsAction(userId: string) {
  // 1. Fetch user info
  const { data: user, error: userErr } = await supabaseAdmin
    .from('users')
    .select('id, name, username, phone, is_active, created_at')
    .eq('id', userId)
    .single();

  if (userErr || !user) {
    return { error: 'User not found', user: null, connections: [] };
  }

  // 2. Fetch all connections where user is a participant
  const { data: connections, error: connErr } = await supabaseAdmin
    .from('connections')
    .select(`
      id,
      user_a_id,
      user_b_id,
      contact_name,
      contact_phone,
      created_at,
      user_a:users!connections_user_a_id_fkey(id, username, name, phone),
      user_b:users!connections_user_b_id_fkey(id, username, name, phone)
    `)
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (connErr || !connections) {
    return { user, connections: [] };
  }

  const connectionIds = connections.map((c) => c.id);

  // 3. Fetch balances for these connections for this user
  const balancesMap: Record<string, number> = {};
  if (connectionIds.length > 0) {
    const { data: balances } = await supabaseAdmin
      .from('connection_balances')
      .select('connection_id, net_amount')
      .eq('user_id', userId)
      .in('connection_id', connectionIds);

    balances?.forEach((b) => {
      balancesMap[b.connection_id] = Number(b.net_amount ?? 0);
    });
  }

  // 4. Fetch transaction counts for these connections
  const countsMap: Record<string, number> = {};
  if (connectionIds.length > 0) {
    const { data: txns } = await supabaseAdmin
      .from('transactions')
      .select('connection_id');

    txns?.forEach((t) => {
      if (connectionIds.includes(t.connection_id)) {
        countsMap[t.connection_id] = (countsMap[t.connection_id] || 0) + 1;
      }
    });
  }

  // 5. Build connection items
  const mappedConnections = connections.map((conn) => {
    const isUserA = conn.user_a_id === userId;
    const isPersonal = conn.user_b_id === null;

    let peerName = '';
    let peerUsername = '';
    let peerPhone = '';
    let peerId = '';

    if (isPersonal) {
      peerName = conn.contact_name || 'Contact';
      peerUsername = conn.contact_phone || 'Offline Contact';
      peerPhone = conn.contact_phone || '';
      peerId = 'offline';
    } else {
      const peerUser = isUserA ? conn.user_b : conn.user_a;
      peerName = (peerUser as any)?.name || '';
      peerUsername = (peerUser as any)?.username || '';
      peerPhone = (peerUser as any)?.phone || '';
      peerId = (peerUser as any)?.id || '';
    }

    return {
      id: conn.id,
      created_at: conn.created_at,
      is_personal: isPersonal,
      peer: {
        id: peerId,
        name: peerName,
        username: peerUsername,
        phone: peerPhone,
      },
      net_balance: balancesMap[conn.id] || 0,
      transaction_count: countsMap[conn.id] || 0,
    };
  });

  return {
    user,
    connections: mappedConnections,
  };
}

// Get all transactions for a specific connection
export async function adminGetConnectionTransactionsAction(connectionId: string) {
  // 1. Fetch connection details
  const { data: connection, error: connErr } = await supabaseAdmin
    .from('connections')
    .select(`
      id,
      user_a_id,
      user_b_id,
      contact_name,
      contact_phone,
      created_at,
      user_a:users!connections_user_a_id_fkey(id, username, name, phone),
      user_b:users!connections_user_b_id_fkey(id, username, name, phone)
    `)
    .eq('id', connectionId)
    .single();

  if (connErr || !connection) {
    return { error: 'Connection not found', connection: null, transactions: [] };
  }

  // 2. Fetch transactions
  const { data: transactions, error: txnsErr } = await supabaseAdmin
    .from('transactions')
    .select(`
      id,
      amount,
      direction,
      note,
      status,
      created_at,
      updated_at,
      transaction_date,
      creator_id,
      counterparty_id,
      creator:users!transactions_creator_id_fkey(id, name, username),
      counterparty:users!transactions_counterparty_id_fkey(id, name, username)
    `)
    .eq('connection_id', connectionId)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (txnsErr) {
    return { error: 'Failed to fetch transactions', connection, transactions: [] };
  }

  return {
    connection,
    transactions: transactions ?? [],
  };
}

