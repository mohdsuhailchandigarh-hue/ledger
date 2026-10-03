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
  const accent   = isProfit ? '#10b981' : isLoss ? '#f43f5e' : '#3897f0';
  const accentDim = isProfit
    ? 'rgba(16,185,129,0.12)'
    : isLoss
    ? 'rgba(244,63,94,0.12)'
    : 'rgba(56,151,240,0.12)';
  const accentBorder = isProfit
    ? 'rgba(16,185,129,0.25)'
    : isLoss
    ? 'rgba(244,63,94,0.25)'
    : 'rgba(56,151,240,0.25)';
  const glow = 'var(--shadow-sm)';
  const bg = 'var(--bg-surface)';

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
