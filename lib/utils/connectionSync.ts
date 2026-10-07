// Client-side synchronization helper for connections
// Ensures additions and deletions update immediately (0ms) across all tabs, modals, and routes
// without requiring manual page refresh or impacting instant app launching.

export type SyncConnection = {
  id: string;
  created_at: string;
  contact_name?: string | null;
  contact_phone?: string | null;
  user_a_id?: string;
  user_b_id?: string | null;
  user_a: { id: string; name: string; username: string; avatar_url?: string | null };
  user_b?: { id: string; name: string; username: string; avatar_url?: string | null } | null;
};

const DELETED_KEY = 'sl_deleted_conns_v1';
const CREATED_KEY = 'sl_created_conns_v1';

export function getDeletedConnectionIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = sessionStorage.getItem(DELETED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function markConnectionDeleted(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getDeletedConnectionIds();
    current.add(id);
    sessionStorage.setItem(DELETED_KEY, JSON.stringify(Array.from(current)));

    // Clean up from created cache if present
    const createdRaw = sessionStorage.getItem(CREATED_KEY);
    if (createdRaw) {
      const createdList: SyncConnection[] = JSON.parse(createdRaw);
      const filtered = createdList.filter((c) => c.id !== id);
      sessionStorage.setItem(CREATED_KEY, JSON.stringify(filtered));
    }
  } catch {}
}

export function getCreatedConnections(): SyncConnection[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(CREATED_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function markConnectionCreated(conn: SyncConnection): void {
  if (typeof window === 'undefined') return;
  try {
    // Unmark from deleted if previously deleted
    const deleted = getDeletedConnectionIds();
    if (deleted.has(conn.id)) {
      deleted.delete(conn.id);
      sessionStorage.setItem(DELETED_KEY, JSON.stringify(Array.from(deleted)));
    }

    const current = getCreatedConnections();
    const existingIndex = current.findIndex((c) => c.id === conn.id);
    if (existingIndex >= 0) {
      current[existingIndex] = conn;
    } else {
      current.unshift(conn);
    }
    sessionStorage.setItem(CREATED_KEY, JSON.stringify(current));
  } catch {}
}

export function reconcileConnections<T extends { id: string }>(serverConnections: T[]): T[] {
  if (typeof window === 'undefined') return serverConnections;
  try {
    const deleted = getDeletedConnectionIds();
    const created = getCreatedConnections();

    // 1. Filter out known deleted connections
    const filteredServer = serverConnections.filter((c) => !deleted.has(c.id));

    // 2. Prepend known created connections not yet in server list
    const serverIds = new Set(filteredServer.map((c) => c.id));
    const pendingCreated = (created as unknown as T[]).filter((c) => !serverIds.has(c.id));

    return [...pendingCreated, ...filteredServer];
  } catch {
    return serverConnections;
  }
}
