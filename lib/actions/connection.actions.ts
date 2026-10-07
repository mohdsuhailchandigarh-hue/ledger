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

  const cleanDigits = phone.replace(/\D/g, '').slice(-10);
  if (cleanDigits.length < 10) {
    return { error: 'Invalid phone number' };
  }

  // Prevent connecting with oneself
  const { data: myData } = await supabaseAdmin
    .from('users')
    .select('phone')
    .eq('id', currentUser.id)
    .maybeSingle();

  if (myData?.phone && myData.phone.replace(/\D/g, '').slice(-10) === cleanDigits) {
    return { isSelf: true, error: 'You cannot add your own phone number' };
  }

  // Find user by phone in database (matching exact 10 digits or with +91)
  const { data: existingUser } = await supabaseAdmin
    .from('users')
    .select('id, username, name, avatar_url, phone')
    .or(`phone.eq.${cleanDigits},phone.eq.+91${cleanDigits},phone.ilike.%${cleanDigits}`)
    .limit(1)
    .maybeSingle();

  if (existingUser && existingUser.id !== currentUser.id) {
    // Check if already connected
    const { data: existingConn } = await supabaseAdmin
      .from('connections')
      .select('id, user_a_id, user_b_id, deleted_by_a, deleted_by_b')
      .or(`and(user_a_id.eq.${currentUser.id},user_b_id.eq.${existingUser.id}),and(user_a_id.eq.${existingUser.id},user_b_id.eq.${currentUser.id})`)
      .maybeSingle();

    const isConnected = existingConn && (
      existingConn.user_a_id === currentUser.id ? !existingConn.deleted_by_a : !existingConn.deleted_by_b
    );

    // Check if pending request exists
    const { data: existingReq } = await supabaseAdmin
      .from('connection_requests')
      .select('id, status, from_user_id')
      .or(`and(from_user_id.eq.${currentUser.id},to_user_id.eq.${existingUser.id}),and(from_user_id.eq.${existingUser.id},to_user_id.eq.${currentUser.id})`)
      .eq('status', 'pending')
      .maybeSingle();

    return {
      existingUser,
      isConnected: !!isConnected,
      connectionId: existingConn?.id ?? null,
      hasPendingRequest: !!existingReq,
      isPendingFromMe: existingReq?.from_user_id === currentUser.id,
      requestId: existingReq?.id ?? null,
    };
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
      const { data: existing } = await supabaseAdmin
        .from('connections')
        .select('id')
        .eq('user_a_id', currentUser.id)
        .eq('contact_phone', trimmedPhone)
        .maybeSingle();
      return { error: 'DUPLICATE', connectionId: existing?.id };
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
  revalidatePath('/dashboard');
  revalidatePath('/');
  return { success: true, connectionId: data?.id };
}



export async function updateContactNameAction(
  connectionId: string,
  name: string,
  phone?: string | null
) {
  const currentUser = await getUserFromSession();
  if (!currentUser) return { error: 'Unauthorized' };

  const trimmed = name.trim();
  if (!trimmed) return { error: 'Name cannot be empty' };

  const { data: conn } = await supabaseAdmin
    .from('connections')
    .select('id, user_a_id, user_b_id, contact_name, contact_phone')
    .eq('id', connectionId)
    .single();

  if (!conn) return { error: 'Connection not found' };

  const isUserA = conn.user_a_id === currentUser.id;
  const isUserB = conn.user_b_id === currentUser.id;

  if (!isUserA && !isUserB) return { error: 'Unauthorized' };

  if (conn.user_b_id === null) {
    const updatePayload: { contact_name: string; contact_phone?: string } = {
      contact_name: trimmed,
    };

    if (phone !== undefined && phone !== null) {
      const cleanPhone = phone.trim().replace(/\D/g, '').slice(-10);
      if (cleanPhone.length < 10) {
        return { error: 'Please enter a valid 10-digit mobile number' };
      }

      // Check if this user already has another personal contact with this phone
      const { data: existingContact } = await supabaseAdmin
        .from('connections')
        .select('id')
        .eq('user_a_id', currentUser.id)
        .is('user_b_id', null)
        .neq('id', connectionId)
        .or(`contact_phone.eq.${cleanPhone},contact_phone.eq.+91${cleanPhone},contact_phone.ilike.%${cleanPhone}`)
        .maybeSingle();

      if (existingContact) {
        return { error: 'You already have another contact with this mobile number' };
      }

      updatePayload.contact_phone = cleanPhone;
    }

    const { error } = await supabaseAdmin
      .from('connections')
      .update(updatePayload)
      .eq('id', connectionId);

    if (error) return { error: 'Failed to update contact details' };

    revalidatePath('/connections');
    revalidatePath('/dashboard');
    revalidatePath(`/ledger/${connectionId}`);
    revalidatePath('/');
    return { success: true, name: trimmed, phone: updatePayload.contact_phone ?? conn.contact_phone };
  } else {
    let namesMap: Record<string, string> = {};
    if (conn.contact_name && conn.contact_name.startsWith('{')) {
      try {
        namesMap = JSON.parse(conn.contact_name);
      } catch {}
    } else if (conn.contact_name && conn.user_a_id) {
      namesMap[conn.user_a_id] = conn.contact_name;
    }
    namesMap[currentUser.id] = trimmed;

    const { error } = await supabaseAdmin
      .from('connections')
      .update({ contact_name: JSON.stringify(namesMap) })
      .eq('id', connectionId);

    if (error) return { error: 'Failed to update contact name' };

    revalidatePath('/connections');
    revalidatePath('/dashboard');
    revalidatePath(`/ledger/${connectionId}`);
    revalidatePath('/');
    return { success: true, name: trimmed };
  }
}

export async function updatePersonalContactAction(
  connectionId: string,
  name: string,
  phone?: string | null
) {
  return updateContactNameAction(connectionId, name, phone);
}

// ─── Send connection request ──────────────────────────────────
export async function sendConnectionRequestAction(toUserId: string) {
  const currentUser = await getUserFromSession();
  if (!currentUser) return { error: 'Unauthorized' };

  // Check if already connected (shared or upgraded)
  const { data: existingConn } = await supabaseAdmin
    .from('connections')
    .select('id, user_a_id, user_b_id, deleted_by_a, deleted_by_b')
    .or(`and(user_a_id.eq.${currentUser.id},user_b_id.eq.${toUserId}),and(user_a_id.eq.${toUserId},user_b_id.eq.${currentUser.id})`)
    .single();

  if (existingConn) {
    const isUserA = existingConn.user_a_id === currentUser.id;
    const currentUserDeleted = isUserA ? existingConn.deleted_by_a : existingConn.deleted_by_b;
    
    // Only block if the current user has NOT soft-deleted their side
    if (!currentUserDeleted) {
      return { error: 'Already connected' };
    }
  }

  // Check existing request
  const { data: existingReq } = await supabaseAdmin
    .from('connection_requests')
    .select('id, status')
    .or(`and(from_user_id.eq.${currentUser.id},to_user_id.eq.${toUserId}),and(from_user_id.eq.${toUserId},to_user_id.eq.${currentUser.id})`)
    .single();

  if (existingReq) {
    if (existingReq.status === 'pending') return { error: 'Request already sent' };
    // If request exists but is accepted or rejected, delete it so we can send a new one
    await supabaseAdmin
      .from('connection_requests')
      .delete()
      .eq('id', existingReq.id);
  }

  const { error } = await supabaseAdmin
    .from('connection_requests')
    .insert({ from_user_id: currentUser.id, to_user_id: toUserId });

  if (error) return { error: 'Failed to send request' };

  revalidatePath('/connections');
  revalidatePath('/dashboard');
  revalidatePath('/notifications');
  revalidatePath('/');
  return { success: true };
}

// ─── Cancel sent connection request ───────────────────────────
export async function cancelConnectionRequestAction(toUserIdOrRequestId: string) {
  const currentUser = await getUserFromSession();
  if (!currentUser) return { error: 'Unauthorized' };

  // First try finding by request ID
  let { data: request } = await supabaseAdmin
    .from('connection_requests')
    .select('id, from_user_id, status')
    .eq('id', toUserIdOrRequestId)
    .maybeSingle();

  // If not found by request ID, try finding by to_user_id from current user
  if (!request) {
    const { data: reqByUser } = await supabaseAdmin
      .from('connection_requests')
      .select('id, from_user_id, status')
      .eq('from_user_id', currentUser.id)
      .eq('to_user_id', toUserIdOrRequestId)
      .eq('status', 'pending')
      .maybeSingle();

    request = reqByUser;
  }

  if (!request) return { error: 'Connection request not found' };
  if (request.from_user_id !== currentUser.id) return { error: 'Unauthorized' };

  const { error } = await supabaseAdmin
    .from('connection_requests')
    .delete()
    .eq('id', request.id);

  if (error) return { error: 'Failed to cancel request' };

  revalidatePath('/connections');
  revalidatePath('/dashboard');
  revalidatePath('/notifications');
  revalidatePath('/');
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
    let newConnectionId: string | null = null;
    
    // Check if receiver (User B) matches a personal contact created by sender (User A)
    const { data: acceptingUser } = await supabaseAdmin.from('users').select('phone').eq('id', request.to_user_id).single();
    const acceptingPhoneDigits = acceptingUser?.phone ? acceptingUser.phone.replace(/\D/g, '').slice(-10) : '';
    if (acceptingPhoneDigits.length === 10) {
      const { data: personalConn } = await supabaseAdmin.from('connections')
        .select('id')
        .eq('user_a_id', request.from_user_id)
        .is('user_b_id', null)
        .or(`contact_phone.eq.${acceptingPhoneDigits},contact_phone.eq.+91${acceptingPhoneDigits},contact_phone.ilike.%${acceptingPhoneDigits}`)
        .maybeSingle();
        
      if (personalConn) {
        await supabaseAdmin.from('connections').update({ user_b_id: request.to_user_id }).eq('id', personalConn.id);
        await supabaseAdmin.from('transactions').update({ counterparty_id: request.to_user_id }).eq('connection_id', personalConn.id).is('counterparty_id', null);
        upgraded = true;
        newConnectionId = personalConn.id;
      }
    }
    
    // Check the reverse: what if the sender was the one who just registered, and receiver had the offline contact?
    if (!upgraded) {
      const { data: sendingUser } = await supabaseAdmin.from('users').select('phone').eq('id', request.from_user_id).single();
      const sendingPhoneDigits = sendingUser?.phone ? sendingUser.phone.replace(/\D/g, '').slice(-10) : '';
      if (sendingPhoneDigits.length === 10) {
        const { data: reverseConn } = await supabaseAdmin.from('connections')
          .select('id')
          .eq('user_a_id', request.to_user_id)
          .is('user_b_id', null)
          .or(`contact_phone.eq.${sendingPhoneDigits},contact_phone.eq.+91${sendingPhoneDigits},contact_phone.ilike.%${sendingPhoneDigits}`)
          .maybeSingle();
          
        if (reverseConn) {
          await supabaseAdmin.from('connections').update({ user_b_id: request.from_user_id }).eq('id', reverseConn.id);
          await supabaseAdmin.from('transactions').update({ counterparty_id: request.from_user_id }).eq('connection_id', reverseConn.id).is('counterparty_id', null);
          upgraded = true;
          newConnectionId = reverseConn.id;
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

      // Check if a connection already exists between these two users
      const { data: existingConn } = await supabaseAdmin
        .from('connections')
        .select('id')
        .eq('user_a_id', userA)
        .eq('user_b_id', userB)
        .single();

      if (existingConn) {
        // Revive the connection — clear both deletion flags
        await supabaseAdmin
          .from('connections')
          .update({ deleted_by_a: false, deleted_by_b: false })
          .eq('id', existingConn.id);
        newConnectionId = existingConn.id;
      } else {
        const { data: insertedConn } = await supabaseAdmin
          .from('connections')
          .insert({ user_a_id: userA, user_b_id: userB })
          .select('id')
          .single();
        newConnectionId = insertedConn?.id ?? null;
      }
    }

    revalidatePath('/connections');
    revalidatePath('/dashboard');
    revalidatePath('/notifications');
    revalidatePath('/');
    return { success: true, connectionId: newConnectionId };
  }

  revalidatePath('/connections');
  revalidatePath('/dashboard');
  revalidatePath('/notifications');
  revalidatePath('/');
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
        user_a_id,
        user_b_id,
        deleted_by_a,
        deleted_by_b,
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
        user_a_id,
        user_b_id,
        deleted_by_a,
        deleted_by_b,
        user_a:users!connections_user_a_id_fkey(id, username, name, avatar_url),
        user_b:users!connections_user_b_id_fkey(id, username, name, avatar_url)
      `)
      .is('user_b_id', null)
      .eq('user_a_id', currentUser.id)
  ]);

  if (platformResult.error && (platformResult.error.code === '42703' || platformResult.error.code === 'PGRST204')) {
    // Missing columns (database not migrated yet) — fall back to basic select
    const fallbackResult = await supabaseAdmin
      .from('connections')
      .select(`
        id,
        created_at,
        user_a_id,
        user_b_id,
        user_a:users!connections_user_a_id_fkey(id, username, name, avatar_url),
        user_b:users!connections_user_b_id_fkey(id, username, name, avatar_url)
      `)
      .not('user_b_id', 'is', null)
      .or(`user_a_id.eq.${currentUser.id},user_b_id.eq.${currentUser.id}`);

    platformConns = fallbackResult.data ?? [];
  } else {
    // Filter out rows where the current user has soft-deleted their side
    const rawPlatform = (platformResult.data ?? []) as any[];
    platformConns = rawPlatform.filter((c) => {
      if (c.user_a_id === currentUser.id) return !c.deleted_by_a;
      if (c.user_b_id === currentUser.id) return !c.deleted_by_b;
      return true;
    });
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

// ─── Delete ledger ─────────────────────────────────────────────
export async function deleteLedgerAction(connectionId: string): Promise<{ error?: string; success?: boolean }> {
  const currentUser = await getUserFromSession();
  if (!currentUser) return { error: 'Unauthorized' };

  // Fetch connection with deletion flags
  const { data: conn, error: fetchError } = await supabaseAdmin
    .from('connections')
    .select('id, user_a_id, user_b_id, deleted_by_a, deleted_by_b')
    .eq('id', connectionId)
    .single();

  if (fetchError || !conn) return { error: 'Connection not found' };

  const isUserA = conn.user_a_id === currentUser.id;
  const isUserB = conn.user_b_id === currentUser.id;
  const isPersonal = conn.user_b_id === null;

  if (!isUserA && !isUserB) return { error: 'Unauthorized' };

  if (isPersonal) {
    // Personal contact — hard delete (transactions cascade via FK)
    const { error } = await supabaseAdmin
      .from('connections')
      .delete()
      .eq('id', connectionId)
      .eq('user_a_id', currentUser.id);

    if (error) {
      console.warn('[deleteLedgerAction] hard delete failed, falling back to soft delete:', error.message);
      const { error: softError } = await supabaseAdmin
        .from('connections')
        .update({ deleted_by_a: true })
        .eq('id', connectionId)
        .eq('user_a_id', currentUser.id);

      if (softError) return { error: 'Failed to delete contact' };
    }
  } else {
    // Platform connection — soft delete only the caller's side
    const updateField = isUserA ? { deleted_by_a: true } : { deleted_by_b: true };
    const { error } = await supabaseAdmin
      .from('connections')
      .update(updateField)
      .eq('id', connectionId);

    if (error) return { error: 'Failed to remove ledger' };
  }

  revalidatePath('/dashboard');
  revalidatePath('/connections');
  revalidatePath(`/ledger/${connectionId}`);
  revalidatePath('/');
  return { success: true };
}

