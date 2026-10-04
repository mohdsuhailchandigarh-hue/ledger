'use client';

import React from 'react';

interface LedgerLogoProps {
  size?: number;
  mode?: 'dark' | 'light';
  withContainer?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Modern Minimalist Ledger Logo / App Icon
 * Ultra-sharp vector rendering for all screens & resolutions (iOS, Android, Retina, 4K).
 */
export function LedgerLogo({
  size = 32,
  mode = 'dark',
  withContainer = false,
  className = '',
  style = {},
}: LedgerLogoProps) {
  const isLight = mode === 'light';

  const coverColor = isLight ? '#131824' : '#FFFFFF';
  const gridStrokeColor = isLight ? '#FFFFFF' : '#131722';
  const containerBg = isLight ? '#FFFFFF' : '#141824';
  const containerBorder = isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.08)';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    >
      <defs>
        <linearGradient id={`spineGrad_${mode}`} x1="96" y1="108" x2="160" y2="404" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0C75FB" />
          <stop offset="100%" stopColor="#0263DC" />
        </linearGradient>
      </defs>

      {/* Optional iOS / Android Squircle Container */}
      {withContainer && (
        <>
          <rect width="512" height="512" rx="124" fill={containerBg} />
          <rect width="508" height="508" x="2" y="2" rx="122" stroke={containerBorder} strokeWidth="2" />
        </>
      )}

      {/* Left Blue Spine */}
      <path
        d="M 160 108 L 160 404 L 128 404 C 106 404 96 390 96 368 L 96 144 C 96 122 106 108 128 108 Z"
        fill={`url(#spineGrad_${mode})`}
      />

      {/* Main Clean Book Cover */}
      <path
        d="M 160 108 L 384 108 C 406 108 416 122 416 144 L 416 368 C 416 390 406 404 384 404 L 160 404 Z"
        fill={coverColor}
      />

      {/* 2-Column x 5-Row Ledger Grid */}
      <g stroke={gridStrokeColor} strokeWidth="12" strokeLinecap="round" strokeLinejoin="round">
        <line x1="208" y1="172" x2="208" y2="368" />
        <line x1="244" y1="172" x2="244" y2="368" />
        <line x1="208" y1="172" x2="378" y2="172" />
        <line x1="208" y1="208" x2="378" y2="208" />
        <line x1="208" y1="244" x2="378" y2="244" />
        <line x1="208" y1="280" x2="378" y2="280" />
        <line x1="208" y1="316" x2="378" y2="316" />
      </g>
    </svg>
  );
}
