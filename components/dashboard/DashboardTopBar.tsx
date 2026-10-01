'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import UserProfileDrawer from '@/components/dashboard/UserProfileDrawer';
import { extractPaletteFromUrl, type ExtractedPalette } from '@/lib/utils/colorExtractor';

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
  const [photoPalette, setPhotoPalette] = useState<ExtractedPalette | null>(null);

  useEffect(() => {
    setCurrentAvatar(avatarUrl ?? null);
    setImgError(false);
  }, [avatarUrl]);

  // Dynamically extract photo color reflection
  useEffect(() => {
    if (!currentAvatar || imgError) {
      setPhotoPalette(null);
      return;
    }
    let isMounted = true;
    extractPaletteFromUrl(currentAvatar).then((palette) => {
      if (isMounted) {
        setPhotoPalette(palette);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [currentAvatar, imgError]);
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

          {/* Right: Windows 11 Frosted Profile Icon CTA with Dynamic Photo Reflection Glow */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {/* Dynamic Photo Ambient Reflection Glow - Layer 1 (Wide Atmospheric Bloom with Gentle Breathing) */}
            {currentAvatar && !imgError && (
              <motion.div
                animate={{
                  scale: [1, 1.09, 1],
                  opacity: [0.72, 0.95, 0.72],
                }}
                transition={{
                  duration: 3.6,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                style={{
                  position: 'absolute',
                  inset: -9,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  filter: 'blur(14px) saturate(220%) brightness(1.2)',
                  pointerEvents: 'none',
                  zIndex: 0,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentAvatar}
                  alt=""
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: 'scale(1.4)',
                  }}
                />
              </motion.div>
            )}

            {/* Dynamic Photo Ambient Reflection Glow - Layer 2 (Intense Chromatic Rim Aura) */}
            {currentAvatar && !imgError && (
              <div
                style={{
                  position: 'absolute',
                  inset: -3,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  filter: 'blur(7px) saturate(260%) brightness(1.3)',
                  opacity: 0.92,
                  pointerEvents: 'none',
                  zIndex: 0,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentAvatar}
                  alt=""
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: 'scale(1.2)',
                  }}
                />
              </div>
            )}

            {/* Dynamic Ambient Light Wash using extracted tone */}
            {currentAvatar && !imgError && photoPalette && (
              <div
                style={{
                  position: 'absolute',
                  inset: -14,
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${photoPalette.accentGlow} 0%, ${photoPalette.subtleTint} 55%, transparent 80%)`,
                  filter: 'blur(12px)',
                  pointerEvents: 'none',
                  zIndex: 0,
                  opacity: 0.85,
                  transition: 'background 0.4s ease',
                }}
              />
            )}

            {/* Fallback glow for initials */}
            {(!currentAvatar || imgError) && (
              <div
                style={{
                  position: 'absolute',
                  inset: -4,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(255, 255, 255, 0.25) 0%, rgba(99, 102, 241, 0.15) 60%, transparent 85%)',
                  filter: 'blur(8px)',
                  pointerEvents: 'none',
                  zIndex: 0,
                }}
              />
            )}

            <motion.button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsProfileOpen(true);
              }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
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
                border: currentAvatar && !imgError
                  ? (photoPalette?.borderTint ? `1.5px solid ${photoPalette.borderTint}` : '1.5px solid rgba(255, 255, 255, 0.5)')
                  : '1.5px solid rgba(255, 255, 255, 0.22)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.875rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                boxShadow: currentAvatar && !imgError
                  ? `0 4px 16px rgba(0, 0, 0, 0.5), 0 0 16px ${photoPalette?.subtleTint || 'rgba(255, 255, 255, 0.2)'}, inset 0 1px 1px rgba(255, 255, 255, 0.4)`
                  : '0 4px 16px rgba(0, 0, 0, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.3)',
                flexShrink: 0,
                cursor: 'pointer',
                outline: 'none',
                transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
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
