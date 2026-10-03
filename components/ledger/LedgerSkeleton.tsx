'use client';

import { ArrowLeft } from 'lucide-react';

type Props = {
  peerName?: string;
  peerAvatar?: string | null;
  peerUsername?: string | null;
  isPersonal?: boolean;
  onBack?: () => void;
  isOverlay?: boolean;
};

function getInitials(name: string) {
  return (name || 'User')
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function LedgerSkeleton({
  peerName,
  peerAvatar,
  peerUsername,
  isPersonal,
  onBack,
  isOverlay = false,
}: Props) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'var(--bg-base)',
        color: 'var(--text-primary)',
        width: '100%',
        ...(isOverlay
          ? {
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
            }
          : {}),
      }}
    >
      {/* ─── Sticky Top Header ─── */}
      <div
        className="apple-glass-bar"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          padding: '0 1.25rem',
        }}
      >
        <div
          style={{
            maxWidth: '720px',
            margin: '0 auto',
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          {/* Back button + Contact profile */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              minWidth: 0,
            }}
          >
            {onBack ? (
              <button
                onClick={onBack}
                aria-label="Back"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 38,
                  height: 38,
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
                  color: '#ffffff',
                  cursor: 'pointer',
                  flexShrink: 0,
                  padding: 0,
                }}
              >
                <ArrowLeft size={18} strokeWidth={2.2} />
              </button>
            ) : (
              <div
                className="skeleton"
                style={{ width: 38, height: 38, borderRadius: '12px', flexShrink: 0 }}
              />
            )}

            {/* Avatar */}
            {peerAvatar ? (
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  flexShrink: 0,
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={peerAvatar}
                  alt={peerName || 'Avatar'}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                    borderRadius: '50%',
                  }}
                />
              </div>
            ) : peerName ? (
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #065DE8, #3897f0)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  color: 'white',
                  flexShrink: 0,
                }}
              >
                {getInitials(peerName)}
              </div>
            ) : (
              <div
                className="skeleton"
                style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0 }}
              />
            )}

            {/* Name + Subtitle */}
            <div style={{ minWidth: 0 }}>
              {peerName ? (
                <>
                  <h1
                    style={{
                      fontSize: '0.9375rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      letterSpacing: '-0.015em',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      margin: 0,
                    }}
                  >
                    {peerName}
                    {isPersonal && (
                      <span
                        style={{
                          fontSize: '0.625rem',
                          padding: '1px 6px',
                          background: 'rgba(255,255,255,0.06)',
                          borderRadius: '6px',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: 'var(--text-muted)',
                          fontWeight: 600,
                          letterSpacing: '0.04em',
                        }}
                      >
                        Personal
                      </span>
                    )}
                  </h1>
                  <p
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      whiteSpace: 'nowrap',
                      margin: 0,
                    }}
                  >
                    {isPersonal
                      ? `${peerUsername || ''} · Offline`
                      : peerUsername
                      ? `@${peerUsername} · Shared Ledger`
                      : 'Opening ledger...'}
                  </p>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div className="skeleton" style={{ width: 120, height: 16 }} />
                  <div className="skeleton" style={{ width: 80, height: 12 }} />
                </div>
              )}
            </div>
          </div>

          {/* Action button skeleton: matches delete button */}
          <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <div
              className="skeleton"
              style={{
                width: 38,
                height: 38,
                borderRadius: '12px',
                background: 'rgba(244, 63, 94, 0.08)',
                border: '1px solid rgba(244, 63, 94, 0.18)',
              }}
            />
          </div>
        </div>
      </div>

      {/* ─── Main Content Container ─── */}
      <div
        style={{
          padding: '1.25rem',
          maxWidth: '720px',
          margin: '0 auto',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
      >
        {/* Balance summary card skeleton - Centered Hero */}
        <div
          style={{
            padding: '1.75rem 1.5rem',
            borderRadius: '24px',
            background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, rgba(18, 18, 22, 0.9) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '0.75rem',
          }}
        >
          {/* Status capsule skeleton */}
          <div
            className="skeleton"
            style={{ width: 130, height: 26, borderRadius: '9999px' }}
          />

          {/* Amount skeleton */}
          <div
            className="skeleton"
            style={{ width: 170, height: 48, borderRadius: '12px', margin: '0.25rem 0' }}
          />

          {/* Bottom pills skeleton */}
          <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'center' }}>
            <div
              className="skeleton"
              style={{ width: 110, height: 28, borderRadius: '9999px' }}
            />
            <div
              className="skeleton"
              style={{ width: 85, height: 28, borderRadius: '9999px' }}
            />
          </div>
        </div>

        {/* Filter / Search tabs skeleton */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
          }}
        >
          <div
            className="skeleton"
            style={{ width: 140, height: 32, borderRadius: '9999px' }}
          />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <div
              className="skeleton"
              style={{ width: 50, height: 28, borderRadius: '9999px' }}
            />
            <div
              className="skeleton"
              style={{ width: 70, height: 28, borderRadius: '9999px' }}
            />
            <div
              className="skeleton"
              style={{ width: 70, height: 28, borderRadius: '9999px' }}
            />
          </div>
        </div>

        {/* Transaction timeline list skeleton */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              style={{
                padding: '0.875rem 1rem',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
              }}
            >
              {/* Left: Direction icon + note + date */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  className="skeleton"
                  style={{ width: 36, height: 36, borderRadius: '10px', flexShrink: 0 }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <div
                    className="skeleton"
                    style={{ width: i % 2 === 0 ? 150 : 110, height: 15 }}
                  />
                  <div className="skeleton" style={{ width: 85, height: 11 }} />
                </div>
              </div>

              {/* Right: Amount + Status pill */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: '5px',
                }}
              >
                <div
                  className="skeleton"
                  style={{ width: i % 3 === 0 ? 80 : 65, height: 16 }}
                />
                <div
                  className="skeleton"
                  style={{ width: 55, height: 18, borderRadius: '9999px' }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
