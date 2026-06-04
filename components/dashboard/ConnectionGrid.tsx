'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, UserCheck, Clock } from 'lucide-react';
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
  if (connections.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          textAlign: 'center',
          padding: '3rem 1.5rem',
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-xl)',
          border: '1px dashed var(--border-default)',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'var(--bg-elevated)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
          }}
        >
          <UserCheck size={24} color="var(--text-muted)" />
        </div>
        <h3
          style={{
            fontSize: '1rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: '0.375rem',
          }}
        >
          No connections yet
        </h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          Connect with others to start shared ledger
        </p>
        <Link href="/connections" prefetch={false} className="btn btn-primary btn-sm">
          Add Connection
        </Link>
      </motion.div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '1rem',
      }}
    >
      {connections.map((conn, i) => {
        const isPersonal = !conn.user_b;
        const peer = isPersonal
          ? { name: conn.contact_name || 'Contact', username: conn.contact_phone || 'Offline' }
          : conn.user_a?.id === currentUserId 
            ? (conn.user_b || { name: 'Platform User', username: 'offline' }) 
            : (conn.user_a || { name: 'Platform User', username: 'offline' });
        const balance = balances[conn.id] ?? 0;
        const [g1, g2] = GRADIENT_PAIRS[i % GRADIENT_PAIRS.length];

        return (
          <motion.div
            key={conn.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: i * 0.06,
              duration: 0.5,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <Link
              href={`/ledger/${conn.id}`}
              prefetch={false}
              className="card card-interactive"
              style={{
                display: 'block',
                padding: '1.25rem',
                textDecoration: 'none',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  marginBottom: '1.125rem',
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '12px',
                    background: isPersonal ? 'var(--bg-overlay)' : `linear-gradient(135deg, ${g1}, ${g2})`,
                    border: isPersonal ? '1px solid var(--border-default)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    color: isPersonal ? 'var(--text-secondary)' : 'white',
                    letterSpacing: '0.02em',
                    flexShrink: 0,
                    boxShadow: isPersonal ? 'none' : `0 4px 14px ${g1}40`,
                  }}
                >
                  {getInitials(peer.name)}
                </div>

                {/* Arrow */}
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '8px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)',
                    transition: 'all 0.2s',
                  }}
                >
                  <ArrowRight size={13} />
                </div>
              </div>

              {/* Name */}
              <div style={{ marginBottom: '0.75rem' }}>
                <h3
                  style={{
                    fontSize: '0.9375rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: '2px',
                    letterSpacing: '-0.01em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                  }}
                >
                  {peer.name}
                  {isPersonal && (
                    <span style={{ fontSize: '0.5625rem', padding: '1px 5px', background: 'var(--bg-elevated)', borderRadius: '4px', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontWeight: 600 }}>
                      Personal
                    </span>
                  )}
                </h3>
                <p
                  style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}
                >
                  {isPersonal ? peer.username : `@${peer.username}`}
                </p>
              </div>

              {/* Balance */}
              <div
                style={{
                  padding: '0.625rem 0.875rem',
                  borderRadius: '9px',
                  background:
                    balance > 0
                      ? 'var(--success-muted)'
                      : balance < 0
                      ? 'var(--danger-muted)'
                      : 'var(--bg-elevated)',
                  border: `1px solid ${
                    balance > 0
                      ? 'var(--success-border)'
                      : balance < 0
                      ? 'var(--danger-border)'
                      : 'var(--border-subtle)'
                  }`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  {balance > 0 ? 'Will get' : balance < 0 ? 'Will give' : 'Settled'}
                </span>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 700,
                    fontSize: '0.9375rem',
                    color:
                      balance > 0
                        ? 'var(--success)'
                        : balance < 0
                        ? 'var(--danger)'
                        : 'var(--text-muted)',
                  }}
                >
                  {balance === 0 ? '₹0' : formatAmount(balance)}
                </span>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
