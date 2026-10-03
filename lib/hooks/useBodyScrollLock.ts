'use client';

import { useEffect } from 'react';

/**
 * Clean, rock-solid scroll lock that prevents background scrolling
 * on mobile (iOS/Android) and desktop without interfering with active modals
 * or freezing scrollable views.
 */
let activeLockCount = 0;
let savedScrollY = 0;
let originalStyles: {
  overflow: string;
  position: string;
  top: string;
  width: string;
} | null = null;

export function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return;

    activeLockCount++;
    if (activeLockCount === 1) {
      savedScrollY = window.scrollY || window.pageYOffset || 0;
      originalStyles = {
        overflow: document.body.style.overflow,
        position: document.body.style.position,
        top: document.body.style.top,
        width: document.body.style.width,
      };

      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${savedScrollY}px`;
      document.body.style.width = '100%';
    }

    return () => {
      activeLockCount = Math.max(0, activeLockCount - 1);
      if (activeLockCount === 0 && originalStyles) {
        document.documentElement.style.overflow = '';
        document.body.style.overflow = originalStyles.overflow;
        document.body.style.position = originalStyles.position;
        document.body.style.top = originalStyles.top;
        document.body.style.width = originalStyles.width;
        const restoreY = savedScrollY;
        originalStyles = null;
        window.scrollTo(0, restoreY);
      }
    };
  }, [isLocked]);
}
