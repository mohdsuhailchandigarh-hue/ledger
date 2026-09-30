'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { logoutAction } from '@/lib/actions/auth.actions';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Bell,
  Settings,
  LogOut,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  KeyRound,
} from 'lucide-react';

const nav = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/connections', icon: Users, label: 'Connections' },
  { href: '/notifications', icon: Bell, label: 'Approvals', badge: true },
];

type Props = {
  pendingCount?: number;
  user: { name: string; username: string };
};

export default function Sidebar({ pendingCount = 0, user }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 68 : 240 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100dvh',
          background: 'var(--bg-surface)',
          borderRight: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 40,
          overflow: 'hidden',
        }}
        className="desktop-sidebar"
      >
        {/* Logo */}
        <div
          style={{
            padding: collapsed ? '1.25rem 0' : '1.25rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'space-between',
            borderBottom: '1px solid var(--border-subtle)',
            minHeight: '64px',
          }}
        >
          <Link
            href="/dashboard"
            prefetch={false}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              textDecoration: 'none',
              flexShrink: 0,
            }}
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              style={{
                width: 34,
                height: 34,
                borderRadius: '9px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 2px 12px rgba(99,102,241,0.35)',
              }}
            >
              <TrendingUp size={17} color="white" />
            </motion.div>
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    fontSize: '0.9375rem',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    letterSpacing: '-0.02em',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                  }}
                >
                  Shared Ledger
                </motion.span>
              )}
            </AnimatePresence>
          </Link>

          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                width: 26,
                height: 26,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                flexShrink: 0,
                transition: 'all 0.15s',
              }}
              aria-label="Collapse sidebar"
            >
              <ChevronLeft size={14} />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav
          style={{
            flex: 1,
            padding: '0.75rem 0.625rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}
        >
          {nav.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                title={collapsed ? item.label : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: collapsed ? '0.625rem' : '0.625rem 0.75rem',
                  borderRadius: '9px',
                  textDecoration: 'none',
                  background: active
                    ? 'rgba(99,102,241,0.12)'
                    : 'transparent',
                  border: active
                    ? '1px solid rgba(99,102,241,0.2)'
                    : '1px solid transparent',
                  color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  transition: 'all 0.15s',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = 'var(--bg-elevated)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }
                }}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <item.icon size={18} />
                  {item.badge && pendingCount > 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: -6,
                        right: -6,
                        background: 'var(--danger)',
                        color: 'white',
                        fontSize: '0.625rem',
                        fontWeight: 700,
                        borderRadius: '9999px',
                        minWidth: 16,
                        height: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 4px',
                      }}
                    >
                      {pendingCount > 99 ? '99+' : pendingCount}
                    </span>
                  )}
                </div>

                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.18 }}
                      style={{
                        fontSize: '0.875rem',
                        fontWeight: active ? 600 : 500,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                      }}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle when collapsed */}
        {collapsed && (
          <div
            style={{
              padding: '0.75rem',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <button
              onClick={() => setCollapsed(false)}
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                borderRadius: '8px',
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                transition: 'all 0.15s',
              }}
              aria-label="Expand sidebar"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}

        {/* User footer */}
        <div
          style={{
            borderTop: '1px solid var(--border-subtle)',
            padding: collapsed ? '0.75rem 0.625rem' : '0.875rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            justifyContent: collapsed ? 'center' : 'space-between',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.625rem',
              minWidth: 0,
              flex: collapsed ? undefined : 1,
            }}
          >
            {/* Avatar */}
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8125rem',
                fontWeight: 700,
                color: 'white',
                flexShrink: 0,
              }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  style={{ minWidth: 0, overflow: 'hidden' }}
                >
                  <div
                    style={{
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {user.name}
                  </div>
                  <div
                    style={{
                      fontSize: '0.6875rem',
                      color: 'var(--text-muted)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    @{user.username}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <button
                  type="button"
                  onClick={() => router.push('/login?tab=change')}
                  className="btn btn-ghost btn-icon"
                  title="Change password"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <KeyRound size={15} />
                </button>
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="btn btn-ghost btn-icon"
                    title="Sign out"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <LogOut size={15} />
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.aside>

      <style>{`
        .desktop-sidebar {
          display: none !important;
        }
        @media (min-width: 769px) {
          .desktop-sidebar { display: flex !important; }
        }
      `}</style>
    </>
  );
}
