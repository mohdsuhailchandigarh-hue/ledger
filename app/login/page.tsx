'use client';

import { useActionState, useEffect, useState } from 'react';
import {
  loginAction,
  signUpAction,
  changePasswordAction,
  checkSignUpUsernameAction,
  type AuthState,
} from '@/lib/actions/auth.actions';
import {
  Eye,
  EyeOff,
  Phone,
  User,
  Lock,
  MessageCircle,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  X,
  ExternalLink,
  ArrowLeft,
} from 'lucide-react';

const initialState: AuthState = {};

type AuthMode = 'signin' | 'signup' | 'forgot' | 'change';
type SignInMethod = 'phone' | 'username';

const ADMIN_WHATSAPP_NUMBER = '7652851408';
const WHATSAPP_URL = `https://wa.me/917652851408?text=${encodeURIComponent(
  'Hello Admin, I need help resetting my password for my Shared Ledger account.\n\nMy registered details:\n- Username: \n- Mobile: '
)}`;

/**
 * Format phone input:
 * - Strips all non-digit characters (spaces, dashes, parens, etc.)
 * - Ignores country code (+91, 91, or leading 0) if length > 10
 * - If still greater than 10 digits, generates a warning and trims to 10
 */
function cleanPhoneNumber(raw: string): { digits: string; warning: string | null } {
  let digits = raw.replace(/\D/g, '');
  let warning: string | null = null;

  // Ignore country code '91' if pasted with 12+ digits (+91...)
  if (digits.length > 10 && digits.startsWith('91')) {
    digits = digits.slice(2);
  }
  // Ignore leading '0' if pasted with 11+ digits (098...)
  if (digits.length > 10 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  // If number still exceeds 10 digits after stripping prefix
  if (digits.length > 10) {
    warning = `Entered number has ${digits.length} digits. Only 10 digits are allowed.`;
    digits = digits.slice(0, 10);
  }

  return { digits, warning };
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; expired?: string; tab?: string }>;
}) {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [signInMethod, setSignInMethod] = useState<SignInMethod>('phone');

  // Sign In inputs & warnings
  const [signInPhone, setSignInPhone] = useState('');
  const [signInPhoneWarning, setSignInPhoneWarning] = useState<string | null>(null);
  const [signInUsername, setSignInUsername] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signInError, setSignInError] = useState('');
  const [isSignInFocused, setIsSignInFocused] = useState(false);

  // Sign Up inputs & warnings
  const [signUpPhone, setSignUpPhone] = useState('');
  const [signUpPhoneWarning, setSignUpPhoneWarning] = useState<string | null>(null);
  const [signUpUsername, setSignUpUsername] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [signUpError, setSignUpError] = useState('');
  const [isSignUpPhoneFocused, setIsSignUpPhoneFocused] = useState(false);
  const [isSignUpUsernameFocused, setIsSignUpUsernameFocused] = useState(false);
  const [usernameCheckStatus, setUsernameCheckStatus] = useState<{
    checking: boolean;
    available: boolean | null;
    error?: string;
  }>({ checking: false, available: null });

  // Password visibility
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showSignUpConfirm, setShowSignUpConfirm] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showChangeConfirm, setShowChangeConfirm] = useState(false);

  // Form actions
  const [loginState, loginFormAction, loginPending] = useActionState(loginAction, initialState);
  const [signUpState, signUpFormAction, signUpPending] = useActionState(signUpAction, initialState);
  const [changeState, changeFormAction, changePending] = useActionState(changePasswordAction, initialState);

  useEffect(() => {
    searchParams.then(({ tab }) => {
      if (tab === 'change') setMode('change');
      else if (tab === 'signup') setMode('signup');
      else if (tab === 'forgot') setMode('forgot');
    });
  }, [searchParams]);

  // Sign In Phone handlers (10 digits strictly, ignores spaces & country code, warns on excess)
  const handleSignInPhoneChange = (raw: string) => {
    setSignInError('');
    const { digits, warning } = cleanPhoneNumber(raw);
    setSignInPhone(digits);
    setSignInPhoneWarning(warning);
  };

  const handleSignInPhonePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    handleSignInPhoneChange(pasted);
  };

  // Sign Up Phone handlers (10 digits strictly, ignores spaces & country code, warns on excess)
  const handleSignUpPhoneChange = (raw: string) => {
    setSignUpError('');
    const { digits, warning } = cleanPhoneNumber(raw);
    setSignUpPhone(digits);
    setSignUpPhoneWarning(warning);
  };

  const handleSignUpPhonePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    handleSignUpPhoneChange(pasted);
  };

  // Username formatter (Lowercase only, alphanumeric only, non-deletable @ handled visually)
  const handleUsernameChange = (raw: string, setter: (val: string) => void) => {
    const clean = raw.toLowerCase().replace(/[^a-z0-9]/g, '');
    setter(clean);
  };

  // Real-time username availability check (debounced)
  useEffect(() => {
    const clean = signUpUsername.trim().toLowerCase().replace(/^@+/, '');
    if (!clean || clean.length < 3) {
      setUsernameCheckStatus({ checking: false, available: null });
      return;
    }

    if (!/^[a-z0-9]+$/.test(clean)) {
      setUsernameCheckStatus({
        checking: false,
        available: false,
        error: 'Only lowercase letters and numbers allowed',
      });
      return;
    }

    let isCurrent = true;
    setUsernameCheckStatus((prev) => ({ ...prev, checking: true }));

    const timer = setTimeout(async () => {
      try {
        const res = await checkSignUpUsernameAction(clean);
        if (isCurrent) {
          if (res.available) {
            setUsernameCheckStatus({ checking: false, available: true });
          } else {
            setUsernameCheckStatus({
              checking: false,
              available: false,
              error: res.error || 'Username is already taken',
            });
          }
        }
      } catch {
        if (isCurrent) {
          setUsernameCheckStatus({ checking: false, available: null });
        }
      }
    }, 250);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [signUpUsername]);

  // Password rules validation
  const pwHasLength = signUpPassword.length >= 8;
  const pwHasLetter = /[a-zA-Z]/.test(signUpPassword);
  const pwHasNumber = /[0-9]/.test(signUpPassword);
  const pwIsValid = pwHasLength && pwHasLetter && pwHasNumber;

  const handleSignInSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    setSignInError('');
    if (signInMethod === 'phone') {
      if (signInPhone.length < 10) {
        e.preventDefault();
        setSignInError('Please enter a valid 10-digit mobile number');
        return;
      }
    } else {
      if (!signInUsername.trim()) {
        e.preventDefault();
        setSignInError('Please enter your username');
        return;
      }
    }
  };

  const handleSignUpSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (signUpPhone.length < 10) {
      e.preventDefault();
      setSignUpError('Please enter a valid 10-digit mobile number');
      return;
    }
    if (signUpUsername.length < 3) {
      e.preventDefault();
      setSignUpError('Username must be at least 3 characters');
      return;
    }
    if (usernameCheckStatus.available === false) {
      e.preventDefault();
      setSignUpError(usernameCheckStatus.error || 'Username is already taken');
      return;
    }
    if (usernameCheckStatus.checking) {
      e.preventDefault();
      setSignUpError('Checking username availability...');
      return;
    }
    if (!pwIsValid) {
      e.preventDefault();
      setSignUpError('Please choose a strong password (at least 8 characters)');
      return;
    }
    if (signUpPassword !== signUpConfirmPassword) {
      e.preventDefault();
      setSignUpError('Passwords do not match');
      return;
    }
    setSignUpError('');
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        height: '100dvh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1F1E24', // Exact Instagram dark greyish tone from user screenshot
        color: '#f4f4f5',
        padding: '0 1rem',
        overflow: 'hidden',
        boxSizing: 'border-box',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      {/* Centered Instagram Content Container - No Squaring Shape */}
      <div
        style={{
          width: '100%',
          maxWidth: '340px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          position: 'relative',
          minWidth: 0,
        }}
      >
        {/* Top Header: Close / Back Icon (like Instagram onboarding screen) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '36px',
            marginBottom: '0.5rem',
          }}
        >
          {mode !== 'signin' ? (
            <button
              type="button"
              onClick={() => {
                setSignUpError('');
                setMode('signin');
              }}
              style={{
                background: 'none',
                border: 'none',
                padding: '4px',
                cursor: 'pointer',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                marginLeft: '-4px',
              }}
              aria-label="Back to Log In"
            >
              <X size={22} strokeWidth={2.2} />
            </button>
          ) : (
            <div style={{ width: 22 }} />
          )}

          <div
            style={{
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: '#9ca3af',
              letterSpacing: '0.02em',
            }}
          >
            Shared Ledger
          </div>

          <div style={{ width: 22 }} />
        </div>

        {/* ========================================================
            VIEW 1: SIGN IN (Instagram Minimalist Layout)
            - Seamless, no outer box, pure greyish background
            - Pill-shaped button, rounded floating-style inputs
            - Mobile number or Username + Password
           ======================================================== */}
        {mode === 'signin' && (
          <div>
            {/* Title & Subtitle */}
            <div style={{ marginBottom: '1.25rem' }}>
              <h1
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  margin: '0 0 0.35rem 0',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.2,
                }}
              >
                Log in
              </h1>
              <p
                style={{
                  fontSize: '0.8125rem',
                  color: '#9ca3af',
                  margin: 0,
                  lineHeight: 1.4,
                }}
              >
                Enter your mobile number or username to continue.
              </p>
            </div>

            {/* Clean Segment Pill Switcher: [ Mobile ] | [ Username ] */}
            <div
              style={{
                display: 'flex',
                width: '100%',
                background: 'rgba(255, 255, 255, 0.06)',
                borderRadius: '9999px',
                padding: '3px',
                marginBottom: '1rem',
                boxSizing: 'border-box',
                minWidth: 0,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setSignInMethod('phone');
                  setSignInPhoneWarning(null);
                  setSignInError('');
                }}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  padding: '0.45rem 0.5rem',
                  borderRadius: '9999px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  background: signInMethod === 'phone' ? '#2A2930' : 'transparent',
                  color: signInMethod === 'phone' ? '#ffffff' : '#9ca3af',
                  transition: 'all 0.15s ease',
                  minWidth: 0,
                  boxShadow: signInMethod === 'phone' ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
                }}
              >
                <Phone size={13} />
                <span>Mobile</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSignInMethod('username');
                  setSignInPhoneWarning(null);
                  setSignInError('');
                }}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  padding: '0.45rem 0.5rem',
                  borderRadius: '9999px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  background: signInMethod === 'username' ? '#2A2930' : 'transparent',
                  color: signInMethod === 'username' ? '#ffffff' : '#9ca3af',
                  transition: 'all 0.15s ease',
                  minWidth: 0,
                  boxShadow: signInMethod === 'username' ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
                }}
              >
                <User size={13} />
                <span>Username</span>
              </button>
            </div>

            <form
              action={loginFormAction}
              onSubmit={handleSignInSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}
            >
              <input type="hidden" name="role" value="user" />
              <input
                type="hidden"
                name="identifier"
                value={signInMethod === 'phone' ? signInPhone : signInUsername}
              />

              {/* Input 1: Identifier (Mobile or Username) */}
              <div
                style={{
                  background: '#18171C',
                  border:
                    signInMethod === 'phone' && signInPhoneWarning
                      ? '1px solid #f59e0b'
                      : isSignInFocused
                      ? '1px solid #3897f0'
                      : '1px solid rgba(255, 255, 255, 0.18)',
                  borderRadius: '14px',
                  padding: '0.45rem 0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                  boxShadow: isSignInFocused ? '0 0 0 1px #3897f0' : 'none',
                }}
                className="insta-input-box"
              >
                <span
                  style={{
                    fontSize: '0.6875rem',
                    color: '#8e8e93',
                    fontWeight: 500,
                    lineHeight: 1.1,
                    marginBottom: '2px',
                  }}
                >
                  {signInMethod === 'phone' ? 'Mobile number' : 'Username'}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span
                    style={{
                      fontSize: '0.9375rem',
                      fontWeight: 600,
                      color: '#a1a1aa',
                      userSelect: 'none',
                    }}
                  >
                    {signInMethod === 'phone' ? '+91' : '@'}
                  </span>

                  {signInMethod === 'phone' ? (
                    <input
                      id="signin-phone"
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={10}
                      placeholder="9876543210"
                      value={signInPhone}
                      onChange={(e) => handleSignInPhoneChange(e.target.value)}
                      onPaste={handleSignInPhonePaste}
                      onFocus={() => setIsSignInFocused(true)}
                      onBlur={() => setIsSignInFocused(false)}
                      onKeyDown={(e) => {
                        if (
                          !/[0-9]/.test(e.key) &&
                          e.key !== 'Backspace' &&
                          e.key !== 'Delete' &&
                          e.key !== 'ArrowLeft' &&
                          e.key !== 'ArrowRight' &&
                          e.key !== 'Tab' &&
                          e.key !== 'Enter' &&
                          !e.ctrlKey &&
                          !e.metaKey
                        ) {
                          e.preventDefault();
                        }
                      }}
                      autoFocus
                      required
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        color: '#ffffff',
                        fontSize: '0.9375rem',
                        fontWeight: 500,
                        outline: 'none',
                        padding: 0,
                        letterSpacing: '0.03em',
                        caretColor: '#3897f0',
                      }}
                    />
                  ) : (
                    <input
                      id="signin-username"
                      type="text"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck="false"
                      placeholder="username"
                      value={signInUsername}
                      onChange={(e) => handleUsernameChange(e.target.value, setSignInUsername)}
                      onFocus={() => setIsSignInFocused(true)}
                      onBlur={() => setIsSignInFocused(false)}
                      autoFocus
                      required
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        color: '#ffffff',
                        fontSize: '0.9375rem',
                        fontWeight: 500,
                        outline: 'none',
                        padding: 0,
                        textTransform: 'lowercase',
                        caretColor: '#3897f0',
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Warning if entered or pasted mobile exceeds 10 digits */}
              {signInMethod === 'phone' && signInPhoneWarning && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    color: '#f59e0b',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    marginTop: '-0.375rem',
                    marginBottom: '-0.125rem',
                  }}
                >
                  <AlertCircle size={13} color="#f59e0b" style={{ flexShrink: 0 }} />
                  <span>{signInPhoneWarning}</span>
                </div>
              )}

              {/* Input 2: Password */}
              <div
                style={{
                  background: '#18171C',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  borderRadius: '14px',
                  padding: '0.45rem 0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'border-color 0.15s ease',
                  position: 'relative',
                }}
                className="insta-input-box"
              >
                <span
                  style={{
                    fontSize: '0.6875rem',
                    color: '#8e8e93',
                    fontWeight: 500,
                    lineHeight: 1.1,
                    marginBottom: '2px',
                  }}
                >
                  Password
                </span>

                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <input
                    id="signin-password"
                    name="password"
                    type={showSignInPassword ? 'text' : 'password'}
                    placeholder="Enter password"
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '0.9375rem',
                      fontWeight: 500,
                      outline: 'none',
                      padding: '0 0.5rem 0 0',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignInPassword(!showSignInPassword)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#9ca3af',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 0,
                    }}
                    aria-label="Toggle password"
                  >
                    {showSignInPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Forgot Password Link */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-0.25rem' }}>
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#3897f0',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Forgot password?
                </button>
              </div>

              {/* Error Alert */}
              {(signInError || loginState?.error) && (
                <div
                  style={{
                    padding: '0.5rem 0.75rem',
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    color: '#f87171',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <AlertCircle size={14} style={{ flexShrink: 0 }} />
                  <span>{signInError || loginState?.error}</span>
                </div>
              )}

              {/* Primary Instagram Blue Pill Button (#065DE8) */}
              <button
                type="submit"
                disabled={loginPending}
                style={{
                  marginTop: '0.25rem',
                  width: '100%',
                  height: '46px',
                  borderRadius: '9999px',
                  border: 'none',
                  background: '#065DE8',
                  color: '#ffffff',
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  cursor: loginPending ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  opacity: loginPending ? 0.75 : 1,
                  transition: 'background-color 0.15s ease',
                }}
                className="insta-btn"
              >
                {loginPending ? 'Logging in...' : 'Log in'}
              </button>
            </form>

            {/* Bottom Link: Sign Up */}
            <div
              style={{
                marginTop: '1.5rem',
                textAlign: 'center',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                paddingTop: '1rem',
              }}
            >
              <span style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>
                Don&apos;t have an account?{' '}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSignInError('');
                  setSignInPhoneWarning(null);
                  setSignUpError('');
                  setSignUpPhoneWarning(null);
                  setUsernameCheckStatus({ checking: false, available: null });
                  setMode('signup');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#3897f0',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Sign up
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            VIEW 2: SIGN UP (Instagram Clean Onboarding Style)
            - 4 Compulsory fields in clean rounded inputs
            - Mobile with +91, Username with @, Password, Confirm
            - Blue pill button
           ======================================================== */}
        {mode === 'signup' && (
          <div>
            {/* Title & Subtitle */}
            <div style={{ marginBottom: '1rem' }}>
              <h1
                style={{
                  fontSize: '1.375rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  margin: '0 0 0.25rem 0',
                  letterSpacing: '-0.02em',
                }}
              >
                Create an account
              </h1>
              <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: 0, lineHeight: 1.35 }}>
                Fill in your details to register your account.
              </p>
            </div>

            <form
              action={signUpFormAction}
              onSubmit={handleSignUpSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}
            >
              {/* 1. Mobile Number (Compulsory, with +91 badge) */}
              <div
                style={{
                  background: '#18171C',
                  border: signUpPhoneWarning
                    ? '1px solid #f59e0b'
                    : isSignUpPhoneFocused
                    ? '1px solid #3897f0'
                    : '1px solid rgba(255, 255, 255, 0.18)',
                  borderRadius: '13px',
                  padding: '0.4rem 0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                  boxShadow: isSignUpPhoneFocused ? '0 0 0 1px #3897f0' : 'none',
                }}
                className="insta-input-box"
              >
                <span style={{ fontSize: '0.65rem', color: '#8e8e93', fontWeight: 500, lineHeight: 1 }}>
                  Mobile number <span style={{ color: '#ef4444' }}>*</span>
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '2px' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#a1a1aa' }}>+91</span>
                  <input
                    id="signup-phone"
                    name="phone"
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={10}
                    placeholder="10-digit mobile"
                    value={signUpPhone}
                    onChange={(e) => handleSignUpPhoneChange(e.target.value)}
                    onPaste={handleSignUpPhonePaste}
                    onFocus={() => setIsSignUpPhoneFocused(true)}
                    onBlur={() => setIsSignUpPhoneFocused(false)}
                    onKeyDown={(e) => {
                      if (
                        !/[0-9]/.test(e.key) &&
                        e.key !== 'Backspace' &&
                        e.key !== 'Delete' &&
                        e.key !== 'ArrowLeft' &&
                        e.key !== 'ArrowRight' &&
                        e.key !== 'Tab' &&
                        e.key !== 'Enter' &&
                        !e.ctrlKey &&
                        !e.metaKey
                      ) {
                        e.preventDefault();
                      }
                    }}
                    required
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      outline: 'none',
                      padding: 0,
                      caretColor: '#3897f0',
                    }}
                  />
                  {signUpPhone.length === 10 && !signUpPhoneWarning && (
                    <CheckCircle2 size={15} color="#22c55e" />
                  )}
                </div>
              </div>

              {/* Warning if entered or pasted mobile exceeds 10 digits */}
              {signUpPhoneWarning && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    color: '#f59e0b',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    marginTop: '-0.25rem',
                    marginBottom: '0.1rem',
                  }}
                >
                  <AlertCircle size={13} color="#f59e0b" style={{ flexShrink: 0 }} />
                  <span>{signUpPhoneWarning}</span>
                </div>
              )}

              {/* 2. Username (Compulsory, with non-deletable @ badge, lowercase alphanumeric) */}
              <div
                style={{
                  background: '#18171C',
                  border:
                    usernameCheckStatus.available === false
                      ? '1px solid #ef4444'
                      : usernameCheckStatus.available === true
                      ? '1px solid rgba(34, 197, 94, 0.5)'
                      : isSignUpUsernameFocused
                      ? '1px solid #3897f0'
                      : '1px solid rgba(255, 255, 255, 0.18)',
                  borderRadius: '13px',
                  padding: '0.4rem 0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                  boxShadow:
                    usernameCheckStatus.available === false
                      ? '0 0 0 1px #ef4444'
                      : isSignUpUsernameFocused
                      ? '0 0 0 1px #3897f0'
                      : 'none',
                }}
                className="insta-input-box"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.65rem', color: '#8e8e93', fontWeight: 500, lineHeight: 1 }}>
                    Username <span style={{ color: '#ef4444' }}>*</span>
                  </span>
                  {usernameCheckStatus.checking && (
                    <span style={{ fontSize: '0.65rem', color: '#a1a1aa', fontWeight: 500 }}>
                      Checking...
                    </span>
                  )}
                  {!usernameCheckStatus.checking && usernameCheckStatus.available === true && (
                    <span style={{ fontSize: '0.65rem', color: '#22c55e', fontWeight: 600 }}>
                      ✓ Available
                    </span>
                  )}
                  {!usernameCheckStatus.checking && usernameCheckStatus.available === false && (
                    <span style={{ fontSize: '0.65rem', color: '#ef4444', fontWeight: 600 }}>
                      ✗ Already taken
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '2px' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#a1a1aa' }}>@</span>
                  <input
                    id="signup-username"
                    name="username"
                    type="text"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                    placeholder="letters & numbers only"
                    value={signUpUsername}
                    onChange={(e) => {
                      setSignUpError('');
                      handleUsernameChange(e.target.value, setSignUpUsername);
                    }}
                    onFocus={() => setIsSignUpUsernameFocused(true)}
                    onBlur={() => setIsSignUpUsernameFocused(false)}
                    required
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      outline: 'none',
                      padding: 0,
                      textTransform: 'lowercase',
                    }}
                  />
                  {usernameCheckStatus.checking && (
                    <Loader2 size={15} color="#3897f0" className="animate-spin" />
                  )}
                  {!usernameCheckStatus.checking && usernameCheckStatus.available === true && (
                    <CheckCircle2 size={15} color="#22c55e" />
                  )}
                  {!usernameCheckStatus.checking && usernameCheckStatus.available === false && (
                    <XCircle size={15} color="#ef4444" />
                  )}
                </div>
              </div>

              {/* Warning if username already taken */}
              {!usernameCheckStatus.checking && usernameCheckStatus.available === false && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    color: '#ef4444',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    marginTop: '-0.25rem',
                    marginBottom: '0.1rem',
                  }}
                >
                  <AlertCircle size={13} color="#ef4444" style={{ flexShrink: 0 }} />
                  <span>{usernameCheckStatus.error || 'Username is already taken'}</span>
                </div>
              )}

              {/* 3. Password (Compulsory: 8+ chars, 1 letter, 1 number) */}
              <div
                style={{
                  background: '#18171C',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  borderRadius: '13px',
                  padding: '0.4rem 0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                }}
                className="insta-input-box"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.65rem', color: '#8e8e93', fontWeight: 500, lineHeight: 1 }}>
                    Password <span style={{ color: '#ef4444' }}>*</span>
                  </span>
                  {pwIsValid && (
                    <span style={{ fontSize: '0.65rem', color: '#22c55e', fontWeight: 600 }}>
                      ✓ Strong
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', marginTop: '2px' }}>
                  <input
                    id="signup-password"
                    name="password"
                    type={showSignUpPassword ? 'text' : 'password'}
                    placeholder="Create password"
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      outline: 'none',
                      padding: 0,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#9ca3af',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 0,
                    }}
                    aria-label="Toggle password"
                  >
                    {showSignUpPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* 4. Confirm Password (Compulsory) */}
              <div
                style={{
                  background: '#18171C',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  borderRadius: '13px',
                  padding: '0.4rem 0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                }}
                className="insta-input-box"
              >
                <span style={{ fontSize: '0.65rem', color: '#8e8e93', fontWeight: 500, lineHeight: 1 }}>
                  Confirm password <span style={{ color: '#ef4444' }}>*</span>
                </span>
                <div style={{ display: 'flex', alignItems: 'center', marginTop: '2px' }}>
                  <input
                    id="signup-confirm-password"
                    name="confirm_password"
                    type={showSignUpConfirm ? 'text' : 'password'}
                    placeholder="Confirm password"
                    value={signUpConfirmPassword}
                    onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      outline: 'none',
                      padding: 0,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignUpConfirm(!showSignUpConfirm)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#9ca3af',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 0,
                    }}
                    aria-label="Toggle password"
                  >
                    {showSignUpConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Error banner */}
              {(signUpError || signUpState?.error) && (
                <div
                  style={{
                    padding: '0.4rem 0.65rem',
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '10px',
                    fontSize: '0.6875rem',
                    color: '#f87171',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <AlertCircle size={13} style={{ flexShrink: 0 }} />
                  <span>{signUpError || signUpState?.error}</span>
                </div>
              )}

              {/* Blue Pill Button */}
              <button
                type="submit"
                disabled={signUpPending}
                style={{
                  marginTop: '0.25rem',
                  width: '100%',
                  height: '44px',
                  borderRadius: '9999px',
                  border: 'none',
                  background: '#065DE8',
                  color: '#ffffff',
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  cursor: signUpPending ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: signUpPending ? 0.75 : 1,
                }}
                className="insta-btn"
              >
                {signUpPending ? 'Creating account...' : 'Create Account'}
              </button>
            </form>

            {/* Bottom Link: Log In */}
            <div
              style={{
                marginTop: '1rem',
                textAlign: 'center',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                paddingTop: '0.75rem',
              }}
            >
              <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                Already have an account?{' '}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSignUpError('');
                  setSignUpPhoneWarning(null);
                  setSignInError('');
                  setSignInPhoneWarning(null);
                  setUsernameCheckStatus({ checking: false, available: null });
                  setMode('signin');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#3897f0',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Log in
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            VIEW 3: FORGOT PASSWORD (Instagram Clean Style)
            1. Clear instructions to contact admin
            2. Shows WhatsApp contact (+91 7652851408)
           ======================================================== */}
        {mode === 'forgot' && (
          <div>
            {/* Title & Subtitle */}
            <div style={{ marginBottom: '1.125rem' }}>
              <h1
                style={{
                  fontSize: '1.375rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  margin: '0 0 0.25rem 0',
                  letterSpacing: '-0.02em',
                }}
              >
                Reset password
              </h1>
              <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: 0, lineHeight: 1.4 }}>
                Follow the instructions below to recover your account with the administrator.
              </p>
            </div>

            {/* Part 1: Clean Instructions Card */}
            <div
              style={{
                background: '#18171C',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                borderRadius: '14px',
                padding: '0.875rem',
                marginBottom: '1rem',
              }}
            >
              <p style={{ fontSize: '0.75rem', color: '#cbd5e1', lineHeight: 1.45, margin: '0 0 0.625rem 0' }}>
                For the security of financial records, password resets are processed exclusively by the <strong style={{ color: '#ffffff' }}>System Administrator</strong>:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.45rem', fontSize: '0.75rem', color: '#a1a1aa' }}>
                  <span style={{ color: '#3897f0', fontWeight: 700 }}>1.</span>
                  <span>Contact the administrator on WhatsApp using the button below.</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.45rem', fontSize: '0.75rem', color: '#a1a1aa' }}>
                  <span style={{ color: '#3897f0', fontWeight: 700 }}>2.</span>
                  <span>Provide your registered <strong>@username</strong> or <strong>Mobile Number</strong>.</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.45rem', fontSize: '0.75rem', color: '#a1a1aa' }}>
                  <span style={{ color: '#3897f0', fontWeight: 700 }}>3.</span>
                  <span>Admin will verify your identity and send your reset credentials.</span>
                </div>
              </div>
            </div>

            {/* Part 2: WhatsApp Contact Action Button */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.6875rem', color: '#86efac', fontWeight: 600, marginBottom: '0.45rem', textAlign: 'center' }}>
                Administrator WhatsApp Contact
              </div>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  width: '100%',
                  height: '46px',
                  borderRadius: '9999px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #25D366, #128C7E)',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  boxShadow: '0 4px 16px rgba(37, 211, 102, 0.3)',
                  boxSizing: 'border-box',
                }}
                className="insta-btn"
              >
                <MessageCircle size={17} color="#ffffff" />
                <span>Chat on WhatsApp (+91 {ADMIN_WHATSAPP_NUMBER})</span>
                <ExternalLink size={13} color="#ffffff" />
              </a>
            </div>

            {/* Back Button */}
            <button
              type="button"
              onClick={() => setMode('signin')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
                background: 'none',
                border: 'none',
                color: '#9ca3af',
                fontSize: '0.8125rem',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              <ArrowLeft size={14} />
              <span>Back to Log in</span>
            </button>
          </div>
        )}

        {/* ========================================================
            VIEW 4: CHANGE PASSWORD (?tab=change)
           ======================================================== */}
        {mode === 'change' && (
          <div>
            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                Update password
              </h1>
              <button
                type="button"
                onClick={() => setMode('signin')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#3897f0',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Back
              </button>
            </div>

            {changeState?.success ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.625rem', padding: '1rem 0', textAlign: 'center' }}>
                <CheckCircle2 size={36} color="#22c55e" />
                <div>
                  <p style={{ fontSize: '0.875rem', fontWeight: 650, color: '#ffffff', margin: '0 0 0.25rem 0' }}>
                    Password updated!
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: 0 }}>
                    You can now sign in with your new password.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  style={{
                    height: '42px',
                    padding: '0 1.25rem',
                    borderRadius: '9999px',
                    border: 'none',
                    background: '#065DE8',
                    color: '#ffffff',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Log in
                </button>
              </div>
            ) : (
              <form action={changeFormAction} style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                <div
                  style={{
                    background: '#18171C',
                    border: '1px solid rgba(255, 255, 255, 0.18)',
                    borderRadius: '13px',
                    padding: '0.4rem 0.75rem',
                  }}
                  className="insta-input-box"
                >
                  <span style={{ fontSize: '0.65rem', color: '#8e8e93', fontWeight: 500 }}>Username</span>
                  <input
                    id="cp-username"
                    name="username"
                    type="text"
                    placeholder="Username"
                    autoComplete="username"
                    required
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '0.875rem',
                      outline: 'none',
                      padding: 0,
                    }}
                  />
                </div>

                <div
                  style={{
                    background: '#18171C',
                    border: '1px solid rgba(255, 255, 255, 0.18)',
                    borderRadius: '13px',
                    padding: '0.4rem 0.75rem',
                  }}
                  className="insta-input-box"
                >
                  <span style={{ fontSize: '0.65rem', color: '#8e8e93', fontWeight: 500 }}>Current password</span>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <input
                      id="cp-old"
                      name="old_password"
                      type={showOldPassword ? 'text' : 'password'}
                      placeholder="Current password"
                      autoComplete="current-password"
                      required
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        color: '#ffffff',
                        fontSize: '0.875rem',
                        outline: 'none',
                        padding: 0,
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPassword(!showOldPassword)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0 }}
                    >
                      {showOldPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    background: '#18171C',
                    border: '1px solid rgba(255, 255, 255, 0.18)',
                    borderRadius: '13px',
                    padding: '0.4rem 0.75rem',
                  }}
                  className="insta-input-box"
                >
                  <span style={{ fontSize: '0.65rem', color: '#8e8e93', fontWeight: 500 }}>New password</span>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <input
                      id="cp-new"
                      name="new_password"
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="Min 8 characters, 1 letter, 1 number"
                      autoComplete="new-password"
                      required
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        color: '#ffffff',
                        fontSize: '0.875rem',
                        outline: 'none',
                        padding: 0,
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0 }}
                    >
                      {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    background: '#18171C',
                    border: '1px solid rgba(255, 255, 255, 0.18)',
                    borderRadius: '13px',
                    padding: '0.4rem 0.75rem',
                  }}
                  className="insta-input-box"
                >
                  <span style={{ fontSize: '0.65rem', color: '#8e8e93', fontWeight: 500 }}>Confirm new password</span>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <input
                      id="cp-confirm"
                      name="confirm_password"
                      type={showChangeConfirm ? 'text' : 'password'}
                      placeholder="Re-enter password"
                      autoComplete="new-password"
                      required
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        color: '#ffffff',
                        fontSize: '0.875rem',
                        outline: 'none',
                        padding: 0,
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowChangeConfirm(!showChangeConfirm)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0 }}
                    >
                      {showChangeConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {changeState?.error && (
                  <div
                    style={{
                      padding: '0.4rem 0.65rem',
                      background: 'rgba(239, 68, 68, 0.12)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '10px',
                      fontSize: '0.6875rem',
                      color: '#f87171',
                    }}
                  >
                    {changeState.error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={changePending}
                  style={{
                    marginTop: '0.25rem',
                    height: '44px',
                    borderRadius: '9999px',
                    border: 'none',
                    background: '#065DE8',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: changePending ? 'not-allowed' : 'pointer',
                  }}
                  className="insta-btn"
                >
                  {changePending ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      <style>{`
        .insta-input-box:focus-within {
          border-color: #3897f0 !important;
        }
        .insta-btn:hover {
          opacity: 0.92;
        }
        .insta-btn:active {
          transform: scale(0.985);
        }
      `}</style>
    </div>
  );
}
