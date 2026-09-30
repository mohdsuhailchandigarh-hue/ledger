'use client';

import { motion } from 'framer-motion';
import AnimatedCounter from '@/components/motion/AnimatedCounter';
<<<<<<< HEAD
import { ArrowUpRight, ArrowDownRight, CheckCircle2 } from 'lucide-react';
=======
import { TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight } from 'lucide-react';
>>>>>>> 90955cf5404937548f44cc14d69b3374d37d4fde

type Props = {
  totalGet: number;
  totalGive: number;
  netPosition: number;
  pendingActions: number;
};

<<<<<<< HEAD
const formatINR = (v: number) =>
  new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);
=======
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
>>>>>>> 90955cf5404937548f44cc14d69b3374d37d4fde

export default function BalanceCard({
  totalGet,
  totalGive,
  netPosition,
  pendingActions,
}: Props) {
<<<<<<< HEAD
  const isPositive = netPosition > 0;
  const isNegative = netPosition < 0;
  const isZero = netPosition === 0;

  // Colors & visual theme based on net state
  const accentColor = isPositive ? '#10b981' : isNegative ? '#f43f5e' : '#818cf8';
  const accentBorder = isPositive
    ? 'rgba(16, 185, 129, 0.22)'
    : isNegative
    ? 'rgba(244, 63, 94, 0.22)'
    : 'rgba(99, 102, 241, 0.22)';
  const ambientGlow = isPositive
    ? 'radial-gradient(ellipse at 85% 0%, rgba(16, 185, 129, 0.12) 0%, transparent 65%)'
    : isNegative
    ? 'radial-gradient(ellipse at 85% 0%, rgba(244, 63, 94, 0.12) 0%, transparent 65%)'
    : 'radial-gradient(ellipse at 85% 0%, rgba(99, 102, 241, 0.12) 0%, transparent 65%)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="compact-balance-card"
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, rgba(17, 18, 23, 0.95) 0%, rgba(13, 14, 18, 0.98) 100%)',
        border: `1px solid ${accentBorder}`,
        boxShadow: `0 4px 20px -2px rgba(0, 0, 0, 0.5), 0 0 40px -10px ${accentColor}25, inset 0 1px 0 rgba(255, 255, 255, 0.05)`,
        padding: '0.875rem 1rem',
      }}
    >
      {/* Background ambient lighting */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: ambientGlow,
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1 }} className="balance-content-wrapper">
        {/* Top: Net Position Section */}
        <div className="net-position-section">
          {/* Header Row: Label + Status Badge + Pending Actions */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.375rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                }}
              >
                Net Position
              </span>

              {/* Status Pill Badge */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  background: isPositive
                    ? 'rgba(16, 185, 129, 0.12)'
                    : isNegative
                    ? 'rgba(244, 63, 94, 0.12)'
                    : 'rgba(99, 102, 241, 0.12)',
                  border: `1px solid ${accentBorder}`,
                  color: accentColor,
                }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: accentColor,
                    display: 'inline-block',
                  }}
                />
                {isPositive && 'You Will Get'}
                {isNegative && 'You Will Give'}
                {isZero && 'Settled Up'}
              </div>
            </div>

            {/* Pending actions counter if any */}
            {pendingActions > 0 && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 7px',
                  borderRadius: '9999px',
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  fontSize: '0.625rem',
                  fontWeight: 600,
                  color: 'var(--warning)',
                }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: 'var(--warning)',
                    display: 'inline-block',
                    animation: 'pulse 1.8s infinite',
                  }}
                />
                {pendingActions} pending
              </div>
            )}
          </div>

          {/* Amount Display */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '1.125rem',
                fontWeight: 600,
                color: accentColor,
                opacity: 0.85,
=======
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
>>>>>>> 90955cf5404937548f44cc14d69b3374d37d4fde
              }}
            >
              ₹
            </span>
            <AnimatedCounter
              value={Math.abs(netPosition)}
<<<<<<< HEAD
              duration={1.4}
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 'clamp(1.625rem, 4.5vw, 2.125rem)',
                fontWeight: 800,
                color: accentColor,
                letterSpacing: '-0.03em',
                lineHeight: 1.1,
              }}
              formatFn={formatINR}
            />
          </div>
        </div>

        {/* Divider */}
        <div
          className="balance-divider"
          style={{
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.08) 20%, rgba(255, 255, 255, 0.08) 80%, transparent)',
            margin: '0.625rem 0',
          }}
        />

        {/* Bottom Breakdown: 2-column Compact Split */}
        <div
          className="give-get-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.5rem',
          }}
        >
          {/* YOU WILL GET */}
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.04)',
              border: '1px solid rgba(16, 185, 129, 0.14)',
              borderRadius: '10px',
              padding: '0.45rem 0.625rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ArrowUpRight size={12} color="#10b981" strokeWidth={2.5} />
              <span
                style={{
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  color: '#10b981',
                }}
              >
                You Will Get
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.8125rem',
                  color: '#10b981',
                  opacity: 0.8,
                }}
              >
                ₹
              </span>
              <AnimatedCounter
                value={totalGet}
                duration={1.3}
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 'clamp(0.9375rem, 3vw, 1.125rem)',
                  fontWeight: 700,
                  color: '#10b981',
                  letterSpacing: '-0.02em',
                }}
                formatFn={formatINR}
              />
            </div>
          </div>

          {/* YOU WILL GIVE */}
          <div
            style={{
              background: 'rgba(244, 63, 94, 0.04)',
              border: '1px solid rgba(244, 63, 94, 0.14)',
              borderRadius: '10px',
              padding: '0.45rem 0.625rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ArrowDownRight size={12} color="#f43f5e" strokeWidth={2.5} />
              <span
                style={{
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  color: '#f43f5e',
                }}
              >
                You Will Give
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.8125rem',
                  color: '#f43f5e',
                  opacity: 0.8,
                }}
              >
                ₹
              </span>
              <AnimatedCounter
                value={totalGive}
                duration={1.3}
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 'clamp(0.9375rem, 3vw, 1.125rem)',
                  fontWeight: 700,
                  color: '#f43f5e',
                  letterSpacing: '-0.02em',
                }}
                formatFn={formatINR}
              />
            </div>
          </div>
        </div>
=======
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
>>>>>>> 90955cf5404937548f44cc14d69b3374d37d4fde
      </div>

      <style>{`
        @keyframes pulse {
<<<<<<< HEAD
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }
        @media (min-width: 769px) {
          .compact-balance-card {
            padding: 1.25rem 1.5rem !important;
          }
          .balance-content-wrapper {
            display: flex;
            align-items: center;
            justifyContent: space-between;
            gap: 1.5rem;
          }
          .net-position-section {
            flex: 1;
          }
          .balance-divider {
            display: none;
          }
          .give-get-grid {
            min-width: 380px;
            gap: 0.75rem !important;
          }
        }
      `}</style>
    </motion.div>
=======
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .stat-cards { flex-direction: column; }
        @media (min-width: 641px) {
          .stat-cards { flex-direction: row; }
        }
      `}</style>
    </div>
>>>>>>> 90955cf5404937548f44cc14d69b3374d37d4fde
  );
}
