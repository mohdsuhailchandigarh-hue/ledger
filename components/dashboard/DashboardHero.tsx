'use client';

import { motion } from 'framer-motion';
import AnimatedCounter from '@/components/motion/AnimatedCounter';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

type Props = {
  userName?: string;
  userUsername?: string;
  greeting?: string;
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

export default function DashboardHero({
  totalGet,
  totalGive,
  netPosition,
  pendingActions,
}: Props) {
  const isPositive = netPosition > 0;
  const isNegative = netPosition < 0;
  const isZero = netPosition === 0;

  // Primary accent colors based on financial state
  // Negative (Owes money) = Seductive Crimson/Rose
  // Positive (Owed money) = Electric Emerald
  // Zero = Sophisticated Indigo
  const accentColor = isPositive ? '#10b981' : isNegative ? '#f43f5e' : '#818cf8';

  return (
    <div
      className="dashboard-hero-seamless"
      style={{
        position: 'relative',
        padding: 'clamp(0.75rem, 2vw, 1.25rem) clamp(0.25rem, 1vw, 0.5rem) clamp(1.5rem, 3.5vw, 2.25rem)',
        marginBottom: '1rem',
      }}
    >
      {/* ─── True Infinite Ambient Atmosphere (Zero Cutting Edges, Full-Bleed Edge-to-Edge) ─── */}
      <div
        style={{
          position: 'absolute',
          top: '-1rem',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100vw',
          height: 'calc(100% + 1rem)',
          pointerEvents: 'none',
          zIndex: 0,
          overflow: 'hidden',
        }}
      >
        {/* Layer 1: Ambient radial wash with deep living breathing wave */}
        <motion.div
          animate={{
            scale: [1, 1.07, 0.96, 1.05, 1],
            opacity: [0.85, 1, 0.88, 1, 0.85],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            position: 'absolute',
            inset: 0,
            background: isPositive
              ? 'radial-gradient(ellipse 90% 65% at 50% 32%, rgba(16, 185, 129, 0.32) 0%, rgba(16, 185, 129, 0.14) 35%, rgba(16, 185, 129, 0.02) 65%, transparent 100%)'
              : isNegative
              ? 'radial-gradient(ellipse 90% 65% at 50% 32%, rgba(244, 63, 94, 0.32) 0%, rgba(244, 63, 94, 0.14) 35%, rgba(244, 63, 94, 0.02) 65%, transparent 100%)'
              : 'radial-gradient(ellipse 90% 65% at 50% 32%, rgba(99, 102, 241, 0.28) 0%, rgba(99, 102, 241, 0.12) 35%, rgba(99, 102, 241, 0.02) 65%, transparent 100%)',
          }}
        />

        {/* Layer 2: Wide Ethereal Swirling Aurora Wave (360° Cosmic Rotation like Profile Picture) */}
        <motion.div
          animate={{
            rotate: [0, 360],
            scale: [1, 1.16, 0.94, 1.14, 1],
            opacity: [0.75, 0.96, 0.8, 1, 0.75],
          }}
          transition={{
            rotate: {
              duration: 22,
              repeat: Infinity,
              ease: 'linear',
            },
            scale: {
              duration: 7,
              repeat: Infinity,
              ease: 'easeInOut',
            },
            opacity: {
              duration: 5.5,
              repeat: Infinity,
              ease: 'easeInOut',
            },
          }}
          style={{
            position: 'absolute',
            top: '32%',
            left: '50%',
            x: '-50%',
            y: '-50%',
            width: 'clamp(320px, 88vw, 560px)',
            height: 'clamp(240px, 60vw, 360px)',
            borderRadius: '50%',
            background: `radial-gradient(ellipse at center, ${accentColor}38 0%, ${accentColor}14 45%, transparent 75%)`,
            filter: 'blur(55px)',
            transformOrigin: 'center center',
          }}
        />

        {/* Layer 3: Living Core Luminous Bloom with Oscillating Chromatic Movement (Counter-Wave) */}
        <motion.div
          animate={{
            rotate: [0, -28, 0, 28, 0],
            scale: [0.95, 1.18, 0.98, 1.14, 0.95],
            opacity: [0.8, 1, 0.85, 1, 0.8],
          }}
          transition={{
            rotate: {
              duration: 9.5,
              repeat: Infinity,
              ease: 'easeInOut',
            },
            scale: {
              duration: 5,
              repeat: Infinity,
              ease: 'easeInOut',
            },
            opacity: {
              duration: 4.2,
              repeat: Infinity,
              ease: 'easeInOut',
            },
          }}
          style={{
            position: 'absolute',
            top: '32%',
            left: '50%',
            x: '-50%',
            y: '-50%',
            width: 'clamp(260px, 72vw, 420px)',
            height: 'clamp(170px, 45vw, 260px)',
            borderRadius: '50%',
            background: `radial-gradient(circle at center, ${accentColor}65 0%, ${accentColor}28 45%, transparent 75%)`,
            filter: 'blur(38px)',
            transformOrigin: 'center center',
          }}
        />

        {/* Layer 4: Deep Focused Heartbeat Luminous Center (Directly Behind the Net Numbers) */}
        <motion.div
          animate={{
            scale: [0.92, 1.14, 0.96, 1.1, 0.92],
            opacity: [0.7, 0.95, 0.75, 0.92, 0.7],
          }}
          transition={{
            duration: 4.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            position: 'absolute',
            top: '32%',
            left: '50%',
            x: '-50%',
            y: '-50%',
            width: 'clamp(180px, 50vw, 290px)',
            height: 'clamp(120px, 32vw, 190px)',
            borderRadius: '50%',
            background: `radial-gradient(circle at center, ${accentColor}75 0%, ${accentColor}30 50%, transparent 80%)`,
            filter: 'blur(26px)',
            transformOrigin: 'center center',
          }}
        />
      </div>

      {/* ─── Foreground Content ─────────────────────────────── */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        {/* ─── Hero Net Balance Section ─────────────────────────── */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            margin: '0.25rem 0 1.5rem',
          }}
        >
          {/* Label + Pulsing Status Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.625rem',
            }}
          >
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
              }}
            >
              Net Position
            </span>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 9px',
                borderRadius: '9999px',
                fontSize: '0.625rem',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                background: isPositive
                  ? 'rgba(16, 185, 129, 0.12)'
                  : isNegative
                  ? 'rgba(244, 63, 94, 0.12)'
                  : 'rgba(99, 102, 241, 0.12)',
                border: `1px solid ${accentColor}33`,
                color: accentColor,
                boxShadow: `0 2px 12px ${accentColor}22`,
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: accentColor,
                  display: 'inline-block',
                  boxShadow: `0 0 8px ${accentColor}`,
                }}
              />
              {isPositive && 'You Will Get'}
              {isNegative && 'You Will Give'}
              {isZero && 'Settled Up'}
            </div>
          </div>

          {/* Amount Display with Glowing Luminescence */}
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'center',
              gap: '4px',
            }}
          >
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 'clamp(1.35rem, 4vw, 1.75rem)',
                fontWeight: 600,
                color: accentColor,
                opacity: 0.9,
              }}
            >
              ₹
            </span>
            <AnimatedCounter
              value={Math.abs(netPosition)}
              duration={1.4}
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 'clamp(2.5rem, 8vw, 3.5rem)',
                fontWeight: 800,
                color: accentColor,
                letterSpacing: '-0.04em',
                lineHeight: 1,
                textShadow: `0 0 35px ${accentColor}44, 0 0 70px ${accentColor}22`,
              }}
              formatFn={formatINR}
            />
          </div>

          {/* Pending approval notification pill if any */}
          {pendingActions > 0 && (
            <div
              style={{
                marginTop: '0.625rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 10px',
                borderRadius: '9999px',
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                fontSize: '0.625rem',
                fontWeight: 600,
                color: 'var(--warning)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: 'var(--warning)',
                  display: 'inline-block',
                }}
              />
              {pendingActions} pending approval{pendingActions !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* ─── Breakdown: Floating Frosted Glass Pills (No hard squaring borders) ─── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.75rem',
            maxWidth: '560px',
            margin: '0 auto',
          }}
        >
          {/* YOU WILL GET Capsule — Self-illuminating Emerald with Radiant Ambient Blending */}
          <div
            style={{
              position: 'relative',
              borderRadius: '16px',
              padding: '0.8125rem 1rem',
              // Rich self-emitting dark emerald base: ~94% opaque base prevents background green/red washout
              background: 'linear-gradient(145deg, rgba(16, 185, 129, 0.18) 0%, rgba(16, 185, 129, 0.06) 45%, rgba(6, 22, 16, 0.94) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.32)',
              // Radiant emerald ambient shadow that bleeds outward into the surrounding atmosphere
              boxShadow: '0 12px 28px -4px rgba(16, 185, 129, 0.28), 0 4px 12px rgba(0, 0, 0, 0.45), inset 0 1px 1px 0 rgba(16, 185, 129, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 10px rgba(16, 185, 129, 0.3)',
                }}
              >
                <ArrowUpRight size={13} color="#10b981" strokeWidth={2.6} />
              </div>
              <span
                style={{
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                  color: '#10b981',
                }}
              >
                You Will Get
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  color: '#10b981',
                  opacity: 0.9,
                }}
              >
                ₹
              </span>
              <AnimatedCounter
                value={totalGet}
                duration={1.3}
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 'clamp(1.125rem, 3.2vw, 1.375rem)',
                  fontWeight: 700,
                  color: '#10b981',
                  letterSpacing: '-0.02em',
                  textShadow: '0 0 16px rgba(16, 185, 129, 0.35)',
                }}
                formatFn={formatINR}
              />
            </div>
          </div>

          {/* YOU WILL GIVE Capsule — Self-illuminating Crimson/Rose with Radiant Ambient Blending */}
          <div
            style={{
              position: 'relative',
              borderRadius: '16px',
              padding: '0.8125rem 1rem',
              // Rich self-emitting dark crimson base: ~94% opaque base ensures it is NEVER tinted by background green!
              background: 'linear-gradient(145deg, rgba(244, 63, 94, 0.18) 0%, rgba(244, 63, 94, 0.06) 45%, rgba(24, 7, 12, 0.94) 100%)',
              border: '1px solid rgba(244, 63, 94, 0.32)',
              // Radiant crimson ambient shadow that bleeds into the background, creating a gorgeous optical color fusion!
              boxShadow: '0 12px 28px -4px rgba(244, 63, 94, 0.28), 0 4px 12px rgba(0, 0, 0, 0.45), inset 0 1px 1px 0 rgba(244, 63, 94, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: 'rgba(244, 63, 94, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 10px rgba(244, 63, 94, 0.3)',
                }}
              >
                <ArrowDownRight size={13} color="#f43f5e" strokeWidth={2.6} />
              </div>
              <span
                style={{
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                  color: '#f43f5e',
                }}
              >
                You Will Give
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  color: '#f43f5e',
                  opacity: 0.9,
                }}
              >
                ₹
              </span>
              <AnimatedCounter
                value={totalGive}
                duration={1.3}
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 'clamp(1.125rem, 3.2vw, 1.375rem)',
                  fontWeight: 700,
                  color: '#f43f5e',
                  letterSpacing: '-0.02em',
                  textShadow: '0 0 16px rgba(244, 63, 94, 0.35)',
                }}
                formatFn={formatINR}
              />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
