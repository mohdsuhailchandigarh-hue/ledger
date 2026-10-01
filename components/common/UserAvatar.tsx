'use client';

import { useState } from 'react';

type UserAvatarProps = {
  name: string;
  avatarUrl?: string | null;
  size?: number;
  borderRadius?: string | number;
  fontSize?: string | number;
  className?: string;
  style?: React.CSSProperties;
  border?: string;
  boxShadow?: string;
  alt?: string;
};

const GRADIENTS = [
  'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
  'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)',
  'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  'linear-gradient(135deg, #ec4899 0%, #d946ef 100%)',
  'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)',
];

export function getAvatarGradient(name: string) {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

export function getInitials(name: string) {
  return (name || 'User')
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function UserAvatar({
  name,
  avatarUrl,
  size = 40,
  borderRadius = '50%',
  fontSize,
  className,
  style,
  border = 'none',
  boxShadow = 'none',
  alt,
}: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const initials = getInitials(name);
  const bgGradient = getAvatarGradient(name);

  const calculatedFontSize = fontSize ?? `${Math.max(11, Math.round(size * 0.38))}px`;

  if (avatarUrl && !imgError) {
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius,
          overflow: 'hidden',
          flexShrink: 0,
          border,
          boxShadow,
          background: 'var(--bg-surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          ...style,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarUrl}
          alt={alt || name || 'User avatar'}
          onError={() => setImgError(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius,
        background: bgGradient,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: calculatedFontSize,
        fontWeight: 700,
        color: '#ffffff',
        letterSpacing: '-0.02em',
        textShadow: '0 1px 3px rgba(0, 0, 0, 0.4)',
        flexShrink: 0,
        border,
        boxShadow,
        userSelect: 'none',
        ...style,
      }}
    >
      {initials}
    </div>
  );
}
