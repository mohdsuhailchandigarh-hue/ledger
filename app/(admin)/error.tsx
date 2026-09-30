'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw, ShieldAlert } from 'lucide-react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[ADMIN PORTAL CRASH] Caught exception:', error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#09090b',
        color: '#fafafa',
        padding: '2rem',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: '550px',
          width: '100%',
          background: '#18181b',
          border: '1px solid #27272a',
          borderRadius: '12px',
          padding: '2.5rem',
          textAlign: 'center',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
          }}
        >
          <ShieldAlert size={30} color="#ef4444" />
        </div>

        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            marginBottom: '0.75rem',
            letterSpacing: '-0.02em',
          }}
        >
          Admin Section Crash Detected
        </h1>

        <p
          style={{
            fontSize: '0.9375rem',
            color: '#a1a1aa',
            lineHeight: '1.6',
            marginBottom: '1.5rem',
          }}
        >
          An unexpected error occurred while rendering the admin portal. Below are the details of the failure:
        </p>

        <div
          style={{
            background: '#09090b',
            border: '1px solid #27272a',
            borderRadius: '8px',
            padding: '1.25rem',
            textAlign: 'left',
            marginBottom: '2rem',
            overflowX: 'auto',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.625rem',
              color: '#f87171',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.8125rem',
              lineHeight: 1.5,
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {error.name || 'Error'}: {error.message || 'No details provided.'}
            </pre>
          </div>
          {error.digest && (
            <div
              style={{
                marginTop: '0.75rem',
                fontSize: '0.75rem',
                color: '#71717a',
                fontFamily: 'monospace',
                borderTop: '1px solid #18181b',
                paddingTop: '0.5rem',
              }}
            >
              Digest ID: {error.digest}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button
            onClick={() => reset()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: '#fafafa',
              color: '#18181b',
              border: 'none',
              borderRadius: '6px',
              padding: '0.625rem 1.25rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#e4e4e7';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#fafafa';
            }}
          >
            <RefreshCw size={15} />
            Try again
          </button>
          <a
            href="/login?role=admin"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: 'transparent',
              color: '#a1a1aa',
              border: '1px solid #27272a',
              borderRadius: '6px',
              padding: '0.625rem 1.25rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'none',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#fafafa';
              e.currentTarget.style.borderColor = '#3f3f46';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#a1a1aa';
              e.currentTarget.style.borderColor = '#27272a';
            }}
          >
            Return to Login
          </a>
        </div>
      </div>
    </div>
  );
}
