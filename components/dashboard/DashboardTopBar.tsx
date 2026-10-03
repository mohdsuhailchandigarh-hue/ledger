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
  const [currentName, setCurrentName] = useState(userName);
  const [currentUsername, setCurrentUsername] = useState(userUsername);
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(avatarUrl ?? null);
  const [imgError, setImgError] = useState(false);
  const [photoPalette, setPhotoPalette] = useState<ExtractedPalette | null>(null);

  useEffect(() => {
    setCurrentName(userName);
  }, [userName]);

  useEffect(() => {
    setCurrentUsername(userUsername);
  }, [userUsername]);

  useEffect(() => {
    setCurrentAvatar(avatarUrl ?? null);
    setImgError(false);
  }, [avatarUrl]);

  // Track scroll direction & position to shrink CTA on scroll down, expand on scroll up / top
  const [isShrunk, setIsShrunk] = useState(false);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const diff = currentScrollY - lastScrollYRef.current;

      if (currentScrollY <= 8) {
        // At the top of the page -> always original full size
        setIsShrunk(false);
      } else if (diff > 1.5) {
        // Scrolling down -> shrink immediately
        setIsShrunk(true);
      } else if (diff < -1.5) {
        // Scrolling up -> restore immediately
        setIsShrunk(false);
      }

      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
  const accentColor = isPositive ? '#10b981' : isNegative ? '#f43f5e' : '#3897f0';

  const isMonthProfit = monthlyNet > 0;
  const isMonthLoss = monthlyNet < 0;
  const monthColor = isMonthProfit ? '#10b981' : isMonthLoss ? '#f43f5e' : 'var(--text-muted)';

  return (
    <>
      <div
        className="dashboard-topbar-wrapper"
        style={{
          paddingTop: 'max(0.625rem, env(safe-area-inset-top, 0.625rem))',
          paddingBottom: 0,
          marginBottom: '0.85rem',
        }}
      >
        {/* Elastic Overscroll Dense Blur Shield — covers rubber-band pull down up to 800px above */}
        <div className="topbar-blur-shield" aria-hidden="true" />

        {/* Progressive Blur Veil — starts light blur at CTA bottom, builds to proper dense blur at the top */}
        <div className="topbar-progressive-veil" aria-hidden="true">
          <div className="veil-blur-base" />
          <div className="veil-blur-mid" />
          <div className="veil-blur-dense" />
          <div className="veil-tint" />
        </div>

        {/* Floating Pill CTA — shrinks slightly on scroll down, restores to original size on scroll up & top */}
        <motion.header
          className="dashboard-permanent-topbar apple-glass-pill-bar"
          onClick={() => setIsProfileOpen(true)}
          animate={{
            scale: isShrunk ? 0.94 : 1,
            y: isShrunk ? -2 : 0,
          }}
          transition={{
            duration: 0.14,
            ease: [0.16, 1, 0.3, 1],
          }}
          style={{
            position: 'relative',
            width: 'calc(100% - clamp(1rem, 3.5vw, 2.5rem))',
            maxWidth: '1200px',
            margin: '0 auto',
            transformOrigin: 'top center',
            zIndex: 2,
            cursor: 'pointer',
            borderRadius: '9999px',
            boxSizing: 'border-box',
            padding: '0.45rem 0.625rem 0.45rem clamp(1.125rem, 2.5vw, 1.5rem)',
          }}
        >
        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
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
              {currentName || currentUsername || 'User'}
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
                  textShadow: 'none',
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

          {/* Right: Profile CTA with Notification Count */}
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
            {/* Avatar Button — Clean Concentric Ring (No Blurry Outer Glow) */}
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
                border: '2px solid rgba(255, 255, 255, 0.85)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.875rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.25)',
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
                  alt={currentName}
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
      </motion.header>
      </div>

      {/* User Profile & Features Menu Drawer */}
      <UserProfileDrawer
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        userName={currentName}
        userUsername={currentUsername}
        onProfileUpdate={(newName, newUsername) => {
          setCurrentName(newName);
          setCurrentUsername(newUsername);
        }}
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
