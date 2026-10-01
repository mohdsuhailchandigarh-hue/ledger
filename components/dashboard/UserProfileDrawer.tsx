'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  KeyRound,
  LogOut,
  X,
  ChevronRight,
  Camera,
  Trash2,
  Check,
  Crop,
} from 'lucide-react';
import { logoutAction } from '@/lib/actions/auth.actions';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import AvatarAdjustModal from '@/components/dashboard/AvatarAdjustModal';
import { extractPaletteFromUrl, type ExtractedPalette, DEFAULT_PALETTE } from '@/lib/utils/colorExtractor';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  userUsername: string;
  avatarUrl?: string | null;
  onAvatarUpdate?: (newUrl: string | null) => void;
  pendingActions?: number;
  netPosition?: number;
};

function getInitials(name: string) {
  return (name || 'User')
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function UserProfileDrawer({
  isOpen,
  onClose,
  userName,
  userUsername,
  avatarUrl,
  onAvatarUpdate,
  pendingActions = 0,
  netPosition = 0,
}: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentAvatar, setCurrentAvatar] = useState<string | null>(avatarUrl ?? null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Dynamic photo palette extraction for realistic reflection
  const [photoPalette, setPhotoPalette] = useState<ExtractedPalette | null>(null);

  // iOS-inspired bottom action sheet state
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);

  // Big circle adjuster modal state
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustingImageSrc, setAdjustingImageSrc] = useState<string | null>(null);

  // Progression bar state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentAvatar(avatarUrl ?? null);
  }, [avatarUrl]);

  const initials = getInitials(userName);
  const displayImage = previewUrl || currentAvatar;

  // Real-time photo color reflection extraction
  useEffect(() => {
    if (!displayImage) {
      setPhotoPalette(null);
      return;
    }
    let isMounted = true;
    extractPaletteFromUrl(displayImage).then((palette) => {
      if (isMounted) {
        setPhotoPalette(palette);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [displayImage]);

  const activePalette = photoPalette || DEFAULT_PALETTE;

  // Lock background scroll when drawer or action sheet is open
  useBodyScrollLock(isOpen || isActionSheetOpen || isAdjustModalOpen);

  // When user taps the profile circle or camera badge
  const handleAvatarTap = () => {
    if (isUploading) return;
    setIsActionSheetOpen(true);
  };

  // Option 1 from iOS sheet: Adjust current picture
  const handleOpenAdjustCurrent = () => {
    setIsActionSheetOpen(false);
    if (!currentAvatar) return;
    setAdjustingImageSrc(currentAvatar);
    setIsAdjustModalOpen(true);
  };

  // Option 2 from iOS sheet: Upload new photo
  const handleOpenUploadNew = () => {
    setIsActionSheetOpen(false);
    fileInputRef.current?.click();
  };

  // When user selects a new image file from file picker
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please choose a valid image file (PNG, JPG, WebP)');
      return;
    }

    if (file.size > 12 * 1024 * 1024) {
      setUploadError('Image size must be less than 12MB');
      return;
    }

    setUploadError(null);
    setUploadSuccess(false);

    // Open big circle adjuster modal with this local file
    const objectUrl = URL.createObjectURL(file);
    setAdjustingImageSrc(objectUrl);
    setIsAdjustModalOpen(true);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // When user clicks "Done" in the Big Circle Adjuster modal
  const handleCropConfirm = async (croppedBlob: Blob, croppedDataUrl: string) => {
    setIsAdjustModalOpen(false);

    // Instant local preview
    setPreviewUrl(croppedDataUrl);
    setIsUploading(true);
    setUploadProgress(10);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      const formData = new FormData();
      formData.append('avatar', croppedBlob, 'avatar.webp');

      const data = await uploadWithXhrProgress(formData, (pct) => {
        setUploadProgress(pct);
      });

      const newUrl = data.avatar_url;
      setCurrentAvatar(newUrl);
      setPreviewUrl(null);
      setUploadProgress(100);
      setUploadSuccess(true);
      onAvatarUpdate?.(newUrl);
      router.refresh();

      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 700);

      setTimeout(() => {
        setUploadSuccess(false);
      }, 4000);
    } catch (err: any) {
      setIsUploading(false);
      setUploadProgress(0);
      setPreviewUrl(null);
      setUploadError(err.message || 'Failed to upload photo');
    }
  };

  // Upload helper using XMLHttpRequest with smooth progress animation
  const uploadWithXhrProgress = (
    formData: FormData,
    onProgress: (pct: number) => void
  ): Promise<{ avatar_url: string }> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/user/avatar');

      let currentPct = 12;
      onProgress(currentPct);

      // Smooth progression increment while server processes
      const ticker = setInterval(() => {
        currentPct = Math.min(88, currentPct + 6);
        onProgress(currentPct);
      }, 80);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const computed = Math.round((e.loaded / e.total) * 85);
          if (computed > currentPct) {
            currentPct = computed;
            onProgress(currentPct);
          }
        }
      };

      xhr.onload = () => {
        clearInterval(ticker);
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const res = JSON.parse(xhr.responseText);
            if (res.avatar_url) {
              onProgress(100);
              setTimeout(() => resolve(res), 300);
            } else {
              reject(new Error(res.error || 'Upload failed'));
            }
          } catch {
            reject(new Error('Invalid response'));
          }
        } else {
          try {
            const res = JSON.parse(xhr.responseText);
            reject(new Error(res.error || 'Upload failed'));
          } catch {
            reject(new Error('Upload failed'));
          }
        }
      };

      xhr.onerror = () => {
        clearInterval(ticker);
        reject(new Error('Network error during upload'));
      };

      xhr.send(formData);
    });
  };

  // Remove photo handler
  const handleRemovePhoto = async () => {
    if (isUploading) return;
    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      const res = await fetch('/api/user/avatar', {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to remove photo');
      }

      setCurrentAvatar(null);
      setPreviewUrl(null);
      setPhotoPalette(null);
      setUploadSuccess(true);
      onAvatarUpdate?.(null);
      router.refresh();

      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to remove photo');
    } finally {
      setIsUploading(false);
    }
  };

  // SVG circular progression bar constants
  // Circle radius 45 inside 98x98 SVG box -> Circumference: 2 * Math.PI * 45 = 282.74
  const strokeCircumference = 282.74;
  const strokeDashoffset = strokeCircumference * (1 - uploadProgress / 100);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              onClick={onClose}
              onTouchMove={(e) => e.preventDefault()}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.72)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                zIndex: 100,
              }}
            />

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            {/* Drawer Sheet */}
            <motion.div
              initial={{ y: 'calc(100% + 50px)', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 'calc(100% + 50px)', opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="profile-drawer-sheet"
              style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                maxWidth: 480,
                margin: '0 auto',
                zIndex: 101,
                background: 'var(--bg-surface)',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                borderLeft: '1px solid rgba(255, 255, 255, 0.05)',
                borderRight: '1px solid rgba(255, 255, 255, 0.05)',
                boxShadow: displayImage
                  ? `0 -24px 64px rgba(0, 0, 0, 0.85), 0 0 55px ${activePalette.subtleTint}`
                  : '0 -24px 64px rgba(0, 0, 0, 0.8), 0 0 50px rgba(99, 102, 241, 0.12)',
                borderTopLeftRadius: '28px',
                borderTopRightRadius: '28px',
                overflow: 'visible',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                transition: 'box-shadow 0.4s ease',
              }}
            >
              {/* Soft Ambient Photo Reflection across top of sheet with gentle breath */}
              {displayImage && (
                <motion.div
                  animate={{
                    opacity: [0.6, 0.9, 0.6],
                  }}
                  transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 170,
                    borderTopLeftRadius: '28px',
                    borderTopRightRadius: '28px',
                    background: `radial-gradient(ellipse 100% 100% at 50% 0%, ${activePalette.subtleTint} 0%, transparent 100%)`,
                    pointerEvents: 'none',
                    zIndex: 0,
                  }}
                />
              )}

              {/* Dynamic Photo Ambient Reflection Glow - Layer 1 (Wide Ethereal Swirling Aurora Wave) */}
              {displayImage ? (
                <motion.div
                  animate={{
                    rotate: [0, 360],
                    scale: [1, 1.15, 0.96, 1.12, 1],
                    opacity: [0.78, 0.96, 0.82, 1, 0.78],
                  }}
                  transition={{
                    rotate: {
                      duration: 22,
                      repeat: Infinity,
                      ease: 'linear',
                    },
                    scale: {
                      duration: 6.5,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    },
                    opacity: {
                      duration: 5,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    },
                  }}
                  style={{
                    position: 'absolute',
                    top: -100,
                    left: '50%',
                    x: '-50%',
                    width: 195,
                    height: 195,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    filter: 'blur(38px) saturate(240%) brightness(1.28)',
                    pointerEvents: 'none',
                    zIndex: 0,
                    transformOrigin: 'center center',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={displayImage}
                    alt=""
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transform: 'scale(1.55)',
                    }}
                  />
                </motion.div>
              ) : (
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.65, 0.9, 0.65],
                  }}
                  transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  style={{
                    position: 'absolute',
                    top: -70,
                    left: '50%',
                    x: '-50%',
                    width: 150,
                    height: 150,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(255, 255, 255, 0.25) 0%, rgba(99, 102, 241, 0.12) 55%, transparent 75%)',
                    filter: 'blur(18px)',
                    pointerEvents: 'none',
                    zIndex: 0,
                  }}
                />
              )}

              {/* Dynamic Photo Ambient Reflection Glow - Layer 2 (Living Chromatic Rim Pulse & Oscillation) */}
              {displayImage && (
                <motion.div
                  animate={{
                    rotate: [0, -24, 0, 24, 0],
                    scale: [1, 1.14, 0.98, 1.12, 1],
                    opacity: [0.88, 1, 0.9, 1, 0.88],
                  }}
                  transition={{
                    rotate: {
                      duration: 8.5,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    },
                    scale: {
                      duration: 4.6,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    },
                    opacity: {
                      duration: 3.8,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    },
                  }}
                  style={{
                    position: 'absolute',
                    top: -60,
                    left: '50%',
                    x: '-50%',
                    width: 122,
                    height: 122,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    filter: 'blur(16px) saturate(280%) brightness(1.35)',
                    pointerEvents: 'none',
                    zIndex: 0,
                    transformOrigin: 'center center',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={displayImage}
                    alt=""
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transform: 'scale(1.35)',
                    }}
                  />
                </motion.div>
              )}

              {/* Dynamic Ambient Light Wash from extracted photo color (Warm Living Pulse) */}
              {displayImage && (
                <motion.div
                  animate={{
                    scale: [0.94, 1.14, 0.97, 1.1, 0.94],
                    opacity: [0.65, 0.95, 0.72, 1, 0.65],
                  }}
                  transition={{
                    duration: 6.8,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  style={{
                    position: 'absolute',
                    top: -105,
                    left: '50%',
                    x: '-50%',
                    width: 240,
                    height: 240,
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${activePalette.accentGlow} 0%, ${activePalette.subtleTint} 52%, transparent 76%)`,
                    filter: 'blur(32px)',
                    pointerEvents: 'none',
                    zIndex: 0,
                    transformOrigin: 'center center',
                  }}
                />
              )}

              {/* Floating Avatar Outer Container with Circular Progression Bar */}
              <div
                style={{
                  position: 'absolute',
                  top: -49,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 98,
                  height: 98,
                  zIndex: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* SVG Circular Progression Bar around the Profile Icon */}
                <svg
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    transform: 'rotate(-90deg)', // Progress flows clockwise from 12 o'clock
                    pointerEvents: 'none',
                    zIndex: 4,
                  }}
                  viewBox="0 0 100 100"
                >
                  <defs>
                    <linearGradient id="avatarProgressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor={activePalette.dominant || '#38bdf8'} />
                      <stop offset="100%" stopColor={activePalette.secondaryGlow || activePalette.dominant || '#38bdf8'} />
                    </linearGradient>
                  </defs>

                  {/* Background Track Ring */}
                  {isUploading && (
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.12)"
                      strokeWidth="3.5"
                    />
                  )}

                  {/* Active Animated Progression Ring */}
                  {isUploading && (
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke={uploadProgress >= 100 ? '#10b981' : 'url(#avatarProgressGrad)'}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeDasharray={strokeCircumference}
                      strokeDashoffset={strokeDashoffset}
                      style={{
                        transition: 'stroke-dashoffset 0.16s ease-out, stroke 0.25s ease',
                        filter: uploadProgress >= 100
                          ? 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.9))'
                          : `drop-shadow(0 0 7px ${activePalette.dominant || '#6366f1'})`,
                      }}
                    />
                  )}
                </svg>

                {/* Inner Clickable Avatar Circle */}
                <motion.button
                  type="button"
                  onClick={handleAvatarTap}
                  disabled={isUploading}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  title="Tap to adjust or upload photo"
                  style={{
                    position: 'relative',
                    width: 86,
                    height: 86,
                    borderRadius: '50%',
                    padding: 0,
                    margin: 0,
                    border: isUploading ? '3px solid transparent' : '3.5px solid rgba(255, 255, 255, 0.9)',
                    boxShadow: displayImage
                      ? `0 18px 44px -4px ${activePalette.accentGlow}, 0 0 35px ${activePalette.subtleTint}, 0 8px 24px rgba(0, 0, 0, 0.7), inset 0 2px 4px rgba(255, 255, 255, 0.5)`
                      : '0 14px 34px -4px rgba(99, 102, 241, 0.4), 0 6px 20px rgba(0, 0, 0, 0.7), inset 0 2px 3px rgba(255, 255, 255, 0.35)',
                    background: '#090d16',
                    overflow: 'hidden',
                    cursor: isUploading ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    outline: 'none',
                    zIndex: 2,
                    transition: 'border 0.2s ease, box-shadow 0.35s ease',
                  }}
                >
                  {displayImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={displayImage}
                      alt={userName}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        fontSize: '2rem',
                        fontWeight: 800,
                        color: '#ffffff',
                        letterSpacing: '-0.03em',
                        textShadow: '0 2px 10px rgba(0, 0, 0, 0.45)',
                        userSelect: 'none',
                      }}
                    >
                      {initials}
                    </span>
                  )}

                  {/* Uploading Percentage Indicator inside circle */}
                  {isUploading && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.65)',
                        backdropFilter: 'blur(3px)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 5,
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.875rem',
                          fontWeight: 800,
                          color: '#ffffff',
                          fontFamily: "'JetBrains Mono', monospace",
                          letterSpacing: '-0.02em',
                        }}
                      >
                        {uploadProgress}%
                      </span>
                    </div>
                  )}
                </motion.button>

                {/* Camera / Edit Badge at Bottom-Right */}
                {!isUploading && (
                  <motion.button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAvatarTap();
                    }}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    title="Change or Adjust Photo"
                    style={{
                      position: 'absolute',
                      bottom: 4,
                      right: 4,
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: displayImage
                        ? (activePalette.isBrightMonochrome ? 'linear-gradient(135deg, rgba(255,255,255,0.22), rgba(255,255,255,0.08))' : `linear-gradient(135deg, ${activePalette.dominant}, rgba(15,23,42,0.9))`)
                        : 'linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.08))',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                      border: displayImage && activePalette.borderTint ? `1.5px solid ${activePalette.borderTint}` : '1.5px solid rgba(255, 255, 255, 0.3)',
                      boxShadow: displayImage
                        ? `0 4px 14px ${activePalette.accentGlow}`
                        : '0 4px 10px rgba(0, 0, 0, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      zIndex: 6,
                      color: activePalette.isBrightMonochrome ? '#ffffff' : '#ffffff',
                      outline: 'none',
                      transition: 'background 0.3s ease, box-shadow 0.3s ease',
                    }}
                  >
                    <Camera size={13} />
                  </motion.button>
                )}

                {/* Notification Badge if approvals pending */}
                {pendingActions > 0 && !isUploading && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      minWidth: 20,
                      height: 20,
                      padding: '0 6px',
                      borderRadius: '9999px',
                      background: '#f59e0b',
                      color: '#000000',
                      fontSize: '0.6875rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid var(--bg-surface)',
                      boxShadow: '0 0 10px rgba(245, 158, 11, 0.6)',
                      zIndex: 6,
                    }}
                  >
                    {pendingActions}
                  </span>
                )}
              </div>

              {/* Close Button in Top Right */}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close Profile Menu"
                className="hover-bg-elevated"
                style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1.25rem',
                  zIndex: 10,
                  width: 36,
                  height: 36,
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <X size={18} />
              </button>

              {/* Profile Info Header */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  paddingTop: '3.625rem',
                  paddingBottom: '1.125rem',
                  paddingLeft: '1.5rem',
                  paddingRight: '1.5rem',
                  borderBottom: '1px solid var(--border-subtle)',
                  textAlign: 'center',
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                <h3
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    letterSpacing: '-0.025em',
                    lineHeight: 1.25,
                    margin: 0,
                  }}
                >
                  {userName || 'User'}
                </h3>

                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginTop: '5px',
                    padding: '2px 10px',
                    borderRadius: '9999px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.07)',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.8125rem',
                      fontWeight: 500,
                      color: 'var(--text-secondary)',
                      letterSpacing: '0.01em',
                    }}
                  >
                    @{userUsername}
                  </span>
                </div>

                {/* Dynamic Photo Reflection Themed Action Button */}
                <button
                  type="button"
                  onClick={handleAvatarTap}
                  disabled={isUploading}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginTop: '9px',
                    background: displayImage
                      ? (activePalette.isBrightMonochrome ? 'rgba(255, 255, 255, 0.08)' : activePalette.subtleTint)
                      : 'rgba(255, 255, 255, 0.08)',
                    border: `1px solid ${displayImage ? activePalette.borderTint : 'rgba(255, 255, 255, 0.16)'}`,
                    padding: '6px 16px',
                    borderRadius: '9999px',
                    color: displayImage
                      ? (activePalette.isBrightMonochrome ? '#f1f5f9' : activePalette.dominant)
                      : '#f1f5f9',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: displayImage ? `0 2px 14px ${activePalette.subtleTint}` : 'none',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    transition: 'all 0.25s ease',
                  }}
                >
                  <Camera size={13} />
                  {currentAvatar ? 'Adjust or Change Picture' : 'Upload Profile Picture'}
                </button>

                {/* Status Messages */}
                {isUploading && (
                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: '#38bdf8',
                      marginTop: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    Uploading picture ({uploadProgress}%)...
                  </div>
                )}

                {uploadSuccess && (
                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: '#34d399',
                      marginTop: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Check size={13} />
                    Profile picture updated!
                  </div>
                )}

                {uploadError && (
                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: '#f87171',
                      marginTop: '8px',
                      background: 'rgba(244, 63, 94, 0.1)',
                      padding: '3px 10px',
                      borderRadius: '6px',
                      border: '1px solid rgba(244, 63, 94, 0.2)',
                    }}
                  >
                    {uploadError}
                  </div>
                )}
              </div>

              {/* Menu Links */}
              <div
                style={{
                  padding: '1.125rem 1.25rem max(1.5rem, env(safe-area-inset-bottom, 1.5rem))',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.625rem',
                  overflowY: 'auto',
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                {/* Option 1: Pending Approvals (Opens popup directly, no awkward page redirect) */}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    window.dispatchEvent(new CustomEvent('open-pending-approvals'));
                  }}
                  className="hover-bg-elevated"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.9375rem 1.125rem',
                    borderRadius: '16px',
                    background: 'rgba(255, 255, 255, 0.025)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    color: 'var(--text-primary)',
                    transition: 'all 0.15s ease',
                    width: '100%',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: '12px',
                        background: 'rgba(139, 92, 246, 0.14)',
                        border: '1px solid rgba(139, 92, 246, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Bell size={18} color="#a78bfa" />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        Pending Approvals
                        {pendingActions > 0 && (
                          <span
                            style={{
                              fontSize: '0.625rem',
                              fontWeight: 700,
                              padding: '1px 7px',
                              borderRadius: '9999px',
                              background: 'rgba(245, 158, 11, 0.16)',
                              color: '#f59e0b',
                              border: '1px solid rgba(245, 158, 11, 0.35)',
                            }}
                          >
                            {pendingActions} new
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                        Confirm transactions from others
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={16} color="var(--text-muted)" />
                </button>

                {/* Option 2: Change Password */}
                <Link
                  href="/login?tab=change"
                  onClick={onClose}
                  className="hover-bg-elevated"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.9375rem 1.125rem',
                    borderRadius: '16px',
                    background: 'rgba(255, 255, 255, 0.025)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    textDecoration: 'none',
                    color: 'var(--text-primary)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: '12px',
                        background: 'rgba(6, 182, 212, 0.14)',
                        border: '1px solid rgba(6, 182, 212, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <KeyRound size={18} color="#38bdf8" />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Change Password</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                        Update your account security
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={16} color="var(--text-muted)" />
                </Link>

                {/* Subtle Divider */}
                <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '0.375rem 0' }} />

                {/* Sign Out Button */}
                <form action={logoutAction} style={{ width: '100%' }}>
                  <button
                    type="submit"
                    className="hover-signout"
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.875rem',
                      padding: '0.9375rem 1.125rem',
                      borderRadius: '16px',
                      background: 'rgba(244, 63, 94, 0.06)',
                      border: '1px solid rgba(244, 63, 94, 0.18)',
                      color: '#f43f5e',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: '12px',
                        background: 'rgba(244, 63, 94, 0.14)',
                        border: '1px solid rgba(244, 63, 94, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <LogOut size={18} color="#f43f5e" />
                    </div>
                    <span>Sign Out</span>
                  </button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* iOS-Inspired Bottom Action Sheet for Picture Options */}
      <AnimatePresence>
        {isActionSheetOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setIsActionSheetOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.72)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                zIndex: 110,
              }}
            />

            {/* iOS Action Sheet Card */}
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: 'fixed',
                bottom: 'max(0.75rem, env(safe-area-inset-bottom, 0.75rem))',
                left: '1rem',
                right: '1rem',
                maxWidth: 420,
                margin: '0 auto',
                zIndex: 111,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              {/* Grouped Actions List */}
              <div
                style={{
                  background: 'rgba(26, 28, 38, 0.92)',
                  backdropFilter: 'blur(32px) saturate(190%)',
                  WebkitBackdropFilter: 'blur(32px) saturate(190%)',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  overflow: 'hidden',
                  boxShadow: displayImage
                    ? `0 24px 60px rgba(0, 0, 0, 0.8), 0 0 35px ${activePalette.subtleTint}`
                    : '0 24px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(99, 102, 241, 0.1)',
                }}
              >
                {/* Header Title */}
                <div
                  style={{
                    padding: '0.875rem 1rem 0.625rem',
                    textAlign: 'center',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <p
                    style={{
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      margin: 0,
                      letterSpacing: '-0.01em',
                    }}
                  >
                    Profile Photo
                  </p>
                </div>

                {/* Action: Adjust Current Photo (if photo exists) */}
                {currentAvatar && (
                  <button
                    type="button"
                    onClick={handleOpenAdjustCurrent}
                    className="hover-bg-elevated"
                    style={{
                      width: '100%',
                      padding: '1rem 1.25rem',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                      color: activePalette.dominant || '#818cf8',
                      fontSize: '1rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    <Crop size={18} />
                    Adjust Current Picture
                  </button>
                )}

                {/* Action: Upload [New] Photo */}
                <button
                  type="button"
                  onClick={handleOpenUploadNew}
                  className="hover-bg-elevated"
                  style={{
                    width: '100%',
                    padding: '1rem 1.25rem',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: currentAvatar ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
                    color: '#60a5fa',
                    fontSize: '1rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    letterSpacing: '-0.01em',
                  }}
                >
                  <Camera size={18} />
                  {currentAvatar ? 'Upload New Photo' : 'Upload Photo'}
                </button>

                {/* Action: Remove Photo (if exists) */}
                {currentAvatar && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsActionSheetOpen(false);
                      handleRemovePhoto();
                    }}
                    className="hover-bg-elevated"
                    style={{
                      width: '100%',
                      padding: '1rem 1.25rem',
                      background: 'transparent',
                      border: 'none',
                      color: '#fb7185',
                      fontSize: '1rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    <Trash2 size={18} />
                    Remove Photo
                  </button>
                )}
              </div>

              {/* Cancel Button */}
              <button
                type="button"
                onClick={() => setIsActionSheetOpen(false)}
                style={{
                  width: '100%',
                  padding: '1rem 1.25rem',
                  borderRadius: '16px',
                  background: 'rgba(32, 35, 45, 0.95)',
                  backdropFilter: 'blur(32px) saturate(190%)',
                  WebkitBackdropFilter: 'blur(32px) saturate(190%)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#ffffff',
                  fontSize: '1rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  letterSpacing: '-0.01em',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                }}
              >
                Cancel
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Big Circle Interactive Adjust & Crop Modal */}
      <AvatarAdjustModal
        isOpen={isAdjustModalOpen}
        imageSrc={adjustingImageSrc}
        onClose={() => setIsAdjustModalOpen(false)}
        onConfirm={handleCropConfirm}
      />
    </>
  );
}
