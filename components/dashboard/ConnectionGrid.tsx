'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ChevronRight, UserCheck, Search, X } from 'lucide-react';
import { formatAmount } from '@/lib/utils/currency';

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
};

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const GRADIENT_PAIRS = [
  ['#6366f1', '#8b5cf6'],
  ['#10b981', '#059669'],
  ['#f59e0b', '#d97706'],
  ['#3b82f6', '#2563eb'],
  ['#ec4899', '#db2777'],
  ['#06b6d4', '#0891b2'],
];

export default function ConnectionGrid({ connections, currentUserId, balances }: Props) {
  const [query, setQuery] = useState('');

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

      return (
        peer.name.toLowerCase().includes(q) ||
        peer.username.toLowerCase().includes(q)
      );
    });
  }, [connections, query, currentUserId]);

  if (connections.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          textAlign: 'center',
          padding: '2rem 1.5rem',
          background: 'var(--bg-surface)',
          borderRadius: '16px',
          border: '1px dashed var(--border-default)',
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'var(--bg-elevated)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 0.75rem',
          }}
        >
          <UserCheck size={20} color="var(--text-muted)" />
        </div>
        <h3
          style={{
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: '0.25rem',
          }}
        >
          No connections yet
        </h3>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Tap the floating + button on the bottom right to add your first connection
        </p>
      </motion.div>
    );
  }

  return (
    <div>
      {/* Search Filter for Accounts (shown when 3+ connections exist) */}
      {connections.length > 2 && (
        <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
          <Search
            size={14}
            color="var(--text-muted)"
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          />
          <input
            type="text"
            placeholder="Search accounts..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem 2rem 0.5rem 2.25rem',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: '0.8125rem',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{
                position: 'absolute',
                right: 8,
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
        <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
          No accounts found matching &ldquo;{query}&rdquo;
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '0.5rem',
          }}
        >
          {filteredConnections.map((conn, i) => {
            const isPersonal = !conn.user_b;
            const peer = isPersonal
              ? { name: conn.contact_name || 'Contact', username: conn.contact_phone || 'Offline' }
              : conn.user_a?.id === currentUserId 
                ? (conn.user_b || { name: 'Platform User', username: 'offline' }) 
                : (conn.user_a || { name: 'Platform User', username: 'offline' });
            const balance = balances[conn.id] ?? 0;
            const [g1, g2] = GRADIENT_PAIRS[i % GRADIENT_PAIRS.length];

            const isPositive = balance > 0;
            const isNegative = balance < 0;

            return (
              <motion.div
                key={conn.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: i * 0.04,
                  duration: 0.35,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <Link
                  href={`/ledger/${conn.id}`}
                  prefetch={false}
                  className="hover-bg-elevated"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    padding: '0.625rem 0.875rem',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.025)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    textDecoration: 'none',
                    transition: 'all 0.18s ease',
                  }}
                >
                  {/* Left: Avatar + Names */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: '10px',
                        background: isPersonal ? 'var(--bg-elevated)' : `linear-gradient(135deg, ${g1}, ${g2})`,
                        border: isPersonal ? '1px solid var(--border-default)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.8125rem',
                        fontWeight: 700,
                        color: isPersonal ? 'var(--text-secondary)' : 'white',
                        flexShrink: 0,
                        boxShadow: isPersonal ? 'none' : `0 2px 10px ${g1}33`,
                      }}
                    >
                      {getInitials(peer.name)}
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <h3
                          style={{
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            letterSpacing: '-0.01em',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            margin: 0,
                          }}
                        >
                          {peer.name}
                        </h3>
                        {isPersonal && (
                          <span
                            style={{
                              fontSize: '0.5625rem',
                              padding: '1px 5px',
                              background: 'var(--bg-elevated)',
                              borderRadius: '4px',
                              border: '1px solid var(--border-subtle)',
                              color: 'var(--text-muted)',
                              fontWeight: 600,
                              flexShrink: 0,
                            }}
                          >
                            Personal
                          </span>
                        )}
                      </div>
                      <p
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          margin: '1px 0 0',
                        }}
                      >
                        {isPersonal ? peer.username : `@${peer.username}`}
                      </p>
                    </div>
                  </div>

                  {/* Right: Balance Pill & Arrow */}
                  <div
                    style={{
                      textAlign: 'right',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.625rem',
                      flexShrink: 0,
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1px' }}>
                      <span
                        style={{
                          fontSize: '0.5625rem',
                          fontWeight: 700,
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          color: isPositive ? '#10b981' : isNegative ? '#f43f5e' : 'var(--text-muted)',
                        }}
                      >
                        {isPositive ? 'Will get' : isNegative ? 'Will give' : 'Settled'}
                      </span>
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontWeight: 700,
                          fontSize: '0.9375rem',
                          color: isPositive ? '#10b981' : isNegative ? '#f43f5e' : 'var(--text-secondary)',
                          lineHeight: 1.2,
                        }}
                      >
                        {balance === 0 ? '₹0' : formatAmount(balance)}
                      </span>
                    </div>

                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <ChevronRight size={13} color="var(--text-muted)" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
