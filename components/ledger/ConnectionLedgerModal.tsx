'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import LedgerSkeleton from './LedgerSkeleton';
import LedgerClient from './LedgerClient';
import { useSwipeDownDismiss } from '@/lib/hooks/useSwipeDownDismiss';

export type ActiveLedgerData = {
  connectionId: string;
  peer: {
    id: string;
    name: string;
    username: string;
    avatar_url?: string | null;
    isPersonal?: boolean;
  };
  netBalance: number;
  transactions: any[] | null;
  isDisconnected: boolean;
  hasMore?: boolean;
  totalCount?: number;
  totalPendingCount?: number;
};

type Props = {
  activeLedger: ActiveLedgerData | null;
  currentUserId: string;
  onClose: () => void;
  onRefresh: () => void;
};

export default function ConnectionLedgerModal({
  activeLedger,
  currentUserId,
  onClose,
  onRefresh,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { isDismissing, dismissSheet, handleHeaderPointerDown } = useSwipeDownDismiss({
    isOpen: !!activeLedger,
    onClose,
    sheetRef,
    backdropRef,
    scrollRef,
    headerSelector: '.popup-glass-header, [data-drag-header="true"], [data-drag-handle="true"]',
    threshold: 120,
  });

  if (!mounted || typeof document === 'undefined' || !activeLedger) return null;

  return createPortal(
    <div
      key="connection-popup-root"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        pointerEvents: isDismissing ? 'none' : 'auto',
      }}
    >
      {/* Dimmed Blurred Backdrop Overlay */}
      <div
        ref={backdropRef}
        key="connection-popup-backdrop"
        onClick={() => {
          dismissSheet();
        }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99998,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          animation: 'sheetBackdropFadeIn 0.22s ease-out forwards',
        }}
      />

      {/* Bottom Sheet Modal with Rounded Top Corners */}
      <div
        ref={sheetRef}
        key="connection-popup-sheet"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={handleHeaderPointerDown}
        onAnimationEnd={(e) => {
          if (e.target === sheetRef.current) {
            e.currentTarget.style.animation = 'none';
          }
        }}
        style={{
          position: 'fixed',
          top: 'max(20px, calc(env(safe-area-inset-top, 0px) + 12px))',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 99999,
          width: '100%',
          maxWidth: 680,
          margin: '0 auto',
          height: 'calc(100dvh - max(20px, calc(env(safe-area-inset-top, 0px) + 12px)))',
          maxHeight: 'calc(100dvh - max(20px, calc(env(safe-area-inset-top, 0px) + 12px)))',
          background: 'var(--bg-base)',
          borderTopLeftRadius: '28px',
          borderTopRightRadius: '28px',
          borderTop: '1px solid rgba(255, 255, 255, 0.14)',
          borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 -24px 64px rgba(0, 0, 0, 0.95), 0 0 50px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'sheetSlideUpModal 0.28s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        }}
      >
        {/* Inner Scrollable Ledger Viewport */}
        <div
          ref={scrollRef}
          className="ledger-popup-scroll"
          style={{
            flex: '1 1 0%',
            minHeight: 0,
            height: '100%',
            maxHeight: '100%',
            overflowY: 'auto',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
            position: 'relative',
          }}
        >
          {activeLedger.transactions === null ? (
            <LedgerSkeleton
              peerName={activeLedger.peer.name}
              peerAvatar={activeLedger.peer.avatar_url}
              peerUsername={activeLedger.peer.username}
              isPersonal={activeLedger.peer.isPersonal}
              onBack={dismissSheet}
            />
          ) : (
            <LedgerClient
              connectionId={activeLedger.connectionId}
              peer={activeLedger.peer}
              currentUserId={currentUserId}
              transactions={activeLedger.transactions}
              netBalance={activeLedger.netBalance}
              isDisconnected={activeLedger.isDisconnected}
              initialHasMore={activeLedger.hasMore}
              onBack={dismissSheet}
              onRefresh={onRefresh}
              totalCount={activeLedger.totalCount}
              totalPendingCount={activeLedger.totalPendingCount}
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
