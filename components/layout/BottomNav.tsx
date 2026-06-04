'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Users, Bell, MoreHorizontal, LogOut, KeyRound, X } from 'lucide-react';
import { logoutAction } from '@/lib/actions/auth.actions';
import { useState } from 'react';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { href: '/connections', icon: Users, label: 'Connects' },
  { href: '/notifications', icon: Bell, label: 'Approvals', badge: true },
];

type Props = { pendingCount?: number };

export default function BottomNav({ pendingCount = 0 }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  function handleChangePassword() {
    setMoreOpen(false);
    router.push('/login?tab=change');
  }

  return (
    <>
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 'calc(var(--bottomnav-height) + env(safe-area-inset-bottom, 0px))',
          background: 'rgba(13, 14, 18, 0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'space-around',
          zIndex: 50,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
        className="bottom-nav"
      >
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none',
                borderRadius: '12px',
                position: 'relative',
                transition: 'all 0.2s',
                flex: 1,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  position: 'relative',
                  padding: '6px 16px',
                  borderRadius: '12px',
                }}
              >
                {active && (
                  <motion.div
                    layoutId="bottom-nav-indicator"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: '12px',
                      background: 'rgba(99,102,241,0.15)',
                      border: '1px solid rgba(99,102,241,0.25)',
                      zIndex: 0,
                    }}
                    transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                  />
                )}

                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                  <item.icon
                    size={20}
                    color={active ? 'var(--accent-primary)' : 'var(--text-muted)'}
                    style={{ position: 'relative', zIndex: 1 }}
                  />
                  {item.badge && pendingCount > 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: -5,
                        right: -7,
                        background: 'var(--danger)',
                        color: 'white',
                        fontSize: '0.5625rem',
                        fontWeight: 700,
                        borderRadius: '9999px',
                        minWidth: 14,
                        height: 14,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 3px',
                        border: '1.5px solid var(--bg-base)',
                        zIndex: 2,
                      }}
                    >
                      {pendingCount > 9 ? '9+' : pendingCount}
                    </span>
                  )}
                </div>

                <span
                  style={{
                    fontSize: '0.6375rem',
                    fontWeight: active ? 600 : 400,
                    color: active ? 'var(--accent-primary)' : 'var(--text-muted)',
                    letterSpacing: '0.01em',
                    position: 'relative',
                    zIndex: 1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}

        {/* More button */}
        <button
          onClick={() => setMoreOpen(true)}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '6px 16px',
          }}
          aria-label="More options"
        >
          <MoreHorizontal size={20} color="var(--text-muted)" />
          <span style={{ fontSize: '0.6375rem', fontWeight: 400, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            More
          </span>
        </button>
      </nav>

      {/* More Sheet */}
      <AnimatePresence>
        {moreOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.55)',
                zIndex: 60,
              }}
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 320 }}
              style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'var(--bg-surface)',
                borderTop: '1px solid var(--border-subtle)',
                borderRadius: '20px 20px 0 0',
                zIndex: 61,
                padding: '1.25rem 1.25rem calc(1.5rem + env(safe-area-inset-bottom, 0px))',
              }}
            >
              {/* Handle */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
                <div style={{ width: 40, height: 4, borderRadius: 9999, background: 'var(--border-default)' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Options</span>
                <button
                  onClick={() => setMoreOpen(false)}
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '8px', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  <X size={15} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {/* Change Password */}
                <button
                  onClick={handleChangePassword}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.875rem',
                    padding: '0.875rem 1rem',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ width: 38, height: 38, borderRadius: '10px', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <KeyRound size={17} color="var(--accent-primary)" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>Change Password</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Update your account password</div>
                  </div>
                </button>

                {/* Logout */}
                <form action={logoutAction}>
                  <button
                    type="submit"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.875rem',
                      padding: '0.875rem 1rem',
                      background: 'rgba(239,68,68,0.06)',
                      border: '1px solid rgba(239,68,68,0.2)',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      width: '100%',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ width: 38, height: 38, borderRadius: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <LogOut size={17} color="var(--danger)" />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--danger)' }}>Sign Out</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Log out of this account</div>
                    </div>
                  </button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        .bottom-nav { display: flex; }
        @media (min-width: 769px) {
          .bottom-nav { display: none !important; }
        }
      `}</style>
    </>
  );
}
