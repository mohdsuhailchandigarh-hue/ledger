'use client';

import { motion } from 'framer-motion';
import AnimatedCounter from '@/components/motion/AnimatedCounter';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

type Props = {
  monthlyGet: number;
  monthlyGive: number;
  monthLabel: string; // e.g. "June 2026"
};

const formatINR = (v: number) =>
  new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

export default function MonthlyPnLCard({ monthlyGet, monthlyGive, monthLabel }: Props) {
  const net = monthlyGet - monthlyGive;
  const isProfit   = net > 0;
  const isLoss     = net < 0;
  const isBreakEven = net === 0;

  // ── Palette ────────────────────────────────────────────────────
  const accent   = isProfit ? '#10b981' : isLoss ? '#f43f5e' : '#6366f1';
  const accentDim = isProfit
    ? 'rgba(16,185,129,0.12)'
    : isLoss
    ? 'rgba(244,63,94,0.12)'
    : 'rgba(99,102,241,0.12)';
  const accentBorder = isProfit
    ? 'rgba(16,185,129,0.25)'
    : isLoss
    ? 'rgba(244,63,94,0.25)'
    : 'rgba(99,102,241,0.25)';
  const glow = isProfit
    ? '0 0 80px -10px rgba(16,185,129,0.3), inset 0 1px 0 rgba(255,255,255,0.05)'
    : isLoss
    ? '0 0 80px -10px rgba(244,63,94,0.3), inset 0 1px 0 rgba(255,255,255,0.05)'
    : '0 0 80px -10px rgba(99,102,241,0.2), inset 0 1px 0 rgba(255,255,255,0.05)';
  const bg = isProfit
    ? 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(16,185,129,0.04) 60%, rgba(6,182,212,0.03) 100%)'
    : isLoss
    ? 'linear-gradient(135deg, rgba(244,63,94,0.1) 0%, rgba(244,63,94,0.04) 60%, rgba(139,92,246,0.03) 100%)'
    : 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(99,102,241,0.04) 60%, rgba(6,182,212,0.03) 100%)';

  const StatusIcon = isProfit ? TrendingUp : isLoss ? TrendingDown : Minus;
  const statusLabel = isProfit ? 'Profit' : isLoss ? 'Loss' : 'Break Even';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ scale: 1.005, transition: { duration: 0.2 } }}
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 'var(--radius-2xl)',
        background: bg,
        border: `1px solid ${accentBorder}`,
        boxShadow: glow,
        padding: 'clamp(1.5rem, 4vw, 2rem)',
        cursor: 'default',
        marginBottom: '1.5rem',
      }}
    >
      {/* Floating glow orb */}
      <div
        style={{
          position: 'absolute',
          top: '-60%',
          right: '-5%',
          width: 320,
          height: 320,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accentDim} 0%, transparent 68%)`,
          pointerEvents: 'none',
        }}
      />
      {/* Second subtle orb bottom-left */}
      <div
        style={{
          position: 'absolute',
          bottom: '-40%',
          left: '-5%',
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accentDim} 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative' }}>
        {/* Top row: month label + status badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.25rem',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <p
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
            }}
          >
            This Month · {monthLabel}
          </p>

          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '4px 10px',
              borderRadius: '9999px',
              background: accentDim,
              border: `1px solid ${accentBorder}`,
              fontSize: '0.6875rem',
              fontWeight: 700,
              color: accent,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            <StatusIcon size={11} strokeWidth={2.5} />
            {statusLabel}
          </motion.div>
        </div>

        {/* Hero number */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '6px',
            marginBottom: '1.75rem',
          }}
        >
          {!isBreakEven && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 'clamp(1.75rem, 5vw, 3rem)',
                fontWeight: 800,
                color: accent,
                lineHeight: 1,
                letterSpacing: '-0.03em',
              }}
            >
              {isProfit ? '+' : '-'}
            </motion.span>
          )}
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 'clamp(1rem, 3vw, 1.5rem)',
              fontWeight: 600,
              color: accent,
              opacity: 0.75,
              lineHeight: 1,
              alignSelf: 'center',
            }}
          >
            ₹
          </span>
          <AnimatedCounter
            value={Math.abs(net)}
            duration={1.5}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 'clamp(2.25rem, 7vw, 4rem)',
              fontWeight: 800,
              letterSpacing: '-0.04em',
              lineHeight: 1,
              color: accent,
            }}
            formatFn={formatINR}
          />
        </div>

        {/* Sub-stats row */}
        <div
          style={{
            display: 'flex',
            gap: 'clamp(1rem, 3vw, 2.5rem)',
            flexWrap: 'wrap',
            paddingTop: '1.25rem',
            borderTop: `1px solid ${accentBorder}`,
          }}
        >
          {/* Money Received */}
          <div>
            <p
              style={{
                fontSize: '0.6875rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                marginBottom: '0.375rem',
              }}
            >
              Received
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.875rem',
                  color: '#10b981',
                  opacity: 0.8,
                }}
              >
                ₹
              </span>
              <AnimatedCounter
                value={monthlyGet}
                duration={1.3}
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 'clamp(1.125rem, 3vw, 1.5rem)',
                  fontWeight: 700,
                  color: '#10b981',
                  letterSpacing: '-0.02em',
                }}
                formatFn={formatINR}
              />
            </div>
          </div>

          {/* Divider */}
          <div
            style={{
              width: 1,
              background: `linear-gradient(to bottom, transparent, ${accentBorder}, transparent)`,
              alignSelf: 'stretch',
            }}
          />

          {/* Money Given */}
          <div>
            <p
              style={{
                fontSize: '0.6875rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                marginBottom: '0.375rem',
              }}
            >
              Given
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.875rem',
                  color: '#f43f5e',
                  opacity: 0.8,
                }}
              >
                ₹
              </span>
              <AnimatedCounter
                value={monthlyGive}
                duration={1.3}
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 'clamp(1.125rem, 3vw, 1.5rem)',
                  fontWeight: 700,
                  color: '#f43f5e',
                  letterSpacing: '-0.02em',
                }}
                formatFn={formatINR}
              />
            </div>
          </div>

          {/* Spacer then trend label */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'flex-end' }}>
            <p
              style={{
                fontSize: '0.8125rem',
                color: 'var(--text-muted)',
                fontStyle: 'italic',
              }}
            >
              {isProfit && 'Net positive month 🎉'}
              {isLoss && 'Net negative month'}
              {isBreakEven && 'Balanced this month'}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
