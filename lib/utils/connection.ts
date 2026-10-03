export function resolveConnectionPeerName(
  conn: {
    contact_name?: string | null;
    user_a?: any;
    user_b?: any;
    user_a_id?: string;
    user_b_id?: string | null;
  },
  currentUserId: string
): string {
  if (!conn) return 'Contact';
  const isPersonal = !conn.user_b && (!conn.user_b_id || conn.user_b_id === null);
  if (isPersonal) {
    return conn.contact_name || 'Contact';
  }
  const isUserA = conn.user_a_id ? conn.user_a_id === currentUserId : conn.user_a?.id === currentUserId;
  const peerUser = isUserA ? conn.user_b : conn.user_a;
  const defaultName = peerUser?.name || 'Contact';

  if (!conn.contact_name) return defaultName;

  if (conn.contact_name.startsWith('{')) {
    try {
      const parsed = JSON.parse(conn.contact_name);
      if (parsed[currentUserId]) {
        return parsed[currentUserId];
      }
    } catch {}
    return defaultName;
  }
  return isUserA ? (conn.contact_name || defaultName) : defaultName;
}

export function resolveSavedPeerName({
  peer,
  connectionId,
  currentUserId,
  connections,
}: {
  peer: { id?: string; name?: string; username?: string; phone?: string | null } | null | undefined;
  connectionId?: string | null;
  currentUserId: string;
  connections: Array<{
    id: string;
    user_a_id: string;
    user_b_id?: string | null;
    contact_name?: string | null;
    contact_phone?: string | null;
  }>;
}): string | null {
  if (!peer) return null;

  const cleanPeerPhone = peer.phone ? peer.phone.replace(/\D/g, '').slice(-10) : '';

  // 1. Check if the specific connection for this transaction has a saved name
  if (connectionId) {
    const conn = connections.find((c) => c.id === connectionId);
    if (conn) {
      // Check JSON mapping: {"<userId>": "Nickname"}
      if (conn.contact_name && conn.contact_name.startsWith('{')) {
        try {
          const parsed = JSON.parse(conn.contact_name);
          if (parsed[currentUserId] && typeof parsed[currentUserId] === 'string' && parsed[currentUserId].trim()) {
            return parsed[currentUserId].trim();
          }
        } catch {}
      }
      // If current user is user_a and contact_name is a plain string
      if (conn.user_a_id === currentUserId && conn.contact_name && !conn.contact_name.startsWith('{') && conn.contact_name.trim()) {
        return conn.contact_name.trim();
      }
      // If it's a personal/offline contact (user_b_id is null) owned by current user
      if ((!conn.user_b_id || conn.user_b_id === null) && conn.user_a_id === currentUserId && conn.contact_name && conn.contact_name.trim()) {
        return conn.contact_name.trim();
      }
    }
  }

  // 2. Check ANY shared connection with this peer.id
  if (peer.id) {
    const sharedConn = connections.find(
      (c) => (c.user_a_id === currentUserId && c.user_b_id === peer.id) ||
             (c.user_b_id === currentUserId && c.user_a_id === peer.id)
    );
    if (sharedConn) {
      if (sharedConn.contact_name && sharedConn.contact_name.startsWith('{')) {
        try {
          const parsed = JSON.parse(sharedConn.contact_name);
          if (parsed[currentUserId] && typeof parsed[currentUserId] === 'string' && parsed[currentUserId].trim()) {
            return parsed[currentUserId].trim();
          }
        } catch {}
      }
      if (sharedConn.user_a_id === currentUserId && sharedConn.contact_name && !sharedConn.contact_name.startsWith('{') && sharedConn.contact_name.trim()) {
        return sharedConn.contact_name.trim();
      }
    }
  }

  // 3. Check if currentUser has an offline/personal contact matching this peer's phone number
  if (cleanPeerPhone && cleanPeerPhone.length === 10) {
    const offlineConn = connections.find((c) => {
      if (c.user_a_id !== currentUserId) return false;
      if (c.user_b_id && c.user_b_id !== null) return false;
      if (!c.contact_phone) return false;
      const cleanConnPhone = c.contact_phone.replace(/\D/g, '').slice(-10);
      return cleanConnPhone === cleanPeerPhone;
    });

    if (offlineConn && offlineConn.contact_name && offlineConn.contact_name.trim()) {
      return offlineConn.contact_name.trim();
    }
  }

  // 4. What if the transaction's connection has a contact_phone that matches an offline contact?
  if (connectionId) {
    const conn = connections.find((c) => c.id === connectionId);
    if (conn?.contact_phone) {
      const cleanConnPhone = conn.contact_phone.replace(/\D/g, '').slice(-10);
      if (cleanConnPhone.length === 10) {
        const offlineConn = connections.find((c) => {
          if (c.user_a_id !== currentUserId) return false;
          if (c.user_b_id && c.user_b_id !== null) return false;
          if (!c.contact_phone) return false;
          return c.contact_phone.replace(/\D/g, '').slice(-10) === cleanConnPhone;
        });
        if (offlineConn && offlineConn.contact_name && offlineConn.contact_name.trim()) {
          return offlineConn.contact_name.trim();
        }
      }
    }
  }

  return null;
}

