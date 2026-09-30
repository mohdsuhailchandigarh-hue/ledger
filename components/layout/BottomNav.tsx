'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Bell,
  MoreHorizontal,
  LogOut,
  KeyRound,
  X,
} from 'lucide-react';
import { logoutAction } from '@/lib/actions/auth.actions';
import { gsap } from 'gsap';

type Props = {
  pendingCount?: number;
};

type TabItem = {
  id: string;
  href: string;
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number; style?: React.CSSProperties }>;
  label: string;
  color: string;
  glow: string;
  isAction?: boolean;
};

const TABS: TabItem[] = [
  {
    id: 'dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    label: 'Home',
    color: 'linear-gradient(135deg, #e11d48 0%, #f43f5e 50%, #fb7185 100%)',
    glow: 'rgba(244, 63, 94, 0.65)',
  },
  {
    id: 'connections',
    href: '/connections',
    icon: Users,
    label: 'Accounts',
    color: 'linear-gradient(135deg, #ea580c 0%, #f97316 50%, #fb923c 100%)',
    glow: 'rgba(249, 115, 22, 0.65)',
  },
  {
    id: 'notifications',
    href: '/notifications',
    icon: Bell,
    label: 'Approvals',
    color: 'linear-gradient(135deg, #6d28d9 0%, #8b5cf6 50%, #a78bfa 100%)',
    glow: 'rgba(139, 92, 246, 0.65)',
  },
  {
    id: 'more',
    href: '#more',
    icon: MoreHorizontal,
    label: 'More',
    color: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 50%, #38bdf8 100%)',
    glow: 'rgba(6, 182, 212, 0.65)',
    isAction: true,
  },
];

export default function BottomNav({ pendingCount = 0 }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const containerRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const svgPathRef = useRef<SVGPathElement>(null);
  const svgStrokeRef = useRef<SVGPathElement>(null);

  const [containerWidth, setContainerWidth] = useState(390);
  const [moreOpen, setMoreOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Position tracker ref for GSAP smooth tweening
  const animPos = useRef({ x: 48, scale: 1 });
  const activeIdxRef = useRef(0);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const hasMovedRef = useRef(false);

  // Determine current active tab index from URL
  const getIndexFromPath = useCallback(() => {
    if (pathname.startsWith('/notifications')) return 2;
    if (pathname.startsWith('/connections')) return 1;
    return 0; // default /dashboard
  }, [pathname]);

  const activeIndex = getIndexFromPath();

  // Helper to compute slot center
  const getTabCenter = useCallback(
    (index: number, totalW: number) => {
      const slotW = totalW / TABS.length;
      return slotW * (index + 0.5);
    },
    []
  );

  // SVG Curved Scoop Path generator
  // Creates the organic concave cradle notch that sweeps under the floating bubble
  const generateNotchPath = useCallback((x: number, w: number, h: number = 72) => {
    const y0 = 16;   // flat baseline of bar
    const r = 18;    // top corner radius
    const nw = 42;   // half-width of the notch
    const nd = 26;   // notch depth dip

    const left = Math.max(r, x - nw);
    const right = Math.min(w - r, x + nw);

    return `
      M 0 ${y0 + r}
      Q 0 ${y0} ${r} ${y0}
      L ${left} ${y0}
      C ${x - nw * 0.55} ${y0}, ${x - nw * 0.45} ${y0 + nd}, ${x} ${y0 + nd}
      C ${x + nw * 0.45} ${y0 + nd}, ${x + nw * 0.55} ${y0}, ${right} ${y0}
      L ${w - r} ${y0}
      Q ${w} ${y0} ${w} ${y0 + r}
      L ${w} ${h}
      L 0 ${h}
      Z
    `;
  }, []);

  const generateTopStroke = useCallback((x: number, w: number) => {
    const y0 = 16;
    const r = 18;
    const nw = 42;
    const nd = 26;

    const left = Math.max(r, x - nw);
    const right = Math.min(w - r, x + nw);

    return `
      M 0 ${y0 + r}
      Q 0 ${y0} ${r} ${y0}
      L ${left} ${y0}
      C ${x - nw * 0.55} ${y0}, ${x - nw * 0.45} ${y0 + nd}, ${x} ${y0 + nd}
      C ${x + nw * 0.45} ${y0 + nd}, ${x + nw * 0.55} ${y0}, ${right} ${y0}
      L ${w - r} ${y0}
      Q ${w} ${y0} ${w} ${y0 + r}
    `;
  }, []);

  // Update DOM representation of notch & bubble
  const renderPos = useCallback(
    (x: number, scale: number = 1) => {
      const w = containerWidth || 390;
      if (svgPathRef.current) {
        svgPathRef.current.setAttribute('d', generateNotchPath(x, w, 75));
      }
      if (svgStrokeRef.current) {
        svgStrokeRef.current.setAttribute('d', generateTopStroke(x, w));
      }
      if (bubbleRef.current) {
        bubbleRef.current.style.transform = `translate3d(${x - 26}px, -14px, 0) scale(${scale})`;
      }
    },
    [containerWidth, generateNotchPath, generateTopStroke]
  );

  // ResizeObserver to track container width on mobile
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateWidth = () => {
      const w = el.clientWidth || window.innerWidth;
      setContainerWidth(w);
      const targetX = getTabCenter(activeIdxRef.current, w);
      animPos.current.x = targetX;
      renderPos(targetX, 1);
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(el);
    return () => observer.disconnect();
  }, [getTabCenter, renderPos]);

  // Animate to tab index with elastic spring
  const animateToIndex = useCallback(
    (idx: number, immediate: boolean = false) => {
      activeIdxRef.current = idx;
      const targetX = getTabCenter(idx, containerWidth);

      if (immediate) {
        animPos.current.x = targetX;
        animPos.current.scale = 1;
        renderPos(targetX, 1);
        return;
      }

      gsap.killTweensOf(animPos.current);
      gsap.to(animPos.current, {
        x: targetX,
        scale: 1,
        duration: 0.48,
        ease: 'back.out(1.5)',
        onUpdate: () => {
          renderPos(animPos.current.x, animPos.current.scale);
        },
      });
    },
    [containerWidth, getTabCenter, renderPos]
  );

  // Sync with route changes
  useEffect(() => {
    const idx = getIndexFromPath();
    animateToIndex(idx);
  }, [pathname, getIndexFromPath, animateToIndex]);

  // ─── Gesture Handlers (Tap, Hold, Swipe / Drag) ────────────

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Only primary touch/click
    const el = containerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const touchX = e.clientX - rect.left;

    isDraggingRef.current = true;
    dragStartXRef.current = touchX;
    hasMovedRef.current = false;
    setIsDragging(true);

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}

    // Lift and scale the bubble for immediate responsive feedback
    gsap.killTweensOf(animPos.current);
    gsap.to(animPos.current, {
      scale: 1.15,
      duration: 0.2,
      ease: 'power2.out',
      onUpdate: () => {
        renderPos(animPos.current.x, animPos.current.scale);
      },
    });

    if (navigator.vibrate) {
      navigator.vibrate(8);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const el = containerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const touchX = e.clientX - rect.left;

    if (Math.abs(touchX - dragStartXRef.current) > 5) {
      hasMovedRef.current = true;
    }

    const slotW = containerWidth / TABS.length;
    const minX = slotW * 0.5;
    const maxX = containerWidth - slotW * 0.5;
    const clampedX = Math.max(minX, Math.min(maxX, touchX));

    // Follow the finger in real time
    animPos.current.x = clampedX;
    renderPos(clampedX, 1.15);

    // Compute which tab is currently hovered
    const rawIdx = (clampedX - slotW * 0.5) / slotW;
    const hoverIdx = Math.max(0, Math.min(TABS.length - 1, Math.round(rawIdx)));

    if (hoverIdx !== activeIdxRef.current) {
      activeIdxRef.current = hoverIdx;
      if (navigator.vibrate) {
        navigator.vibrate(6);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}

    const el = containerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const touchX = e.clientX - rect.left;
    const slotW = containerWidth / TABS.length;

    let targetIdx: number;

    if (!hasMovedRef.current) {
      // Tap on a specific slot
      targetIdx = Math.max(0, Math.min(TABS.length - 1, Math.floor(touchX / slotW)));
    } else {
      // Swiped and released
      const clampedX = Math.max(slotW * 0.5, Math.min(containerWidth - slotW * 0.5, touchX));
      targetIdx = Math.max(0, Math.min(TABS.length - 1, Math.round((clampedX - slotW * 0.5) / slotW)));
    }

    // Snap to the target tab
    animateToIndex(targetIdx);

    // Trigger action or navigation
    const targetTab = TABS[targetIdx];
    if (targetTab.isAction) {
      setMoreOpen(true);
    } else {
      router.push(targetTab.href);
    }
  };

  function handleChangePassword() {
    setMoreOpen(false);
    router.push('/login?tab=change');
  }

  const currentTab = TABS[activeIdxRef.current] || TABS[0];
  const ActiveIcon = currentTab.icon;

  return (
    <>
      {/* ─── Outer Curved Bar Container ─────────────────────────── */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="curved-bottom-nav"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 'calc(68px + env(safe-area-inset-bottom, 0px))',
          zIndex: 50,
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          cursor: isDragging ? 'grabbing' : 'pointer',
        }}
      >
        {/* Floating Active Circular Bubble */}
        <div
          ref={bubbleRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: currentTab.color,
            boxShadow: `0 10px 24px -2px ${currentTab.glow}, 0 4px 12px ${currentTab.glow}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            zIndex: 10,
            pointerEvents: 'none',
            transition: 'background 0.3s ease, box-shadow 0.3s ease',
          }}
        >
          <ActiveIcon size={22} color="#ffffff" strokeWidth={2.4} />

          {/* Badge inside active bubble if approvals has pending */}
          {currentTab.id === 'notifications' && pendingCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: -2,
                right: -2,
                background: '#ffffff',
                color: '#e11d48',
                fontSize: '0.625rem',
                fontWeight: 800,
                borderRadius: '9999px',
                minWidth: 16,
                height: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 4px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
              }}
            >
              {pendingCount > 9 ? '9+' : pendingCount}
            </span>
          )}
        </div>

        {/* Dynamic Curved SVG Background & Top Contour */}
        <svg
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            filter: 'drop-shadow(0 -4px 18px rgba(0, 0, 0, 0.22))',
            pointerEvents: 'none',
          }}
        >
          {/* Main White Curved Shell */}
          <path
            ref={svgPathRef}
            fill="#ffffff"
            d={generateNotchPath(animPos.current.x, containerWidth, 75)}
          />
          {/* Top Hairline Stroke */}
          <path
            ref={svgStrokeRef}
            fill="none"
            stroke="rgba(0, 0, 0, 0.06)"
            strokeWidth="1"
            d={generateTopStroke(animPos.current.x, containerWidth)}
          />
        </svg>

        {/* Inactive Tab Icons Row */}
        <div
          style={{
            position: 'relative',
            zIndex: 5,
            display: 'flex',
            height: '100%',
            paddingTop: '18px',
          }}
        >
          {TABS.map((tab, idx) => {
            const isTabActive = activeIndex === idx;
            const TabIcon = tab.icon;

            return (
              <div
                key={tab.id}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  height: 50,
                  opacity: isTabActive ? 0 : 1,
                  transition: 'opacity 0.2s ease',
                  pointerEvents: 'none',
                }}
              >
                <div style={{ position: 'relative' }}>
                  <TabIcon size={21} color="#475569" strokeWidth={2} />

                  {/* Badge on inactive approvals tab */}
                  {tab.id === 'notifications' && pendingCount > 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: -6,
                        right: -8,
                        background: '#e11d48',
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
                        border: '1.5px solid #ffffff',
                      }}
                    >
                      {pendingCount > 9 ? '9+' : pendingCount}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Options Bottom Sheet (More) ────────────────────────── */}
      <AnimatePresence>
        {moreOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setMoreOpen(false);
                animateToIndex(getIndexFromPath());
              }}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                zIndex: 60,
              }}
            />

            {/* Bottom Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'var(--bg-surface)',
                borderTop: '1px solid var(--border-default)',
                borderRadius: '24px 24px 0 0',
                zIndex: 61,
                padding: '1.25rem 1.25rem calc(1.5rem + env(safe-area-inset-bottom, 0px))',
                boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.6)',
              }}
            >
              {/* Drag Handle */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
                <div style={{ width: 40, height: 4, borderRadius: 9999, background: 'var(--border-strong)' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text-primary)' }}>Account Options</span>
                <button
                  onClick={() => {
                    setMoreOpen(false);
                    animateToIndex(getIndexFromPath());
                  }}
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
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
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: '10px',
                      background: 'rgba(99, 102, 241, 0.12)',
                      border: '1px solid rgba(99, 102, 241, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
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
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.22)',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      width: '100%',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: '10px',
                        background: 'rgba(239, 68, 68, 0.12)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
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
        .curved-bottom-nav {
          display: flex;
        }
        @media (min-width: 769px) {
          .curved-bottom-nav {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}
