'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { UserCheck, Search, X, User, CheckCheck } from 'lucide-react';
import { formatAmount } from '@/lib/utils/currency';
import LedgerSkeleton from '@/components/ledger/LedgerSkeleton';
import LedgerClient from '@/components/ledger/LedgerClient';
import { getLedgerDetailsAction } from '@/lib/actions/transaction.actions';

type Connection = {
  id: string;
  user_a: { id: string; username: string; name: string; avatar_url?: string | null };
  user_b?: { id: string; username: string; name: string; avatar_url?: string | null } | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  created_at: string;
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
  } | null>(null);

  const [mounted, setMounted] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // When account chat is active, hide dashboard-only top/bottom CTAs and lock body scroll
  useEffect(() => {
    if (activeLedger) {
      document.body.classList.add('ledger-view-open');
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.classList.remove('ledger-view-open');
        document.body.style.overflow = prevOverflow;
      };
    } else {
      document.body.classList.remove('ledger-view-open');
    }
  }, [activeLedger]);

  const openLedger = useCallback(async (connId: string, peerData: any, currentBalance: number) => {
    // 1. Immediately show the in-app view with instant skeleton (0ms!)
    setActiveLedger({
      connectionId: connId,
      peer: peerData,
      netBalance: currentBalance,
      transactions: null,
      isDisconnected: false,
    });

    // 2. Update browser history state without full document reload so Safari never pops up its browser chrome
    if (typeof window !== 'undefined') {
      window.history.pushState({ ledgerId: connId }, '', `/ledger/${connId}`);
    }

    // 3. Fetch full transactions via Server Action
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
        });
      }
    } catch (e) {
      console.error('Failed to load ledger details:', e);
    }
  }, []);

  const closeLedger = useCallback(() => {
    setActiveLedger(null);
    if (typeof window !== 'undefined') {
      if (window.history.state?.ledgerId) {
        window.history.back();
      } else {
        window.history.replaceState(null, '', '/dashboard');
      }
    }
    // Silently refresh dashboard balances in background
    router.refresh();
  }, [router]);

  useEffect(() => {
    const handlePopState = () => {
      // If user swipes back or taps browser back button, close active ledger if open
      setActiveLedger((current) => {
        if (current) {
          router.refresh();
          return null;
        }
        return null;
      });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [router]);

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
      const isPersonal = !conn.user_b;
      const peer = isPersonal
        ? { name: conn.contact_name || '', username: conn.contact_phone || '' }
        : conn.user_a?.id === currentUserId
        ? conn.user_b || { name: '', username: '' }
        : conn.user_a || { name: '', username: '' };

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
            const isPersonal = !conn.user_b;
            const peer = isPersonal
              ? { name: conn.contact_name || 'Contact', username: conn.contact_phone || '', avatar_url: null }
              : conn.user_a?.id === currentUserId 
                ? (conn.user_b || { name: 'Platform User', username: '', avatar_url: null }) 
                : (conn.user_a || { name: 'Platform User', username: '', avatar_url: null });

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

      {/* Native In-App Full-Screen SPA Ledger View (No Safari URL bar, No bottom action buttons, Mounted to body with zIndex 99999) */}
      {mounted && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {activeLedger && (
            <motion.div
              initial={{ opacity: 0, x: '8%' }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: '8%' }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 99999,
                background: 'var(--bg-base)',
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              {activeLedger.transactions === null ? (
                <LedgerSkeleton
                  peerName={activeLedger.peer.name}
                  peerAvatar={activeLedger.peer.avatar_url}
                  peerUsername={activeLedger.peer.username}
                  isPersonal={activeLedger.peer.isPersonal}
                  onBack={closeLedger}
                />
              ) : (
                <LedgerClient
                  connectionId={activeLedger.connectionId}
                  peer={activeLedger.peer}
                  currentUserId={currentUserId}
                  transactions={activeLedger.transactions}
                  netBalance={activeLedger.netBalance}
                  isDisconnected={activeLedger.isDisconnected}
                  initialHasMore={activeLedger.hasMore}
                  onBack={closeLedger}
                  onRefresh={reloadActiveLedger}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

