'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import UserProfileDrawer from '@/components/dashboard/UserProfileDrawer';

type Props = {
  userName: string;
  userUsername: string;
  avatarUrl?: string | null;
  greeting?: string;
  pendingActions?: number;
  netPosition?: number;
  monthlyNet?: number;
};

const formatINR = (v: number) =>
  new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);

function getInitials(name: string) {
  return (name || 'User')
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function DashboardTopBar({
  userName,
  userUsername,
  avatarUrl,
  greeting,
  pendingActions = 0,
  netPosition = 0,
  monthlyNet = 0,
}: Props) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(avatarUrl ?? null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setCurrentAvatar(avatarUrl ?? null);
    setImgError(false);
  }, [avatarUrl]);

  const initials = getInitials(userName);

  const isPositive = netPosition > 0;
  const isNegative = netPosition < 0;
  const accentColor = isPositive ? '#10b981' : isNegative ? '#f43f5e' : '#818cf8';

  const isMonthProfit = monthlyNet > 0;
  const isMonthLoss = monthlyNet < 0;
  const monthColor = isMonthProfit ? '#10b981' : isMonthLoss ? '#f43f5e' : 'var(--text-muted)';

  return (
    <>
      <header
        className="dashboard-permanent-topbar"
        style={{
          position: 'sticky',
          top: 0,
          left: 0,
          right: 0,
          width: '100%',
          zIndex: 40,
          cursor: 'pointer',
          // Clean frosted acrylic glass — subtle specular highlight, not heavily saturated
          background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, rgba(10, 12, 18, 0.65) 100%)',
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          // Rounded shape for the bottom corners
          borderBottomLeftRadius: '24px',
          borderBottomRightRadius: '24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.09)',
          boxShadow: '0 8px 32px -4px rgba(0, 0, 0, 0.45), inset 0 -1px 0 0 rgba(255, 255, 255, 0.05)',
          paddingTop: 'max(0.625rem, env(safe-area-inset-top, 0.625rem))',
          paddingBottom: '0.625rem',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            maxWidth: '1400px',
            margin: '0 auto',
            padding: '0 clamp(0.875rem, 2.5vw, 2rem)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          {/* Left: User Name + Current Month Profit/Loss */}
          <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <h1
              style={{
                fontSize: 'clamp(1rem, 3.5vw, 1.25rem)',
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
                margin: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {userName || userUsername || 'User'}
            </h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                This Month:
              </span>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  color: monthColor,
                  letterSpacing: '-0.02em',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '2px',
                  textShadow: isMonthProfit
                    ? '0 0 12px rgba(16, 185, 129, 0.3)'
                    : isMonthLoss
                    ? '0 0 12px rgba(244, 63, 94, 0.3)'
                    : 'none',
                }}
              >
                {isMonthProfit
                  ? `+₹${formatINR(monthlyNet)}`
                  : isMonthLoss
                  ? `-₹${formatINR(Math.abs(monthlyNet))}`
                  : '₹0'}
              </span>
              {(isMonthProfit || isMonthLoss) && (
                <span
                  style={{
                    fontSize: '0.625rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    background: isMonthProfit ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)',
                    color: monthColor,
                    border: `1px solid ${isMonthProfit ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)'}`,
                  }}
                >
                  {isMonthProfit ? 'Profit' : 'Loss'}
                </span>
              )}
            </div>
          </div>

          {/* Right: Windows 11 Frosted Profile Icon CTA */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <motion.button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsProfileOpen(true);
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.94 }}
              aria-label="Account and features menu"
              title="Profile & Menu"
              style={{
                position: 'relative',
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: currentAvatar && !imgError
                  ? '#090d16'
                  : 'linear-gradient(135deg, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.05) 100%)',
                border: '1.5px solid rgba(255, 255, 255, 0.22)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.875rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.2)',
                flexShrink: 0,
                cursor: 'pointer',
                outline: 'none',
                overflow: 'hidden',
                zIndex: 2,
              }}
            >
              {currentAvatar && !imgError ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentAvatar}
                  alt={userName}
                  onError={() => setImgError(true)}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
              ) : (
                initials
              )}

              {/* Notification badge if approvals pending */}
              {pendingActions > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: -2,
                    right: -2,
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: '#f59e0b',
                    border: '2px solid var(--bg-base)',
                    boxShadow: '0 0 8px #f59e0b',
                    zIndex: 3,
                  }}
                />
              )}
            </motion.button>
          </div>
        </div>
      </header>

      {/* User Profile & Features Menu Drawer */}
      <UserProfileDrawer
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        userName={userName}
        userUsername={userUsername}
        avatarUrl={currentAvatar}
        onAvatarUpdate={(url) => {
          setCurrentAvatar(url);
          setImgError(false);
        }}
        pendingActions={pendingActions}
        netPosition={netPosition}
      />
    </>
  );
}
