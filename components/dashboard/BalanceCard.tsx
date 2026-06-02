'use client';

import { motion } from 'framer-motion';
import AnimatedCounter from '@/components/motion/AnimatedCounter';
import { TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight } from 'lucide-react';

type Props = {
  totalGet: number;
  totalGive: number;
  netPosition: number;
  pendingActions: number;
};

function StatCard({
  label,
  value,
  type,
  delay,
}: {
  label: string;
  value: number;
  type: 'get' | 'give' | 'net';
  delay: number;
}) {
  const isGet = type === 'get';
  const isGive = type === 'give';
  const isNet = type === 'net';
  const isPositive = value >= 0;

  const color = isGet
    ? 'var(--success)'
    : isGive
    ? 'var(--danger)'
    : isPositive
    ? 'var(--success)'
    : 'var(--danger)';

  const bg = isGet
    ? 'var(--success-muted)'
    : isGive
    ? 'var(--danger-muted)'
    : isPositive
    ? 'var(--success-muted)'
    : 'var(--danger-muted)';

  const Icon = isGet ? TrendingUp : isGive ? TrendingDown : isPositive ? ArrowUpRight : ArrowDownRight;

  const gradientClass = isGet
    ? 'gradient-success-text'
    : isGive
    ? 'gradient-danger-text'
    : isPositive
    ? 'gradient-success-text'
    : 'gradient-danger-text';

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="card"
      style={{ padding: '1.5rem', flex: 1, minWidth: 0 }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
        }}
      >
        <span className="text-label">{label}</span>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: '9px',
            background: bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={16} color={color} />
        </div>
      </div>

      {/* Amount */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '4px',
          marginBottom: '0.5rem',
        }}
      >
        <span
          style={{
            fontSize: '1.125rem',
            fontWeight: 500,
            color: 'var(--text-secondary)',
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          ₹
        </span>
        <AnimatedCounter
          value={Math.abs(value)}
          prefix=""
          duration={1.4}
          className={gradientClass}
          style={{
            fontSize: 'clamp(1.5rem, 4vw, 2rem)',
            fontWeight: 700,
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: '-0.03em',
            lineHeight: 1,
          }}
          formatFn={(v) =>
            new Intl.NumberFormat('en-IN', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(v)
          }
        />
      </div>

      {/* Subtitle */}
      <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
        {isGet && 'Others owe you'}
        {isGive && 'You owe others'}
        {isNet && (value >= 0 ? 'You are in the green' : 'You owe net')}
      </p>
    </motion.div>
  );
}

export default function BalanceCard({
  totalGet,
  totalGive,
  netPosition,
  pendingActions,
}: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Hero Net Balance */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 'var(--radius-2xl)',
          padding: '2rem 2rem 1.75rem',
          background:
            'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.08) 50%, rgba(6,182,212,0.06) 100%)',
          border: '1px solid rgba(99,102,241,0.2)',
          boxShadow:
            '0 0 80px -20px rgba(99,102,241,0.25), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        {/* Decorative orb */}
        <div
          style={{
            position: 'absolute',
            top: '-40%',
            right: '-10%',
            width: 300,
            height: 300,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative' }}>
          <p className="text-label" style={{ marginBottom: '0.75rem', color: 'var(--accent-primary)' }}>
            Net Position
          </p>

          <div
            style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '1.5rem' }}
          >
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '1.5rem',
                fontWeight: 500,
                color: 'var(--text-secondary)',
              }}
            >
              ₹
            </span>
            <AnimatedCounter
              value={Math.abs(netPosition)}
              duration={1.6}
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 'clamp(2.25rem, 6vw, 3.5rem)',
                fontWeight: 800,
                letterSpacing: '-0.04em',
                lineHeight: 1,
                color: netPosition >= 0 ? 'var(--success)' : 'var(--danger)',
              }}
              formatFn={(v) =>
                new Intl.NumberFormat('en-IN', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(v)
              }
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {pendingActions > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
                className="badge badge-pending"
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--warning)',
                    display: 'inline-block',
                    animation: 'pulse 2s infinite',
                  }}
                />
                {pendingActions} pending action{pendingActions !== 1 ? 's' : ''}
              </motion.div>
            )}
            <div className="badge badge-info">
              {netPosition >= 0 ? 'You will get' : 'You will give'}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats row */}
      <div className="stat-cards" style={{ display: 'flex', gap: '1rem' }}>
        <StatCard label="You Will Get" value={totalGet} type="get" delay={0.2} />
        <StatCard label="You Will Give" value={totalGive} type="give" delay={0.3} />
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .stat-cards { flex-direction: column; }
        @media (min-width: 641px) {
          .stat-cards { flex-direction: row; }
        }
      `}</style>
    </div>
  );
}
