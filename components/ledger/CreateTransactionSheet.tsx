'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createTransactionAction } from '@/lib/actions/transaction.actions';
import {
  X,
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
  ChevronLeft,
  Check,
  CalendarDays,
} from 'lucide-react';
import AmountCalculator from './AmountCalculator';

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 'amount' | 'note';

type Props = {
  connectionId: string;
  peerName: string;
  onClose: () => void;
  onSuccess: () => void;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function CreateTransactionSheet({
  connectionId,
  peerName,
  onClose,
  onSuccess,
}: Props) {
  const [step, setStep] = useState<Step>('amount');
  const [amount, setAmount] = useState(0);
  const [direction, setDirection] = useState<'get' | 'give'>('get');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dateError, setDateError] = useState('');
  // Default to today in YYYY-MM-DD (local time)
  const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const [transactionDate, setTransactionDate] = useState(todayStr);
  const noteRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the note input when we arrive on the note step
  useEffect(() => {
    if (step === 'note') {
      const t = setTimeout(() => noteRef.current?.focus(), 350);
      return () => clearTimeout(t);
    }
  }, [step]);

  function handleDateChange(val: string) {
    const today = todayStr();
    if (val > today) {
      setDateError('Transaction date cannot be in the future');
      setTransactionDate(today);
    } else {
      setDateError('');
      setTransactionDate(val);
    }
  }

  async function handleSubmit() {
    setError('');
    if (!note.trim()) {
      setError('Please add a note for this entry.');
      return;
    }
    if (!amount || amount <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    if (dateError) {
      return;
    }

    setLoading(true);
    const result = await createTransactionAction({
      connectionId,
      amount,
      direction,
      note: note.trim(),
      transactionDate,
    });
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      onSuccess();
    }
  }

  const isGet = direction === 'get';
  const accentColor = isGet ? 'var(--success)' : 'var(--danger)';
  const accentMuted = isGet ? 'var(--success-muted)' : 'var(--danger-muted)';
  const accentBorder = isGet ? 'var(--success-border)' : 'var(--danger-border)';

  return (
    <AnimatePresence>
      {/* ── Backdrop ────────────────────────────────────────────────────────── */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="overlay-backdrop"
        onClick={onClose}
      />

      {/* ── Sheet ───────────────────────────────────────────────────────────── */}
      <motion.div
        key="sheet"
        initial={{ y: '100%', opacity: 0.8 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="create-txn-sheet"
      >
        {/* Drag handle */}
        <div
          style={{
            width: 40,
            height: 4,
            background: 'var(--border-strong)',
            borderRadius: '9999px',
            margin: '0 auto 0.875rem',
            flexShrink: 0,
          }}
        />

        {/* Unified Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.25rem 0',
            marginBottom: '1rem',
            flexShrink: 0,
            position: 'relative',
          }}
        >
          {/* Left: Back Button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={step === 'amount' ? onClose : () => setStep('amount')}
            style={{
              width: 38,
              height: 38,
              borderRadius: '11px',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-elevated)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
            }}
            aria-label="Back"
          >
            <ChevronLeft size={20} />
          </motion.button>

          {/* Center: Step Title/Toggle */}
          {step === 'amount' ? (
            <div
              style={{
                display: 'flex',
                background: 'var(--bg-elevated)',
                borderRadius: '9999px',
                padding: '3px',
                border: '1px solid var(--border-subtle)',
                gap: '2px',
              }}
            >
              {(['get', 'give'] as const).map((dir) => {
                const active = direction === dir;
                const dColor = dir === 'get' ? 'var(--success)' : 'var(--danger)';
                const dMuted = dir === 'get' ? 'var(--success-muted)' : 'var(--danger-muted)';
                return (
                  <button
                    key={dir}
                    type="button"
                    onClick={() => setDirection(dir)}
                    style={{
                      padding: '0.35rem 0.875rem',
                      borderRadius: '9999px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      transition: 'all 0.2s',
                      background: active ? dMuted : 'transparent',
                      color: active ? dColor : 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}
                  >
                    {dir === 'get' ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                    {dir === 'get' ? 'I Will Get' : 'I Will Give'}
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <h2
                style={{
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.01em',
                  lineHeight: 1.2,
                }}
              >
                Add a Note
              </h2>
              <p
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  marginTop: '1px',
                }}
              >
                with {peerName}
              </p>
            </div>
          )}

          {/* Right: Close Button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            style={{
              width: 38,
              height: 38,
              borderRadius: '11px',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-elevated)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
            }}
            aria-label="Close"
          >
            <X size={18} />
          </motion.button>
        </div>

        {/* ── Animated step container ─────────────────────────────────────── */}
        <AnimatePresence mode="wait" initial={false}>

          {/* ────── STEP 1: Amount Calculator ────────────────────────────── */}
          {step === 'amount' && (
            <motion.div
              key="amount-step"
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            >
              <AmountCalculator
                direction={direction}
                peerName={peerName}
                onConfirm={(confirmedAmount) => {
                  setAmount(confirmedAmount);
                  setStep('note');
                }}
              />
            </motion.div>
          )}

          {/* ────── STEP 2: Note + Confirm ───────────────────────────────── */}
          {step === 'note' && (
            <motion.div
              key="note-step"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.125rem', overflowY: 'auto', maxHeight: '100%', paddingRight: '4px' }}
            >


              {/* Amount summary pill */}
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.05, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  padding: '1.125rem 1.5rem',
                  borderRadius: 'var(--radius-xl)',
                  background: accentMuted,
                  border: `1px solid ${accentBorder}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: '9px',
                      background: isGet ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {isGet ? (
                      <ArrowDownLeft size={16} color={accentColor} />
                    ) : (
                      <ArrowUpRight size={16} color={accentColor} />
                    )}
                  </div>
                  <div>
                    <p
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: accentColor,
                        marginBottom: '1px',
                      }}
                    >
                      {isGet ? 'I Will Get' : 'I Will Give'}
                    </p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {isGet ? `${peerName} owes you` : `You owe ${peerName}`}
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 800,
                    fontSize: '1.625rem',
                    color: accentColor,
                    letterSpacing: '-0.04em',
                    lineHeight: 1,
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '0.1em',
                  }}
                >
                  <span style={{ fontSize: '0.55em', opacity: 0.7 }}>₹</span>
                  {amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </div>
              </motion.div>

              {/* Note input */}
              <div>
                <p
                  className="text-label"
                  style={{ marginBottom: '0.625rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
                >
                  <FileText size={13} />
                  Note
                  <span
                    style={{
                      fontWeight: 500,
                      textTransform: 'none',
                      letterSpacing: 0,
                      color: 'var(--danger)',
                    }}
                  >
                    *
                  </span>
                </p>
                <input
                  ref={noteRef}
                  type="text"
                  value={note}
                  onChange={(e) => {
                    setNote(e.target.value);
                    if (error) setError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && note.trim()) handleSubmit();
                  }}
                  placeholder="e.g. Tea, Dinner, Rent, Petrol…"
                  maxLength={200}
                  className="input"
                  style={{ fontSize: '1rem' }}
                  autoComplete="off"
                />
                <p
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    marginTop: '0.375rem',
                    textAlign: 'right',
                  }}
                >
                  {note.length}/200
                </p>
              </div>

              {/* Transaction Date */}
              <div>
                <p
                  className="text-label"
                  style={{ marginBottom: '0.625rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
                >
                  <CalendarDays size={13} />
                  Transaction Date
                </p>
                <div style={{ position: 'relative' }}>
                  {/* Styled trigger button */}
                  <button
                    type="button"
                    onClick={() => dateInputRef.current?.showPicker?.() ?? dateInputRef.current?.click()}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-lg)',
                      border: dateError ? '1px solid var(--danger-border)' : '1px solid var(--border-default)',
                      background: 'var(--bg-elevated)',
                      color: 'var(--text-primary)',
                      fontSize: '0.9375rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'border-color 0.15s',
                    }}
                  >
                    <span>
                      {new Date(transactionDate + 'T00:00:00').toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                    <CalendarDays size={16} color="var(--text-muted)" />
                  </button>
                  {/* Hidden native date input */}
                  <input
                    ref={dateInputRef}
                    type="date"
                    value={transactionDate}
                    max={todayStr()}
                    onChange={(e) => handleDateChange(e.target.value)}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      opacity: 0,
                      pointerEvents: 'none',
                    }}
                  />
                </div>
                {dateError && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.375rem' }}>
                    {dateError}
                  </p>
                )}
              </div>

              {/* Confirmation summary */}
              {note.trim() && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    padding: '0.875rem 1rem',
                    background: 'var(--bg-elevated)',
                    borderRadius: '10px',
                    border: '1px solid var(--border-default)',
                    fontSize: '0.875rem',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.6,
                  }}
                >
                  {isGet ? (
                    <>
                      <strong style={{ color: 'var(--success)' }}>{peerName}</strong>
                      {' '}will need to confirm they owe you{' '}
                      <strong
                        style={{
                          fontFamily: 'JetBrains Mono, monospace',
                          color: 'var(--success)',
                        }}
                      >
                        ₹{amount.toLocaleString('en-IN')}
                      </strong>
                      {' '}for &ldquo;{note.trim()}&rdquo;.
                    </>
                  ) : (
                    <>
                      <strong style={{ color: 'var(--danger)' }}>{peerName}</strong>
                      {' '}will need to confirm you owe them{' '}
                      <strong
                        style={{
                          fontFamily: 'JetBrains Mono, monospace',
                          color: 'var(--danger)',
                        }}
                      >
                        ₹{amount.toLocaleString('en-IN')}
                      </strong>
                      {' '}for &ldquo;{note.trim()}&rdquo;.
                    </>
                  )}
                </motion.div>
              )}

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{
                      padding: '0.75rem',
                      background: 'var(--danger-muted)',
                      border: '1px solid var(--danger-border)',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      color: 'var(--danger)',
                    }}
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit */}
              <motion.button
                animate={{
                  opacity: note.trim() ? 1 : 0.45,
                  scale: note.trim() ? 1 : 0.99,
                }}
                whileTap={note.trim() ? { scale: 0.97 } : {}}
                disabled={loading || !note.trim()}
                onClick={handleSubmit}
                className="btn btn-primary btn-lg"
                style={{ justifyContent: 'center', marginTop: 'auto' }}
              >
                {loading ? (
                  <>
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: 'white',
                        display: 'inline-block',
                        animation: 'spin 0.7s linear infinite',
                      }}
                    />
                    Creating…
                  </>
                ) : (
                  <>
                    <Check size={17} />
                    Create Entry &amp; Request Approval
                  </>
                )}
              </motion.button>
            </motion.div>
          )}

        </AnimatePresence>

        <style>{`
          .create-txn-sheet {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            margin-left: auto;
            margin-right: auto;
            width: 100%;
            max-width: none;
            background: var(--bg-surface);
            border: none;
            border-radius: 0;
            padding: 1rem 1.25rem calc(1.25rem + env(safe-area-inset-bottom, 0px));
            z-index: 60;
            box-shadow: none;
            height: 100dvh;
            max-height: 100dvh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }

          @media (min-width: 769px) {
            .create-txn-sheet {
              width: 100%;
              max-width: 520px;
              height: auto;
              max-height: 90dvh;
              border-top: 1px solid var(--border-default);
              border-left: 1px solid var(--border-default);
              border-right: 1px solid var(--border-default);
              border-bottom: 1px solid var(--border-default);
              border-radius: var(--radius-2xl);
              box-shadow: var(--shadow-xl);
              padding: 1.5rem 2rem calc(1.5rem + env(safe-area-inset-bottom, 0px));
            }
          }

          @media (max-width: 768px) {
            .overlay-backdrop {
              background: var(--bg-base) !important;
              backdrop-filter: none !important;
              -webkit-backdrop-filter: none !important;
            }
          }

          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </motion.div>
    </AnimatePresence>
  );
}
