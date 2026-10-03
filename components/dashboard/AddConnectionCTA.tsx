'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlus,
  X,
  Check,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import {
  createPersonalContactAction,
  checkPhoneForContactAction,
  sendConnectionRequestAction,
} from '@/lib/actions/connection.actions';
import { useRouter } from 'next/navigation';
import { useSwipeDownDismiss } from '@/lib/hooks/useSwipeDownDismiss';

type Props = {
  currentUserId: string;
  avatarUrl?: string | null;
  netPosition?: number;
};

type FoundUser = {
  id: string;
  username: string;
  name: string;
  avatar_url?: string | null;
  phone?: string;
};

/**
 * Format phone input:
 * - Strips all non-digit characters (spaces, dashes, etc.)
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

function getInitials(name: string) {
  return (name || 'User')
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function AddConnectionCTA({ currentUserId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'input' | 'found' | 'not_found'>('input');

  const sheetRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleClose = () => {
    setIsOpen(false);
  };

  const { isDismissing, dismissSheet, handleHeaderPointerDown } = useSwipeDownDismiss({
    isOpen,
    onClose: handleClose,
    sheetRef,
    backdropRef,
    scrollRef,
    headerSelector: '.sheet-handle, .modal-header, [data-drag-header="true"], [data-drag-handle="true"]',
    threshold: 110,
  });

  // Phone input states
  const [phone, setPhone] = useState('');
  const [phoneWarning, setPhoneWarning] = useState<string | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isPhoneFocused, setIsPhoneFocused] = useState(false);

  // Found user states
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [isPendingFromMe, setIsPendingFromMe] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [requestSentSuccess, setRequestSentSuccess] = useState(false);

  // Not found (Personal Contact) states
  const [personalName, setPersonalName] = useState('');
  const [isNameFocused, setIsNameFocused] = useState(false);
  const [addingPersonal, setAddingPersonal] = useState(false);
  const [personalError, setPersonalError] = useState<string | null>(null);
  const [personalSuccess, setPersonalSuccess] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const handleOpen = () => {
    setStep('input');
    setPhone('');
    setPhoneWarning(null);
    setInputError(null);
    setFoundUser(null);
    setIsConnected(false);
    setHasPendingRequest(false);
    setRequestSentSuccess(false);
    setPersonalName('');
    setPersonalError(null);
    setPersonalSuccess(null);
    setIsOpen(true);
    setTimeout(() => {
      phoneInputRef.current?.focus();
    }, 150);
  };

  const handlePhoneInputChange = (raw: string) => {
    setInputError(null);
    const { digits, warning } = cleanPhoneNumber(raw);
    setPhone(digits);
    setPhoneWarning(warning);
  };

  const handlePhonePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    handlePhoneInputChange(pasted);
  };

  // Track whether phone/name input was just blurred by tapping outside or on the action button
  const phoneJustBlurredRef = useRef(false);
  const nameJustBlurredRef = useRef(false);

  // When user taps "Next", if the phone input was active/focused, first hide keyboard
  const handleNextPointerDown = () => {
    if (document.activeElement === phoneInputRef.current || isPhoneFocused) {
      phoneJustBlurredRef.current = true;
      phoneInputRef.current?.blur();
    } else {
      phoneJustBlurredRef.current = false;
    }
  };

  const handleNextClick = (e: React.MouseEvent) => {
    // If the input was focused when the user started tapping "Next", hide keyboard on first click
    if (phoneJustBlurredRef.current) {
      e.preventDefault();
      phoneJustBlurredRef.current = false;
      return;
    }
    // Second click (when keyboard is already hidden) proceeds with lookup
    handleCheckPhone();
  };

  // Same behavior for personal contact name submission
  const handleAddPersonalPointerDown = () => {
    if (document.activeElement === nameInputRef.current || isNameFocused) {
      nameJustBlurredRef.current = true;
      nameInputRef.current?.blur();
    } else {
      nameJustBlurredRef.current = false;
    }
  };

  const handleAddPersonalClick = (e: React.MouseEvent) => {
    if (nameJustBlurredRef.current) {
      e.preventDefault();
      nameJustBlurredRef.current = false;
      return;
    }
    handleAddPersonalContact();
  };

  // Dismiss keyboard when clicking anywhere outside the active input field
  const handleDismissKeyboardIfOutside = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement | null;
    if (
      (document.activeElement === phoneInputRef.current || isPhoneFocused) &&
      !phoneInputRef.current?.contains(target) &&
      !target?.closest('#connection-phone-container')
    ) {
      phoneInputRef.current?.blur();
    }
    if (
      (document.activeElement === nameInputRef.current || isNameFocused) &&
      !nameInputRef.current?.contains(target) &&
      !target?.closest('#connection-name-container')
    ) {
      nameInputRef.current?.blur();
    }
  };

  // Step 1 -> Lookup phone in database
  const handleCheckPhone = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (phone.length < 10) {
      setInputError('Please enter a valid 10-digit mobile number');
      return;
    }

    setIsChecking(true);
    setInputError(null);

    try {
      const res = await checkPhoneForContactAction(phone);
      if (res.error) {
        setInputError(res.error);
        setIsChecking(false);
        return;
      }

      if (res.existingUser) {
        setFoundUser(res.existingUser);
        setIsConnected(!!res.isConnected);
        setHasPendingRequest(!!res.hasPendingRequest);
        setIsPendingFromMe(!!res.isPendingFromMe);
        setRequestSentSuccess(false);
        setStep('found');
      } else {
        setFoundUser(null);
        setPersonalName('');
        setPersonalError(null);
        setPersonalSuccess(null);
        setStep('not_found');
        setTimeout(() => {
          nameInputRef.current?.focus();
        }, 150);
      }
    } catch (err: any) {
      setInputError(err.message || 'Failed to search database. Please try again.');
    } finally {
      setIsChecking(false);
    }
  };

  // Step 2A -> Send Connection Request to found registered user
  const handleSendRequest = async () => {
    if (!foundUser) return;
    setSendingRequest(true);
    try {
      const res = await sendConnectionRequestAction(foundUser.id);
      if (res.error) {
        alert(res.error);
      } else {
        setRequestSentSuccess(true);
        startTransition(() => {
          router.refresh();
        });
        setTimeout(() => {
          handleClose();
        }, 1500);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to send connection request');
    } finally {
      setSendingRequest(false);
    }
  };

  // Step 2B -> Add as Personal Contact in ledger
  const handleAddPersonalContact = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!personalName.trim()) {
      setPersonalError('Please enter a contact name');
      return;
    }

    setAddingPersonal(true);
    setPersonalError(null);
    try {
      const res = await createPersonalContactAction(personalName.trim(), `+91${phone}`);
      if (res.error) {
        if (res.error === 'DUPLICATE') {
          setPersonalError('A contact with this mobile number already exists in your ledger.');
        } else {
          setPersonalError(res.error);
        }
        return;
      }

      setPersonalSuccess(`Account for "${personalName.trim()}" created successfully!`);
      startTransition(() => {
        router.refresh();
      });
      setTimeout(() => {
        handleClose();
      }, 1300);
    } catch (err: any) {
      setPersonalError(err.message || 'Failed to create contact account.');
    } finally {
      setAddingPersonal(false);
    }
  };

  return (
    <>
      {/* ─── Floating Action Button (FAB) — Instagram Blue Add Person Button ─── */}
      <motion.button
        whileHover={{
          scale: 1.05,
          boxShadow: '0 6px 20px rgba(0, 0, 0, 0.45)',
        }}
        whileTap={{ scale: 0.94 }}
        transition={{ type: 'spring', stiffness: 450, damping: 22 }}
        onClick={handleOpen}
        className="add-connection-fab"
        aria-label="Add New Person / Connection"
        title="Add Connection"
        style={{
          position: 'fixed',
          bottom: 'max(1.25rem, calc(env(safe-area-inset-bottom, 0px) + 1.25rem))',
          right: 'max(1.25rem, calc(env(safe-area-inset-right, 0px) + 1.25rem))',
          zIndex: 45,
          width: 56,
          height: 56,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          outline: 'none',
          cursor: 'pointer',
          background: 'linear-gradient(135deg, #065DE8 0%, #1e75ff 52%, #3897f0 100%)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <UserPlus
          size={25}
          strokeWidth={2.3}
          color="#ffffff"
          style={{
            display: 'block',
            transform: 'translateX(0.5px)',
          }}
        />
      </motion.button>

      {/* ─── Modal / Bottom Sheet ─── */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            {/* Backdrop */}
            <motion.div
              ref={backdropRef}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={isDismissing ? undefined : { opacity: 0 }}
              transition={{ duration: 0.22 }}
              onClick={dismissSheet}
              onPointerDown={handleDismissKeyboardIfOutside}
              onTouchMove={(e) => e.preventDefault()}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(28px) saturate(180%)',
                WebkitBackdropFilter: 'blur(28px) saturate(180%)',
                zIndex: 60,
              }}
            />

            {/* Sheet / Dialog */}
            <motion.div
              ref={sheetRef}
              initial={{ opacity: 0, y: 'calc(100% + 50px)' }}
              animate={{ opacity: 1, y: 0 }}
              exit={isDismissing ? undefined : { opacity: 0, y: 'calc(100% + 50px)' }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              onPointerDown={(e) => {
                handleDismissKeyboardIfOutside(e);
                handleHeaderPointerDown(e);
              }}
              className="add-connection-modal"
              style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                maxWidth: 480,
                margin: '0 auto',
                zIndex: 61,
                pointerEvents: isDismissing ? 'none' : 'auto',
                background: 'var(--bg-base)',
                borderTop: '1px solid rgba(255, 255, 255, 0.14)',
                borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
                borderRight: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 24px 64px -12px rgba(0, 0, 0, 0.75)',
                borderTopLeftRadius: '28px',
                borderTopRightRadius: '28px',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {/* Mobile handle indicator */}
              <div
                className="sheet-handle"
                data-drag-handle="true"
                style={{ cursor: 'grab', touchAction: 'none' }}
              >
                <div
                  style={{
                    width: 44,
                    height: 5,
                    borderRadius: 3,
                    background: 'rgba(255, 255, 255, 0.28)',
                    margin: '0.625rem auto 0.25rem',
                    cursor: 'grab',
                  }}
                />
              </div>

              {/* Modal Topbar Header (Instagram Style) */}
              <div
                className="modal-header"
                data-drag-header="true"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.875rem 1.25rem 0.75rem',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  touchAction: 'none',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  cursor: 'grab',
                }}
              >
                {step !== 'input' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setStep('input');
                      setInputError(null);
                      setPhoneWarning(null);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      padding: '4px 6px',
                      borderRadius: '6px',
                    }}
                  >
                    <ArrowLeft size={16} />
                    <span>Back</span>
                  </button>
                ) : (
                  <div style={{ width: 40 }} />
                )}

                <h3
                  style={{
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    letterSpacing: '-0.01em',
                    margin: 0,
                  }}
                >
                  Add Connection
                </h3>

                <button
                  type="button"
                  onClick={dismissSheet}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Body */}
              <div
                ref={scrollRef}
                data-scrollable="true"
                style={{
                  padding: '1.25rem',
                  overflowY: 'auto',
                  maxHeight: 'calc(90vh - 75px)',
                  WebkitOverflowScrolling: 'touch',
                  overscrollBehavior: 'contain',
                }}
                onPointerDown={handleDismissKeyboardIfOutside}
              >
                {/* ══════════════════════════════════════════════════════
                    STEP 1: Enter Phone Number (Instagram Login Style)
                   ══════════════════════════════════════════════════════ */}
                {step === 'input' && (
                  <form onSubmit={(e) => { e.preventDefault(); if (!phoneJustBlurredRef.current) handleCheckPhone(); }}>
                    <div style={{ marginBottom: '1.25rem' }}>
                      <h4
                        style={{
                          fontSize: '1.1875rem',
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                          margin: '0 0 0.35rem 0',
                          letterSpacing: '-0.02em',
                        }}
                      >
                        Enter mobile number
                      </h4>
                      <p
                        style={{
                          fontSize: '0.8125rem',
                          color: 'var(--text-muted)',
                          margin: 0,
                          lineHeight: 1.45,
                        }}
                      >
                        Search registered users on Shared Ledger or add a personal contact.
                      </p>
                    </div>

                    {/* Phone Input Box matching Instagram Login Page */}
                    <div
                      id="connection-phone-container"
                      style={{
                        background: '#18171C',
                        border: isPhoneFocused
                          ? '1px solid #3897f0'
                          : phoneWarning || inputError
                          ? '1px solid #f43f5e'
                          : '1px solid rgba(255, 255, 255, 0.18)',
                        borderRadius: '14px',
                        padding: '0.625rem 0.875rem',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                        boxShadow: isPhoneFocused ? '0 0 0 1px #3897f0' : 'none',
                        marginBottom: '0.625rem',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          fontWeight: 500,
                          color: '#9ca3af',
                          marginBottom: '2px',
                        }}
                      >
                        Mobile number
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span
                          style={{
                            fontSize: '0.9375rem',
                            fontWeight: 600,
                            color: '#a1a1aa',
                            userSelect: 'none',
                          }}
                        >
                          +91
                        </span>

                        <input
                          ref={phoneInputRef}
                          id="connection-phone-input"
                          type="tel"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={10}
                          placeholder="9876543210"
                          value={phone}
                          autoComplete="off"
                          autoCorrect="off"
                          spellCheck={false}
                          onChange={(e) => handlePhoneInputChange(e.target.value)}
                          onPaste={handlePhonePaste}
                          onFocus={() => setIsPhoneFocused(true)}
                          onBlur={() => setIsPhoneFocused(false)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              phoneInputRef.current?.blur();
                            }
                          }}
                          style={{
                            flex: 1,
                            background: 'transparent',
                            border: 'none',
                            color: '#ffffff',
                            fontSize: '0.9375rem',
                            fontWeight: 500,
                            outline: 'none',
                            padding: 0,
                            letterSpacing: '0.04em',
                            caretColor: '#3897f0',
                          }}
                        />
                      </div>
                    </div>

                    {/* Warning if pasted number exceeds 10 digits */}
                    {phoneWarning && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          color: '#f59e0b',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          marginBottom: '0.75rem',
                        }}
                      >
                        <AlertCircle size={13} color="#f59e0b" style={{ flexShrink: 0 }} />
                        <span>{phoneWarning}</span>
                      </div>
                    )}

                    {/* Input error message */}
                    {inputError && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          color: '#f43f5e',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          marginBottom: '0.75rem',
                        }}
                      >
                        <AlertCircle size={13} color="#f43f5e" style={{ flexShrink: 0 }} />
                        <span>{inputError}</span>
                      </div>
                    )}

                    {/* Next Action Button — First tap dismisses keyboard if active, second tap proceeds */}
                    <button
                      type="button"
                      onPointerDown={handleNextPointerDown}
                      onClick={handleNextClick}
                      disabled={phone.length < 10 || isChecking}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '9999px',
                        background:
                          phone.length === 10 && !isChecking
                            ? 'linear-gradient(135deg, #065DE8 0%, #1e75ff 52%, #3897f0 100%)'
                            : 'rgba(255, 255, 255, 0.08)',
                        border: 'none',
                        color: phone.length === 10 && !isChecking ? '#ffffff' : 'rgba(255, 255, 255, 0.4)',
                        fontSize: '0.875rem',
                        fontWeight: 700,
                        cursor: phone.length === 10 && !isChecking ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        marginTop: '0.875rem',
                        boxShadow:
                          phone.length === 10 && !isChecking ? '0 4px 16px rgba(6, 93, 232, 0.35)' : 'none',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {isChecking ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Searching...</span>
                        </>
                      ) : (
                        <span>Next</span>
                      )}
                    </button>
                  </form>
                )}

                {/* ══════════════════════════════════════════════════════
                    STEP 2A: User Found on Shared Ledger
                   ══════════════════════════════════════════════════════ */}
                {step === 'found' && foundUser && (
                  <div>
                    <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: 'rgba(56, 151, 240, 0.12)',
                          color: '#3897f0',
                          border: '1px solid rgba(56, 151, 240, 0.28)',
                          padding: '3px 10px',
                          borderRadius: '9999px',
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          marginBottom: '0.75rem',
                        }}
                      >
                        <Sparkles size={11} /> Registered User Found
                      </span>
                      <h4
                        style={{
                          fontSize: '1.1875rem',
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                          margin: 0,
                          letterSpacing: '-0.02em',
                        }}
                      >
                        Add to your ledger
                      </h4>
                    </div>

                    {/* User Profile Card */}
                    <div
                      style={{
                        background: '#18171C',
                        border: '1px solid rgba(255, 255, 255, 0.14)',
                        borderRadius: '16px',
                        padding: '1.125rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.875rem',
                        marginBottom: '1.25rem',
                      }}
                    >
                      {/* Avatar */}
                      <div
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #065DE8 0%, #3897f0 100%)',
                          border: '2px solid rgba(255, 255, 255, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: '1.125rem',
                          overflow: 'hidden',
                          flexShrink: 0,
                        }}
                      >
                        {foundUser.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={foundUser.avatar_url}
                            alt={foundUser.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          getInitials(foundUser.name)
                        )}
                      </div>

                      {/* Info */}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <h5
                          style={{
                            fontSize: '1rem',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            margin: '0 0 2px 0',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {foundUser.name}
                        </h5>
                        <p
                          style={{
                            fontSize: '0.8125rem',
                            fontWeight: 500,
                            color: '#3897f0',
                            margin: '0 0 4px 0',
                          }}
                        >
                          @{foundUser.username}
                        </p>
                        <p
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)',
                            margin: 0,
                          }}
                        >
                          +91 {phone}
                        </p>
                      </div>
                    </div>

                    {/* Status Notice or Action Button */}
                    {isConnected ? (
                      <div>
                        <div
                          style={{
                            padding: '0.75rem',
                            borderRadius: '12px',
                            background: 'rgba(16, 185, 129, 0.1)',
                            border: '1px solid rgba(16, 185, 129, 0.25)',
                            color: '#10b981',
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            textAlign: 'center',
                            marginBottom: '0.75rem',
                          }}
                        >
                          You are already connected with this user!
                        </div>
                        <button
                          type="button"
                          onClick={handleClose}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            borderRadius: '9999px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: 'none',
                            color: '#ffffff',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Close
                        </button>
                      </div>
                    ) : hasPendingRequest ? (
                      <div>
                        <div
                          style={{
                            padding: '0.75rem',
                            borderRadius: '12px',
                            background: 'rgba(245, 158, 11, 0.1)',
                            border: '1px solid rgba(245, 158, 11, 0.25)',
                            color: '#f59e0b',
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            textAlign: 'center',
                            marginBottom: '0.75rem',
                          }}
                        >
                          {isPendingFromMe
                            ? 'Connection request already sent and pending.'
                            : 'This user has already sent you a connection request!'}
                        </div>
                        <button
                          type="button"
                          onClick={handleClose}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            borderRadius: '9999px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: 'none',
                            color: '#ffffff',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Close
                        </button>
                      </div>
                    ) : requestSentSuccess ? (
                      <div
                        style={{
                          padding: '0.875rem',
                          borderRadius: '9999px',
                          background: '#10b981',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem',
                          fontWeight: 700,
                          fontSize: '0.875rem',
                        }}
                      >
                        <Check size={18} />
                        <span>Connection Request Sent!</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendRequest}
                        disabled={sendingRequest}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          borderRadius: '9999px',
                          background: 'linear-gradient(135deg, #065DE8 0%, #1e75ff 52%, #3897f0 100%)',
                          border: 'none',
                          color: '#ffffff',
                          fontSize: '0.875rem',
                          fontWeight: 700,
                          cursor: sendingRequest ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem',
                          boxShadow: '0 4px 16px rgba(6, 93, 232, 0.35)',
                        }}
                      >
                        {sendingRequest ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>Sending Request...</span>
                          </>
                        ) : (
                          <>
                            <UserPlus size={17} />
                            <span>Send Connection Request</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}

                {/* ══════════════════════════════════════════════════════
                    STEP 2B: User NOT Found -> Add as Personal Contact
                   ══════════════════════════════════════════════════════ */}
                {step === 'not_found' && (
                  <form onSubmit={(e) => { e.preventDefault(); if (!nameJustBlurredRef.current) handleAddPersonalContact(); }}>
                    {/* Warning Notice Box */}
                    <div
                      style={{
                        background: 'rgba(245, 158, 11, 0.1)',
                        border: '1px solid rgba(245, 158, 11, 0.25)',
                        borderRadius: '12px',
                        padding: '0.875rem',
                        marginBottom: '1.25rem',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.625rem',
                      }}
                    >
                      <AlertCircle size={17} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <h5
                          style={{
                            fontSize: '0.8125rem',
                            fontWeight: 700,
                            color: '#f59e0b',
                            margin: '0 0 2px 0',
                          }}
                        >
                          User not found on Shared Ledger
                        </h5>
                        <p
                          style={{
                            fontSize: '0.75rem',
                            color: 'rgba(255, 255, 255, 0.75)',
                            margin: 0,
                            lineHeight: 1.4,
                          }}
                        >
                          No registered account exists for <strong>+91 {phone}</strong>. You can add them as a personal contact to track payments and balances privately in your ledger.
                        </p>
                      </div>
                    </div>

                    {/* Contact Name Input (Instagram style) */}
                    <div
                      id="connection-name-container"
                      style={{
                        background: '#18171C',
                        border: isNameFocused
                          ? '1px solid #3897f0'
                          : personalError
                          ? '1px solid #f43f5e'
                          : '1px solid rgba(255, 255, 255, 0.18)',
                        borderRadius: '14px',
                        padding: '0.625rem 0.875rem',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                        boxShadow: isNameFocused ? '0 0 0 1px #3897f0' : 'none',
                        marginBottom: '0.75rem',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          fontWeight: 500,
                          color: '#9ca3af',
                          marginBottom: '2px',
                        }}
                      >
                        Contact name
                      </span>

                      <input
                        ref={nameInputRef}
                        type="text"
                        placeholder="e.g. Rahul Sharma"
                        value={personalName}
                        autoComplete="off"
                        onChange={(e) => {
                          setPersonalName(e.target.value);
                          setPersonalError(null);
                        }}
                        onFocus={() => setIsNameFocused(true)}
                        onBlur={() => setIsNameFocused(false)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            nameInputRef.current?.blur();
                          }
                        }}
                        style={{
                          width: '100%',
                          background: 'transparent',
                          border: 'none',
                          color: '#ffffff',
                          fontSize: '0.9375rem',
                          fontWeight: 500,
                          outline: 'none',
                          padding: 0,
                          caretColor: '#3897f0',
                        }}
                      />
                    </div>

                    {/* Mobile number badge preview */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.5rem 0.875rem',
                        background: 'rgba(255, 255, 255, 0.04)',
                        borderRadius: '10px',
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        marginBottom: '1rem',
                      }}
                    >
                      <span>Phone number:</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>+91 {phone}</span>
                    </div>

                    {/* Error message */}
                    {personalError && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          color: '#f43f5e',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          marginBottom: '0.75rem',
                        }}
                      >
                        <AlertCircle size={13} color="#f43f5e" style={{ flexShrink: 0 }} />
                        <span>{personalError}</span>
                      </div>
                    )}

                    {/* Success message */}
                    {personalSuccess && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          color: '#10b981',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          marginBottom: '0.75rem',
                        }}
                      >
                        <Check size={14} color="#10b981" style={{ flexShrink: 0 }} />
                        <span>{personalSuccess}</span>
                      </div>
                    )}

                    {/* Action Button — First tap dismisses keyboard, second tap proceeds */}
                    <button
                      type="button"
                      onPointerDown={handleAddPersonalPointerDown}
                      onClick={handleAddPersonalClick}
                      disabled={!personalName.trim() || addingPersonal}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '9999px',
                        background: personalName.trim() && !addingPersonal
                          ? 'linear-gradient(135deg, #065DE8 0%, #1e75ff 52%, #3897f0 100%)'
                          : 'rgba(255, 255, 255, 0.08)',
                        border: 'none',
                        color: personalName.trim() && !addingPersonal ? '#ffffff' : 'rgba(255, 255, 255, 0.4)',
                        fontSize: '0.875rem',
                        fontWeight: 700,
                        cursor: personalName.trim() && !addingPersonal ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        boxShadow: personalName.trim() && !addingPersonal ? '0 4px 16px rgba(6, 93, 232, 0.35)' : 'none',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {addingPersonal ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Creating Contact...</span>
                        </>
                      ) : (
                        <span>Add as Personal Contact</span>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        /* Consistent bottom sheet styling on mobile and desktop */
        .add-connection-modal {
          bottom: 0 !important;
          left: 0 !important;
          right: 0 !important;
          margin: 0 auto !important;
          width: 100% !important;
          max-width: 480px !important;
          border-top-left-radius: 28px !important;
          border-top-right-radius: 28px !important;
          border-bottom-left-radius: 0 !important;
          border-bottom-right-radius: 0 !important;
          max-height: 90vh !important;
        }
        .sheet-handle {
          display: block !important;
        }
        @media (max-width: 768px) {
          .add-connection-fab {
            bottom: max(1.25rem, calc(env(safe-area-inset-bottom, 0px) + 1.25rem)) !important;
            right: 1.25rem !important;
          }
        }
        @media (min-width: 769px) {
          .add-connection-fab {
            bottom: 2rem !important;
            right: 2rem !important;
          }
        }
      `}</style>
    </>
  );
}
