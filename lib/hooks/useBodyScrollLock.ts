'use client';

import { useEffect } from 'react';

/**
 * Safely locks background scroll when a modal/drawer is open without modifying body position,
 * preventing iOS Safari sticky header detachment and layout corruption.
 */
let activeLockCount = 0;

export function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) {
      if (activeLockCount <= 0) {
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
      }
      return;
    }

    activeLockCount++;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      activeLockCount = Math.max(0, activeLockCount - 1);
      if (activeLockCount === 0) {
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
      }
    };
  }, [isLocked]);
}
