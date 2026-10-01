'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import UserProfileDrawer from '@/components/dashboard/UserProfileDrawer';
import { extractPaletteFromUrl, type ExtractedPalette, DEFAULT_PALETTE } from '@/lib/utils/colorExtractor';

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

  // Extract color palette dynamically from profile picture for luminous reflection effect
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

  const activePalette = photoPalette || DEFAULT_PALETTE;

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

          {/* Right: Profile CTA with Dynamic Color Reflection & Notification Count */}
          <div
            style={{
              position: 'relative',
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {/* Dynamic Photo Ambient Reflection Glow - Layer 1 (Blurred Scaled Image Bloom) */}
            {currentAvatar && !imgError ? (
              <motion.div
                animate={{
                  scale: [1, 1.15, 0.98, 1.12, 1],
                  opacity: [0.75, 0.95, 0.78, 1, 0.75],
                }}
                transition={{
                  duration: 5.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                style={{
                  position: 'absolute',
                  inset: -10,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  filter: 'blur(12px) saturate(280%) brightness(1.35)',
                  pointerEvents: 'none',
                  zIndex: 0,
                  transformOrigin: 'center center',
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
            ) : (
              <div
                style={{
                  position: 'absolute',
                  inset: -8,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(99, 102, 241, 0.35) 0%, transparent 70%)',
                  filter: 'blur(10px)',
                  pointerEvents: 'none',
                  zIndex: 0,
                }}
              />
            )}

            {/* Dynamic Photo Ambient Reflection Glow - Layer 2 (Warm Living Pulse from Extracted Color) */}
            {currentAvatar && !imgError && (
              <motion.div
                animate={{
                  scale: [0.94, 1.16, 0.94],
                  opacity: [0.65, 0.95, 0.65],
                }}
                transition={{
                  duration: 6.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                style={{
                  position: 'absolute',
                  inset: -18,
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${activePalette.accentGlow} 0%, ${activePalette.subtleTint} 55%, transparent 75%)`,
                  filter: 'blur(18px)',
                  pointerEvents: 'none',
                  zIndex: 0,
                  transformOrigin: 'center center',
                }}
              />
            )}

            {/* Avatar Button */}
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
                border: '2px solid rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.875rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                boxShadow: currentAvatar && !imgError
                  ? `0 6px 18px -2px ${activePalette.accentGlow}, 0 2px 8px rgba(0, 0, 0, 0.6), inset 0 1px 2px rgba(255, 255, 255, 0.4)`
                  : '0 2px 8px rgba(0, 0, 0, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.2)',
                flexShrink: 0,
                cursor: 'pointer',
                outline: 'none',
                overflow: 'hidden',
                zIndex: 2,
                padding: 0,
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
                    borderRadius: '50%',
                  }}
                />
              ) : (
                initials
              )}
            </motion.button>

            {/* Notification Count Badge - matching User Profile Menu */}
            {pendingActions > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  minWidth: 19,
                  height: 19,
                  padding: '0 5px',
                  borderRadius: '9999px',
                  background: '#f59e0b',
                  color: '#000000',
                  fontSize: '0.6875rem',
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #000000',
                  boxShadow: '0 0 10px rgba(245, 158, 11, 0.75)',
                  zIndex: 10,
                  pointerEvents: 'none',
                  lineHeight: 1,
                }}
              >
                {pendingActions}
              </span>
            )}
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
