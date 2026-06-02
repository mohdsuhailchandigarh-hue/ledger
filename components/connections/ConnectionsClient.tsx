'use client';

import { useState, useTransition, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  sendConnectionRequestAction,
  respondToConnectionRequestAction,
  checkPhoneForContactAction,
  createPersonalContactAction,
  updatePersonalContactAction
} from '@/lib/actions/connection.actions';
import { Search, UserPlus, Check, X, Clock, Users, Link2, Phone, AlertCircle, Edit2, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

function formatDate(isoStr: string): string {
  // Show as calendar date, not relative time
  const raw = isoStr?.slice(0, 10);
  if (!raw) return '—';
  const [year, month, day] = raw.split('-').map(Number);
  if (!year || !month || !day) return raw;
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

type User = { id: string; username: string; name: string; avatar_url?: string | null };
type ConnectionReq = {
  id: string;
  status: string;
  created_at: string;
  from_user: User;
  to_user: User;
};
type Connection = {
  id: string;
  created_at: string;
  contact_name?: string | null;
  contact_phone?: string | null;
  user_a: User;
  user_b?: User | null;
};

type Props = {
  currentUserId: string;
  pendingRequests: ConnectionReq[];
  connections: Connection[];
};

// Sub-states for the "Add Personal Contact" tab
type ContactFormState =
  | { kind: 'idle' }
  | { kind: 'error'; message: string }
  | { kind: 'platform_user_found'; user: { id: string; name: string }; existingConnectionId?: string }
  | { kind: 'duplicate_contact'; connectionId: string; currentName: string }
  | { kind: 'editing_name'; connectionId: string; currentName: string }
  | { kind: 'success'; message: string };

const GRADIENT_PAIRS = [
  ['#6366f1', '#8b5cf6'],
  ['#10b981', '#059669'],
  ['#f59e0b', '#d97706'],
  ['#3b82f6', '#2563eb'],
  ['#ec4899', '#db2777'],
];

export default function ConnectionsClient({
  currentUserId,
  pendingRequests,
  connections,
}: Props) {
  const [activeTab, setActiveTab] = useState<'platform' | 'personal'>('platform');

  // ── Platform Users Tab State ──────────────────────────────
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());

  // ── Personal Contacts Tab State ───────────────────────────
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [addingContact, setAddingContact] = useState(false);
  const [contactFormState, setContactFormState] = useState<ContactFormState>({ kind: 'idle' });
  const [editName, setEditName] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);

  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // ── Derived data ──────────────────────────────────────────
  const personalContacts = connections.filter(c => !c.user_b);
  const platformConnections = connections.filter(c => !!c.user_b);

  // Local-filtered personal contacts matching search query
  const matchingPersonalContacts = useMemo(() => {
    if (query.length < 2) return [];
    const lower = query.toLowerCase();
    return personalContacts.filter(c =>
      c.contact_name?.toLowerCase().includes(lower) ||
      c.contact_phone?.includes(query)
    );
  }, [query, personalContacts]);

  // ── Handlers - Platform Tab ───────────────────────────────
  async function handleSearch(q: string) {
    setQuery(q);
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setResults(data.users ?? []);
    setSearching(false);
  }

  async function handleSendRequest(userId: string) {
    setSendingTo(userId);
    const res = await sendConnectionRequestAction(userId);
    if (!res.error) {
      setSentTo(prev => new Set(prev).add(userId));
    }
    setSendingTo(null);
  }

  // ── Handlers - Personal Tab ───────────────────────────────
  async function handleAddContact(e: React.FormEvent) {
    e.preventDefault();
    if (!contactName.trim() || !contactPhone.trim()) return;
    setAddingContact(true);
    setContactFormState({ kind: 'idle' });

    try {
      // 1. Check if phone belongs to a platform user
      const { existingUser, error: checkError } = await checkPhoneForContactAction(contactPhone.trim());
      if (checkError) throw new Error(checkError);

      if (existingUser) {
        // Check if already connected to this platform user
        const existingConn = platformConnections.find(
          c =>
            (c.user_a?.id === existingUser.id) ||
            (c.user_b?.id === existingUser.id)
        );
        setContactFormState({
          kind: 'platform_user_found',
          user: existingUser,
          existingConnectionId: existingConn?.id,
        });
        return;
      }

      // 2. Check locally if we already have a personal contact with this phone
      const duplicateConn = personalContacts.find(c => c.contact_phone === contactPhone.trim());
      if (duplicateConn) {
        setContactFormState({
          kind: 'duplicate_contact',
          connectionId: duplicateConn.id,
          currentName: duplicateConn.contact_name ?? '',
        });
        return;
      }

      // 3. Create personal contact
      const res = await createPersonalContactAction(contactName, contactPhone);

      if (res.error) {
        // Server detected a duplicate (race condition or stale local data)
        if (res.error === 'DUPLICATE') {
          setContactFormState({
            kind: 'duplicate_contact',
            connectionId: '',
            currentName: contactName,
          });
          startTransition(() => router.refresh());
          return;
        }
        // Database migration not applied
        if (res.error === 'DATABASE_NOT_MIGRATED') {
          setContactFormState({
            kind: 'error',
            message: 'The database is not configured for personal contacts yet. Please contact support.',
          });
          return;
        }
        // Any other server error
        setContactFormState({
          kind: 'error',
          message: res.error.startsWith('DB_ERROR:') ? 'A database error occurred. Please try again.' : res.error,
        });
        return;
      }

      setContactName('');
      setContactPhone('');
      setContactFormState({ kind: 'success', message: `Contact "${contactName}" added successfully!` });
      startTransition(() => router.refresh());
    } catch (err: unknown) {
      setContactFormState({
        kind: 'error',
        message: (err as Error).message || 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setAddingContact(false);
    }
  }

  async function handleSendRequestToFound(userId: string) {
    setSendingRequest(true);
    const res = await sendConnectionRequestAction(userId);
    if (!res.error) {
      setContactFormState({ kind: 'success', message: 'Connection request sent successfully!' });
      setContactName('');
      setContactPhone('');
      startTransition(() => router.refresh());
    } else {
      alert(res.error);
    }
    setSendingRequest(false);
  }

  function handleEditContact(connectionId: string, currentName: string) {
    setEditName(currentName);
    setContactFormState({ kind: 'editing_name', connectionId, currentName });
  }

  async function handleSaveEditName(connectionId: string) {
    if (!editName.trim()) return;
    setSavingEdit(true);
    const res = await updatePersonalContactAction(connectionId, editName.trim());
    if (!res.error) {
      setContactFormState({ kind: 'success', message: 'Contact name updated!' });
      setContactName('');
      setContactPhone('');
      startTransition(() => router.refresh());
    } else {
      alert(res.error);
    }
    setSavingEdit(false);
  }

  function resetContactForm() {
    setContactFormState({ kind: 'idle' });
    setContactName('');
    setContactPhone('');
  }

  async function handleRespond(reqId: string, action: 'accepted' | 'rejected') {
    await respondToConnectionRequestAction(reqId, action);
    startTransition(() => router.refresh());
  }

  const isAlreadyConnected = (userId: string) =>
    platformConnections.some(
      c => c.user_a?.id === userId || c.user_b?.id === userId
    );

  const hasPendingRequest = (userId: string) => sentTo.has(userId);

  return (
    <div style={{ padding: 'clamp(1.25rem, 3vw, 2rem)', maxWidth: '800px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1
          style={{
            fontSize: 'clamp(1.375rem, 3vw, 1.75rem)',
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
            marginBottom: '0.25rem',
          }}
        >
          Connections
        </h1>
        <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
          Connect with platform users or manage your personal contacts
        </p>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1rem',
          background: 'var(--bg-elevated)',
          padding: '0.25rem',
          borderRadius: '12px',
          width: 'fit-content',
        }}
      >
        <button
          onClick={() => setActiveTab('platform')}
          style={{
            padding: '0.5rem 1.125rem',
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontWeight: 600,
            border: 'none',
            background: activeTab === 'platform' ? 'var(--bg-card)' : 'transparent',
            color: activeTab === 'platform' ? 'var(--text-primary)' : 'var(--text-muted)',
            boxShadow: activeTab === 'platform' ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block', flexShrink: 0 }} />
          Platform Users
        </button>
        <button
          onClick={() => setActiveTab('personal')}
          style={{
            padding: '0.5rem 1.125rem',
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontWeight: 600,
            border: 'none',
            background: activeTab === 'personal' ? 'var(--bg-card)' : 'transparent',
            color: activeTab === 'personal' ? 'var(--text-primary)' : 'var(--text-muted)',
            boxShadow: activeTab === 'personal' ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--text-muted)', border: '1.5px solid var(--border-strong)', display: 'inline-block', flexShrink: 0 }} />
          Personal Contacts
        </button>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'platform' ? (
          <motion.div
            key="platform"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            {/* Pending Requests */}
            {pendingRequests.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h2
                  style={{
                    fontSize: '0.9375rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <Clock size={16} color="var(--warning)" />
                  Pending Requests
                  <span
                    style={{
                      background: 'var(--warning-muted)',
                      color: 'var(--warning)',
                      border: '1px solid var(--warning-border)',
                      borderRadius: '9999px',
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      padding: '2px 7px',
                    }}
                  >
                    {pendingRequests.length}
                  </span>
                </h2>
                <div className="card" style={{ overflow: 'hidden' }}>
                  {pendingRequests.map((req, i) => (
                    <motion.div
                      key={req.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '1rem 1.25rem',
                        borderBottom: i < pendingRequests.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                        gap: '1rem',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.875rem',
                            fontWeight: 700,
                            color: 'white',
                          }}
                        >
                          {req.from_user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
                            {req.from_user.name}
                          </p>
                          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                            @{req.from_user.username} · {formatDate(req.created_at)}
                          </p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleRespond(req.id, 'rejected')}
                          className="btn btn-danger btn-sm"
                          style={{ gap: '0.25rem' }}
                        >
                          <X size={13} /> Decline
                        </button>
                        <button
                          onClick={() => handleRespond(req.id, 'accepted')}
                          className="btn btn-success btn-sm"
                          style={{ gap: '0.25rem' }}
                        >
                          <Check size={13} /> Accept
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Search Platform Users */}
            <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Search Platform Users
              </p>
              <div style={{ position: 'relative', marginBottom: results.length > 0 || matchingPersonalContacts.length > 0 ? '0.75rem' : 0 }}>
                <Search
                  size={16}
                  color="var(--text-muted)"
                  style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  type="text"
                  className="input"
                  value={query}
                  onChange={e => handleSearch(e.target.value)}
                  placeholder="Search by username or name..."
                  style={{ paddingLeft: '2.75rem' }}
                />
                {searching && (
                  <div
                    style={{
                      position: 'absolute',
                      right: '1rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      border: '2px solid var(--border-strong)',
                      borderTopColor: 'var(--accent-primary)',
                      animation: 'spin 0.7s linear infinite',
                    }}
                  />
                )}
              </div>

              {/* Grouped results */}
              <AnimatePresence>
                {(results.length > 0 || matchingPersonalContacts.length > 0) && query.length >= 2 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div
                      style={{
                        borderRadius: '10px',
                        border: '1px solid var(--border-default)',
                        overflow: 'hidden',
                        background: 'var(--bg-elevated)',
                      }}
                    >
                      {/* Platform users group */}
                      {results.length > 0 && (
                        <>
                          <div style={{ padding: '0.5rem 1rem', background: 'var(--bg-overlay)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                            <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Platform Users</span>
                          </div>
                          {results.map((u, i) => {
                            const alreadyConnected = isAlreadyConnected(u.id);
                            const sent = hasPendingRequest(u.id);
                            return (
                              <div
                                key={u.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '0.75rem 1rem',
                                  borderBottom: (i < results.length - 1 || matchingPersonalContacts.length > 0) ? '1px solid var(--border-subtle)' : 'none',
                                  gap: '1rem',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                  <div
                                    style={{
                                      width: 34,
                                      height: 34,
                                      borderRadius: '10px',
                                      background: `linear-gradient(135deg, ${GRADIENT_PAIRS[i % GRADIENT_PAIRS.length][0]}, ${GRADIENT_PAIRS[i % GRADIENT_PAIRS.length][1]})`,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '0.8125rem',
                                      fontWeight: 700,
                                      color: 'white',
                                      flexShrink: 0,
                                    }}
                                  >
                                    {u.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                      {u.name}
                                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                                    </p>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{u.username}</p>
                                  </div>
                                </div>
                                {alreadyConnected ? (
                                  <span className="badge badge-accepted">Connected</span>
                                ) : sent ? (
                                  <span className="badge badge-pending">Sent</span>
                                ) : (
                                  <button
                                    onClick={() => handleSendRequest(u.id)}
                                    disabled={sendingTo === u.id}
                                    className="btn btn-primary btn-sm"
                                    style={{ gap: '0.375rem' }}
                                  >
                                    {sendingTo === u.id ? (
                                      <span style={{ width: 13, height: 13, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                                    ) : (
                                      <UserPlus size={13} />
                                    )}
                                    Connect
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </>
                      )}

                      {/* Personal contacts group */}
                      {matchingPersonalContacts.length > 0 && (
                        <>
                          <div style={{ padding: '0.5rem 1rem', background: 'var(--bg-overlay)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--text-muted)', border: '1.5px solid var(--border-strong)', display: 'inline-block' }} />
                            <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Personal Contacts</span>
                          </div>
                          {matchingPersonalContacts.map((conn, i) => (
                            <Link
                              key={conn.id}
                              href={`/ledger/${conn.id}`}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '0.75rem 1rem',
                                borderBottom: i < matchingPersonalContacts.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                                gap: '1rem',
                                textDecoration: 'none',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div
                                  style={{
                                    width: 34,
                                    height: 34,
                                    borderRadius: '10px',
                                    background: 'var(--bg-overlay)',
                                    border: '1px solid var(--border-default)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.8125rem',
                                    fontWeight: 700,
                                    color: 'var(--text-secondary)',
                                    flexShrink: 0,
                                  }}
                                >
                                  {(conn.contact_name ?? '?').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{conn.contact_name}</p>
                                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{conn.contact_phone}</p>
                                </div>
                              </div>
                              <span style={{ fontSize: '0.6875rem', fontWeight: 600, padding: '2px 7px', background: 'var(--bg-overlay)', border: '1px solid var(--border-default)', borderRadius: '6px', color: 'var(--text-muted)' }}>
                                Open Ledger →
                              </span>
                            </Link>
                          ))}
                        </>
                      )}

                      {/* No results found at all */}
                      {results.length === 0 && matchingPersonalContacts.length === 0 && !searching && (
                        <div style={{ padding: '1.5rem', textAlign: 'center' }}>
                          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>No platform users or personal contacts found for &ldquo;{query}&rdquo;</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="personal"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            {/* Add Personal Contact Form */}
            <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Add Personal Contact
              </p>

              <AnimatePresence mode="wait">
                {/* ── State: error ── */}
                {contactFormState.kind === 'error' && (
                  <motion.div key="error" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}>
                    <div style={{ padding: '1rem', borderRadius: '10px', border: '1px solid var(--danger-border)', background: 'var(--danger-muted)', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <AlertCircle size={16} color="var(--danger)" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <div>
                          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--danger)', marginBottom: '2px' }}>Error</p>
                          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{contactFormState.message}</p>
                        </div>
                      </div>
                      <button onClick={resetContactForm} className="btn" style={{ justifyContent: 'center', background: 'transparent', border: '1px solid var(--border-default)', color: 'var(--text-secondary)', width: '100%' }}>
                        <X size={13} /> Try Again
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* ── State: platform user found ── */}
                {contactFormState.kind === 'platform_user_found' && (
                  <motion.div key="platform_user_found" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}>
                    <div style={{ padding: '1rem', borderRadius: '10px', border: '1px solid var(--success-border)', background: 'var(--success-muted)', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <AlertCircle size={16} color="var(--success)" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <div>
                          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--success)', marginBottom: '2px' }}>
                            Platform user found
                          </p>
                          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            This mobile number belongs to <strong style={{ color: 'var(--text-primary)' }}>{contactFormState.user.name}</strong>, an existing platform user. Choose how to proceed:
                          </p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {contactFormState.existingConnectionId ? (
                          <Link
                            href={`/ledger/${contactFormState.existingConnectionId}`}
                            className="btn btn-success"
                            style={{ justifyContent: 'center', gap: '0.5rem' }}
                          >
                            <ExternalLink size={14} /> View Existing Connection
                          </Link>
                        ) : (
                          <button
                            onClick={() => handleSendRequestToFound(contactFormState.user.id)}
                            disabled={sendingRequest}
                            className="btn btn-success"
                            style={{ justifyContent: 'center', gap: '0.5rem' }}
                          >
                            {sendingRequest ? (
                              <span style={{ width: 13, height: 13, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                            ) : (
                              <UserPlus size={14} />
                            )}
                            Send Connection Request
                          </button>
                        )}
                        <button
                          onClick={resetContactForm}
                          className="btn"
                          style={{ justifyContent: 'center', background: 'transparent', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
                        >
                          <X size={13} /> Cancel
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ── State: duplicate contact ── */}
                {contactFormState.kind === 'duplicate_contact' && (
                  <motion.div key="duplicate_contact" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}>
                    <div style={{ padding: '1rem', borderRadius: '10px', border: '1px solid var(--warning-border)', background: 'var(--warning-muted)', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <AlertCircle size={16} color="var(--warning)" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <div>
                          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--warning)', marginBottom: '2px' }}>
                            Contact already exists
                          </p>
                          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            You already have a personal contact with this number as <strong style={{ color: 'var(--text-primary)' }}>&ldquo;{contactFormState.currentName}&rdquo;</strong>.
                          </p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <Link
                          href={`/ledger/${contactFormState.connectionId}`}
                          className="btn btn-primary"
                          style={{ justifyContent: 'center', gap: '0.5rem', textDecoration: 'none' }}
                        >
                          <ExternalLink size={14} /> Open Ledger
                        </Link>
                        <button
                          onClick={() => handleEditContact(contactFormState.connectionId, contactFormState.currentName)}
                          className="btn"
                          style={{ justifyContent: 'center', gap: '0.5rem', background: 'transparent', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
                        >
                          <Edit2 size={13} /> Edit Contact Name
                        </button>
                        <button
                          onClick={resetContactForm}
                          className="btn"
                          style={{ justifyContent: 'center', background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}
                        >
                          <X size={13} /> Cancel
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ── State: editing name ── */}
                {contactFormState.kind === 'editing_name' && (
                  <motion.div key="editing_name" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}>
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                      <div>
                        <label className="text-label" style={{ display: 'block', marginBottom: '0.5rem' }}>New Contact Name</label>
                        <input
                          type="text"
                          className="input"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          placeholder="Enter a new name"
                          autoFocus
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleSaveEditName(contactFormState.connectionId)}
                          disabled={savingEdit || !editName.trim()}
                          className="btn btn-primary"
                          style={{ flex: 1, justifyContent: 'center', gap: '0.5rem' }}
                        >
                          {savingEdit ? 'Saving...' : <><Check size={13} /> Save Name</>}
                        </button>
                        <button
                          onClick={resetContactForm}
                          className="btn"
                          style={{ justifyContent: 'center', background: 'transparent', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ── State: success ── */}
                {contactFormState.kind === 'success' && (
                  <motion.div key="success" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}>
                    <div style={{ padding: '1rem', borderRadius: '10px', border: '1px solid var(--success-border)', background: 'var(--success-muted)', marginBottom: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <Check size={16} color="var(--success)" style={{ flexShrink: 0 }} />
                      <p style={{ fontSize: '0.875rem', color: 'var(--success)', fontWeight: 500 }}>{contactFormState.message}</p>
                    </div>
                    <button
                      onClick={resetContactForm}
                      className="btn btn-primary"
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      Add Another Contact
                    </button>
                  </motion.div>
                )}

                {/* ── State: idle (default form) ── */}
                {contactFormState.kind === 'idle' && (
                  <motion.form key="idle" onSubmit={handleAddContact} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div style={{ display: 'grid', gap: '1rem', marginBottom: '1rem' }}>
                      <div>
                        <label className="text-label" style={{ display: 'block', marginBottom: '0.5rem' }}>Contact Name</label>
                        <input
                          type="text"
                          required
                          className="input"
                          placeholder="e.g. Local Shopkeeper, Driver, Vendor"
                          value={contactName}
                          onChange={e => setContactName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-label" style={{ display: 'block', marginBottom: '0.5rem' }}>Mobile Number</label>
                        <div style={{ position: 'relative' }}>
                          <Phone size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)' }} />
                          <input
                            type="tel"
                            required
                            className="input"
                            placeholder="e.g. 9876543210"
                            value={contactPhone}
                            onChange={e => setContactPhone(e.target.value)}
                            style={{ paddingLeft: '2.5rem' }}
                          />
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.375rem' }}>
                          If this number belongs to a platform user, you&apos;ll be offered to connect with them instead.
                        </p>
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={addingContact || !contactName || !contactPhone}
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      {addingContact ? 'Checking...' : 'Create Personal Contact'}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Active Connections ── */}
      <div>
        <h2
          style={{
            fontSize: '0.9375rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <Link2 size={16} color="var(--accent-primary)" />
          All Connections
          <span
            style={{
              background: 'rgba(99,102,241,0.12)',
              color: 'var(--accent-primary)',
              border: '1px solid rgba(99,102,241,0.25)',
              borderRadius: '9999px',
              fontSize: '0.6875rem',
              fontWeight: 700,
              padding: '2px 7px',
            }}
          >
            {connections.length}
          </span>
        </h2>

        {connections.length === 0 ? (
          <div
            className="card"
            style={{ padding: '3rem', textAlign: 'center', border: '1px dashed var(--border-default)', background: 'transparent' }}
          >
            <Users size={40} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', fontWeight: 500 }}>
              No connections yet
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: '0.375rem' }}>
              Search for platform users or add a personal contact to get started
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {connections.map((conn, i) => {
              const isPersonal = !conn.user_b;
              const peerName = isPersonal
                ? (conn.contact_name || 'Contact')
                : (conn.user_a?.id === currentUserId ? (conn.user_b?.name || 'Platform User') : (conn.user_a?.name || 'Platform User'));
              const peerSub = isPersonal
                ? conn.contact_phone || ''
                : (conn.user_a?.id === currentUserId ? `@${conn.user_b?.username || ''}` : `@${conn.user_a?.username || ''}`);
              const [g1, g2] = GRADIENT_PAIRS[i % GRADIENT_PAIRS.length];

              return (
                <motion.div
                  key={conn.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Link
                    href={`/ledger/${conn.id}`}
                    className="card card-interactive"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', textDecoration: 'none', gap: '1rem' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                      {/* Avatar */}
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: '12px',
                          background: isPersonal ? 'var(--bg-overlay)' : `linear-gradient(135deg, ${g1}, ${g2})`,
                          border: isPersonal ? '1px solid var(--border-default)' : 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.9375rem',
                          fontWeight: 700,
                          color: isPersonal ? 'var(--text-secondary)' : 'white',
                          flexShrink: 0,
                        }}
                      >
                        {peerName.charAt(0).toUpperCase()}
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <p
                          style={{
                            fontSize: '0.9375rem',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            marginBottom: '3px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {peerName}
                          {/* Type badge */}
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              fontSize: '0.625rem',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '5px',
                              background: isPersonal ? 'var(--bg-elevated)' : 'rgba(16, 185, 129, 0.12)',
                              border: isPersonal ? '1px solid var(--border-subtle)' : '1px solid rgba(16, 185, 129, 0.25)',
                              color: isPersonal ? 'var(--text-muted)' : '#10b981',
                              flexShrink: 0,
                            }}
                          >
                            <span
                              style={{
                                width: 5,
                                height: 5,
                                borderRadius: '50%',
                                background: isPersonal ? 'var(--text-muted)' : '#10b981',
                                display: 'inline-block',
                              }}
                            />
                            {isPersonal ? 'Personal' : 'Platform'}
                          </span>
                        </p>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {peerSub}
                          {' · '}
                          {formatDate(conn.created_at)}
                        </p>
                      </div>
                    </div>

                    <span className="badge badge-accepted" style={{ flexShrink: 0 }}>View →</span>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
