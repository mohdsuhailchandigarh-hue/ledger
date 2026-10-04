'use client';

import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';

/**
 * OfflineIndicator:
 * Detects online/offline connectivity changes in real time.
 * When offline: Displays a discreet, sleek banner indicating cached layout mode.
 * When reconnected: Automatically re-syncs dynamic database queries.
 */
export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Initial check
    if (typeof window !== 'undefined') {
      setIsOffline(!navigator.onLine);

      const handleOffline = () => {
        setIsOffline(true);
        setShowReconnected(false);
      };

      const handleOnline = () => {
        setIsOffline(false);
        setShowReconnected(true);
        // Refresh server components to re-fetch live ledger records
        router.refresh();

        const timer = setTimeout(() => {
          setShowReconnected(false);
        }, 3500);

        return () => clearTimeout(timer);
      };

      window.addEventListener('offline', handleOffline);
      window.addEventListener('online', handleOnline);

      return () => {
        window.removeEventListener('offline', handleOffline);
        window.removeEventListener('online', handleOnline);
      };
    }
  }, [router]);

  if (!isOffline && !showReconnected) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top, 0px) + 12px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 14px',
        borderRadius: '9999px',
        fontSize: '0.8125rem',
        fontWeight: 600,
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: isOffline ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(34, 197, 94, 0.35)',
        background: isOffline ? 'rgba(24, 18, 24, 0.92)' : 'rgba(16, 28, 20, 0.92)',
        color: isOffline ? '#fca5a5' : '#86efac',
        pointerEvents: 'none',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        animation: 'slideDownBanner 0.3s ease-out forwards',
      }}
    >
      {isOffline ? (
        <>
          <WifiOff size={14} style={{ color: '#ef4444' }} />
          <span>Offline Mode · Cached Layout Active</span>
        </>
      ) : (
        <>
          <Wifi size={14} style={{ color: '#22c55e' }} />
          <span>Connected · Syncing Database</span>
        </>
      )}
    </div>
  );
}
