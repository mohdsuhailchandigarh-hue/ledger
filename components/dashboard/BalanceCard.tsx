'use client';

import { motion } from 'framer-motion';
import AnimatedCounter from '@/components/motion/AnimatedCounter';
import { ArrowUpRight, ArrowDownRight, CheckCircle2 } from 'lucide-react';

type Props = {
  totalGet: number;
  totalGive: number;
  netPosition: number;
  pendingActions: number;
};

const formatINR = (v: number) =>
  new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);

export default function BalanceCard({
  totalGet,
  totalGive,
  netPosition,
  pendingActions,
}: Props) {
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
              }}
            >
              ₹
            </span>
            <AnimatedCounter
              value={Math.abs(netPosition)}
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
      </div>

      <style>{`
        @keyframes pulse {
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
  );
}
