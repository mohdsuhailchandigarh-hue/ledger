'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh?: () => Promise<void> | void;
  threshold?: number;
}

const THRESHOLD = 65; // Pull distance in pixels required to trigger refresh
const HOLD_HEIGHT = 52; // Height to hold indicator while refreshing

export default function PullToRefresh({
  children,
  onRefresh,
  threshold = THRESHOLD,
}: PullToRefreshProps) {
  const router = useRouter();
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const pullDistanceRef = useRef(0);
  const isRefreshingRef = useRef(false);
  const isPullingRef = useRef(false);

  useEffect(() => {
    isRefreshingRef.current = isRefreshing;
  }, [isRefreshing]);

  useEffect(() => {
    let startY = 0;
    let startX = 0;
    let isTracking = false;
    let hasHapticFired = false;

    const getScrollTop = () => {
      return (
        window.scrollY ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0
      );
    };

    const isModalOpen = () => {
      if (typeof document === 'undefined') return false;
      return (
        document.body.style.overflow === 'hidden' ||
        document.documentElement.style.overflow === 'hidden' ||
        Boolean(
          document.querySelector(
            '[data-swipe-sheet="open"], #connection-popup-root, .add-connection-modal, [role="dialog"]'
          )
        )
      );
    };

    // ─── Touch Events ───────────────────────────────────────────
    const handleTouchStart = (e: TouchEvent) => {
      if (isRefreshingRef.current) return;
      if (isModalOpen()) return;

      const scrollTop = getScrollTop();
      if (scrollTop > 2) return;

      const touch = e.touches[0];
      if (!touch) return;

      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.closest('#connection-phone-container, #connection-name-container'))
      ) {
        return;
      }

      startY = touch.clientY;
      startX = touch.clientX;
      isTracking = true;
      hasHapticFired = false;
      pullDistanceRef.current = 0;
      setIsPulling(true);
      isPullingRef.current = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isTracking || isRefreshingRef.current) return;

      if (isModalOpen()) {
        isTracking = false;
        setIsPulling(false);
        isPullingRef.current = false;
        setPullDistance(0);
        pullDistanceRef.current = 0;
        return;
      }

      const touch = e.touches[0];
      if (!touch) return;

      const deltaY = touch.clientY - startY;
      const deltaX = touch.clientX - startX;

      // Scrolling upward — cancel pull tracking immediately
      if (deltaY < 0) {
        isTracking = false;
        setIsPulling(false);
        isPullingRef.current = false;
        setPullDistance(0);
        pullDistanceRef.current = 0;
        return;
      }

      // If horizontal gesture is more pronounced, don't interfere
      if (Math.abs(deltaX) > deltaY) {
        return;
      }

      const scrollTop = getScrollTop();
      if (scrollTop > 2) {
        return;
      }

      // Elastic damping formula: Diminishing returns as user pulls further down
      const damped = Math.min(100, Math.pow(deltaY, 0.8) * 1.5);
      pullDistanceRef.current = damped;
      setPullDistance(damped);

      // Prevent native browser overscroll conflict only when pulling down from top
      if (damped > 5 && e.cancelable) {
        e.preventDefault();
      }

      // Trigger subtle tactile haptic feedback when passing the activation threshold
      if (damped >= threshold && !hasHapticFired) {
        hasHapticFired = true;
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try {
            navigator.vibrate(10);
          } catch {}
        }
      }
    };

    const handleTouchEnd = async () => {
      if (!isTracking) return;
      isTracking = false;
      setIsPulling(false);
      isPullingRef.current = false;

      const currentDistance = pullDistanceRef.current;
      if (currentDistance >= threshold && !isRefreshingRef.current) {
        isRefreshingRef.current = true;
        setIsRefreshing(true);
        setPullDistance(HOLD_HEIGHT);
        pullDistanceRef.current = HOLD_HEIGHT;

        const startTime = Date.now();
        try {
          if (onRefresh) {
            await onRefresh();
          } else {
            router.refresh();
          }
        } finally {
          const elapsed = Date.now() - startTime;
          const waitTime = Math.max(0, 700 - elapsed);
          setTimeout(() => {
            isRefreshingRef.current = false;
            setIsRefreshing(false);
            setPullDistance(0);
            pullDistanceRef.current = 0;
          }, waitTime);
        }
      } else {
        setPullDistance(0);
        pullDistanceRef.current = 0;
      }
    };

    // ─── Mouse Drag Events (for desktop testing & trackpads) ───
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0 || isRefreshingRef.current) return;
      if (isModalOpen()) return;
      if (getScrollTop() > 2) return;

      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.closest('button, a, [role="button"]'))
      ) {
        return;
      }

      startY = e.clientY;
      startX = e.clientX;
      isTracking = true;
      hasHapticFired = false;
      pullDistanceRef.current = 0;
      setIsPulling(true);
      isPullingRef.current = true;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isTracking || isRefreshingRef.current) return;
      if (e.buttons !== 1) {
        handleTouchEnd();
        return;
      }

      const deltaY = e.clientY - startY;
      const deltaX = e.clientX - startX;

      if (deltaY < 0 || Math.abs(deltaX) > deltaY) return;
      if (getScrollTop() > 2) return;

      const damped = Math.min(100, Math.pow(deltaY, 0.8) * 1.5);
      pullDistanceRef.current = damped;
      setPullDistance(damped);

      if (damped >= threshold && !hasHapticFired) {
        hasHapticFired = true;
      }
    };

    const handleMouseUp = () => {
      if (isTracking) handleTouchEnd();
    };

    // Passive false on touchmove is required on iOS Safari to allow preventDefault on pull-down
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    window.addEventListener('mousedown', handleMouseDown, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseup', handleMouseUp, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);

      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [router, onRefresh, threshold]);

  const progress = Math.min(1, pullDistance / threshold);
  const isTriggered = pullDistance >= threshold;
  const isVisible = pullDistance > 6 || isRefreshing;

  // Circular arc calculation (circumference for r=10 is ~62.83)
  const CIRCUMFERENCE = 62.83;
  const strokeDashoffset = isRefreshing
    ? 22
    : CIRCUMFERENCE * (1 - Math.min(1, progress * 0.9));

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* ── Native Pull to Refresh Spinner Indicator ── */}
      <div
        aria-hidden={!isVisible}
        style={{
          position: 'fixed',
          top: 'calc(env(safe-area-inset-top, 0px) + 74px)',
          left: '50%',
          transform: `translate(-50%, ${isVisible ? pullDistance - 44 : -56}px)`,
          zIndex: 42,
          width: 42,
          height: 42,
          borderRadius: '50%',
          background: 'rgba(24, 23, 28, 0.94)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.16)',
          boxShadow:
            isTriggered || isRefreshing
              ? '0 8px 24px rgba(0, 0, 0, 0.55), 0 0 16px rgba(56, 151, 240, 0.35)'
              : '0 4px 14px rgba(0, 0, 0, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          opacity: isVisible ? 1 : 0,
          scale: isVisible ? Math.min(1, 0.75 + progress * 0.25) : 0.6,
          transition: isPulling
            ? 'opacity 0.15s ease, scale 0.15s ease'
            : 'transform 0.34s cubic-bezier(0.18, 0.89, 0.32, 1.15), opacity 0.22s ease, scale 0.22s ease',
          willChange: 'transform, opacity',
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 32 32"
          style={{
            transform: isRefreshing
              ? 'none'
              : `rotate(${progress * 280}deg)`,
            animation: isRefreshing ? 'pullRefreshSpin 0.75s linear infinite' : 'none',
            transition: isRefreshing ? 'none' : 'transform 0.05s linear',
          }}
        >
          {/* Subtle track ring */}
          <circle
            cx="16"
            cy="16"
            r="10"
            fill="none"
            stroke="rgba(255, 255, 255, 0.12)"
            strokeWidth="2.75"
          />
          {/* Dynamic Progress Arc */}
          <circle
            cx="16"
            cy="16"
            r="10"
            fill="none"
            stroke={isTriggered || isRefreshing ? '#3897f0' : '#94a3b8'}
            strokeWidth="2.75"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
            style={{
              transform: 'rotate(-90deg)',
              transformOrigin: '50% 50%',
              transition: isRefreshing ? 'stroke 0.2s ease' : 'stroke-dashoffset 0.08s linear, stroke 0.2s ease',
            }}
          />
        </svg>
      </div>

      {/* ── Content with Elastic Pull Displacement ── */}
      <div
        style={{
          transform: `translate3d(0, ${isRefreshing ? 38 : pullDistance * 0.38}px, 0)`,
          transition: isPulling
            ? 'none'
            : 'transform 0.34s cubic-bezier(0.18, 0.89, 0.32, 1.15)',
          willChange: 'transform',
          width: '100%',
        }}
      >
        {children}
      </div>

      <style>{`
        @keyframes pullRefreshSpin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
