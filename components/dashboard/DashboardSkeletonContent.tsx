'use client';

import React from 'react';

/**
 * DashboardSkeletonContent:
 * High-fidelity, smooth pulsing skeleton UI for the dashboard.
 * Renders instantly (0ms latency) while live database queries stream from Supabase.
 */
export default function DashboardSkeletonContent() {
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* ─── Hero Net Balance Skeleton Card ─────────────────── */}
      <div
        style={{
          position: 'relative',
          padding: 'clamp(1rem, 2.5vw, 1.5rem) 1rem clamp(1.5rem, 3.5vw, 2rem)',
          borderRadius: 'var(--radius-xl)',
          background: 'linear-gradient(180deg, var(--bg-elevated) 0%, rgba(38, 37, 44, 0.4) 100%)',
          border: '1px solid var(--border-default)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.75rem',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
        }}
      >
        {/* Net Position Label Skeleton */}
        <div
          className="skeleton"
          style={{ width: 110, height: 14, borderRadius: '6px' }}
        />

        {/* Big Net Balance Amount Skeleton */}
        <div
          className="skeleton"
          style={{ width: 'clamp(160px, 40%, 240px)', height: 48, borderRadius: '12px', margin: '4px 0' }}
        />

        {/* Breakdown: To Get & To Give Skeleton Pills */}
        <div
          style={{
            display: 'flex',
            gap: 'clamp(0.75rem, 2vw, 1.5rem)',
            marginTop: '0.5rem',
            width: '100%',
            justifyContent: 'center',
          }}
        >
          <div
            className="skeleton"
            style={{ width: 'clamp(110px, 35%, 150px)', height: 38, borderRadius: '9999px' }}
          />
          <div
            className="skeleton"
            style={{ width: 'clamp(110px, 35%, 150px)', height: 38, borderRadius: '9999px' }}
          />
        </div>
      </div>

      {/* ─── Search Bar Skeleton ─────────────────────────────── */}
      <div
        className="skeleton"
        style={{
          width: '100%',
          height: 42,
          borderRadius: '9999px',
          margin: '0.25rem 0',
        }}
      />

      {/* ─── Accounts Header Skeleton ────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '0.5rem',
          padding: '0 0.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div className="skeleton" style={{ width: 140, height: 16, borderRadius: '4px' }} />
          <div className="skeleton" style={{ width: 28, height: 16, borderRadius: '9999px' }} />
        </div>
        <div className="skeleton desktop-only" style={{ width: 80, height: 14, borderRadius: '4px' }} />
      </div>

      {/* ─── WhatsApp Chat-Style Account List Skeleton ───────── */}
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.875rem',
                padding: '0.75rem 0.5rem',
                margin: '0.125rem -0.25rem',
              }}
            >
              {/* 50px Avatar Shimmer Skeleton */}
              <div
                className="skeleton"
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: '50%',
                  flexShrink: 0,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                }}
              />

              {/* Middle: User Name & Last Transaction Note Skeleton */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flex: 1,
                  minWidth: 0,
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: 0 }}>
                  <div
                    className="skeleton"
                    style={{ width: i % 2 === 0 ? '45%' : '35%', minWidth: 90, height: 16, borderRadius: '4px' }}
                  />
                  <div
                    className="skeleton"
                    style={{ width: i % 3 === 0 ? '65%' : '50%', minWidth: 120, height: 12, borderRadius: '4px' }}
                  />
                </div>

                {/* Right: Balance Pill Skeleton */}
                <div
                  className="skeleton"
                  style={{ width: 72, height: 26, borderRadius: '9999px', flexShrink: 0 }}
                />
              </div>
            </div>

            {i < 7 && (
              <div
                style={{
                  height: 1,
                  background: 'rgba(255, 255, 255, 0.05)',
                  marginLeft: '4.25rem',
                  marginRight: '0.25rem',
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
