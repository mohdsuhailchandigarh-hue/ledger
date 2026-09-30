'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  KeyRound,
  LogOut,
  X,
  ChevronRight,
} from 'lucide-react';
import { logoutAction } from '@/lib/actions/auth.actions';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  userUsername: string;
  pendingActions?: number;
  netPosition?: number;
};

function getInitials(name: string) {
  return (name || 'User')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function UserProfileDrawer({
  isOpen,
  onClose,
  userName,
  userUsername,
  pendingActions = 0,
  netPosition = 0,
}: Props) {
  const router = useRouter();
  const initials = getInitials(userName);

  // Lock background scroll when drawer is open
  useBodyScrollLock(isOpen);

  const isPositive = netPosition > 0;
  const isNegative = netPosition < 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
            onTouchMove={(e) => e.preventDefault()}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.72)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              zIndex: 100,
            }}
          />

          {/* Drawer / Sheet */}
          <motion.div
            initial={{ y: 'calc(100% + 50px)', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 'calc(100% + 50px)', opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="profile-drawer-sheet"
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              maxWidth: 480,
              margin: '0 auto',
              zIndex: 101,
              background: 'var(--bg-surface)',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              borderLeft: '1px solid rgba(255, 255, 255, 0.05)',
              borderRight: '1px solid rgba(255, 255, 255, 0.05)',
              boxShadow: '0 -24px 64px rgba(0, 0, 0, 0.8), 0 0 50px rgba(99, 102, 241, 0.12)',
              borderTopLeftRadius: '28px',
              borderTopRightRadius: '28px',
              overflow: 'visible',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Ambient Radial Glow behind Avatar */}
            <div
              style={{
                position: 'absolute',
                top: -65,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 140,
                height: 140,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(139, 92, 246, 0.4) 0%, rgba(99, 102, 241, 0.18) 45%, transparent 70%)',
                filter: 'blur(16px)',
                pointerEvents: 'none',
                zIndex: 0,
              }}
            />

            {/* Floating Avatar Circle (84px diameter, top: -42px = half in, half out) */}
            <div
              style={{
                position: 'absolute',
                top: -42,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 84,
                height: 84,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                fontWeight: 800,
                color: '#ffffff',
                letterSpacing: '-0.03em',
                textShadow: '0 2px 10px rgba(0, 0, 0, 0.45)',
                border: '4px solid var(--bg-surface)',
                boxShadow:
                  '0 14px 34px -4px rgba(99, 102, 241, 0.55), 0 6px 20px rgba(0, 0, 0, 0.7), inset 0 2px 3px rgba(255, 255, 255, 0.35)',
                zIndex: 2,
                userSelect: 'none',
              }}
            >
              {initials}

              {/* Notification badge if approvals pending */}
              {pendingActions > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    minWidth: 20,
                    height: 20,
                    padding: '0 6px',
                    borderRadius: '9999px',
                    background: '#f59e0b',
                    color: '#000000',
                    fontSize: '0.6875rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid var(--bg-surface)',
                    boxShadow: '0 0 10px rgba(245, 158, 11, 0.6)',
                  }}
                >
                  {pendingActions}
                </span>
              )}
            </div>

            {/* Close Button in Top Right */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Profile Menu"
              className="hover-bg-elevated"
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1.25rem',
                zIndex: 10,
                width: 36,
                height: 36,
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <X size={18} />
            </button>

            {/* Profile Info Header (Centered directly under avatar) */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                paddingTop: '3.25rem',
                paddingBottom: '1.25rem',
                paddingLeft: '1.5rem',
                paddingRight: '1.5rem',
                borderBottom: '1px solid var(--border-subtle)',
                textAlign: 'center',
              }}
            >
              <h3
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.025em',
                  lineHeight: 1.25,
                  margin: 0,
                }}
              >
                {userName || 'User'}
              </h3>

              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginTop: '6px',
                  padding: '2px 10px',
                  borderRadius: '9999px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.07)',
                }}
              >
                <span
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    color: 'var(--text-secondary)',
                    letterSpacing: '0.01em',
                  }}
                >
                  @{userUsername}
                </span>
              </div>
            </div>

            {/* Menu Links */}
            <div
              style={{
                padding: '1.125rem 1.25rem max(1.5rem, env(safe-area-inset-bottom, 1.5rem))',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.625rem',
                overflowY: 'auto',
              }}
            >
              {/* Option 1: Pending Approvals */}
              <Link
                href="/notifications"
                onClick={onClose}
                className="hover-bg-elevated"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.9375rem 1.125rem',
                  borderRadius: '16px',
                  background: 'rgba(255, 255, 255, 0.025)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  textDecoration: 'none',
                  color: 'var(--text-primary)',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: '12px',
                      background: 'rgba(139, 92, 246, 0.14)',
                      border: '1px solid rgba(139, 92, 246, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Bell size={18} color="#a78bfa" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      Pending Approvals
                      {pendingActions > 0 && (
                        <span
                          style={{
                            fontSize: '0.625rem',
                            fontWeight: 700,
                            padding: '1px 7px',
                            borderRadius: '9999px',
                            background: 'rgba(245, 158, 11, 0.16)',
                            color: '#f59e0b',
                            border: '1px solid rgba(245, 158, 11, 0.35)',
                          }}
                        >
                          {pendingActions} new
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                      Confirm transactions from others
                    </div>
                  </div>
                </div>
                <ChevronRight size={16} color="var(--text-muted)" />
              </Link>

              {/* Option 2: Change Password */}
              <Link
                href="/login?tab=change"
                onClick={onClose}
                className="hover-bg-elevated"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.9375rem 1.125rem',
                  borderRadius: '16px',
                  background: 'rgba(255, 255, 255, 0.025)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  textDecoration: 'none',
                  color: 'var(--text-primary)',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: '12px',
                      background: 'rgba(6, 182, 212, 0.14)',
                      border: '1px solid rgba(6, 182, 212, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <KeyRound size={18} color="#38bdf8" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Change Password</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                      Update your account security
                    </div>
                  </div>
                </div>
                <ChevronRight size={16} color="var(--text-muted)" />
              </Link>

              {/* Subtle Divider */}
              <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '0.375rem 0' }} />

              {/* Sign Out Button */}
              <form action={logoutAction} style={{ width: '100%' }}>
                <button
                  type="submit"
                  className="hover-signout"
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.875rem',
                    padding: '0.9375rem 1.125rem',
                    borderRadius: '16px',
                    background: 'rgba(244, 63, 94, 0.06)',
                    border: '1px solid rgba(244, 63, 94, 0.18)',
                    color: '#f43f5e',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: '12px',
                      background: 'rgba(244, 63, 94, 0.14)',
                      border: '1px solid rgba(244, 63, 94, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <LogOut size={18} color="#f43f5e" />
                  </div>
                  <span>Sign Out</span>
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
