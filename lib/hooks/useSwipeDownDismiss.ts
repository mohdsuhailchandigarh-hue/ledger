'use client';

import { useRef, useState, useEffect, useCallback, RefObject } from 'react';
import { useBodyScrollLock } from './useBodyScrollLock';

type UseSwipeDownDismissOptions = {
  isOpen: boolean;
  onClose: () => void;
  sheetRef: RefObject<HTMLDivElement | null>;
  backdropRef: RefObject<HTMLDivElement | null>;
  scrollRef?: RefObject<HTMLDivElement | null>;
  headerSelector?: string;
  threshold?: number;
};

export function useSwipeDownDismiss({
  isOpen,
  onClose,
  sheetRef,
  backdropRef,
  scrollRef,
  headerSelector = '[data-drag-header="true"], [data-drag-handle="true"], .sheet-handle, .popup-glass-header, .drawer-handle, .modal-header',
  threshold = 120,
}: UseSwipeDownDismissOptions) {
  const isDismissingRef = useRef(false);

  // Gesture Tracking Ref
  const gestureRef = useRef<{
    isTracking: boolean;
    isDraggingSheet: boolean;
    startY: number;
    startX: number;
    currentY: number;
    lastY: number;
    lastTime: number;
    velocity: number;
    isHeaderTarget: boolean;
    isInteractiveTarget: boolean;
    startScrollTop: number;
    directionDecided: boolean;
  }>({
    isTracking: false,
    isDraggingSheet: false,
    startY: 0,
    startX: 0,
    currentY: 0,
    lastY: 0,
    lastTime: 0,
    velocity: 0,
    isHeaderTarget: false,
    isInteractiveTarget: false,
    startScrollTop: 0,
    directionDecided: false,
  });

  // Lock background scroll when open
  useBodyScrollLock(isOpen);

  // Guaranteed cleanup on unmount or when closed
  useEffect(() => {
    if (isOpen) {
      isDismissingRef.current = false;
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

  // Helper to directly translate sheet and dim backdrop (zero React re-render overhead)
  const applySheetTranslate = useCallback((yOffset: number) => {
    const clampedY = Math.max(0, yOffset);
    if (sheetRef.current) {
      sheetRef.current.style.animation = 'none';
      sheetRef.current.style.transform = `translate3d(0, ${clampedY}px, 0)`;
    }
    if (backdropRef.current) {
      backdropRef.current.style.animation = 'none';
      const opacity = Math.max(0, 1 - clampedY / 420);
      backdropRef.current.style.opacity = `${opacity}`;
    }
  }, [sheetRef, backdropRef]);

  // Smooth dismiss animation down to bottom of screen with immediate pointer-events & scroll release
  const dismissSheet = useCallback(() => {
    if (isDismissingRef.current) return;
    isDismissingRef.current = true;

    // Cancel any in-flight gesture tracking
    if (gestureRef.current) {
      gestureRef.current.isTracking = false;
      gestureRef.current.isDraggingSheet = false;
    }

    // Immediately restore body overflow so dashboard can be used and scrolled immediately
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';

    if (sheetRef.current) {
      sheetRef.current.style.pointerEvents = 'none';
      sheetRef.current.style.animation = 'none';
      sheetRef.current.style.transition = 'transform 0.24s cubic-bezier(0.32, 0.72, 0, 1)';
      sheetRef.current.style.transform = 'translate3d(0, 100dvh, 0)';
    }
    if (backdropRef.current) {
      backdropRef.current.style.pointerEvents = 'none';
      backdropRef.current.style.animation = 'none';
      backdropRef.current.style.transition = 'opacity 0.22s ease-out';
      backdropRef.current.style.opacity = '0';
    }

    setTimeout(() => {
      if (sheetRef.current) {
        sheetRef.current.style.display = 'none';
      }
      if (backdropRef.current) {
        backdropRef.current.style.display = 'none';
      }
      onClose();
    }, 240);
  }, [onClose, sheetRef, backdropRef]);

  // Smooth spring bounce back to top (0px)
  const snapBackSheet = useCallback(() => {
    if (isDismissingRef.current) return;

    if (sheetRef.current) {
      sheetRef.current.style.animation = 'none';
      sheetRef.current.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.1)';
      sheetRef.current.style.transform = 'translate3d(0, 0px, 0)';
    }
    if (backdropRef.current) {
      backdropRef.current.style.animation = 'none';
      backdropRef.current.style.transition = 'opacity 0.25s ease-out';
      backdropRef.current.style.opacity = '1';
    }

    setTimeout(() => {
      if (sheetRef.current && !isDismissingRef.current) {
        sheetRef.current.style.transition = '';
      }
      if (backdropRef.current && !isDismissingRef.current) {
        backdropRef.current.style.transition = '';
      }
    }, 300);
  }, [sheetRef, backdropRef]);

  // Handle ESC key to dismiss
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        dismissSheet();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, dismissSheet]);

  // Attach touch event listeners to sheet element with { passive: false } for 1:1 real-time finger tracking
  useEffect(() => {
    const sheetEl = sheetRef.current;
    if (!sheetEl || !isOpen) return;

    // Helper to find effective scroll container
    const getScrollElement = (): HTMLElement | null => {
      if (scrollRef?.current) return scrollRef.current;
      // Search for any child element that has scrollable overflow
      return (
        sheetEl.querySelector('.ledger-popup-scroll, [data-scrollable="true"], div[style*="overflow-y: auto"], div[style*="overflowY: auto"]') as HTMLElement | null
      ) || sheetEl;
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1 || isDismissingRef.current) return;
      const touch = e.touches[0];
      const target = e.target as HTMLElement;

      const isInteractive = !!target.closest('button, input, a, select, textarea, [data-prevent-drag="true"]');
      const isHeader = !!target.closest(headerSelector);

      const scrollEl = getScrollElement();
      const currentScrollTop = scrollEl ? scrollEl.scrollTop : 0;

      gestureRef.current = {
        isTracking: true,
        isDraggingSheet: false,
        startY: touch.clientY,
        startX: touch.clientX,
        currentY: touch.clientY,
        lastY: touch.clientY,
        lastTime: performance.now(),
        velocity: 0,
        isHeaderTarget: isHeader,
        isInteractiveTarget: isInteractive,
        startScrollTop: currentScrollTop,
        directionDecided: false,
      };

      // Reset transitions so sheet binds 1:1 immediately to finger touch
      sheetEl.style.transition = 'none';
      sheetEl.style.animation = 'none';
      if (backdropRef.current) {
        backdropRef.current.style.transition = 'none';
        backdropRef.current.style.animation = 'none';
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      const g = gestureRef.current;
      if (!g.isTracking || isDismissingRef.current) return;

      const touch = e.touches[0];
      const deltaY = touch.clientY - g.startY;
      const deltaX = touch.clientX - g.startX;
      const now = performance.now();
      const dt = now - g.lastTime;

      if (dt > 0) {
        g.velocity = (touch.clientY - g.lastY) / dt;
        g.lastY = touch.clientY;
        g.lastTime = now;
      }
      g.currentY = touch.clientY;

      // Determine initial gesture direction
      if (!g.directionDecided) {
        if (Math.abs(deltaY) < 4 && Math.abs(deltaX) < 4) {
          return;
        }
        g.directionDecided = true;

        // If predominantly horizontal, ignore sheet drag
        if (Math.abs(deltaX) > Math.abs(deltaY) + 2) {
          g.isTracking = false;
          return;
        }

        // If interactive button pressed on header, allow clear downward movement (> 8px) to take over drag
        if (g.isInteractiveTarget && g.isHeaderTarget && deltaY > 8) {
          g.isInteractiveTarget = false;
        }
      }

      if (g.isInteractiveTarget) return;

      const scrollEl = getScrollElement();
      const currentScrollTop = scrollEl ? scrollEl.scrollTop : 0;

      // ─── If already dragging sheet, update translation directly ───
      if (g.isDraggingSheet) {
        if (deltaY > 0) {
          if (e.cancelable) e.preventDefault();
          applySheetTranslate(deltaY);
        } else {
          applySheetTranslate(0);
          if (!g.isHeaderTarget) {
            g.isDraggingSheet = false;
          }
        }
        return;
      }

      // ─── Header CTA Drag: Always active regardless of scroll position ───
      if (g.isHeaderTarget) {
        if (deltaY > 0) {
          g.isDraggingSheet = true;
          if (e.cancelable) e.preventDefault();
          applySheetTranslate(deltaY);
        } else {
          applySheetTranslate(0);
        }
        return;
      }

      // ─── Content Area Drag: Active when user is at the top of the popup (scrollTop <= 0) ───
      if (currentScrollTop <= 0 && deltaY > 0) {
        g.startY = touch.clientY;
        g.isDraggingSheet = true;
        if (e.cancelable) e.preventDefault();
        applySheetTranslate(0);
      }
    };

    const handleTouchEnd = () => {
      const g = gestureRef.current;
      if (!g.isTracking || isDismissingRef.current) return;
      g.isTracking = false;

      if (g.isDraggingSheet) {
        const deltaY = g.currentY - g.startY;
        const velocity = g.velocity;

        // Dismiss if pulled down > threshold OR downward flick (velocity > 0.45 px/ms and pulled > 35px)
        const shouldDismiss = deltaY > threshold || (velocity > 0.45 && deltaY > 35);

        if (shouldDismiss) {
          dismissSheet();
        } else {
          snapBackSheet();
        }
      }

      g.isDraggingSheet = false;
    };

    sheetEl.addEventListener('touchstart', handleTouchStart, { passive: true });
    sheetEl.addEventListener('touchmove', handleTouchMove, { passive: false });
    sheetEl.addEventListener('touchend', handleTouchEnd, { passive: true });
    sheetEl.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      sheetEl.removeEventListener('touchstart', handleTouchStart);
      sheetEl.removeEventListener('touchmove', handleTouchMove);
      sheetEl.removeEventListener('touchend', handleTouchEnd);
      sheetEl.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [isOpen, applySheetTranslate, dismissSheet, snapBackSheet, scrollRef, headerSelector, threshold, sheetRef, backdropRef]);

  // Pointer drag for desktop mouse on header CTA / handle
  const handleHeaderPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || isDismissingRef.current) return;
    const target = e.target as HTMLElement;
    const isHeader = !!target.closest(headerSelector);
    if (!isHeader) return;
    if (target.closest('button, input, a, select, textarea')) return;

    const startY = e.clientY;
    let currentDeltaY = 0;
    let lastTime = performance.now();
    let lastY = e.clientY;
    let velocity = 0;

    if (sheetRef.current) {
      sheetRef.current.style.transition = 'none';
      sheetRef.current.style.animation = 'none';
    }
    if (backdropRef.current) {
      backdropRef.current.style.transition = 'none';
      backdropRef.current.style.animation = 'none';
    }

    const onPointerMove = (moveEvent: PointerEvent) => {
      const deltaY = moveEvent.clientY - startY;
      currentDeltaY = deltaY;
      const now = performance.now();
      const dt = now - lastTime;
      if (dt > 0) {
        velocity = (moveEvent.clientY - lastY) / dt;
        lastY = moveEvent.clientY;
        lastTime = now;
      }
      if (deltaY > 0) {
        applySheetTranslate(deltaY);
      } else {
        applySheetTranslate(0);
      }
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);

      const shouldDismiss = currentDeltaY > threshold || (velocity > 0.45 && currentDeltaY > 35);
      if (shouldDismiss) {
        dismissSheet();
      } else {
        snapBackSheet();
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  }, [headerSelector, threshold, applySheetTranslate, dismissSheet, snapBackSheet, sheetRef, backdropRef]);

  return {
    isDismissing: false,
    dismissSheet,
    handleHeaderPointerDown,
  };
}
