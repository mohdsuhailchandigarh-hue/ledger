'use client';

import { useState, useTransition, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  UserPlus,
  X,
  Search,
  Check,
  Phone,
  User as UserIcon,
  AlertCircle,
  ExternalLink,
  Loader2,
  Sparkles,
} from 'lucide-react';
import {
  createPersonalContactAction,
  checkPhoneForContactAction,
  searchUsersAction,
  sendConnectionRequestAction,
} from '@/lib/actions/connection.actions';
import { useRouter } from 'next/navigation';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

type Props = {
  currentUserId: string;
  avatarUrl?: string | null;
  netPosition?: number;
};

type SearchedUser = {
  id: string;
  username: string;
  name: string;
  avatar_url?: string | null;
};

export default function AddConnectionCTA({ currentUserId, netPosition = 0 }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'personal' | 'platform'>('personal');

  const isPositive = netPosition > 0;
  const isNegative = netPosition < 0;
  // Status color matching background aura: emerald green when positive, rose red when negative, periwinkle when zero
  const statusColor = isPositive ? '#10b981' : isNegative ? '#f43f5e' : '#818cf8';

  // Lock background scroll when modal is open
  useBodyScrollLock(isOpen);

  // Personal Contact state
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [addingPersonal, setAddingPersonal] = useState(false);
  const [personalError, setPersonalError] = useState<string | null>(null);
  const [personalSuccess, setPersonalSuccess] = useState<string | null>(null);
  const [foundPlatformUser, setFoundPlatformUser] = useState<{ id: string; name: string } | null>(null);

  // Platform User search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [sendingRequestId, setSendingRequestId] = useState<string | null>(null);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());

  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Reset form states when modal opens/closes
  const handleOpen = () => {
    setPersonalError(null);
    setPersonalSuccess(null);
    setFoundPlatformUser(null);
    setSearchQuery('');
    setSearchResults([]);
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  // Add Personal (Offline) Contact
  async function handleAddPersonal(e: React.FormEvent) {
    e.preventDefault();
    if (!contactName.trim() || !contactPhone.trim()) return;

    setAddingPersonal(true);
    setPersonalError(null);
    setPersonalSuccess(null);
    setFoundPlatformUser(null);

    try {
      // 1. Check if phone matches an existing platform user
      const { existingUser } = await checkPhoneForContactAction(contactPhone.trim());
      if (existingUser && existingUser.id !== currentUserId) {
        setFoundPlatformUser(existingUser);
        setAddingPersonal(false);
        return;
      }

      // 2. Create the personal contact ledger
      const res = await createPersonalContactAction(contactName.trim(), contactPhone.trim());
      if (res.error) {
        if (res.error === 'DUPLICATE') {
          setPersonalError('A contact with this mobile number already exists in your ledger.');
        } else {
          setPersonalError(res.error);
        }
        return;
      }

      setPersonalSuccess(`Account for "${contactName.trim()}" created successfully!`);
      setContactName('');
      setContactPhone('');

      startTransition(() => {
        router.refresh();
      });

      // Auto close after 1.4s
      setTimeout(() => {
        setIsOpen(false);
      }, 1400);
    } catch (err: any) {
      setPersonalError(err.message || 'Failed to create contact account.');
    } finally {
      setAddingPersonal(false);
    }
  }

  // Send request to found platform user
  async function handleSendRequestToUser(targetUserId: string) {
    setSendingRequestId(targetUserId);
    try {
      const res = await sendConnectionRequestAction(targetUserId);
      if (res.error) {
        alert(res.error);
      } else {
        setSentRequests((prev) => new Set(prev).add(targetUserId));
        startTransition(() => {
          router.refresh();
        });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to send request');
    } finally {
      setSendingRequestId(null);
    }
  }

  // Handle Search Platform Users
  async function handleSearch(q: string) {
    setSearchQuery(q);
    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await searchUsersAction(q.trim());
      setSearchResults((res.users as SearchedUser[]) ?? []);
    } catch (err) {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  return (
    <>
      {/* ─── Floating Action Button (FAB) — Perfectly Concentric Black Glass + Edge Gaussian Color Blur ─── */}
      <motion.button
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        transition={{ type: 'spring', stiffness: 420, damping: 24 }}
        onClick={handleOpen}
        className="add-connection-fab"
        aria-label="Add New Connection"
        title="Add Connection"
        style={{
          position: 'fixed',
          bottom: 'max(1.25rem, calc(env(safe-area-inset-bottom, 0px) + 1.25rem))',
          right: 'max(1.25rem, calc(env(safe-area-inset-right, 0px) + 1.25rem))',
          zIndex: 45,
          width: 52,
          height: 52,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          outline: 'none',
          cursor: 'pointer',
          // Pitch-black center, with color coming from edge to center in a faded gaussian radial gradient
          background: `radial-gradient(circle at 50% 50%, #080c14 36%, rgba(8, 12, 20, 0.88) 60%, ${statusColor}22 82%, ${statusColor}55 100%)`,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          // Concentric circular rim reflecting background green/red
          border: `1.5px solid ${statusColor}`,
          // Zero-offset symmetric concentric glow: inward gaussian blur + edge outer reflection
          boxShadow: `0 0 16px -1px ${statusColor}66, inset 0 0 12px 2px ${statusColor}50, inset 0 0 24px 4px ${statusColor}25, 0 4px 16px rgba(0, 0, 0, 0.7)`,
          overflow: 'hidden',
        }}
      >
        <Plus
          size={24}
          strokeWidth={2.6}
          color={statusColor}
          style={{
            display: 'block',
            filter: `drop-shadow(0 0 6px ${statusColor}aa)`,
            transition: 'color 0.25s ease, filter 0.25s ease',
          }}
        />
      </motion.button>

      {/* ─── Modal / Bottom Sheet ─────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              onTouchMove={(e) => e.preventDefault()}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.72)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                zIndex: 60,
              }}
            />

            {/* Sheet / Dialog */}
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.96 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="add-connection-modal"
              style={{
                position: 'fixed',
                zIndex: 61,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                boxShadow: '0 20px 60px -10px rgba(0, 0, 0, 0.7), 0 0 40px -10px rgba(99, 102, 241, 0.2)',
                overflow: 'hidden',
              }}
            >
              {/* Mobile handle indicator */}
              <div className="sheet-handle">
                <div
                  style={{
                    width: 36,
                    height: 4,
                    borderRadius: '9999px',
                    background: 'var(--border-strong)',
                    margin: '0.75rem auto 0.25rem',
                  }}
                />
              </div>

              {/* Modal Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1.25rem 1.25rem 0.75rem',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                <div>
                  <h3
                    style={{
                      fontSize: '1.125rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      letterSpacing: '-0.02em',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <Sparkles size={17} color="var(--accent-primary)" />
                    Add Connection
                  </h3>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    Add someone to your shared financial ledger
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '8px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Tab Selector */}
              <div
                style={{
                  display: 'flex',
                  gap: '0.5rem',
                  padding: '0.875rem 1.25rem 0.5rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('personal');
                    setPersonalError(null);
                  }}
                  style={{
                    flex: 1,
                    padding: '0.625rem',
                    borderRadius: '10px',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    background: activeTab === 'personal' ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-elevated)',
                    border: `1px solid ${activeTab === 'personal' ? 'rgba(99, 102, 241, 0.35)' : 'var(--border-subtle)'}`,
                    color: activeTab === 'personal' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  }}
                >
                  Quick Contact (Offline)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('platform')}
                  style={{
                    flex: 1,
                    padding: '0.625rem',
                    borderRadius: '10px',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    background: activeTab === 'platform' ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-elevated)',
                    border: `1px solid ${activeTab === 'platform' ? 'rgba(99, 102, 241, 0.35)' : 'var(--border-subtle)'}`,
                    color: activeTab === 'platform' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  }}
                >
                  Platform User
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: '0.75rem 1.25rem 1.5rem', maxHeight: '65vh', overflowY: 'auto' }}>
                {/* ─── TAB 1: Quick Personal Contact ──────────────── */}
                {activeTab === 'personal' && (
                  <form onSubmit={handleAddPersonal} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      Create an instant offline ledger for friends, shopkeepers, or associates. No invite required.
                    </p>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>
                        Contact Name *
                      </label>
                      <div style={{ position: 'relative' }}>
                        <UserIcon size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                          type="text"
                          required
                          placeholder="e.g. Ramesh Kumar or Chai Wala"
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.625rem 0.875rem 0.625rem 2.25rem',
                            borderRadius: '10px',
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border-default)',
                            color: 'var(--text-primary)',
                            fontSize: '0.875rem',
                            outline: 'none',
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>
                        Mobile Number *
                      </label>
                      <div style={{ position: 'relative' }}>
                        <Phone size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                          type="tel"
                          required
                          placeholder="10-digit mobile number"
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.625rem 0.875rem 0.625rem 2.25rem',
                            borderRadius: '10px',
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border-default)',
                            color: 'var(--text-primary)',
                            fontSize: '0.875rem',
                            outline: 'none',
                          }}
                        />
                      </div>
                    </div>

                    {/* Error message */}
                    {personalError && (
                      <div
                        style={{
                          padding: '0.625rem 0.875rem',
                          borderRadius: '8px',
                          background: 'rgba(244, 63, 94, 0.1)',
                          border: '1px solid rgba(244, 63, 94, 0.25)',
                          color: '#f43f5e',
                          fontSize: '0.8125rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                        }}
                      >
                        <AlertCircle size={15} flex-shrink={0} />
                        <span>{personalError}</span>
                      </div>
                    )}

                    {/* Found existing platform user notice */}
                    {foundPlatformUser && (
                      <div
                        style={{
                          padding: '0.75rem 0.875rem',
                          borderRadius: '10px',
                          background: 'rgba(99, 102, 241, 0.1)',
                          border: '1px solid rgba(99, 102, 241, 0.3)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem',
                        }}
                      >
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                          💡 <strong>{foundPlatformUser.name}</strong> is registered on Shared Ledger!
                        </p>
                        <button
                          type="button"
                          onClick={() => handleSendRequestToUser(foundPlatformUser.id)}
                          disabled={sendingRequestId === foundPlatformUser.id || sentRequests.has(foundPlatformUser.id)}
                          className="btn btn-primary btn-sm"
                          style={{ alignSelf: 'flex-start' }}
                        >
                          {sentRequests.has(foundPlatformUser.id) ? 'Request Sent ✓' : 'Send Connection Request'}
                        </button>
                      </div>
                    )}

                    {/* Success message */}
                    {personalSuccess && (
                      <div
                        style={{
                          padding: '0.625rem 0.875rem',
                          borderRadius: '8px',
                          background: 'rgba(16, 185, 129, 0.1)',
                          border: '1px solid rgba(16, 185, 129, 0.25)',
                          color: '#10b981',
                          fontSize: '0.8125rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                        }}
                      >
                        <Check size={16} />
                        <span>{personalSuccess}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={addingPersonal}
                      className="btn btn-primary"
                      style={{
                        marginTop: '0.375rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem',
                      }}
                    >
                      {addingPersonal ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Creating Ledger Account...</span>
                        </>
                      ) : (
                        <>
                          <UserPlus size={16} />
                          <span>Create Account Ledger</span>
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* ─── TAB 2: Search Platform User ─────────────────── */}
                {activeTab === 'platform' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      Search for users registered on the platform to connect and maintain synchronized records.
                    </p>

                    <div style={{ position: 'relative' }}>
                      <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                      <input
                        type="text"
                        placeholder="Search by name or @username..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.625rem 0.875rem 0.625rem 2.25rem',
                          borderRadius: '10px',
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border-default)',
                          color: 'var(--text-primary)',
                          fontSize: '0.875rem',
                          outline: 'none',
                        }}
                      />
                    </div>

                    {/* Results */}
                    {searching ? (
                      <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                        <Loader2 size={18} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
                        Searching...
                      </div>
                    ) : searchResults.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                        {searchResults.map((u) => {
                          const isSent = sentRequests.has(u.id);
                          const isSending = sendingRequestId === u.id;
                          return (
                            <div
                              key={u.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '0.625rem 0.875rem',
                                borderRadius: '10px',
                                background: 'var(--bg-elevated)',
                                border: '1px solid var(--border-subtle)',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                                <div
                                  style={{
                                    width: 34,
                                    height: 34,
                                    borderRadius: '10px',
                                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontWeight: 700,
                                    fontSize: '0.8125rem',
                                    overflow: 'hidden',
                                  }}
                                >
                                  {u.avatar_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={u.avatar_url}
                                      alt={u.name}
                                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                    />
                                  ) : (
                                    u.name.slice(0, 2).toUpperCase()
                                  )}
                                </div>
                                <div>
                                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{u.name}</div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{u.username}</div>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleSendRequestToUser(u.id)}
                                disabled={isSent || isSending}
                                style={{
                                  padding: '0.375rem 0.75rem',
                                  borderRadius: '8px',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  cursor: isSent ? 'default' : 'pointer',
                                  background: isSent ? 'rgba(16, 185, 129, 0.15)' : 'var(--accent-primary)',
                                  color: isSent ? '#10b981' : '#ffffff',
                                  border: isSent ? '1px solid rgba(16, 185, 129, 0.3)' : 'none',
                                }}
                              >
                                {isSent ? 'Sent ✓' : isSending ? 'Sending...' : 'Connect'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : searchQuery.trim().length >= 2 ? (
                      <div style={{ padding: '1.25rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                        No users found matching &ldquo;{searchQuery}&rdquo;. Try adding them as an offline contact instead!
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        /* Responsive styles for FAB and Modal */
        @media (max-width: 768px) {
          .add-connection-fab {
            bottom: max(1.25rem, calc(env(safe-area-inset-bottom, 0px) + 1.25rem)) !important;
            right: 1.25rem !important;
          }
          .add-connection-modal {
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            border-radius: 20px 20px 0 0 !important;
            max-height: 85vh;
          }
          .sheet-handle {
            display: block;
          }
        }
        @media (min-width: 769px) {
          .add-connection-fab {
            bottom: 2rem !important;
            right: 2rem !important;
          }
          .add-connection-modal {
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: 90% !important;
            max-width: 480px !important;
            border-radius: 16px !important;
          }
          .sheet-handle {
            display: none;
          }
        }
      `}</style>
    </>
  );
}
