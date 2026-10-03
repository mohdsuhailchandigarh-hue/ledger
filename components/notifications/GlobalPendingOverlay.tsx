'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import { Check, X, AlertCircle, Edit2, RotateCcw, BellOff, Calendar, Sparkles, CheckCheck } from 'lucide-react';
import { respondToTransactionAction, handleRejectedTransactionAction } from '@/lib/actions/transaction.actions';
import { useRouter } from 'next/navigation';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

type Transaction = {
  id: string;
  amount: number;
  direction: 'give' | 'get';
  note?: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'canceled';
  created_at: string;
  transaction_date?: string | null;
  creator_id: string;
  counterparty_id: string;
  creator: { id: string; name: string; username: string; avatar_url?: string | null };
  counterparty: { id: string; name: string; username: string; avatar_url?: string | null };
};

function formatTxnDate(dateStr: string | null | undefined, fallback: string): string {
  const raw = dateStr || fallback?.slice(0, 10);
  if (!raw) return '—';
  const [year, month, day] = raw.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return raw;
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
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

function avatarGradient(name: string) {
  const palettes = [
    'linear-gradient(135deg,#065DE8,#3897f0)',
    'linear-gradient(135deg,#0ea5e9,#065DE8)',
    'linear-gradient(135deg,#f59e0b,#ef4444)',
    'linear-gradient(135deg,#10b981,#0ea5e9)',
    'linear-gradient(135deg,#ec4899,#8b5cf6)',
    'linear-gradient(135deg,#f97316,#ef4444)',
  ];
  return palettes[name.charCodeAt(0) % palettes.length];
}

const BTN_SPRING = { type: 'spring' as const, stiffness: 420, damping: 26 };

export default function GlobalPendingOverlay({
  actions,
  currentUserId,
}: {
  actions: Transaction[];
  currentUserId: string;
}) {
  const [snoozedIds, setSnoozedIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [isSnoozedSession, setIsSnoozedSession] = useState(false);
  const [isExplicitlyOpen, setIsExplicitlyOpen] = useState(false);
  const [isDismissedByUser, setIsDismissedByUser] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState(1);
  const [doneMap, setDoneMap] = useState<Map<string, 'accepted' | 'rejected'>>(new Map());
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [confirmRejectId, setConfirmRejectId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ amount: '', note: '' });
  const [toast, setToast] = useState<string | null>(null);
  const router = useRouter();

  // Check if user previously snoozed for this session
  useEffect(() => {
    try {
      if (sessionStorage.getItem('snooze_all_pending') === 'true') {
        setIsSnoozedSession(true);
      }
    } catch {}
  }, []);

  // Listen for trigger from user profile menu or anywhere in the app
  useEffect(() => {
    const handleOpenTrigger = () => {
      setIsExplicitlyOpen(true);
      setIsDismissedByUser(false);
      setIsSnoozedSession(false);
    };
    window.addEventListener('open-pending-approvals', handleOpenTrigger);
    return () => window.removeEventListener('open-pending-approvals', handleOpenTrigger);
  }, []);

  const activeActions = actions.filter((a) => {
    if (isSnoozedSession && !isExplicitlyOpen) return false;
    if (snoozedIds.has(a.id) || dismissedIds.has(a.id)) return false;
    if (a.status === 'pending' && a.counterparty_id === currentUserId) return true;
    if (a.status === 'rejected' && a.creator_id === currentUserId) return true;
    return false;
  });

  const isOpen = isExplicitlyOpen || (activeActions.length > 0 && !isSnoozedSession && !isDismissedByUser);

  // Lock background body scroll completely in place while popup is open
  useBodyScrollLock(isOpen);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleClose = () => {
    setIsExplicitlyOpen(false);
    setIsDismissedByUser(true);
  };

  const handleSnoozeAll = () => {
    try {
      sessionStorage.setItem('snooze_all_pending', 'true');
    } catch {}
    setIsSnoozedSession(true);
    setIsExplicitlyOpen(false);
    setSnoozedIds(new Set(actions.map((a) => a.id)));
    showToast('Snoozed until next login');
  };

  const finishCard = (id: string, state: 'accepted' | 'rejected') => {
    setDoneMap((prev) => new Map(prev).set(id, state));
    setTimeout(() => {
      setDismissedIds((prev) => new Set(prev).add(id));
      setDoneMap((prev) => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
      router.refresh();
    }, 1200);
  };

  const handleRespond = async (id: string, action: 'accepted' | 'rejected') => {
    setLoadingId(id);
    setConfirmRejectId(null);
    await respondToTransactionAction(id, action);
    setLoadingId(null);
    finishCard(id, action);
  };

  const handleRejectedAction = async (
    id: string,
    action: 'cancel' | 're_request' | 'edit'
  ) => {
    setLoadingId(id);
    let updates = undefined;
    if (action === 'edit') {
      updates = { amount: Number(editForm.amount), note: editForm.note };
    }
    await handleRejectedTransactionAction(id, action, updates);
    setEditingId(null);
    setLoadingId(null);
    finishCard(id, action === 'cancel' ? 'rejected' : 'accepted');
  };

  const handleDragEnd = (_e: any, info: PanInfo) => {
    if (activeActions.length <= 1) return;
    if (info.offset.y < -40 || info.velocity.y < -220) {
      // Swiped UP -> advance to next
      setSlideDirection(1);
      setCurrentIndex((prev) => (prev + 1) % activeActions.length);
    } else if (info.offset.y > 40 || info.velocity.y > 220) {
      // Swiped DOWN -> go back to previous
      setSlideDirection(-1);
      setCurrentIndex((prev) => (prev - 1 + activeActions.length) % activeActions.length);
    }
  };

  if (!isOpen) return null;

  // ─── 1. ALL CAUGHT UP STATE (When there are 0 pending approvals) ───
  if (activeActions.length === 0) {
    return (
      <AnimatePresence>
        <div key="overlay-root">
          {/* Backdrop */}
          <motion.div
            key="overlay-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={handleClose}
            onTouchMove={(e) => e.preventDefault()}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.45)',
              backdropFilter: 'blur(30px) saturate(180%)',
              WebkitBackdropFilter: 'blur(30px) saturate(180%)',
              zIndex: 9998,
              touchAction: 'none',
            }}
          />

          {/* Bottom Drawer Sheet */}
          <motion.div
            key="overlay-sheet"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              maxWidth: 480,
              margin: '0 auto',
              zIndex: 9999,
              background: 'linear-gradient(180deg, #13151f 0%, #090a0f 100%)',
              borderTop: '1px solid rgba(255, 255, 255, 0.12)',
              borderLeft: '1px solid rgba(255, 255, 255, 0.06)',
              borderRight: '1px solid rgba(255, 255, 255, 0.06)',
              borderTopLeftRadius: '28px',
              borderTopRightRadius: '28px',
              boxShadow: '0 -24px 64px rgba(0, 0, 0, 0.9), 0 0 50px rgba(16, 185, 129, 0.14)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              overscrollBehavior: 'contain',
              paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 1.5rem))',
            }}
          >
            {/* Drag Handle Bar */}
            <div
              style={{
                width: 38,
                height: 4,
                borderRadius: 2,
                background: 'rgba(255, 255, 255, 0.2)',
                margin: '0.625rem auto 0.4rem',
              }}
            />

            {/* Top Header Row with Close Button */}
            <div
              style={{
                padding: '0.35rem 1.25rem 0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Sparkles size={16} color="#10b981" />
                </div>
                <div>
                  <h2
                    style={{
                      fontSize: '0.975rem',
                      fontWeight: 700,
                      color: '#f8fafc',
                      letterSpacing: '-0.015em',
                      margin: 0,
                    }}
                  >
                    Pending Approvals
                  </h2>
                  <p style={{ fontSize: '0.725rem', color: '#64748b', margin: 0, marginTop: '1px' }}>
                    Transaction status
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={handleClose}
                aria-label="Close"
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Premium "All Caught Up" Body */}
            <div
              style={{
                padding: '2.25rem 1.5rem 1.25rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: '1rem',
              }}
            >
              {/* Glowing animated emblem */}
              <motion.div
                initial={{ scale: 0.75, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                style={{
                  position: 'relative',
                  width: 76,
                  height: 76,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle at center, rgba(16, 185, 129, 0.25) 0%, rgba(16, 185, 129, 0.06) 65%, transparent 100%)',
                  border: '2px solid rgba(16, 185, 129, 0.45)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 35px rgba(16, 185, 129, 0.3), inset 0 0 16px rgba(16, 185, 129, 0.18)',
                }}
              >
                <CheckCheck size={36} color="#10b981" strokeWidth={2.4} />
              </motion.div>

              <div>
                <h3
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: '#f8fafc',
                    letterSpacing: '-0.02em',
                    margin: 0,
                    marginBottom: '0.45rem',
                  }}
                >
                  You&rsquo;re All Caught Up!
                </h3>
                <p
                  style={{
                    fontSize: '0.875rem',
                    color: '#8696a0',
                    lineHeight: 1.5,
                    maxWidth: 320,
                    margin: '0 auto',
                  }}
                >
                  No pending transaction requests or approvals requiring your attention right now. Everything is up to date.
                </p>
              </div>

              {/* Got it button */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleClose}
                style={{
                  marginTop: '0.75rem',
                  width: '100%',
                  maxWidth: 320,
                  height: 48,
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
                }}
              >
                Got it
              </motion.button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  }

  // ─── 2. ACTIVE PENDING TRANSACTIONS STATE ───
  const safeIndex = Math.min(currentIndex, activeActions.length - 1);
  const currentTxn = activeActions[safeIndex];
  if (!currentTxn) return null;

  const isPending = currentTxn.status === 'pending';
  const isRejectedStatus = currentTxn.status === 'rejected';
  const iAmCreator = currentTxn.creator_id === currentUserId;
  const peer = iAmCreator ? currentTxn.counterparty : currentTxn.creator;
  const iWillGive = iAmCreator ? currentTxn.direction === 'give' : currentTxn.direction === 'get';
  const amount = Number(currentTxn.amount);
  const isEditing = editingId === currentTxn.id;
  const isLoading = loadingId === currentTxn.id;
  const isConfirmingReject = confirmRejectId === currentTxn.id;
  const doneState = doneMap.get(currentTxn.id);

  const statusColor = isRejectedStatus ? '#f43f5e' : iWillGive ? '#f43f5e' : '#10b981';

  return (
    <AnimatePresence>
      <div key="overlay-root">
        {/* Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div
              key="snooze-toast"
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8 }}
              style={{
                position: 'fixed',
                bottom: '2rem',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(18, 20, 28, 0.96)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '9999px',
                padding: '0.625rem 1.25rem',
                fontSize: '0.8125rem',
                color: '#e2e8f0',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                boxShadow: '0 12px 36px rgba(0, 0, 0, 0.6)',
                zIndex: 10002,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <BellOff size={14} color="#f59e0b" />
              {toast}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Backdrop (matching user profile drawer) */}
        <motion.div
          key="overlay-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={handleClose}
          onTouchMove={(e) => e.preventDefault()}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(30px) saturate(180%)',
            WebkitBackdropFilter: 'blur(30px) saturate(180%)',
            zIndex: 9998,
            touchAction: 'none',
          }}
        />

        {/* Bottom Drawer Sheet (matching user profile drawer style, non-scrollable) */}
        <motion.div
          key="overlay-sheet"
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            maxWidth: 480,
            margin: '0 auto',
            zIndex: 9999,
            background: 'linear-gradient(180deg, #13151f 0%, #090a0f 100%)',
            borderTop: '1px solid rgba(255, 255, 255, 0.12)',
            borderLeft: '1px solid rgba(255, 255, 255, 0.06)',
            borderRight: '1px solid rgba(255, 255, 255, 0.06)',
            borderTopLeftRadius: '28px',
            borderTopRightRadius: '28px',
            boxShadow: '0 -24px 64px rgba(0, 0, 0, 0.9), 0 0 50px rgba(0, 0, 0, 0.6)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            overscrollBehavior: 'contain',
            paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom, 1.25rem))',
          }}
        >
          {/* Drag Handle Bar */}
          <div
            style={{
              width: 38,
              height: 4,
              borderRadius: 2,
              background: 'rgba(255, 255, 255, 0.2)',
              margin: '0.625rem auto 0.4rem',
            }}
          />

          {/* Top Header Row with Snooze All + Close Button */}
          <div
            style={{
              padding: '0.35rem 1.25rem 0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertCircle size={16} color="#f59e0b" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <h2
                    style={{
                      fontSize: '0.975rem',
                      fontWeight: 700,
                      color: '#f8fafc',
                      letterSpacing: '-0.015em',
                      margin: 0,
                    }}
                  >
                    Action Required
                  </h2>
                  {activeActions.length > 1 && (
                    <span
                      style={{
                        fontSize: '0.675rem',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '9999px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#94a3b8',
                      }}
                    >
                      {safeIndex + 1} / {activeActions.length}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '0.725rem', color: '#64748b', margin: 0, marginTop: '1px' }}>
                  {activeActions.length === 1 ? 'Needs your response' : 'Swipe up to review next'}
                </p>
              </div>
            </div>

            {/* Right Controls: Single Snooze All + Close Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleSnoozeAll}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '6px 12px',
                  borderRadius: '9999px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#94a3b8',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <BellOff size={13} />
                <span>Snooze All</span>
              </motion.button>

              <button
                onClick={handleClose}
                aria-label="Close"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Swipeable Single Card (Non-scrollable, swipe up to next) */}
          <div style={{ position: 'relative', overflow: 'hidden' }}>
            <AnimatePresence mode="wait" custom={slideDirection}>
              <motion.div
                key={currentTxn.id}
                custom={slideDirection}
                variants={{
                  enter: (dir: number) => ({
                    y: dir > 0 ? 35 : -35,
                    opacity: 0,
                    scale: 0.98,
                  }),
                  center: {
                    y: 0,
                    opacity: 1,
                    scale: 1,
                    transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
                  },
                  exit: (dir: number) => ({
                    y: dir > 0 ? -35 : 35,
                    opacity: 0,
                    scale: 0.98,
                    transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
                  }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                drag={activeActions.length > 1 ? 'y' : false}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.16}
                onDragEnd={handleDragEnd}
                style={{
                  padding: '1rem 1.25rem 0.5rem',
                  touchAction: activeActions.length > 1 ? 'pan-x' : 'auto',
                }}
              >
                {/* Done state animation */}
                {doneState ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '2.5rem 1rem',
                      gap: '0.85rem',
                    }}
                  >
                    <motion.div
                      initial={{ scale: 0, rotate: -20 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      style={{
                        width: 58,
                        height: 58,
                        borderRadius: '50%',
                        background: doneState === 'accepted' ? 'rgba(16, 185, 129, 0.16)' : 'rgba(244, 63, 94, 0.16)',
                        border: `2px solid ${doneState === 'accepted' ? '#10b981' : '#f43f5e'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: `0 0 24px ${doneState === 'accepted' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
                      }}
                    >
                      {doneState === 'accepted' ? (
                        <Check size={28} color="#10b981" strokeWidth={2.5} />
                      ) : (
                        <X size={28} color="#f43f5e" strokeWidth={2.5} />
                      )}
                    </motion.div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                        {doneState === 'accepted' ? 'Accepted!' : 'Request Handled'}
                      </p>
                      <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0, marginTop: '3px' }}>
                        {doneState === 'accepted' ? 'Ledger balances updated' : 'Transaction updated'}
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <>
                    {/* User Profile Info: Avatar + Name + Date */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        marginBottom: '0.85rem',
                      }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: '50%',
                          overflow: 'hidden',
                          flexShrink: 0,
                          border: '1.5px solid rgba(255, 255, 255, 0.15)',
                          background: 'rgba(255, 255, 255, 0.05)',
                        }}
                      >
                        {peer.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={peer.avatar_url}
                            alt={peer.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '100%',
                              height: '100%',
                              background: avatarGradient(peer.name),
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#ffffff',
                              fontWeight: 700,
                              fontSize: '0.95rem',
                            }}
                          >
                            {getInitials(peer.name)}
                          </div>
                        )}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3
                          style={{
                            fontSize: '1rem',
                            fontWeight: 700,
                            color: '#f8fafc',
                            letterSpacing: '-0.01em',
                            margin: 0,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {peer.name}
                        </h3>
                        <p
                          style={{
                            fontSize: '0.75rem',
                            color: '#8696a0',
                            margin: 0,
                            marginTop: '2px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Calendar size={11} color="#64748b" />
                          <span>{formatTxnDate(currentTxn.transaction_date, currentTxn.created_at)}</span>
                        </p>
                      </div>

                      <span
                        style={{
                          fontSize: '0.675rem',
                          fontWeight: 700,
                          letterSpacing: '0.04em',
                          padding: '3px 8px',
                          borderRadius: '9999px',
                          background: isRejectedStatus ? 'rgba(244, 63, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: isRejectedStatus ? '#f43f5e' : '#f59e0b',
                          border: `1px solid ${isRejectedStatus ? 'rgba(244, 63, 94, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                          textTransform: 'uppercase',
                        }}
                      >
                        {isRejectedStatus ? 'Rejected' : 'Pending'}
                      </span>
                    </div>

                    {/* Financial Amount Inset Box */}
                    <div
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.07)',
                        borderRadius: '16px',
                        padding: '1.1rem 1rem',
                        textAlign: 'center',
                        marginBottom: '1rem',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.725rem',
                          fontWeight: 700,
                          letterSpacing: '0.06em',
                          color: statusColor,
                          textTransform: 'uppercase',
                          marginBottom: '0.35rem',
                        }}
                      >
                        {isRejectedStatus
                          ? 'Transaction Rejected'
                          : iWillGive
                          ? 'You Will Give'
                          : 'You Will Get'}
                      </div>
                      <div
                        style={{
                          fontSize: '2.25rem',
                          fontWeight: 800,
                          fontFamily: "'JetBrains Mono', monospace",
                          color: statusColor,
                          letterSpacing: '-0.03em',
                          lineHeight: 1.1,
                        }}
                      >
                        ₹{amount.toLocaleString('en-IN')}
                      </div>
                      {currentTxn.note && (
                        <div
                          style={{
                            fontSize: '0.85rem',
                            color: '#cbd5e1',
                            fontStyle: 'italic',
                            marginTop: '0.45rem',
                          }}
                        >
                          &ldquo;{currentTxn.note}&rdquo;
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                      {/* PENDING Transaction Buttons */}
                      {isPending && !isConfirmingReject && (
                        <>
                          <motion.button
                            whileTap={{ scale: 0.98 }}
                            transition={BTN_SPRING}
                            onClick={() => handleRespond(currentTxn.id, 'accepted')}
                            disabled={isLoading}
                            style={{
                              width: '100%',
                              height: 48,
                              background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                              color: '#ffffff',
                              fontSize: '0.975rem',
                              fontWeight: 700,
                              borderRadius: '14px',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.5rem',
                              boxShadow: '0 4px 18px rgba(16, 185, 129, 0.35)',
                            }}
                          >
                            {isLoading ? (
                              <span className="spin-indicator" />
                            ) : (
                              <Check size={18} strokeWidth={2.5} />
                            )}
                            Accept Transaction
                          </motion.button>

                          <motion.button
                            whileTap={{ scale: 0.98 }}
                            transition={BTN_SPRING}
                            onClick={() => setConfirmRejectId(currentTxn.id)}
                            disabled={isLoading}
                            style={{
                              width: '100%',
                              height: 44,
                              background: 'rgba(244, 63, 94, 0.12)',
                              color: '#f43f5e',
                              border: '1px solid rgba(244, 63, 94, 0.3)',
                              fontSize: '0.9rem',
                              fontWeight: 600,
                              borderRadius: '14px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.5rem',
                            }}
                          >
                            <X size={16} strokeWidth={2.5} />
                            Reject Request
                          </motion.button>
                        </>
                      )}

                      {/* Confirm Reject Sub-state */}
                      {isConfirmingReject && (
                        <div
                          style={{
                            background: 'rgba(244, 63, 94, 0.08)',
                            border: '1px solid rgba(244, 63, 94, 0.25)',
                            borderRadius: '14px',
                            padding: '0.85rem',
                            textAlign: 'center',
                          }}
                        >
                          <p style={{ fontSize: '0.825rem', color: '#f8fafc', fontWeight: 600, margin: 0, marginBottom: '0.75rem' }}>
                            Are you sure you want to reject this transaction?
                          </p>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              onClick={() => setConfirmRejectId(null)}
                              style={{
                                flex: 1,
                                height: 38,
                                borderRadius: '10px',
                                background: 'rgba(255, 255, 255, 0.08)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: '#e2e8f0',
                                fontSize: '0.825rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Go Back
                            </button>
                            <button
                              onClick={() => handleRespond(currentTxn.id, 'rejected')}
                              disabled={isLoading}
                              style={{
                                flex: 1,
                                height: 38,
                                borderRadius: '10px',
                                background: '#f43f5e',
                                border: 'none',
                                color: '#ffffff',
                                fontSize: '0.825rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              Yes, Reject
                            </button>
                          </div>
                        </div>
                      )}

                      {/* REJECTED Transaction (Creator side) Buttons */}
                      {isRejectedStatus && !isEditing && (
                        <>
                          <motion.button
                            whileTap={{ scale: 0.98 }}
                            transition={BTN_SPRING}
                            onClick={() => handleRejectedAction(currentTxn.id, 're_request')}
                            disabled={isLoading}
                            style={{
                              width: '100%',
                              height: 48,
                              background: 'linear-gradient(135deg, #065DE8 0%, #3897f0 100%)',
                              color: '#ffffff',
                              fontSize: '0.975rem',
                              fontWeight: 700,
                              borderRadius: '14px',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.5rem',
                              boxShadow: '0 4px 18px rgba(56, 151, 240, 0.35)',
                            }}
                          >
                            {isLoading ? <span className="spin-indicator" /> : <RotateCcw size={16} />}
                            Resend Transaction
                          </motion.button>

                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <motion.button
                              whileTap={{ scale: 0.98 }}
                              transition={BTN_SPRING}
                              onClick={() => {
                                setEditForm({ amount: String(amount), note: currentTxn.note || '' });
                                setEditingId(currentTxn.id);
                              }}
                              disabled={isLoading}
                              style={{
                                flex: 1,
                                height: 42,
                                background: 'rgba(255, 255, 255, 0.05)',
                                color: '#e2e8f0',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                borderRadius: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.4rem',
                              }}
                            >
                              <Edit2 size={14} />
                              Edit
                            </motion.button>

                            <motion.button
                              whileTap={{ scale: 0.98 }}
                              transition={BTN_SPRING}
                              onClick={() => handleRejectedAction(currentTxn.id, 'cancel')}
                              disabled={isLoading}
                              style={{
                                flex: 1,
                                height: 42,
                                background: 'rgba(244, 63, 94, 0.1)',
                                color: '#f43f5e',
                                border: '1px solid rgba(244, 63, 94, 0.25)',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                borderRadius: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.4rem',
                              }}
                            >
                              <X size={14} />
                              Cancel
                            </motion.button>
                          </div>
                        </>
                      )}

                      {/* Inline Edit Form for Rejected Transaction */}
                      {isEditing && (
                        <div
                          style={{
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '14px',
                            padding: '0.85rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.6rem',
                          }}
                        >
                          <div>
                            <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>
                              Amount (₹)
                            </label>
                            <input
                              type="number"
                              value={editForm.amount}
                              onChange={(e) => setEditForm((p) => ({ ...p, amount: e.target.value }))}
                              style={{
                                width: '100%',
                                padding: '0.5rem 0.75rem',
                                borderRadius: '8px',
                                background: 'rgba(0, 0, 0, 0.4)',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                color: '#fff',
                                fontSize: '0.85rem',
                                outline: 'none',
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>
                              Note
                            </label>
                            <input
                              type="text"
                              value={editForm.note}
                              onChange={(e) => setEditForm((p) => ({ ...p, note: e.target.value }))}
                              style={{
                                width: '100%',
                                padding: '0.5rem 0.75rem',
                                borderRadius: '8px',
                                background: 'rgba(0, 0, 0, 0.4)',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                color: '#fff',
                                fontSize: '0.85rem',
                                outline: 'none',
                              }}
                            />
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                            <button
                              onClick={() => setEditingId(null)}
                              style={{
                                flex: 1,
                                height: 36,
                                borderRadius: '8px',
                                background: 'rgba(255, 255, 255, 0.08)',
                                border: 'none',
                                color: '#e2e8f0',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleRejectedAction(currentTxn.id, 'edit')}
                              disabled={isLoading}
                              style={{
                                flex: 1,
                                height: 36,
                                borderRadius: '8px',
                                background: '#10b981',
                                border: 'none',
                                color: '#fff',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              Save &amp; Resend
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Bottom Swipe Navigation Bar (only when multiple transactions exist) */}
          {activeActions.length > 1 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.625rem 1.25rem 0.25rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                marginTop: '0.35rem',
              }}
            >
              {/* Pagination Dots */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                {activeActions.map((_, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setSlideDirection(idx > safeIndex ? 1 : -1);
                      setCurrentIndex(idx);
                    }}
                    style={{
                      width: idx === safeIndex ? 18 : 6,
                      height: 5,
                      borderRadius: 3,
                      background: idx === safeIndex ? '#10b981' : 'rgba(255, 255, 255, 0.2)',
                      transition: 'all 0.25s ease',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>

              {/* Next Swipe Prompt Button */}
              <button
                onClick={() => {
                  setSlideDirection(1);
                  setCurrentIndex((prev) => (prev + 1) % activeActions.length);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 6px',
                }}
              >
                <span>Swipe up for next</span>
                <span style={{ fontSize: '0.9rem' }}>↑</span>
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
