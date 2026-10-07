'use client';

import { ArrowLeft, RefreshCw, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function LedgerErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'var(--bg-base, #0b0f19)',
        color: 'var(--text-primary, #ffffff)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#f87171',
          marginBottom: '1.25rem',
        }}
      >
        <AlertTriangle size={32} />
      </div>

      <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>
        Unable to load ledger
      </h1>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted, #94a3b8)', margin: '0 0 1.5rem 0', maxWidth: 360 }}>
        {error?.message || 'Something went wrong while connecting to this ledger. Please try again.'}
      </p>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={() => reset()}
          style={{
            padding: '10px 20px',
            borderRadius: '12px',
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
          <RefreshCw size={15} />
          <span>Try Again</span>
        </button>

        <Link
          href="/dashboard"
          style={{
            padding: '10px 20px',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.08)',
            color: 'var(--text-primary, #ffffff)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            fontSize: '0.875rem',
            fontWeight: 500,
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <ArrowLeft size={15} />
          <span>Back to Dashboard</span>
        </Link>
      </div>
    </div>
  );
}
