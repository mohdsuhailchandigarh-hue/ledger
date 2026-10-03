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
