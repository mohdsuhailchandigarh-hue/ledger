'use client';

import { useState, useTransition, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LedgerTimeline from '@/components/ledger/LedgerTimeline';
import CreateTransactionSheet from '@/components/ledger/CreateTransactionSheet';
import AnimatedCounter from '@/components/motion/AnimatedCounter';
import { Plus, ArrowLeft, Trash2, AlertTriangle, X, Edit2, Check, Sparkles, UserPlus, Clock, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { deleteLedgerAction, updateContactNameAction, sendConnectionRequestAction, respondToConnectionRequestAction } from '@/lib/actions/connection.actions';
import { loadMoreTransactionsAction } from '@/lib/actions/transaction.actions';

type Transaction = {
  id: string;
  amount: number;
  direction: 'give' | 'get';
  note?: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'canceled';
  created_at: string;
  creator: { id: string; name: string; username: string };
  counterparty: { id: string; name: string; username: string };
};

type Props = {
  connectionId: string;
  peer: { id: string; name: string; username: string; avatar_url?: string | null; isPersonal?: boolean; phone?: string | null };
  currentUserId: string;
  transactions: Transaction[];
  netBalance: number;
  isDisconnected?: boolean;
  initialHasMore?: boolean;
  onBack?: () => void;
  onRefresh?: () => void | Promise<void>;
  totalCount?: number;
  totalPendingCount?: number;
  registeredUser?: { id: string; name: string; username: string; avatar_url?: string | null } | null;
  initialRequestStatus?: { status: 'none' | 'pending_sent' | 'pending_received'; requestId?: string } | null;
};

export default function LedgerClient({
  connectionId,
  peer,
  currentUserId,
  transactions,
  netBalance,
  isDisconnected = false,
  initialHasMore,
  onBack,
  onRefresh,
  totalCount,
  totalPendingCount,
  registeredUser,
  initialRequestStatus,
}: Props) {
  const [items, setItems] = useState<Transaction[]>(transactions);
  const [hasMore, setHasMore] = useState(initialHasMore ?? (transactions.length >= 50));
  const [totalEntries, setTotalEntries] = useState<number>(totalCount ?? transactions.length);
  const [pendingCount, setPendingCount] = useState<number>(
    totalPendingCount ?? transactions.filter((t) => t.status === 'pending').length
  );
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const router = useRouter();

  // Custom display name and phone state
  const [displayName, setDisplayName] = useState(peer.name);
  const [displayPhone, setDisplayPhone] = useState(peer.phone || (peer.isPersonal ? peer.username : ''));
  const [showEditName, setShowEditName] = useState(false);
  const [editInputName, setEditInputName] = useState(peer.name);
  const [editInputPhone, setEditInputPhone] = useState(peer.phone || (peer.isPersonal ? peer.username : ''));
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(peer.name);
    setDisplayPhone(peer.phone || (peer.isPersonal ? peer.username : ''));
  }, [peer.name, peer.phone, peer.username, peer.isPersonal]);

  const handleSaveName = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = editInputName.trim();
    if (!trimmed) {
      setNameError('Name cannot be empty');
      return;
    }
    const cleanPhone = peer.isPersonal ? editInputPhone.replace(/\D/g, '').slice(-10) : undefined;
    if (peer.isPersonal && (!cleanPhone || cleanPhone.length < 10)) {
      setNameError('Please enter a valid 10-digit mobile number');
      return;
    }

    setIsSavingName(true);
    setNameError(null);
    try {
      const res = await updateContactNameAction(connectionId, trimmed, cleanPhone);
      if (res?.error) {
        setNameError(res.error);
      } else {
        setDisplayName(trimmed);
        if (res.phone) {
          setDisplayPhone(res.phone);
        }
        setShowEditName(false);
        router.refresh();
        if (onRefresh) onRefresh();
      }
    } catch (err: any) {
      setNameError(err?.message || 'Failed to update contact');
    } finally {
      setIsSavingName(false);
    }
  };

  // State for registered user notification & connection request
  const [reqStatus, setReqStatus] = useState<'none' | 'pending_sent' | 'pending_received'>(
    initialRequestStatus?.status ?? 'none'
  );
  const [currentReqId, setCurrentReqId] = useState<string | undefined>(
    initialRequestStatus?.requestId
  );
  const [isSendingReq, setIsSendingReq] = useState(false);
  const [isRespondingReq, setIsRespondingReq] = useState(false);

  const handleSendSharedRequest = async () => {
    if (!registeredUser) return;
    setIsSendingReq(true);
    try {
      const res = await sendConnectionRequestAction(registeredUser.id);
      if (res?.success) {
        setReqStatus('pending_sent');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSendingReq(false);
    }
  };

  const handleAcceptSharedRequest = async () => {
    if (!currentReqId) return;
    setIsRespondingReq(true);
    try {
      await respondToConnectionRequestAction(currentReqId, 'accepted');
      router.refresh();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsRespondingReq(false);
    }
  };

  const handleRejectSharedRequest = async () => {
    if (!currentReqId) return;
    setIsRespondingReq(true);
    try {
      await respondToConnectionRequestAction(currentReqId, 'rejected');
      setReqStatus('none');
    } catch (err) {
      console.error(err);
    } finally {
      setIsRespondingReq(false);
    }
  };

  useEffect(() => {
    setItems(transactions);
    setHasMore(initialHasMore ?? (transactions.length >= 50));
    if (typeof totalCount === 'number') {
      setTotalEntries(totalCount);
    } else {
      setTotalEntries(transactions.length);
    }
    if (typeof totalPendingCount === 'number') {
      setPendingCount(totalPendingCount);
    } else {
      setPendingCount(transactions.filter((t) => t.status === 'pending').length);
    }
  }, [transactions, initialHasMore, totalCount, totalPendingCount]);

  const displayTotalCount = Math.max(totalEntries, items.length);

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const res = await loadMoreTransactionsAction(connectionId, items.length, 50);
      if (res && res.transactions && res.transactions.length > 0) {
        setItems((prev) => {
          const existingIds = new Set(prev.map((t) => t.id));
          const newEntries = res.transactions.filter((t) => !existingIds.has(t.id));
          return [...prev, ...newEntries];
        });
        setHasMore(res.hasMore);
      } else {
        setHasMore(false);
      }
    } catch (e) {
      console.error('Failed to load more transactions:', e);
    } finally {
      setIsLoadingMore(false);
    }
  }, [connectionId, items.length, hasMore, isLoadingMore]);

  function handleSuccess() {
    setShowCreate(false);
    if (onRefresh) {
      startTransition(() => {
        void onRefresh();
      });
    } else {
      startTransition(() => router.refresh());
    }
  }

  function handleDelete() {
    setDeleteError(null);
    startDeleteTransition(async () => {
      const result = await deleteLedgerAction(connectionId);
      if (result.error) {
        setDeleteError(result.error);
      } else {
        if (onBack) {
          onBack();
        } else {
          router.push('/dashboard');
        }
      }
    });
  }

  const willGet = netBalance > 0;
  const willGive = netBalance < 0;
  const settled = netBalance === 0;

  return (
    <>
      <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header - Fixed seamlessly into the rounded shape top of the popup with exact dashboard CTA glass effect & blur veil */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 40,
            borderTopLeftRadius: '28px',
            borderTopRightRadius: '28px',
          }}
        >
          {/* Elastic Overscroll Dense Blur Shield — covers rubber-band pull down / scroll up above top: 0 */}
          <div
            style={{
              position: 'absolute',
              top: -400,
              height: 400,
              left: 0,
              right: 0,
              background: 'var(--bg-base)',
              backdropFilter: 'blur(60px) saturate(220%)',
              WebkitBackdropFilter: 'blur(60px) saturate(220%)',
              pointerEvents: 'none',
              zIndex: 0,
            }}
            aria-hidden="true"
          />

          {/* Progressive Blur Veil with Tint — identical to dashboard CTA veil */}
          <div
            className="topbar-progressive-veil"
            style={{
              position: 'absolute',
              top: 0,
              bottom: -18,
              left: 0,
              right: 0,
              pointerEvents: 'none',
              borderTopLeftRadius: '28px',
              borderTopRightRadius: '28px',
              overflow: 'hidden',
              zIndex: 1,
            }}
            aria-hidden="true"
          >
            <div className="veil-blur-base" />
            <div className="veil-blur-mid" />
            <div className="veil-blur-dense" />
            <div className="veil-tint" />
          </div>

          {/* Glass Header Bar Container — exact same glass effect, tint, and highlights as dashboard CTA */}
          <div
            className="popup-glass-header"
            data-drag-header="true"
            style={{
              borderTopLeftRadius: '28px',
              borderTopRightRadius: '28px',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 2,
              touchAction: 'none',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              cursor: 'grab',
            }}
          >
            {/* Drag Handle Bar Pill */}
            <div
              data-drag-handle="true"
              style={{
                width: 44,
                height: 5,
                borderRadius: 3,
                background: 'rgba(255, 255, 255, 0.28)',
                margin: '0.625rem auto 0.3rem',
                flexShrink: 0,
                touchAction: 'none',
                cursor: 'grab',
              }}
            />

            <div
              style={{
                maxWidth: '720px',
                margin: '0 auto',
                width: '100%',
                height: 52,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
                padding: '0 1rem 0.35rem',
              }}
            >
            {/* Back + peer info */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                minWidth: 0,
              }}
            >
              <motion.button
                onClick={() => {
                  if (onBack) {
                    onBack();
                  } else if (typeof window !== 'undefined' && window.history.length > 1) {
                    router.back();
                  } else {
                    router.push('/dashboard');
                  }
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
                aria-label="Back"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'background 0.2s',
                  padding: 0,
                }}
              >
                <ArrowLeft size={18} strokeWidth={2.2} />
              </motion.button>

              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #065DE8, #3897f0)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  color: 'white',
                  flexShrink: 0,
                  overflow: 'hidden',
                }}
              >
                {peer.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={peer.avatar_url}
                    alt={displayName}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: '50%' }}
                  />
                ) : (
                  displayName.charAt(0).toUpperCase()
                )}
              </div>

              <div style={{ minWidth: 0 }}>
                <h1
                  style={{
                    fontSize: '0.9375rem',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    letterSpacing: '-0.015em',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    margin: 0,
                    lineHeight: 1.2,
                  }}
                >
                  <span
                    onClick={() => {
                      setEditInputName(displayName);
                      setEditInputPhone(displayPhone.replace(/\D/g, '').slice(-10));
                      setNameError(null);
                      setShowEditName(true);
                    }}
                    style={{ cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis' }}
                    title="Click to edit name"
                  >
                    {displayName}
                  </span>
                  {peer.isPersonal && (
                    <span style={{ fontSize: '0.625rem', padding: '1px 6px', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em', flexShrink: 0 }}>
                      Personal
                    </span>
                  )}
                </h1>
                <p
                  style={{
                    fontSize: '0.75rem',
                    color: isDisconnected ? 'var(--danger)' : 'rgba(255, 255, 255, 0.5)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    margin: '1px 0 0 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    lineHeight: 1.2,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: isDisconnected
                        ? '#ef4444'
                        : peer.isPersonal
                        ? '#64748b'
                        : '#10b981',
                      display: 'inline-block',
                      boxShadow: isDisconnected
                        ? '0 0 6px rgba(239, 68, 68, 0.6)'
                        : peer.isPersonal
                        ? 'none'
                        : '0 0 6px rgba(16, 185, 129, 0.6)',
                      flexShrink: 0,
                    }}
                  />
                  <span>
                    {peer.isPersonal 
                      ? `${displayPhone || peer.username} · Offline` 
                      : isDisconnected 
                      ? `@${peer.username} · Disconnected` 
                      : `@${peer.username} · Shared Ledger`}
                  </span>
                </p>
              </div>
            </div>

            {/* Actions: Edit and Delete buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
              <motion.button
                onClick={() => {
                  setEditInputName(displayName);
                  setEditInputPhone(displayPhone.replace(/\D/g, '').slice(-10));
                  setNameError(null);
                  setShowEditName(true);
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
                aria-label="Edit name"
                title="Edit name"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                  color: 'rgba(255, 255, 255, 0.85)',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'background 0.2s',
                  padding: 0,
                }}
              >
                <Edit2 size={15} strokeWidth={2} />
              </motion.button>

              <motion.button
                onClick={() => { setDeleteError(null); setShowDelete(true); }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
                aria-label={peer.isPersonal ? 'Delete contact permanently' : 'Remove ledger'}
                title={peer.isPersonal ? 'Delete contact permanently' : 'Remove ledger'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'rgba(244, 63, 94, 0.1)',
                  border: '1px solid rgba(244, 63, 94, 0.25)',
                  color: '#fb7185',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'background 0.2s',
                  padding: 0,
                }}
              >
                <Trash2 size={16} strokeWidth={2} />
              </motion.button>
            </div>
          </div>
        </div>
      </div>

        {/* Balance summary - Premium Centered Net Position Hero */}
        <div style={{ padding: 'clamp(0.75rem, 2.5vw, 1.25rem) clamp(0.75rem, 3vw, 1.25rem) 0.5rem', maxWidth: '720px', margin: '0 auto', width: '100%' }}>
          {/* Notification Banner: When someone with this phone number is registered on Ledger */}
          {peer.isPersonal && registeredUser && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              style={{
                marginBottom: '1rem',
                padding: '1.125rem',
                borderRadius: '20px',
                background: 'linear-gradient(135deg, rgba(6, 93, 232, 0.16) 0%, rgba(15, 23, 42, 0.6) 100%)',
                border: '1px solid rgba(56, 151, 240, 0.3)',
                boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.45)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '12px',
                    background: 'rgba(56, 151, 240, 0.18)',
                    border: '1px solid rgba(56, 151, 240, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#3897f0',
                    flexShrink: 0,
                  }}
                >
                  <Sparkles size={20} strokeWidth={2.2} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#f8fafc', margin: 0, letterSpacing: '-0.01em' }}>
                      {reqStatus === 'pending_received'
                        ? `@${registeredUser.username} sent you a connection request!`
                        : reqStatus === 'pending_sent'
                        ? `Request sent to @${registeredUser.username}`
                        : `${registeredUser.name} is on Ledger!`}
                    </h4>
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: '6px',
                        background: 'rgba(56, 151, 240, 0.2)',
                        color: '#60a5fa',
                        border: '1px solid rgba(56, 151, 240, 0.3)',
                        letterSpacing: '0.03em',
                      }}
                    >
                      ON LEDGER
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#cbd5e1', margin: '4px 0 0 0', lineHeight: 1.45 }}>
                    {reqStatus === 'pending_received'
                      ? `Accept this request to turn this personal ledger into a real-time Shared Ledger.`
                      : reqStatus === 'pending_sent'
                      ? `Waiting for @${registeredUser.username} to accept. Once accepted, this ledger will be shared automatically.`
                      : `Someone with this mobile number is registered as @${registeredUser.username}. Send a request to turn this into a Shared Ledger!`}
                  </p>
                </div>
              </div>

              {/* Banner Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', alignSelf: 'flex-end', width: '100%', justifyContent: 'flex-end' }}>
                {reqStatus === 'none' && (
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={handleSendSharedRequest}
                    disabled={isSendingReq}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      padding: '0.5rem 1rem',
                      borderRadius: '12px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #065DE8 0%, #3897f0 100%)',
                      color: '#ffffff',
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                      cursor: isSendingReq ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 14px rgba(6, 93, 232, 0.4)',
                      transition: 'opacity 0.2s',
                    }}
                  >
                    {isSendingReq ? (
                      <>
                        <span
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: '50%',
                            border: '2px solid rgba(255,255,255,0.3)',
                            borderTopColor: '#ffffff',
                            display: 'inline-block',
                            animation: 'spin 0.7s linear infinite',
                          }}
                        />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus size={15} strokeWidth={2.4} />
                        <span>Send Request to Share Ledger</span>
                      </>
                    )}
                  </motion.button>
                )}

                {reqStatus === 'pending_sent' && (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.4rem 0.85rem',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#94a3b8',
                      fontSize: '0.785rem',
                      fontWeight: 600,
                    }}
                  >
                    <Clock size={13} />
                    <span>Connection Request Pending</span>
                  </div>
                )}

                {reqStatus === 'pending_received' && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={handleAcceptSharedRequest}
                      disabled={isRespondingReq}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        padding: '0.45rem 1rem',
                        borderRadius: '12px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: '#ffffff',
                        fontSize: '0.8125rem',
                        fontWeight: 700,
                        cursor: isRespondingReq ? 'not-allowed' : 'pointer',
                        boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
                      }}
                    >
                      <CheckCircle2 size={15} strokeWidth={2.4} />
                      <span>Accept &amp; Share</span>
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={handleRejectSharedRequest}
                      disabled={isRespondingReq}
                      style={{
                        padding: '0.45rem 0.85rem',
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        background: 'rgba(255, 255, 255, 0.05)',
                        color: '#94a3b8',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        cursor: isRespondingReq ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Decline
                    </motion.button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: 'relative',
              overflow: 'hidden',
              padding: 'clamp(1.25rem, 4vw, 1.75rem) clamp(0.875rem, 3vw, 1.5rem)',
              borderRadius: '24px',
              background: '#13151b',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.45)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
              {/* Centered Status Capsule Badge */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.3rem 0.85rem',
                  borderRadius: '9999px',
                  background: settled
                    ? 'rgba(255, 255, 255, 0.06)'
                    : willGet
                    ? 'rgba(16, 185, 129, 0.12)'
                    : 'rgba(244, 63, 94, 0.12)',
                  border: `1px solid ${
                    settled
                      ? 'rgba(255, 255, 255, 0.1)'
                      : willGet
                      ? 'rgba(16, 185, 129, 0.28)'
                      : 'rgba(244, 63, 94, 0.28)'
                  }`,
                  marginBottom: '0.75rem',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: settled
                      ? '#94a3b8'
                      : willGet
                      ? '#10b981'
                      : '#f43f5e',
                    boxShadow: 'none',
                    display: 'inline-block',
                  }}
                />
                <span
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: settled
                      ? 'var(--text-muted)'
                      : willGet
                      ? '#34d399'
                      : '#fb7185',
                  }}
                >
                  {settled ? 'All Settled Up' : willGet ? 'You Will Receive' : 'You Will Give'}
                </span>
              </div>

              {/* Centered Hero Amount */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'center',
                  gap: '4px',
                  marginBottom: '1rem',
                }}
              >
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', -apple-system, monospace",
                    fontSize: 'clamp(1.5rem, 5vw, 2rem)',
                    fontWeight: 600,
                    color: settled
                      ? 'var(--text-muted)'
                      : willGet
                      ? '#10b981'
                      : '#f43f5e',
                    opacity: 0.9,
                    lineHeight: 1,
                  }}
                >
                  ₹
                </span>
                <AnimatedCounter
                  value={Math.abs(netBalance)}
                  duration={1.2}
                  style={{
                    fontFamily: "'JetBrains Mono', -apple-system, monospace",
                    fontSize: 'clamp(2.5rem, 8.5vw, 3.5rem)',
                    fontWeight: 800,
                    letterSpacing: '-0.04em',
                    lineHeight: 1,
                    color: settled
                      ? 'var(--text-muted)'
                      : willGet
                      ? '#10b981'
                      : '#f43f5e',
                    textShadow: 'none',
                  }}
                  formatFn={(v) =>
                    new Intl.NumberFormat('en-IN').format(Math.round(v))
                  }
                />
              </div>

              {/* Centered Pills: Entries & Status */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.625rem',
                  flexWrap: 'wrap',
                }}
              >
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.35rem 0.85rem',
                    borderRadius: '9999px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'rgba(255, 255, 255, 0.75)',
                    letterSpacing: '0.02em',
                  }}
                >
                  <span>{displayTotalCount}</span>
                  <span style={{ color: 'rgba(255, 255, 255, 0.45)' }}>
                    {displayTotalCount === 1 ? 'transaction' : 'transactions'}
                  </span>
                </div>

                {pendingCount > 0 ? (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.35rem 0.85rem',
                      borderRadius: '9999px',
                      background: 'rgba(245, 158, 11, 0.1)',
                      border: '1px solid rgba(245, 158, 11, 0.28)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#fbbf24',
                      letterSpacing: '0.02em',
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: '#f59e0b',
                        boxShadow: 'none',
                        display: 'inline-block',
                      }}
                    />
                    <span>
                      {pendingCount} pending
                    </span>
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.35rem 0.85rem',
                      borderRadius: '9999px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      color: 'rgba(255, 255, 255, 0.45)',
                    }}
                  >
                    <span>0 pending</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Disconnected Alert Banner */}
        {isDisconnected && (
          <div style={{ padding: '0 1.5rem', maxWidth: '720px', margin: '0 auto 1.5rem', width: '100%' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.875rem 1rem',
                borderRadius: '12px',
                background: 'rgba(239,68,68,0.06)',
                border: '1px solid rgba(239,68,68,0.15)',
                color: 'var(--danger)',
                fontSize: '0.875rem',
              }}
            >
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <span>
                <strong>Connection Disconnected.</strong> {peer.name} has removed this ledger. New entries you add will be accepted automatically.
              </span>
            </div>
          </div>
        )}

        {/* Timeline Card */}
        <div
          style={{
            maxWidth: '720px',
            width: 'calc(100% - clamp(1rem, 4vw, 2rem))',
            margin: '0 auto 6.5rem',
            overflow: 'hidden',
            borderRadius: '20px',
            background: 'linear-gradient(180deg, rgba(20, 20, 26, 0.75) 0%, rgba(14, 14, 18, 0.9) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
          }}
        >
          <div
            style={{
              padding: '1rem 1.25rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <h2
              style={{
                fontSize: '0.9375rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '-0.01em',
                margin: 0,
              }}
            >
              Transaction History
            </h2>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                color: 'rgba(255, 255, 255, 0.6)',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '2px 8px',
                borderRadius: '9999px',
              }}
            >
              {displayTotalCount} {displayTotalCount === 1 ? 'entry' : 'entries'}
            </span>
          </div>

          <LedgerTimeline
            transactions={items}
            currentUserId={currentUserId}
            connectionId={connectionId}
            netBalance={netBalance}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
            onLoadMore={handleLoadMore}
          />
        </div>
      </div>

      {/* Create sheet */}
      <AnimatePresence>
        {showCreate && (
          <CreateTransactionSheet
            connectionId={connectionId}
            peerName={displayName}
            onClose={() => setShowCreate(false)}
            onSuccess={handleSuccess}
          />
        )}
      </AnimatePresence>

      {/* Delete confirmation sheet */}
      <AnimatePresence>
        {showDelete && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDeleting && setShowDelete(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 60 }}
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 340 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => {
                if (info.offset.y > 60 || info.velocity.y > 200) {
                  setShowDelete(false);
                }
              }}
              style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'linear-gradient(180deg, #161a26 0%, #0c0d14 100%)',
                borderTop: '1px solid rgba(255, 255, 255, 0.14)',
                borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
                borderRight: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '24px 24px 0 0',
                padding: '1.25rem 1.25rem max(1.25rem, env(safe-area-inset-bottom, 1.25rem))',
                zIndex: 61,
                maxWidth: '480px',
                margin: '0 auto',
                boxShadow: '0 -24px 64px rgba(0, 0, 0, 0.9), 0 0 50px rgba(0, 0, 0, 0.6)',
                overflow: 'hidden',
                userSelect: 'none',
              }}
            >
              {/* Top luminous accent edge */}
              <div
                style={{
                  height: 3,
                  width: '100%',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  background: peer.isPersonal
                    ? 'linear-gradient(90deg, transparent, #ef4444, transparent)'
                    : 'linear-gradient(90deg, transparent, #f59e0b, transparent)',
                }}
              />

              {/* Drag handle */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', marginTop: '0.25rem' }}>
                <div style={{ width: 38, height: 4, borderRadius: 9999, background: 'rgba(255, 255, 255, 0.25)' }} />
              </div>

              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.125rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '12px',
                      background: peer.isPersonal ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                      border: `1px solid ${peer.isPersonal ? 'rgba(239, 68, 68, 0.28)' : 'rgba(245, 158, 11, 0.28)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {peer.isPersonal
                      ? <Trash2 size={20} color="#ef4444" strokeWidth={2.2} />
                      : <AlertTriangle size={20} color="#f59e0b" strokeWidth={2.2} />}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', margin: 0, letterSpacing: '-0.015em' }}>
                      {peer.isPersonal ? 'Delete Contact?' : 'Remove Ledger?'}
                    </h3>
                    <p style={{ fontSize: '0.8125rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
                      {displayName}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDelete(false)}
                  aria-label="Close"
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '50%',
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    flexShrink: 0,
                    outline: 'none',
                  }}
                >
                  <X size={15} />
                </button>
              </div>

              {/* Warning message */}
              <div
                style={{
                  padding: '1rem 1.125rem',
                  borderRadius: '16px',
                  background: peer.isPersonal ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                  border: `1px solid ${peer.isPersonal ? 'rgba(239, 68, 68, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
                  marginBottom: '1.25rem',
                }}
              >
                {peer.isPersonal ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.45rem', letterSpacing: '-0.01em' }}>
                      <AlertTriangle size={16} strokeWidth={2.4} style={{ flexShrink: 0 }} />
                      <span>This is permanent and cannot be undone</span>
                    </div>
                    <p style={{ fontSize: '0.835rem', lineHeight: 1.55, color: '#cbd5e1', margin: 0 }}>
                      All transactions with <strong style={{ color: '#ffffff' }}>{displayName}</strong> will be permanently deleted. You will lose all history.
                    </p>
                  </>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b', fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.45rem', letterSpacing: '-0.01em' }}>
                      <AlertTriangle size={16} strokeWidth={2.4} style={{ flexShrink: 0 }} />
                      <span>Your history is preserved</span>
                    </div>
                    <p style={{ fontSize: '0.835rem', lineHeight: 1.55, color: '#cbd5e1', margin: 0 }}>
                      This ledger will be removed from <strong style={{ color: '#ffffff' }}>your</strong> view only. <strong style={{ color: '#ffffff' }}>{displayName}</strong> will still see their full history. If you reconnect in the future, you can continue from where you left off.
                    </p>
                  </>
                )}
              </div>

              {/* Error */}
              <AnimatePresence>
                {deleteError && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{
                      padding: '0.75rem 1rem',
                      background: 'rgba(239, 68, 68, 0.12)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '12px',
                      fontSize: '0.85rem',
                      color: '#f87171',
                      marginBottom: '1rem',
                    }}
                  >
                    {deleteError}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Actions - Stacked with clean text placement for mobile */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', width: '100%' }}>
                <motion.button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  whileTap={{ scale: isDeleting ? 1 : 0.98 }}
                  style={{
                    width: '100%',
                    height: 48,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0 1rem',
                    borderRadius: '14px',
                    border: 'none',
                    cursor: isDeleting ? 'not-allowed' : 'pointer',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    whiteSpace: 'nowrap',
                    background: peer.isPersonal
                      ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                      : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    color: '#ffffff',
                    boxShadow: peer.isPersonal
                      ? '0 4px 18px rgba(239, 68, 68, 0.35)'
                      : '0 4px 18px rgba(245, 158, 11, 0.35)',
                    transition: 'opacity 0.15s ease',
                  }}
                >
                  {isDeleting ? (
                    <>
                      <span
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          border: '2px solid rgba(255,255,255,0.3)',
                          borderTopColor: '#ffffff',
                          display: 'inline-block',
                          animation: 'spin 0.7s linear infinite',
                        }}
                      />
                      <span>{peer.isPersonal ? 'Deleting Contact...' : 'Removing Ledger...'}</span>
                    </>
                  ) : (
                    <>
                      {peer.isPersonal ? (
                        <Trash2 size={17} strokeWidth={2.3} />
                      ) : (
                        <AlertTriangle size={17} strokeWidth={2.3} />
                      )}
                      <span>{peer.isPersonal ? 'Delete Permanently' : 'Remove from My View'}</span>
                    </>
                  )}
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowDelete(false)}
                  disabled={isDeleting}
                  style={{
                    width: '100%',
                    height: 44,
                    borderRadius: '14px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#cbd5e1',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    cursor: isDeleting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 0.15s ease',
                  }}
                >
                  Cancel
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Edit Name Modal Sheet */}
      <AnimatePresence>
        {showEditName && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSavingName && setShowEditName(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 60 }}
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 340 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => {
                if (info.offset.y > 60 || info.velocity.y > 200) {
                  setShowEditName(false);
                }
              }}
              style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'linear-gradient(180deg, #161a26 0%, #0c0d14 100%)',
                borderTop: '1px solid rgba(255, 255, 255, 0.14)',
                borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
                borderRight: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '24px 24px 0 0',
                padding: '1.25rem 1.25rem max(1.25rem, env(safe-area-inset-bottom, 1.25rem))',
                zIndex: 61,
                maxWidth: '480px',
                margin: '0 auto',
                boxShadow: '0 -24px 64px rgba(0, 0, 0, 0.9), 0 0 50px rgba(0, 0, 0, 0.6)',
                overflow: 'hidden',
                userSelect: 'none',
              }}
            >
              {/* Top accent edge */}
              <div
                style={{
                  height: 3,
                  width: '100%',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  background: 'linear-gradient(90deg, transparent, #065DE8, #3897f0, transparent)',
                }}
              />

              {/* Drag handle */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', marginTop: '0.25rem' }}>
                <div style={{ width: 38, height: 4, borderRadius: 9999, background: 'rgba(255, 255, 255, 0.25)' }} />
              </div>

              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.125rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '12px',
                      background: 'rgba(6, 93, 232, 0.12)',
                      border: '1px solid rgba(6, 93, 232, 0.28)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Edit2 size={20} color="#3897f0" strokeWidth={2.2} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', margin: 0, letterSpacing: '-0.015em' }}>
                      {peer.isPersonal ? 'Edit Personal Contact' : 'Edit Contact Nickname'}
                    </h3>
                    <p style={{ fontSize: '0.8125rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
                      {peer.isPersonal ? 'Update name & mobile number' : `@${peer.username}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEditName(false)}
                  aria-label="Close"
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '50%',
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    flexShrink: 0,
                    outline: 'none',
                  }}
                >
                  <X size={15} />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSaveName}>
                <div style={{ marginBottom: '1.125rem' }}>
                  <label
                    htmlFor="edit-person-name-input"
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#94a3b8',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      marginBottom: '0.45rem',
                    }}
                  >
                    Name
                  </label>
                  <div
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '14px',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      padding: '0 0.875rem',
                    }}
                  >
                    <input
                      id="edit-person-name-input"
                      type="text"
                      value={editInputName}
                      onChange={(e) => {
                        setEditInputName(e.target.value);
                        if (nameError) setNameError(null);
                      }}
                      placeholder="Enter name"
                      maxLength={50}
                      autoFocus
                      disabled={isSavingName}
                      style={{
                        width: '100%',
                        height: 48,
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: '#f8fafc',
                        fontSize: '0.975rem',
                        fontWeight: 600,
                      }}
                    />
                    {editInputName.length > 0 && !isSavingName && (
                      <button
                        type="button"
                        onClick={() => setEditInputName('')}
                        style={{
                          background: 'rgba(255,255,255,0.08)',
                          border: 'none',
                          borderRadius: '50%',
                          width: 22,
                          height: 22,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          padding: 0,
                          flexShrink: 0,
                        }}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.45rem 0 0 0', lineHeight: 1.4 }}>
                    {peer.isPersonal
                      ? 'Updates this contact name in your records.'
                      : 'This custom name is private to your ledger view.'}
                  </p>
                </div>

                {/* Phone Number Field (Only for Personal/Offline Contacts) */}
                {peer.isPersonal && (
                  <div style={{ marginBottom: '1.125rem' }}>
                    <label
                      htmlFor="edit-person-phone-input"
                      style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: '#94a3b8',
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        marginBottom: '0.45rem',
                      }}
                    >
                      Mobile Number
                    </label>
                    <div
                      style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '14px',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        padding: '0 0.875rem',
                        gap: '0.5rem',
                      }}
                    >
                      <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#64748b' }}>
                        +91
                      </span>
                      <input
                        id="edit-person-phone-input"
                        type="tel"
                        value={editInputPhone}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setEditInputPhone(digits);
                          if (nameError) setNameError(null);
                        }}
                        placeholder="10-digit mobile number"
                        maxLength={10}
                        disabled={isSavingName}
                        style={{
                          width: '100%',
                          height: 48,
                          background: 'transparent',
                          border: 'none',
                          outline: 'none',
                          color: '#f8fafc',
                          fontSize: '0.975rem',
                          fontWeight: 600,
                        }}
                      />
                      {editInputPhone.length > 0 && !isSavingName && (
                        <button
                          type="button"
                          onClick={() => setEditInputPhone('')}
                          style={{
                            background: 'rgba(255,255,255,0.08)',
                            border: 'none',
                            borderRadius: '50%',
                            width: 22,
                            height: 22,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            padding: 0,
                            flexShrink: 0,
                          }}
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.45rem 0 0 0', lineHeight: 1.4 }}>
                      Used to match and notify you when they create an account on Ledger.
                    </p>
                  </div>
                )}

                {/* Error */}
                <AnimatePresence>
                  {nameError && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{
                        padding: '0.75rem 1rem',
                        background: 'rgba(239, 68, 68, 0.12)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '12px',
                        fontSize: '0.85rem',
                        color: '#f87171',
                        marginBottom: '1rem',
                      }}
                    >
                      {nameError}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Actions - Stacked with clean button text for mobile */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', width: '100%' }}>
                  <motion.button
                    type="submit"
                    disabled={isSavingName || !editInputName.trim() || (peer.isPersonal && editInputPhone.length < 10)}
                    whileTap={{ scale: isSavingName ? 1 : 0.98 }}
                    style={{
                      width: '100%',
                      height: 48,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      padding: '0 1rem',
                      borderRadius: '14px',
                      border: 'none',
                      cursor: isSavingName || !editInputName.trim() || (peer.isPersonal && editInputPhone.length < 10) ? 'not-allowed' : 'pointer',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      whiteSpace: 'nowrap',
                      background: 'linear-gradient(135deg, #065DE8 0%, #3897f0 100%)',
                      color: '#ffffff',
                      boxShadow: '0 4px 18px rgba(6, 93, 232, 0.35)',
                      opacity: !editInputName.trim() || (peer.isPersonal && editInputPhone.length < 10) ? 0.6 : 1,
                      transition: 'opacity 0.15s ease',
                    }}
                  >
                    {isSavingName ? (
                      <>
                        <span
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            border: '2px solid rgba(255,255,255,0.3)',
                            borderTopColor: '#ffffff',
                            display: 'inline-block',
                            animation: 'spin 0.7s linear infinite',
                          }}
                        />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check size={17} strokeWidth={2.4} />
                        <span>{peer.isPersonal ? 'Save Contact Details' : 'Save Name'}</span>
                      </>
                    )}
                  </motion.button>

                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowEditName(false)}
                    disabled={isSavingName}
                    style={{
                      width: '100%',
                      height: 44,
                      borderRadius: '14px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#cbd5e1',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      cursor: isSavingName ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    Cancel
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating Action Button (New Entry) */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => setShowCreate(true)}
        aria-label="New Entry"
        title="Add new entry"
        style={{
          position: 'fixed',
          bottom: 'max(1.5rem, calc(env(safe-area-inset-bottom, 0px) + 1.5rem))',
          right: '1.5rem',
          width: 54,
          height: 54,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #065DE8 0%, #3897f0 100%)',
          border: '1px solid rgba(255, 255, 255, 0.22)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 8px 24px -2px rgba(56, 151, 240, 0.55), 0 2px 8px rgba(0, 0, 0, 0.3)',
          zIndex: 40,
          color: 'white',
        }}
      >
        <Plus size={24} strokeWidth={2.4} />
      </motion.button>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
