'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ────────────────────────────────────────────────────────────────────

type NumberToken = { type: 'number'; value: string };
type OperatorToken = { type: 'operator'; value: '+' | '-' | '×' | '÷' };
type Token = NumberToken | OperatorToken;

type Props = {
  direction: 'get' | 'give';
  peerName: string;
  onConfirm: (amount: number) => void;
};

// ─── Keypad layout ────────────────────────────────────────────────────────────

const KEYPAD_BUTTONS = [
  { key: 'C', colSpan: 1, rowSpan: 1 }, { key: '÷', colSpan: 1, rowSpan: 1 }, { key: '×', colSpan: 1, rowSpan: 1 }, { key: '⌫', colSpan: 1, rowSpan: 1 },
  { key: '7', colSpan: 1, rowSpan: 1 }, { key: '8', colSpan: 1, rowSpan: 1 }, { key: '9', colSpan: 1, rowSpan: 1 }, { key: '-', colSpan: 1, rowSpan: 1 },
  { key: '4', colSpan: 1, rowSpan: 1 }, { key: '5', colSpan: 1, rowSpan: 1 }, { key: '6', colSpan: 1, rowSpan: 1 }, { key: '+', colSpan: 1, rowSpan: 1 },
  { key: '1', colSpan: 1, rowSpan: 1 }, { key: '2', colSpan: 1, rowSpan: 1 }, { key: '3', colSpan: 1, rowSpan: 1 }, { key: '=', colSpan: 1, rowSpan: 2 },
  { key: '.', colSpan: 1, rowSpan: 1 }, { key: '0', colSpan: 1, rowSpan: 1 }, { key: '00', colSpan: 1, rowSpan: 1 },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function evaluateTokens(tokens: Token[]): number {
  if (tokens.length === 0) return 0;

  // Remove trailing operator if present for evaluation
  let evalTokens = [...tokens];
  if (evalTokens[evalTokens.length - 1].type === 'operator') {
    evalTokens = evalTokens.slice(0, -1);
  }
  
  if (evalTokens.length === 0) return 0;

  // Pass 1: Multiplication and Division
  let i = 0;
  while (i < evalTokens.length) {
    const token = evalTokens[i];
    if (token.type === 'operator' && (token.value === '×' || token.value === '÷')) {
      const left = parseFloat((evalTokens[i - 1] as NumberToken).value || '0');
      const right = parseFloat((evalTokens[i + 1] as NumberToken).value || '0');
      let result = 0;
      if (token.value === '×') {
        result = left * right;
      } else if (token.value === '÷') {
        result = right === 0 ? 0 : left / right;
      }
      
      evalTokens.splice(i - 1, 3, { type: 'number', value: result.toString() });
      i--; // Step back to re-evaluate the new token
    } else {
      i++;
    }
  }

  // Pass 2: Addition and Subtraction
  let result = parseFloat((evalTokens[0] as NumberToken).value || '0');
  for (let j = 1; j + 1 < evalTokens.length; j += 2) {
    const op = evalTokens[j] as OperatorToken;
    const next = evalTokens[j + 1] as NumberToken;
    const right = parseFloat(next.value || '0');
    if (op.value === '+') result += right;
    else if (op.value === '-') result -= right;
  }

  return Math.max(0, result);
}

function formatNumber(raw: string): string {
  if (!raw || raw === '.') return '0';
  const parts = raw.split('.');
  const intPart = parseInt(parts[0] || '0', 10);
  const formatted = isNaN(intPart) ? '0' : intPart.toLocaleString('en-IN');
  return parts.length > 1 ? `${formatted}.${parts[1]}` : formatted;
}

function buildExpressionLabel(tokens: Token[]): string {
  return tokens
    .map((t, i) => {
      if (t.type === 'number') {
        const v = t.value ? formatNumber(t.value) : i === 0 ? '' : '0';
        return v;
      }
      return t.value;
    })
    .join(' ');
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AmountCalculator({
  direction,
  peerName,
  onConfirm,
}: Props) {
  const [tokens, setTokens] = useState<Token[]>([{ type: 'number', value: '' }]);

  const hasOperator = tokens.some((t) => t.type === 'operator');
  const result = evaluateTokens(tokens);
  const hasValue = result > 0;

  const expressionLabel = buildExpressionLabel(tokens);
  const mainDisplay = formatNumber(result.toString());

  const displayLength = mainDisplay.length;
  const mainDisplayFontSize =
    displayLength <= 6
      ? 'clamp(2.25rem, 11vw, 4.25rem)'
      : displayLength <= 9
      ? 'clamp(1.75rem, 8.5vw, 3rem)'
      : 'clamp(1.25rem, 6.5vw, 2.125rem)';

  // ─── Accent colors ──────────────────────────────────────────────────────────
  const isGet = direction === 'get';
  const accentColor = isGet ? 'var(--success)' : 'var(--danger)';
  const accentMuted = isGet ? 'var(--success-muted)' : 'var(--danger-muted)';
  const accentBorder = isGet ? 'var(--success-border)' : 'var(--danger-border)';

  // ─── Key handler ────────────────────────────────────────────────────────────
  const handleKey = useCallback((key: string) => {
    setTokens((prev) => {
      const toks = [...prev];
      const last = toks[toks.length - 1];

      // ── Clear ──
      if (key === 'C') {
        return [{ type: 'number', value: '' }];
      }

      // ── Backspace ──
      if (key === '⌫') {
        if (last.type === 'number') {
          if (last.value.length > 1) {
            return [...toks.slice(0, -1), { type: 'number', value: last.value.slice(0, -1) }];
          }
          if (last.value.length === 1) {
            // If there's an operator before this number, remove both
            return toks.length > 1
              ? toks.slice(0, -2)
              : [{ type: 'number', value: '' }];
          }
          // Already empty — remove preceding operator if any
          return toks.length > 1 ? toks.slice(0, -2) : toks;
        }
        return toks;
      }

      // ── Evaluate ──
      if (key === '=') {
        const res = evaluateTokens(toks);
        if (res > 0) {
          const rounded = Math.round(res * 100) / 100;
          return [{ type: 'number', value: rounded.toString() }];
        }
        return toks;
      }

      // ── Operator ──
      if (key === '+' || key === '-' || key === '×' || key === '÷') {
        if (last.type === 'operator') {
          // Replace existing operator
          return [...toks.slice(0, -1), { type: 'operator', value: key as OperatorToken['value'] }];
        }
        if (last.type === 'number' && (last.value || toks.length > 1)) {
          return [
            ...toks,
            { type: 'operator', value: key as OperatorToken['value'] },
            { type: 'number', value: '' },
          ];
        }
        return toks;
      }

      // ── Digit / Decimal / Double-zero ──
      if (last.type !== 'number') return toks;
      let v = last.value;

      if (key === '.') {
        if (v.includes('.')) return toks;
        return [...toks.slice(0, -1), { type: 'number', value: (v || '0') + '.' }];
      }

      if (key === '00') {
        if (!v || v === '0') return toks;
        v = v + '00';
      } else {
        v = v === '0' ? key : v + key;
      }

      // Guard: max 10 significant digits
      if (v.replace(/[^0-9]/g, '').length > 10) return toks;

      return [...toks.slice(0, -1), { type: 'number', value: v }];
    });
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        userSelect: 'none',
      }}
    >
      {/* ── Amount Display ──────────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem 0',
          gap: '0.25rem',
        }}
      >
        {/* Contact name badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '9999px',
            fontSize: '0.8125rem',
            color: 'var(--text-secondary)',
            fontWeight: 500,
            marginBottom: '0.375rem',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: accentColor,
              boxShadow: `0 0 8px ${accentColor}`,
              transition: 'background 0.25s, box-shadow 0.25s',
            }}
          />
          <span>with {peerName}</span>
        </div>

        {/* Main big number (Result) */}
        <AnimatePresence mode="wait">
          <motion.div
            key={mainDisplay}
            initial={{ opacity: 0.5, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.12, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: mainDisplayFontSize,
              fontWeight: 800,
              letterSpacing: '-0.045em',
              lineHeight: 1,
              color: hasValue ? accentColor : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'baseline',
              gap: '0.1em',
              textShadow: hasValue
                ? `0 4px 24px ${isGet ? 'rgba(16,185,129,0.18)' : 'rgba(244,63,94,0.18)'}`
                : 'none',
              transition: 'color 0.25s, text-shadow 0.25s',
            }}
          >
            <span
              style={{
                fontSize: '0.45em',
                fontWeight: 700,
                opacity: 0.65,
                paddingBottom: '0.1em',
              }}
            >
              ₹
            </span>
            {mainDisplay}
          </motion.div>
        </AnimatePresence>

        {/* Expression label below the main number */}
        <AnimatePresence>
          {hasOperator && expressionLabel && (
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              style={{
                fontSize: '1.125rem',
                color: 'var(--text-secondary)',
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: '0.02em',
                fontWeight: 500,
                minHeight: '1.5rem',
                marginTop: '0.25rem',
              }}
            >
              {expressionLabel}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* ── Keypad ──────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridAutoRows: 'clamp(54px, 7.2dvh, 64px)',
          gap: 'clamp(8px, 1.5vw, 12px)',
          marginBottom: '1rem',
        }}
      >
        {KEYPAD_BUTTONS.map((btn) => {
          const isOperator = btn.key === '+' || btn.key === '-' || btn.key === '×' || btn.key === '÷';
          const isAction = btn.key === 'C' || btn.key === '⌫';
          const isEquals = btn.key === '=';
          const isNumber = !isNaN(Number(btn.key)) || btn.key === '00' || btn.key === '.';

          let bg = 'var(--bg-elevated)';
          let color = 'var(--text-primary)';
          let border = '1px solid var(--border-subtle)';
          let boxShadow = 'none';
          let fontWeight: number = 600;
          let fontSize = '1.375rem';

          if (isEquals) {
            bg = accentColor;
            color = 'white';
            border = `1px solid ${accentColor}`;
            boxShadow = `0 4px 18px ${isGet ? 'rgba(16,185,129,0.35)' : 'rgba(244,63,94,0.35)'}`;
            fontWeight = 700;
            fontSize = '1.625rem';
          } else if (isOperator) {
            bg = accentMuted;
            color = accentColor;
            border = `1px solid ${accentBorder}`;
            fontWeight = 700;
            fontSize = '1.5rem';
          } else if (isAction) {
            bg = 'var(--bg-base)';
            color = btn.key === 'C' ? 'var(--danger)' : 'var(--text-secondary)';
            border = '1px solid var(--border-subtle)';
            fontWeight = btn.key === 'C' ? 600 : 500;
            fontSize = '1.25rem';
          } else if (btn.key === '.') {
            fontSize = '1.625rem';
            fontWeight = 700;
          }

          return (
            <motion.button
              key={btn.key}
              whileTap={{ scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 600, damping: 24 }}
              onClick={() => handleKey(btn.key)}
              style={{
                gridColumn: `span ${btn.colSpan}`,
                gridRow: `span ${btn.rowSpan}`,
                borderRadius: '14px',
                border,
                background: bg,
                cursor: 'pointer',
                fontSize,
                fontWeight,
                color,
                fontFamily: isNumber || isAction ? 'inherit' : "'JetBrains Mono', monospace",
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow,
                outline: 'none',
                WebkitTapHighlightColor: 'transparent',
                transition: 'background 0.2s ease, border-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease',
              }}
            >
              {btn.key}
            </motion.button>
          );
        })}
      </div>

      {/* ── Continue button ─────────────────────────────────────────────────── */}
      <motion.button
        animate={{
          opacity: hasValue ? 1 : 0.45,
          y: hasValue ? 0 : 2,
        }}
        transition={{ duration: 0.2 }}
        whileTap={hasValue ? { scale: 0.97 } : {}}
        disabled={!hasValue}
        onClick={() => {
          if (hasValue) {
            const final = Math.round(result * 100) / 100;
            if (final > 0) onConfirm(final);
          }
        }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          cursor: hasValue ? 'pointer' : 'not-allowed',
          letterSpacing: '0.01em',
          background: hasValue
            ? 'linear-gradient(135deg, var(--brand-start), var(--brand-end))'
            : 'var(--bg-elevated)',
          color: hasValue ? 'white' : 'var(--text-muted)',
          border: hasValue ? 'none' : '1px solid var(--border-subtle)',
          boxShadow: hasValue ? 'var(--shadow-brand)' : 'none',
          padding: '0.875rem',
          borderRadius: '14px',
          fontWeight: 600,
          fontSize: '1rem',
          transition: 'all 0.2s ease',
          flexShrink: 0,
        }}
      >
        Continue →
      </motion.button>
    </div>
  );
}
