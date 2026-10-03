'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { UserCheck, Search, X, User, CheckCheck, Lock, UserPlus, Clock, Sparkles, CheckCircle2 } from 'lucide-react';
import { formatAmount } from '@/lib/utils/currency';
import ConnectionLedgerModal from '@/components/ledger/ConnectionLedgerModal';
import { getLedgerDetailsAction } from '@/lib/actions/transaction.actions';
import { resolveConnectionPeerName } from '@/lib/utils/connection';
import { sendConnectionRequestAction, respondToConnectionRequestAction } from '@/lib/actions/connection.actions';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

type Connection = {
  id: string;
  user_a: { id: string; username: string; name: string; avatar_url?: string | null };
  user_b?: { id: string; username: string; name: string; avatar_url?: string | null } | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  created_at: string;
  isUnclaimedForMe?: boolean;
  requestInfo?: { id: string; status: string; isFromMe: boolean } | null;
};

type Props = {
  connections: Connection[];
  currentUserId: string;
  balances: Record<string, number>;
  latestTransactions?: Record<string, {
    id: string;
    note?: string | null;
    amount: number;
    direction: 'give' | 'get';
    creator_id: string;
    created_at: string;
    transaction_date?: string | null;
    status?: 'pending' | 'accepted' | 'rejected' | 'canceled';
  }>;
};

function getInitials(name: string) {
  return (name || 'User')
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const GRADIENT_PAIRS = [
  ['#065DE8', '#3897f0'],
  ['#10b981', '#059669'],
  ['#f59e0b', '#d97706'],
  ['#3b82f6', '#2563eb'],
  ['#ec4899', '#db2777'],
  ['#06b6d4', '#0891b2'],
];

function formatWhatsAppDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const now = new Date();

  // Check if same calendar day
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  if (isToday) {
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  // Check if yesterday
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return 'Yesterday';
  }

  // Older dates
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function ConnectionGrid({ connections, currentUserId, balances, latestTransactions }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [activeLedger, setActiveLedger] = useState<{
    connectionId: string;
    peer: { id: string; name: string; username: string; avatar_url?: string | null; isPersonal?: boolean };
    netBalance: number;
    transactions: any[] | null;
    isDisconnected: boolean;
    hasMore?: boolean;
    totalCount?: number;
    totalPendingCount?: number;
  } | null>(null);

  const [selectedUnclaimedConn, setSelectedUnclaimedConn] = useState<Connection | null>(null);
  const [isSendingUnclaimedReq, setIsSendingUnclaimedReq] = useState(false);
  const [sentReqIds, setSentReqIds] = useState<Record<string, boolean>>({});

  const [mounted, setMounted] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const openLedger = useCallback(async (connId: string, peerData: any, currentBalance: number) => {
    // 1. Immediately show the in-app bottom sheet with instant skeleton (0ms!)
    setActiveLedger({
      connectionId: connId,
      peer: peerData,
      netBalance: currentBalance,
      transactions: null,
      isDisconnected: false,
    });

    if (typeof window !== 'undefined') {
      window.history.pushState({ ledgerOpen: true }, '');
    }

    // 2. Fetch full transactions via Server Action in background
    try {
      const res = await getLedgerDetailsAction(connId);
      if (res && !('error' in res)) {
        setActiveLedger({
          connectionId: res.connectionId,
          peer: res.peer,
          netBalance: res.netBalance,
          transactions: res.transactions,
          isDisconnected: res.isDisconnected,
          hasMore: res.hasMore,
          totalCount: res.totalCount,
          totalPendingCount: res.totalPendingCount,
        });
      }
    } catch (e) {
      console.error('Failed to load ledger details:', e);
    }
  }, []);

  const closeLedger = useCallback(() => {
    setActiveLedger(null);
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    if (typeof window !== 'undefined' && window.history.state?.ledgerOpen) {
      window.history.back();
    }
    // Silently refresh dashboard balances in background
    router.refresh();
  }, [router]);

  useEffect(() => {
    const handlePopState = () => {
      // If user swipes back or taps browser back button, close active ledger popup if open
      setActiveLedger((current) => {
        if (current) {
          document.body.style.overflow = '';
          document.documentElement.style.overflow = '';
          router.refresh();
          return null;
        }
        return null;
      });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [router]);

  useEffect(() => {
    if (!activeLedger) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeLedger();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeLedger, closeLedger]);

  const reloadActiveLedger = useCallback(async () => {
    if (!activeLedger) return;
    try {
      const res = await getLedgerDetailsAction(activeLedger.connectionId);
      if (res && !('error' in res)) {
        setActiveLedger({
          connectionId: res.connectionId,
          peer: res.peer,
          netBalance: res.netBalance,
          transactions: res.transactions,
          isDisconnected: res.isDisconnected,
          hasMore: res.hasMore,
          totalCount: res.totalCount,
          totalPendingCount: res.totalPendingCount,
        });
      }
      router.refresh();
    } catch (e) {
      console.error('Failed to reload ledger:', e);
    }
  }, [activeLedger, router]);

  // Smoothly scroll the search bar up so it sits comfortably below the top sticky CTA with clear breathing room
  const scrollToSearch = useCallback(() => {
    if (!searchContainerRef.current) return;
    const wrapperEl = (document.querySelector('.dashboard-topbar-wrapper') || document.querySelector('.dashboard-permanent-topbar')) as HTMLElement | null;
    const wrapperHeight = wrapperEl ? wrapperEl.getBoundingClientRect().height : 92;

    // Check if there is an Accounts heading right above ConnectionGrid to keep entire section clearly visible
    const parentContainer = searchContainerRef.current.closest('div[style*="flex-direction: column"]') || searchContainerRef.current.parentElement;
    const headingEl = parentContainer?.querySelector('h2');
    const targetElement = headingEl || searchContainerRef.current;

    const rect = targetElement.getBoundingClientRect();
    const currentScroll = window.scrollY || window.pageYOffset || 0;

    // Position comfortably below the sticky topbar wrapper and blur veil with 20px clearance
    const targetY = Math.max(0, currentScroll + rect.top - wrapperHeight - 20);

    window.scrollTo({
      top: targetY,
      behavior: 'smooth',
    });
  }, []);

  const handleFocus = () => {
    setIsFocused(true);
    // Smooth scroll once shortly after focus so iOS Safari touch gesture completes
    setTimeout(() => {
      scrollToSearch();
    }, 80);
  };

  // Dismiss keyboard when Enter is pressed
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      inputRef.current?.blur();
      setIsFocused(false);
    }
  };

  // Automatically dismiss keyboard when user taps anywhere outside the search bar
  useEffect(() => {
    if (!isFocused) return;

    const handlePointerDownOutside = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (searchContainerRef.current && !searchContainerRef.current.contains(target)) {
        inputRef.current?.blur();
        setIsFocused(false);
      }
    };

    // Attach after a short delay so the initial tap that focused the search bar doesn't immediately dismiss it
    const timer = setTimeout(() => {
      document.addEventListener('pointerdown', handlePointerDownOutside, { passive: true });
    }, 120);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('pointerdown', handlePointerDownOutside);
    };
  }, [isFocused]);

  const filteredConnections = useMemo(() => {
    if (!query.trim()) return connections;
    const q = query.toLowerCase().trim();
    return connections.filter((conn) => {
      if (conn.isUnclaimedForMe) {
        const aName = conn.user_a?.name?.toLowerCase() || '';
        const aUsername = conn.user_a?.username?.toLowerCase() || '';
        return aName.includes(q) || aUsername.includes(q);
      }
      const isPersonal = !conn.user_b;
      const resolvedName = resolveConnectionPeerName(conn, currentUserId);
      const peer = isPersonal
        ? { name: resolvedName, username: conn.contact_phone || '' }
        : {
            name: resolvedName,
            username: (conn.user_a?.id === currentUserId ? conn.user_b?.username : conn.user_a?.username) || '',
          };

      const latestNote = latestTransactions?.[conn.id]?.note?.toLowerCase() || '';

      return (
        peer.name.toLowerCase().includes(q) ||
        peer.username.toLowerCase().includes(q) ||
        latestNote.includes(q)
      );
    });
  }, [connections, query, currentUserId, latestTransactions]);

  if (connections.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          textAlign: 'center',
          padding: '2.5rem 1.5rem',
          background: 'var(--bg-surface)',
          borderRadius: '16px',
          border: '1px dashed var(--border-default)',
        }}
      >
        <div
          style={{
            width: 50,
            height: 50,
            borderRadius: '50%',
            background: 'var(--bg-elevated)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 0.75rem',
          }}
        >
          <UserCheck size={22} color="var(--text-muted)" />
        </div>
        <h3
          style={{
            fontSize: '0.9375rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: '0.25rem',
          }}
        >
          No accounts yet
        </h3>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Tap the floating + button on the bottom right to start your first ledger
        </p>
      </motion.div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      {/* Search Filter for Accounts */}
      {connections.length > 0 && (
        <div
          ref={searchContainerRef}
          style={{
            position: 'relative',
            marginBottom: '0.75rem',
            scrollMarginTop: '140px',
            zIndex: 20,
          }}
        >
          <Search
            size={14}
            color={isFocused ? '#3897f0' : '#8696a0'}
            style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
              transition: 'color 0.2s ease',
            }}
          />
          <input
            ref={inputRef}
            type="text"
            className="account-search-input"
            enterKeyHint="search"
            placeholder="Search accounts or notes..."
            value={query}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={handleFocus}
            onBlur={() => {
              setTimeout(() => {
                if (document.activeElement !== inputRef.current) {
                  setIsFocused(false);
                }
              }, 100);
            }}
            onKeyDown={handleKeyDown}
            style={{
              width: '100%',
              padding: '0.625rem 2.2rem 0.625rem 2.35rem',
              borderRadius: '9999px',
              background: isFocused ? 'rgba(56, 151, 240, 0.08)' : 'rgba(255, 255, 255, 0.05)',
              border: isFocused ? '1px solid rgba(56, 151, 240, 0.65)' : '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: isFocused ? '0 0 0 2px rgba(56, 151, 240, 0.22), 0 2px 14px rgba(6, 93, 232, 0.18)' : 'none',
              color: 'var(--text-primary)',
              fontSize: '16px',
              caretColor: '#3897f0',
              outline: 'none',
              transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease',
              WebkitAppearance: 'none',
            }}
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '4px',
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {filteredConnections.length === 0 ? (
        <div style={{ padding: '2rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
          No accounts found matching &ldquo;{query}&rdquo;
        </div>
      ) : (
        /* Pure WhatsApp Chat-Style Account List - NO cards, NO bounding boxes, only a single hairline separator line */
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
          }}
        >
          {filteredConnections.map((conn, i) => {
            if (conn.isUnclaimedForMe) {
              const userA = conn.user_a || { name: 'User', username: '', avatar_url: null };
              const isReqSent = sentReqIds[conn.id] || (conn.requestInfo?.status === 'pending' && conn.requestInfo.isFromMe);
              const isReqReceived = conn.requestInfo?.status === 'pending' && !conn.requestInfo.isFromMe;
              const isLast = i === filteredConnections.length - 1;

              return (
                <motion.div
                  key={conn.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02, duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedUnclaimedConn(conn)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.875rem',
                      padding: '0.625rem 0.625rem',
                      margin: '0.125rem -0.375rem',
                      borderRadius: '14px',
                      background: 'rgba(6, 93, 232, 0.06)',
                      border: '1px solid rgba(56, 151, 240, 0.18)',
                      transition: 'background 0.15s ease, transform 0.1s ease',
                      position: 'relative',
                      cursor: 'pointer',
                      boxSizing: 'border-box',
                      WebkitTapHighlightColor: 'transparent',
                      userSelect: 'none',
                    }}
                    className="hover:bg-blue-500/[0.1] active:bg-blue-500/[0.15]"
                  >
                    {/* Left: Avatar with lock overlay */}
                    <div
                      style={{
                        position: 'relative',
                        width: 50,
                        height: 50,
                        borderRadius: '50%',
                        flexShrink: 0,
                        background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                        border: '1.5px solid rgba(56, 151, 240, 0.35)',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
                      }}
                    >
                      {userA.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={userA.avatar_url}
                          alt={userA.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: '50%' }}
                        />
                      ) : (
                        <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                          {getInitials(userA.name)}
                        </span>
                      )}
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          right: 0,
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          background: '#065DE8',
                          border: '2px solid #0f172a',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                        }}
                      >
                        <Lock size={9} strokeWidth={2.6} />
                      </div>
                    </div>

                    {/* Middle: Name + Subtitle */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span
                          style={{
                            fontSize: '0.9375rem',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            letterSpacing: '-0.01em',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {userA.name}
                        </span>
                        <span
                          style={{
                            fontSize: '0.625rem',
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: '5px',
                            background: 'rgba(56, 151, 240, 0.15)',
                            color: '#60a5fa',
                            border: '1px solid rgba(56, 151, 240, 0.25)',
                            letterSpacing: '0.02em',
                            flexShrink: 0,
                          }}
                        >
                          FOUND LEDGER
                        </span>
                      </div>
                      <p
                        style={{
                          fontSize: '0.785rem',
                          color: 'var(--text-muted)',
                          margin: '2px 0 0 0',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        Has records with your phone number · Tap to connect
                      </p>
                    </div>

                    {/* Right: Action */}
                    <div style={{ flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                      {isReqReceived ? (
                        <button
                          onClick={async () => {
                            if (!conn.requestInfo?.id) return;
                            await respondToConnectionRequestAction(conn.requestInfo.id, 'accepted');
                            router.refresh();
                          }}
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: '#ffffff',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                          }}
                        >
                          <CheckCircle2 size={13} />
                          <span>Accept</span>
                        </button>
                      ) : isReqSent ? (
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            color: '#f59e0b',
                            background: 'rgba(245, 158, 11, 0.12)',
                            border: '1px solid rgba(245, 158, 11, 0.25)',
                            padding: '4px 10px',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Clock size={11} />
                          <span>Pending</span>
                        </span>
                      ) : (
                        <button
                          onClick={async () => {
                            if (!conn.user_a?.id) return;
                            setSentReqIds((prev) => ({ ...prev, [conn.id]: true }));
                            await sendConnectionRequestAction(conn.user_a.id);
                            router.refresh();
                          }}
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: '#ffffff',
                            background: 'linear-gradient(135deg, #065DE8 0%, #3897f0 100%)',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: '0 2px 8px rgba(6, 93, 232, 0.35)',
                          }}
                        >
                          <UserPlus size={13} strokeWidth={2.4} />
                          <span>Connect</span>
                        </button>
                      )}
                    </div>
                  </div>
                  {!isLast && (
                    <div
                      style={{
                        height: '1px',
                        background: 'rgba(255, 255, 255, 0.06)',
                        marginLeft: '4.25rem',
                        marginRight: '0.375rem',
                      }}
                    />
                  )}
                </motion.div>
              );
            }

            const isPersonal = !conn.user_b;
            const resolvedName = resolveConnectionPeerName(conn, currentUserId);
            const rawPeer = isPersonal
              ? { name: resolvedName, username: conn.contact_phone || '', avatar_url: null }
              : conn.user_a?.id === currentUserId 
                ? (conn.user_b || { name: 'Platform User', username: '', avatar_url: null }) 
                : (conn.user_a || { name: 'Platform User', username: '', avatar_url: null });
            const peer = {
              ...rawPeer,
              name: resolvedName,
            };

            const balance = balances[conn.id] ?? 0;
            const [g1, g2] = GRADIENT_PAIRS[i % GRADIENT_PAIRS.length];

            const isPositive = balance > 0;
            const isNegative = balance < 0;
            const isLast = i === filteredConnections.length - 1;

            const latestTxn = latestTransactions?.[conn.id];
            const dateToFormat = latestTxn?.transaction_date || latestTxn?.created_at || conn.created_at;

            // Subtitle text: Note or last transaction or phone
            let subtitle = '';
            if (latestTxn?.note) {
              subtitle = latestTxn.note;
            } else if (latestTxn) {
              const isMe = latestTxn.creator_id === currentUserId;
              subtitle = isMe 
                ? `You: ${latestTxn.direction === 'give' ? 'Paid' : 'Requested'} ₹${latestTxn.amount.toLocaleString('en-IN')}`
                : `${peer.name.split(' ')[0]}: ${latestTxn.direction === 'give' ? 'Paid' : 'Requested'} ₹${latestTxn.amount.toLocaleString('en-IN')}`;
            } else if (isPersonal && conn.contact_phone) {
              subtitle = conn.contact_phone;
            } else if (!isPersonal && peer.username) {
              subtitle = `@${peer.username}`;
            } else {
              subtitle = 'Tap to open ledger';
            }

            return (
              <motion.div
                key={conn.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: i * 0.02,
                  duration: 0.24,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => openLedger(conn.id, peer, balance)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openLedger(conn.id, peer, balance);
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.875rem',
                    padding: '0.625rem 0.625rem',
                    margin: '0.125rem -0.375rem',
                    borderRadius: '14px',
                    transition: 'background 0.15s ease, transform 0.1s ease',
                    position: 'relative',
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                    WebkitTapHighlightColor: 'transparent',
                    userSelect: 'none',
                  }}
                  className="hover:bg-white/[0.04] active:bg-white/[0.08]"
                >
                  {/* Left: Perfectly Rounded 50px Profile Picture */}
                  <div
                    style={{
                      position: 'relative',
                      width: 50,
                      height: 50,
                      borderRadius: '50%',
                      flexShrink: 0,
                      background: isPersonal ? '#202c33' : `linear-gradient(135deg, ${g1}, ${g2})`,
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    {peer.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={peer.avatar_url}
                        alt={peer.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                          borderRadius: '50%',
                        }}
                      />
                    ) : isPersonal ? (
                      <User size={24} color="#8696a0" />
                    ) : (
                      <span
                        style={{
                          fontSize: '1.1rem',
                          fontWeight: 700,
                          color: '#ffffff',
                          letterSpacing: '-0.02em',
                        }}
                      >
                        {getInitials(peer.name)}
                      </span>
                    )}
                  </div>

                  {/* Right Content Area */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flex: 1,
                      minWidth: 0,
                      gap: '0.75rem',
                    }}
                  >
                    {/* Middle Column: Account Name + Subtitle (Note / Preview with optional time) */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      <h3
                        style={{
                          fontSize: '1.02rem',
                          fontWeight: 600,
                          color: '#f1f5f9',
                          letterSpacing: '-0.01em',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          margin: 0,
                          marginBottom: '3px',
                          lineHeight: 1.25,
                        }}
                      >
                        {peer.name}
                      </h3>

                      <p
                        style={{
                          fontSize: '0.85rem',
                          color: '#8696a0',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          margin: 0,
                          lineHeight: 1.3,
                        }}
                      >
                        {subtitle}
                      </p>
                    </div>

                    {/* Right Side Column: Latest Request Status (Pending/Approved) + Total Balance (or only Total Balance for offline) */}
                    {(() => {
                      const latestStatus =
                        !isPersonal && latestTxn
                          ? latestTxn.status === 'pending'
                            ? 'Pending'
                            : latestTxn.status === 'accepted'
                            ? 'Approved'
                            : latestTxn.status === 'rejected'
                            ? 'Rejected'
                            : null
                          : null;

                      return (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-end',
                            justifyContent: 'center',
                            flexShrink: 0,
                            gap: isPersonal || !latestStatus ? '0px' : '4px',
                          }}
                        >
                          {/* Top: Status of latest request ("Pending" / "Approved") — shown for platform users */}
                          {!isPersonal && latestStatus && (
                            <span
                              style={{
                                fontSize: '0.6875rem',
                                fontWeight: 700,
                                letterSpacing: '0.02em',
                                textTransform: 'uppercase',
                                color:
                                  latestStatus === 'Pending'
                                    ? '#f59e0b'
                                    : latestStatus === 'Approved'
                                    ? '#10b981'
                                    : latestStatus === 'Rejected'
                                    ? '#f43f5e'
                                    : '#8696a0',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <span
                                style={{
                                  width: 5,
                                  height: 5,
                                  borderRadius: '50%',
                                  background:
                                    latestStatus === 'Pending'
                                      ? '#f59e0b'
                                      : latestStatus === 'Approved'
                                      ? '#10b981'
                                      : '#f43f5e',
                                  boxShadow: 'none',
                                }}
                              />
                              {latestStatus}
                            </span>
                          )}

                          {/* Bottom / Centered: Total Balance (or Settled if zero) */}
                          {isPositive ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '2px 7.5px',
                                borderRadius: '9999px',
                                background: 'rgba(16, 185, 129, 0.16)',
                                border: '1px solid rgba(16, 185, 129, 0.35)',
                                color: '#10b981',
                                fontFamily: "'JetBrains Mono', monospace",
                                fontWeight: 700,
                                fontSize: '0.735rem',
                                letterSpacing: '-0.02em',
                                boxShadow: 'none',
                              }}
                            >
                              +₹{formatAmount(balance).replace('₹', '')}
                            </span>
                          ) : isNegative ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '2px 7.5px',
                                borderRadius: '9999px',
                                background: 'rgba(244, 63, 94, 0.16)',
                                border: '1px solid rgba(244, 63, 94, 0.35)',
                                color: '#f43f5e',
                                fontFamily: "'JetBrains Mono', monospace",
                                fontWeight: 700,
                                fontSize: '0.735rem',
                                letterSpacing: '-0.02em',
                                boxShadow: 'none',
                              }}
                            >
                              -₹{formatAmount(Math.abs(balance)).replace('₹', '')}
                            </span>
                          ) : (
                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                color: '#8696a0',
                                fontSize: '0.735rem',
                              }}
                            >
                              <CheckCheck size={14} color="#53bdeb" />
                              <span style={{ fontWeight: 500 }}>Settled</span>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
                {/* Hairline Separator Line indented past avatar */}
                {!isLast && (
                  <div
                    style={{
                      height: '1px',
                      background: 'rgba(255, 255, 255, 0.06)',
                      marginLeft: '4.25rem',
                      marginRight: '0.375rem',
                    }}
                  />
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Unclaimed Ledger / Connect Request Modal */}
      <AnimatePresence>
        {selectedUnclaimedConn && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUnclaimedConn(null)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 9000 }}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 340 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => {
                if (info.offset.y > 60 || info.velocity.y > 200) {
                  setSelectedUnclaimedConn(null);
                }
              }}
              style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'linear-gradient(180deg, #161a26 0%, #0c0d14 100%)',
                borderTop: '1px solid rgba(56, 151, 240, 0.25)',
                borderRadius: '24px 24px 0 0',
                padding: '1.25rem 1.25rem max(1.5rem, env(safe-area-inset-bottom, 1.5rem))',
                zIndex: 9001,
                maxWidth: '480px',
                margin: '0 auto',
                boxShadow: '0 -24px 64px rgba(0, 0, 0, 0.9)',
                overflow: 'hidden',
              }}
            >
              <div style={{ height: 3, width: '100%', position: 'absolute', top: 0, left: 0, right: 0, background: 'linear-gradient(90deg, transparent, #065DE8, #3897f0, transparent)' }} />
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', marginTop: '0.25rem' }}>
                <div style={{ width: 38, height: 4, borderRadius: 9999, background: 'rgba(255, 255, 255, 0.25)' }} />
              </div>

              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '12px',
                      background: 'rgba(6, 93, 232, 0.15)',
                      border: '1px solid rgba(6, 93, 232, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      color: '#3897f0',
                    }}
                  >
                    <Lock size={20} strokeWidth={2.2} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', margin: 0, letterSpacing: '-0.015em' }}>
                      {selectedUnclaimedConn.user_a?.name || 'Contact'}
                    </h3>
                    <p style={{ fontSize: '0.8125rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
                      @{selectedUnclaimedConn.user_a?.username || 'user'} · Offline Record
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedUnclaimedConn(null)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '50%',
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#94a3b8',
                  }}
                >
                  <X size={15} />
                </button>
              </div>

              {/* Explanatory Message Box */}
              <div
                style={{
                  padding: '1.125rem',
                  borderRadius: '16px',
                  background: 'rgba(6, 93, 232, 0.08)',
                  border: '1px solid rgba(56, 151, 240, 0.22)',
                  marginBottom: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#60a5fa', fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.35rem' }}>
                  <Sparkles size={16} />
                  <span>Existing Ledger Found</span>
                </div>
                <p style={{ fontSize: '0.835rem', lineHeight: 1.55, color: '#cbd5e1', margin: 0 }}>
                  <strong style={{ color: '#ffffff' }}>{selectedUnclaimedConn.user_a?.name}</strong> created personal ledger records matching your mobile number.
                </p>
                <p style={{ fontSize: '0.8rem', lineHeight: 1.5, color: '#94a3b8', margin: '0.5rem 0 0 0' }}>
                  🔒 To protect both parties’ privacy, transactions cannot be opened directly until connected. Send a connection request to connect and share this ledger.
                </p>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', width: '100%' }}>
                {selectedUnclaimedConn.requestInfo?.status === 'pending' && !selectedUnclaimedConn.requestInfo.isFromMe ? (
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    disabled={isSendingUnclaimedReq}
                    onClick={async () => {
                      if (!selectedUnclaimedConn.requestInfo?.id) return;
                      setIsSendingUnclaimedReq(true);
                      try {
                        await respondToConnectionRequestAction(selectedUnclaimedConn.requestInfo.id, 'accepted');
                        setSelectedUnclaimedConn(null);
                        router.refresh();
                      } finally {
                        setIsSendingUnclaimedReq(false);
                      }
                    }}
                    style={{
                      width: '100%',
                      height: 48,
                      borderRadius: '14px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <CheckCircle2 size={17} strokeWidth={2.4} />
                    <span>Accept Connection Request</span>
                  </motion.button>
                ) : sentReqIds[selectedUnclaimedConn.id] || (selectedUnclaimedConn.requestInfo?.status === 'pending' && selectedUnclaimedConn.requestInfo.isFromMe) ? (
                  <div
                    style={{
                      width: '100%',
                      height: 48,
                      borderRadius: '14px',
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.14)',
                      color: '#f59e0b',
                      fontWeight: 700,
                      fontSize: '0.92rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <Clock size={16} />
                    <span>Connection Request Pending Approval</span>
                  </div>
                ) : (
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    disabled={isSendingUnclaimedReq}
                    onClick={async () => {
                      if (!selectedUnclaimedConn.user_a?.id) return;
                      setIsSendingUnclaimedReq(true);
                      try {
                        await sendConnectionRequestAction(selectedUnclaimedConn.user_a.id);
                        setSentReqIds((prev) => ({ ...prev, [selectedUnclaimedConn.id]: true }));
                        router.refresh();
                      } finally {
                        setIsSendingUnclaimedReq(false);
                      }
                    }}
                    style={{
                      width: '100%',
                      height: 48,
                      borderRadius: '14px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #065DE8 0%, #3897f0 100%)',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      cursor: isSendingUnclaimedReq ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      boxShadow: '0 4px 18px rgba(6, 93, 232, 0.35)',
                    }}
                  >
                    {isSendingUnclaimedReq ? (
                      <>
                        <span
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            border: '2px solid rgba(255,255,255,0.3)',
                            borderTopColor: '#ffffff',
                            display: 'inline-block',
                            animation: 'spin 0.7s linear infinite',
                          }}
                        />
                        <span>Sending Request...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus size={17} strokeWidth={2.4} />
                        <span>Send Connection Request</span>
                      </>
                    )}
                  </motion.button>
                )}

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedUnclaimedConn(null)}
                  style={{
                    width: '100%',
                    height: 44,
                    borderRadius: '14px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#cbd5e1',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  Close
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Native In-App Bottom Sheet Popup for Ledger View with Finger Swipe Down to Dismiss and CTA Header dragging */}
      <ConnectionLedgerModal
        activeLedger={activeLedger}
        currentUserId={currentUserId}
        onClose={closeLedger}
        onRefresh={reloadActiveLedger}
      />
    </div>
  );
}

