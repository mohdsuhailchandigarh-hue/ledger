'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';
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
  error?: string | null;
};

type Props = {
  activeLedger: ActiveLedgerData | null;
  currentUserId: string;
  onClose: () => void;
  onRefresh: () => void;
  onDeleteSuccess?: (connectionId: string) => void;
  onPendingTxnDeleted?: (deletedTxnId: string) => void;
};

export default function ConnectionLedgerModal({
  activeLedger,
  currentUserId,
  onClose,
  onRefresh,
  onDeleteSuccess,
  onPendingTxnDeleted,
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
          {activeLedger.error ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                background: 'var(--bg-base)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '1rem',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <button
                  onClick={dismissSheet}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  <ArrowLeft size={18} />
                </button>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {activeLedger.peer?.name || 'Ledger'}
                </span>
              </div>
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2rem',
                  textAlign: 'center',
                  gap: '1rem',
                }}
              >
                <div
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: '50%',
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#f87171',
                  }}
                >
                  <AlertCircle size={26} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 0.4rem 0' }}>
                    Unable to load ledger
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, maxWidth: 320 }}>
                    {activeLedger.error}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button
                    onClick={onRefresh}
                    style={{
                      padding: '8px 18px',
                      borderRadius: '10px',
                      background: 'var(--accent-primary, #3b82f6)',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <RefreshCw size={14} />
                    <span>Try Again</span>
                  </button>
                  <button
                    onClick={dismissSheet}
                    style={{
                      padding: '8px 18px',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      color: 'var(--text-secondary)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          ) : activeLedger.transactions === null ? (
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
              onDeleteSuccess={onDeleteSuccess}
              onPendingTxnDeleted={onPendingTxnDeleted}
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
