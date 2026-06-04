'use client';

import { useActionState, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  loginAction,
  changePasswordAction,
  type AuthState,
} from '@/lib/actions/auth.actions';
import {
  Eye,
  EyeOff,
  ArrowRight,
  Shield,
  TrendingUp,
  Users,
  Zap,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';

const initialState: AuthState = {};

const features = [
  {
    icon: TrendingUp,
    title: 'Real-time Ledger',
    desc: 'Instant synchronized financial records',
  },
  {
    icon: Users,
    title: 'Shared by Design',
    desc: 'Both parties see the same truth',
  },
  {
    icon: Shield,
    title: 'Approval Workflow',
    desc: 'Every transaction needs confirmation',
  },
  {
    icon: Zap,
    title: 'Instant Updates',
    desc: 'Live notifications on every action',
  },
];

type Mode = 'user' | 'admin' | 'change';

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; expired?: string; tab?: string }>;
}) {
  const [mode, setMode] = useState<Mode>('user');
  const [showPassword, setShowPassword] = useState(false);
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [expiredBanner, setExpiredBanner] = useState(false);

  const [loginState, loginFormAction, loginPending] = useActionState(loginAction, initialState);
  const [changeState, changeFormAction, changePending] = useActionState(changePasswordAction, initialState);

  useEffect(() => {
    searchParams.then(({ role, expired, tab }) => {
      if (role === 'admin') setMode('admin');
      if (tab === 'change') setMode('change');
      if (expired === '1') setExpiredBanner(true);
    });
  }, [searchParams]);

  const tabs: { id: Mode; label: string }[] = [
    { id: 'user', label: 'Sign In' },
    { id: 'admin', label: 'Admin' },
    { id: 'change', label: 'Change Password' },
  ];

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        background: 'var(--bg-base)',
        overflow: 'hidden',
        position: 'relative',
        justifyContent: 'center',
      }}
    >
      {/* Ambient background glows */}
      <div
        style={{
          position: 'fixed',
          top: '-20%',
          left: '-10%',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'fixed',
          bottom: '-20%',
          right: '-10%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Left Panel — Brand */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '4rem',
          position: 'relative',
          borderRight: '1px solid var(--border-subtle)',
        }}
        className="hidden-mobile"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          style={{ marginBottom: '4rem' }}
        >
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
              }}
            >
              <TrendingUp size={20} color="white" />
            </div>
            <span
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
              }}
            >
              Shared Ledger
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7 }}
          style={{ marginBottom: '3rem' }}
        >
          <h1 className="text-display" style={{ marginBottom: '1.25rem', maxWidth: '480px' }}>
            Financial records{' '}
            <span className="gradient-brand-text">built on trust</span>
          </h1>
          <p style={{ fontSize: '1.0625rem', color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: '420px' }}>
            A premium shared ledger where both parties see the same truth.
            Every transaction confirmed. Every rupee accounted for.
          </p>
        </motion.div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {features.map((feat, i) => (
            <motion.div
              key={feat.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.1, duration: 0.5 }}
              style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '10px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <feat.icon size={18} color="var(--accent-primary)" />
              </div>
              <div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.125rem' }}>
                  {feat.title}
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  {feat.desc}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          style={{ position: 'absolute', bottom: '2rem', left: '4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}
        >
          Shared Ledger v1.0 · Premium Edition
        </motion.div>
      </motion.div>

      {/* Right Panel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{
          width: '100%',
          maxWidth: '480px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 'clamp(1.5rem, 5vw, 3rem)',
          flexShrink: 0,
        }}
      >
        {/* Mobile logo */}
        <div
          style={{ display: 'none', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}
          className="show-mobile"
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '9px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TrendingUp size={18} color="white" />
          </div>
          <span style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Shared Ledger
          </span>
        </div>

        {/* Session expired banner */}
        <AnimatePresence>
          {expiredBanner && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                padding: '0.75rem 1rem',
                background: 'rgba(245,158,11,0.1)',
                border: '1px solid rgba(245,158,11,0.3)',
                borderRadius: '10px',
                fontSize: '0.8125rem',
                color: '#f59e0b',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <Shield size={14} />
              Your session was reset by an admin. Please sign in again.
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab switcher */}
        <motion.div
          layout
          style={{
            display: 'flex',
            background: 'var(--bg-elevated)',
            borderRadius: '10px',
            padding: '4px',
            marginBottom: '2rem',
            border: '1px solid var(--border-subtle)',
            gap: '2px',
          }}
        >
          {tabs.map((tab) => {
            const active = mode === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setMode(tab.id)}
                style={{
                  flex: 1,
                  padding: '0.5rem 0.25rem',
                  borderRadius: '7px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  transition: 'all 0.2s',
                  background: active ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
                  color: active ? 'white' : 'var(--text-muted)',
                  boxShadow: active ? '0 2px 12px rgba(99,102,241,0.3)' : 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </motion.div>

        <AnimatePresence mode="wait">
          {/* ── Sign In / Admin ── */}
          {(mode === 'user' || mode === 'admin') && (
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <div style={{ marginBottom: '2rem' }}>
                <h2
                  style={{
                    fontSize: '1.75rem',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    letterSpacing: '-0.02em',
                    marginBottom: '0.375rem',
                  }}
                >
                  {mode === 'admin' ? 'Admin Portal' : 'Welcome back'}
                </h2>
                <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
                  {mode === 'admin'
                    ? 'Restricted access — admin credentials required'
                    : 'Sign in to your financial ledger'}
                </p>
              </div>

              <form action={loginFormAction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input type="hidden" name="role" value={mode === 'admin' ? 'admin' : 'user'} />

                <div>
                  <label htmlFor="username" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    {mode === 'admin' ? 'Admin Username' : 'Username'}
                  </label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    placeholder={mode === 'admin' ? 'Enter admin username' : 'Enter your username'}
                    autoComplete="username"
                    autoFocus
                    className="input"
                    required
                    style={{ fontSize: '0.9375rem' }}
                  />
                </div>

                <div>
                  <label htmlFor="password" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      className="input"
                      required
                      style={{ fontSize: '0.9375rem', paddingRight: '3rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: '4px' }}
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {loginState?.error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{ padding: '0.75rem 1rem', background: 'var(--danger-muted)', border: '1px solid var(--danger-border)', borderRadius: '8px', fontSize: '0.875rem', color: 'var(--danger)' }}
                    >
                      {loginState.error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button
                  type="submit"
                  disabled={loginPending}
                  whileHover={{ scale: loginPending ? 1 : 1.01 }}
                  whileTap={{ scale: loginPending ? 1 : 0.99 }}
                  className="btn btn-primary btn-lg"
                  style={{ marginTop: '0.5rem', fontSize: '0.9375rem', justifyContent: 'center', gap: '0.5rem', opacity: loginPending ? 0.8 : 1 }}
                >
                  {loginPending ? (
                    <>
                      <span style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', display: 'inline-block', animation: 'spin-slow 0.7s linear infinite' }} />
                      Signing in...
                    </>
                  ) : (
                    <>Sign in <ArrowRight size={17} /></>
                  )}
                </motion.button>
              </form>

              <p style={{ marginTop: '2rem', fontSize: '0.8125rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                {mode === 'admin'
                  ? 'Admin access is restricted. Contact system administrator.'
                  : 'New account? Ask your admin to create one for you.'}
              </p>
            </motion.div>
          )}

          {/* ── Change Password ── */}
          {mode === 'change' && (
            <motion.div
              key="change"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.5rem' }}>
                  <KeyRound size={22} color="var(--accent-primary)" />
                  <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                    Change Password
                  </h2>
                </div>
                <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
                  Enter your current password to set a new one.
                </p>
              </div>

              <AnimatePresence mode="wait">
                {changeState?.success ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '2rem 1rem', textAlign: 'center' }}
                  >
                    <CheckCircle2 size={52} color="#22c55e" />
                    <div>
                      <p style={{ fontSize: '1.0625rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.375rem' }}>
                        Password updated!
                      </p>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        You&apos;ve been signed out of all devices. Sign in with your new password.
                      </p>
                    </div>
                    <button onClick={() => setMode('user')} className="btn btn-primary" style={{ gap: '0.5rem', marginTop: '0.5rem' }}>
                      Go to Sign In <ArrowRight size={15} />
                    </button>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    action={changeFormAction}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
                  >
                    <div>
                      <label htmlFor="cp-username" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                        Username
                      </label>
                      <input id="cp-username" name="username" type="text" placeholder="Your username" autoComplete="username" className="input" required style={{ fontSize: '0.9375rem' }} />
                    </div>

                    <div>
                      <label htmlFor="cp-old" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                        Current Password
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input id="cp-old" name="old_password" type={showOld ? 'text' : 'password'} placeholder="Enter current password" autoComplete="current-password" className="input" required style={{ fontSize: '0.9375rem', paddingRight: '3rem' }} />
                        <button type="button" onClick={() => setShowOld(!showOld)} style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: '4px' }} aria-label="Toggle">
                          {showOld ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="cp-new" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                        New Password
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input id="cp-new" name="new_password" type={showNew ? 'text' : 'password'} placeholder="Min 6 characters" autoComplete="new-password" className="input" required style={{ fontSize: '0.9375rem', paddingRight: '3rem' }} />
                        <button type="button" onClick={() => setShowNew(!showNew)} style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: '4px' }} aria-label="Toggle">
                          {showNew ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="cp-confirm" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                        Confirm New Password
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input id="cp-confirm" name="confirm_password" type={showConfirm ? 'text' : 'password'} placeholder="Re-enter new password" autoComplete="new-password" className="input" required style={{ fontSize: '0.9375rem', paddingRight: '3rem' }} />
                        <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: '4px' }} aria-label="Toggle">
                          {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {changeState?.error && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          style={{ padding: '0.75rem 1rem', background: 'var(--danger-muted)', border: '1px solid var(--danger-border)', borderRadius: '8px', fontSize: '0.875rem', color: 'var(--danger)' }}
                        >
                          {changeState.error}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <motion.button
                      type="submit"
                      disabled={changePending}
                      whileHover={{ scale: changePending ? 1 : 1.01 }}
                      whileTap={{ scale: changePending ? 1 : 0.99 }}
                      className="btn btn-primary btn-lg"
                      style={{ marginTop: '0.5rem', fontSize: '0.9375rem', justifyContent: 'center', gap: '0.5rem', opacity: changePending ? 0.8 : 1 }}
                    >
                      {changePending ? (
                        <>
                          <span style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', display: 'inline-block', animation: 'spin-slow 0.7s linear infinite' }} />
                          Updating...
                        </>
                      ) : (
                        <><KeyRound size={16} /> Update Password</>
                      )}
                    </motion.button>
                  </motion.form>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <style>{`
        .hidden-mobile { display: none !important; }
        .show-mobile { display: flex !important; }
        @media (min-width: 769px) {
          .hidden-mobile { display: flex !important; }
          .show-mobile { display: none !important; }
        }
        @keyframes spin-slow {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
