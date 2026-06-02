'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { LayoutDashboard, Users, Bell } from 'lucide-react';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { href: '/connections', icon: Users, label: 'Connects' },
  { href: '/notifications', icon: Bell, label: 'Approvals', badge: true },
];

type Props = { pendingCount?: number };

export default function BottomNav({ pendingCount = 0 }: Props) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
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

      <style>{`
        .bottom-nav { display: flex; }
        @media (min-width: 769px) {
          .bottom-nav { display: none !important; }
        }
      `}</style>
    </nav>
  );
}
