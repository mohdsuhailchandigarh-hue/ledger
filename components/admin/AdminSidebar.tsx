'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { adminLogoutAction } from '@/lib/actions/auth.actions';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Receipt,
  Shield,
  LogOut,
  TrendingUp,
} from 'lucide-react';

const nav = [
  { href: '/admin', icon: LayoutDashboard, label: 'Overview', exact: true },
  { href: '/admin/users', icon: Users, label: 'Users' },
  { href: '/admin/ledgers', icon: BookOpen, label: 'Ledgers' },
  { href: '/admin/transactions', icon: Receipt, label: 'Transactions' },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <aside
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100dvh',
        width: 'var(--sidebar-width)',
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 40,
      }}
      className="desktop-sidebar"
    >
      {/* Logo */}
      <div
        style={{
          padding: '1.25rem',
          borderBottom: '1px solid var(--border-subtle)',
          minHeight: 64,
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: '9px',
            background: 'linear-gradient(135deg, #f43f5e, #fb7185)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Shield size={17} color="white" />
        </div>
        <div>
          <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Admin Portal
          </div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
            Shared Ledger
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '0.75rem 0.625rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {nav.map((item) => {
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.625rem 0.75rem',
                borderRadius: '9px',
                textDecoration: 'none',
                background: active ? 'rgba(244,63,94,0.1)' : 'transparent',
                border: active ? '1px solid rgba(244,63,94,0.2)' : '1px solid transparent',
                color: active ? 'var(--danger)' : 'var(--text-secondary)',
                fontSize: '0.875rem',
                fontWeight: active ? 600 : 500,
                transition: 'all 0.15s',
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
              <item.icon size={17} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '0.875rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #f43f5e, #fb7185)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.8125rem',
              fontWeight: 700,
              color: 'white',
            }}
          >
            A
          </div>
          <div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Administrator
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
              Full access
            </div>
          </div>
        </div>

        <form action={adminLogoutAction}>
          <button
            type="submit"
            className="btn btn-ghost btn-icon"
            title="Sign out"
            style={{ color: 'var(--text-muted)' }}
          >
            <LogOut size={15} />
          </button>
        </form>
      </div>

      <style>{`
        .desktop-sidebar { display: none !important; }
        @media (min-width: 769px) { .desktop-sidebar { display: flex !important; flex-direction: column; } }
      `}</style>
    </aside>
  );
}
