'use server';

import { supabaseAdmin } from '@/lib/supabase/server';
import { getUserFromSession } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';

// ─── Search users to connect with ────────────────────────────
export async function searchUsersAction(query: string) {
  const currentUser = await getUserFromSession();
  if (!currentUser) return { error: 'Unauthorized', users: [] };

  const { data } = await supabaseAdmin
    .from('users')
    .select('id, username, name, avatar_url')
    .or(`username.ilike.%${query}%,name.ilike.%${query}%`)
    .neq('id', currentUser.id)
    .eq('is_active', true)
    .limit(10);

  return { users: data ?? [] };
}

// ─── Personal Contacts ─────────────────────────────────────────
export async function checkPhoneForContactAction(phone: string) {
  const currentUser = await getUserFromSession();
  if (!currentUser) return { error: 'Unauthorized' };

  const { data: existingUser } = await supabaseAdmin
    .from('users')
    .select('id, name')
    .eq('phone', phone)
    .single();

  if (existingUser && existingUser.id !== currentUser.id) {
    return { existingUser };
  }
  return { existingUser: null };
}

export async function createPersonalContactAction(name: string, phone: string) {
  const currentUser = await getUserFromSession();
  if (!currentUser) return { error: 'Unauthorized' };

  // Validate inputs
  const trimmedName = name?.trim();
  const trimmedPhone = phone?.trim();
  if (!trimmedName) return { error: 'Contact name is required' };
  if (!trimmedPhone) return { error: 'Mobile number is required' };

  console.log('[createPersonalContact] Attempting insert:', { userId: currentUser.id, phone: trimmedPhone });

  const { data, error } = await supabaseAdmin
    .from('connections')
    .insert({
      user_a_id: currentUser.id,
      contact_name: trimmedName,
      contact_phone: trimmedPhone,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[createPersonalContact] DB error:', error.code, error.message);

    // Unique constraint violation — this owner already has a contact with this phone
    if (error.code === '23505') {
      return { error: 'DUPLICATE' };
    }

    // Column not found — migration was never applied to this database
    if (error.code === 'PGRST204' || error.code === '42703') {
      return { error: 'DATABASE_NOT_MIGRATED' };
    }

    // NOT NULL violation — user_b_id is still NOT NULL (migration not applied)
    if (error.code === '23502') {
      return { error: 'DATABASE_NOT_MIGRATED' };
    }

    // Check constraint violation
    if (error.code === '23514') {
      return { error: 'Invalid contact data' };
    }

    return { error: `DB_ERROR: ${error.message}` };
  }

  console.log('[createPersonalContact] Created contact id:', data?.id);
  revalidatePath('/connections');
  return { success: true };
}

export async function updatePersonalContactAction(connectionId: string, name: string) {
  const currentUser = await getUserFromSession();
  if (!currentUser) return { error: 'Unauthorized' };

  const { error } = await supabaseAdmin
    .from('connections')
    .update({ contact_name: name })
    .eq('id', connectionId)
    .eq('user_a_id', currentUser.id)
    .is('user_b_id', null);

  if (error) return { error: 'Failed to update contact name' };

  revalidatePath('/connections');
  return { success: true };
}

// ─── Send connection request ──────────────────────────────────
export async function sendConnectionRequestAction(toUserId: string) {
  const currentUser = await getUserFromSession();
  if (!currentUser) return { error: 'Unauthorized' };

  // Check if already connected (shared or upgraded)
  const { data: existingConn } = await supabaseAdmin
    .from('connections')
    .select('id')
    .or(`and(user_a_id.eq.${currentUser.id},user_b_id.eq.${toUserId}),and(user_a_id.eq.${toUserId},user_b_id.eq.${currentUser.id})`)
    .single();

  if (existingConn) return { error: 'Already connected' };

  // Check existing request
  const { data: existingReq } = await supabaseAdmin
    .from('connection_requests')
    .select('id, status')
    .or(`and(from_user_id.eq.${currentUser.id},to_user_id.eq.${toUserId}),and(from_user_id.eq.${toUserId},to_user_id.eq.${currentUser.id})`)
    .single();

  if (existingReq) {
    if (existingReq.status === 'pending') return { error: 'Request already sent' };
    if (existingReq.status === 'accepted') return { error: 'Already connected' };
  }

  const { error } = await supabaseAdmin
    .from('connection_requests')
    .insert({ from_user_id: currentUser.id, to_user_id: toUserId });

  if (error) return { error: 'Failed to send request' };

  revalidatePath('/connections');
  return { success: true };
}

// ─── Respond to connection request ───────────────────────────
export async function respondToConnectionRequestAction(
  requestId: string,
  action: 'accepted' | 'rejected'
) {
  const currentUser = await getUserFromSession();
  if (!currentUser) return { error: 'Unauthorized' };

  const { data: request } = await supabaseAdmin
    .from('connection_requests')
    .select('*')
    .eq('id', requestId)
    .eq('to_user_id', currentUser.id)
    .single();

  if (!request) return { error: 'Request not found' };

  await supabaseAdmin
    .from('connection_requests')
    .update({ status: action })
    .eq('id', requestId);

  if (action === 'accepted') {
    let upgraded = false;
    
    // Check if receiver (User B) matches a personal contact created by sender (User A)
    const { data: acceptingUser } = await supabaseAdmin.from('users').select('phone').eq('id', request.to_user_id).single();
    if (acceptingUser?.phone) {
      const { data: personalConn } = await supabaseAdmin.from('connections')
        .select('id')
        .eq('user_a_id', request.from_user_id)
        .is('user_b_id', null)
        .eq('contact_phone', acceptingUser.phone)
        .single();
        
      if (personalConn) {
        await supabaseAdmin.from('connections').update({ user_b_id: request.to_user_id }).eq('id', personalConn.id);
        await supabaseAdmin.from('transactions').update({ counterparty_id: request.to_user_id }).eq('connection_id', personalConn.id).is('counterparty_id', null);
        upgraded = true;
      }
    }
    
    // Check the reverse: what if the sender was the one who just registered, and receiver had the offline contact?
    if (!upgraded) {
      const { data: sendingUser } = await supabaseAdmin.from('users').select('phone').eq('id', request.from_user_id).single();
      if (sendingUser?.phone) {
        const { data: reverseConn } = await supabaseAdmin.from('connections')
          .select('id')
          .eq('user_a_id', request.to_user_id)
          .is('user_b_id', null)
          .eq('contact_phone', sendingUser.phone)
          .single();
          
        if (reverseConn) {
          await supabaseAdmin.from('connections').update({ user_b_id: request.from_user_id }).eq('id', reverseConn.id);
          await supabaseAdmin.from('transactions').update({ counterparty_id: request.from_user_id }).eq('connection_id', reverseConn.id).is('counterparty_id', null);
          upgraded = true;
        }
      }
    }

    if (!upgraded) {
      const userA = request.from_user_id < request.to_user_id
        ? request.from_user_id
        : request.to_user_id;
      const userB = request.from_user_id < request.to_user_id
        ? request.to_user_id
        : request.from_user_id;

      await supabaseAdmin
        .from('connections')
        .insert({ user_a_id: userA, user_b_id: userB });
    }
  }

  revalidatePath('/connections');
  return { success: true };
}

// ─── Get my connections ───────────────────────────────────────
export async function getMyConnectionsAction() {
  const currentUser = await getUserFromSession();
  if (!currentUser) return { error: 'Unauthorized', connections: [] };

  let platformConns: any[] = [];
  let personalConns: any[] = [];

  const [platformResult, personalResult] = await Promise.all([
    supabaseAdmin
      .from('connections')
      .select(`
        id,
        created_at,
        contact_name,
        contact_phone,
        user_a:users!connections_user_a_id_fkey(id, username, name, avatar_url),
        user_b:users!connections_user_b_id_fkey(id, username, name, avatar_url)
      `)
      .not('user_b_id', 'is', null)
      .or(`user_a_id.eq.${currentUser.id},user_b_id.eq.${currentUser.id}`),
    supabaseAdmin
      .from('connections')
      .select(`
        id,
        created_at,
        contact_name,
        contact_phone,
        user_a:users!connections_user_a_id_fkey(id, username, name, avatar_url),
        user_b:users!connections_user_b_id_fkey(id, username, name, avatar_url)
      `)
      .is('user_b_id', null)
      .eq('user_a_id', currentUser.id)
  ]);

  if (platformResult.error && platformResult.error.code === '42703') {
    // Missing contact_name/contact_phone columns (database not migrated yet)
    const fallbackResult = await supabaseAdmin
      .from('connections')
      .select(`
        id,
        created_at,
        user_a:users!connections_user_a_id_fkey(id, username, name, avatar_url),
        user_b:users!connections_user_b_id_fkey(id, username, name, avatar_url)
      `)
      .not('user_b_id', 'is', null)
      .or(`user_a_id.eq.${currentUser.id},user_b_id.eq.${currentUser.id}`);
      
    platformConns = fallbackResult.data ?? [];
  } else {
    platformConns = platformResult.data ?? [];
    personalConns = personalResult.data ?? [];
  }

  return { connections: [...platformConns, ...personalConns] };
}

// ─── Get pending requests ─────────────────────────────────────
export async function getPendingRequestsAction() {
  const currentUser = await getUserFromSession();
  if (!currentUser) return { error: 'Unauthorized', requests: [] };

  const { data: requests } = await supabaseAdmin
    .from('connection_requests')
    .select(`
      id,
      status,
      created_at,
      from_user:users!connection_requests_from_user_id_fkey(id, username, name, avatar_url),
      to_user:users!connection_requests_to_user_id_fkey(id, username, name, avatar_url)
    `)
    .eq('to_user_id', currentUser.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  return { requests: requests ?? [] };
}

// ─── Admin: Force connect users ────────────────────────────────
export async function adminForceConnectAction(userAId: string, userBId: string) {
  const a = userAId < userBId ? userAId : userBId;
  const b = userAId < userBId ? userBId : userAId;

  const { error } = await supabaseAdmin
    .from('connections')
    .insert({ user_a_id: a, user_b_id: b });

  if (error) return { error: 'Failed to create connection (may already exist)' };

  revalidatePath('/admin/ledgers');
  return { success: true };
}

// ─── Automatic Upgrade Helper ──────────────────────────────────
export async function upgradePersonalContactsForPhone(phone: string, userId: string) {
  const trimmedPhone = phone.trim();
  if (!trimmedPhone) return { success: false };

  console.log(`[upgradePersonalContactsForPhone] Upgrading connections for phone: ${trimmedPhone}, userId: ${userId}`);

  // Find all personal contacts matching this phone number
  const { data: offlineConns, error: selectError } = await supabaseAdmin
    .from('connections')
    .select('id, user_a_id')
    .is('user_b_id', null)
    .eq('contact_phone', trimmedPhone);

  if (selectError) {
    console.error('[upgradePersonalContactsForPhone] select connections error:', selectError);
    return { error: selectError.message };
  }

  if (offlineConns && offlineConns.length > 0) {
    console.log(`[upgradePersonalContactsForPhone] Found ${offlineConns.length} matching personal contacts to upgrade.`);
    for (const conn of offlineConns) {
      // 1. Update connections
      const { error: connError } = await supabaseAdmin
        .from('connections')
        .update({ user_b_id: userId })
        .eq('id', conn.id);

      if (connError) {
        console.error(`[upgradePersonalContactsForPhone] Failed to upgrade connection ${conn.id}:`, connError);
        continue;
      }

      // 2. Update transactions
      const { error: txnError } = await supabaseAdmin
        .from('transactions')
        .update({ counterparty_id: userId })
        .eq('connection_id', conn.id)
        .is('counterparty_id', null);

      if (txnError) {
        console.error(`[upgradePersonalContactsForPhone] Failed to update transactions for connection ${conn.id}:`, txnError);
      }
    }
  }

  return { success: true };
}

