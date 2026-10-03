'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
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
  CheckCircle2,
  XCircle,
  Loader2,
  UserCheck,
  Edit3,
} from 'lucide-react';
import { logoutAction } from '@/lib/actions/auth.actions';
import {
  checkUsernameAvailabilityAction,
  updateProfileNameAndUsernameAction,
} from '@/lib/actions/user.actions';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { useSwipeDownDismiss } from '@/lib/hooks/useSwipeDownDismiss';
import AvatarAdjustModal from '@/components/dashboard/AvatarAdjustModal';
import { extractPaletteFromUrl, type ExtractedPalette, DEFAULT_PALETTE } from '@/lib/utils/colorExtractor';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  userUsername: string;
  avatarUrl?: string | null;
  onAvatarUpdate?: (newUrl: string | null) => void;
  onProfileUpdate?: (newName: string, newUsername: string) => void;
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

function SlideToSignOut() {
  const trackRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [maxDrag, setMaxDrag] = useState(240);
  const [isCompleted, setIsCompleted] = useState(false);

  const x = useMotionValue(0);
  const textOpacity = useTransform(x, [0, maxDrag * 0.55], [1, 0]);
  const fillWidth = useTransform(x, (currentX) => `${Math.max(48, currentX + 46)}px`);

  // Dynamically calculate max draggable width based on container width
  useEffect(() => {
    const updateDimensions = () => {
      if (trackRef.current) {
        // Track width - thumb width (42px) - 2 * padding (5px each side = 10px)
        const trackWidth = trackRef.current.offsetWidth;
        const availableDrag = Math.max(60, trackWidth - 42 - 10);
        setMaxDrag(availableDrag);
      }
    };

    updateDimensions();

    const observer = new ResizeObserver(updateDimensions);
    if (trackRef.current) {
      observer.observe(trackRef.current);
    }

    window.addEventListener('resize', updateDimensions);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  const handleDragEnd = () => {
    if (isCompleted) return;
    const currentX = x.get();
    if (currentX >= maxDrag * 0.65) {
      // User slid past the activation threshold -> trigger sign out
      setIsCompleted(true);
      animate(x, maxDrag, { type: 'spring', stiffness: 420, damping: 28 });
      try {
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate(25);
        }
      } catch {}

      // Submit logout form
      setTimeout(() => {
        formRef.current?.requestSubmit();
      }, 150);
    } else {
      // Elastic spring back to origin
      animate(x, 0, { type: 'spring', stiffness: 480, damping: 30 });
    }
  };

  return (
    <form ref={formRef} action={logoutAction} style={{ width: '100%', margin: 0, padding: 0 }}>
      <input type="submit" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" />
      <div
        ref={trackRef}
        style={{
          position: 'relative',
          width: '100%',
          height: 52,
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.06) 0%, rgba(24, 26, 36, 0.88) 100%)',
          border: '1px solid rgba(244, 63, 94, 0.22)',
          boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.5), 0 2px 10px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          boxSizing: 'border-box',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      >
        {/* Dynamic Glow Fill following the thumb */}
        <motion.div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            width: fillWidth,
            background: 'linear-gradient(90deg, rgba(244, 63, 94, 0.12) 0%, rgba(244, 63, 94, 0.32) 100%)',
            borderRadius: '15px',
            pointerEvents: 'none',
          }}
        />

        {/* Shimmering Center Text: Slide to Sign Out */}
        <motion.div
          style={{
            opacity: isCompleted ? 0 : textOpacity,
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            pointerEvents: 'none',
            userSelect: 'none',
            paddingLeft: '34px',
            transition: 'opacity 0.12s ease',
          }}
        >
          <span
            style={{
              fontSize: '0.8125rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
              color: '#f43f5e',
              textTransform: 'uppercase',
              textShadow: '0 0 12px rgba(244, 63, 94, 0.35)',
            }}
          >
            Slide to Sign Out
          </span>
          <motion.span
            animate={{
              x: [0, 5, 0],
              opacity: [0.35, 1, 0.35],
            }}
            transition={{
              duration: 1.6,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              color: '#f43f5e',
              fontSize: '1rem',
              fontWeight: 800,
              letterSpacing: '-2px',
            }}
          >
            ›››
          </motion.span>
        </motion.div>

        {/* Completed State: Signing out indicator */}
        {isCompleted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              color: '#ffffff',
              fontSize: '0.875rem',
              fontWeight: 700,
              letterSpacing: '0.02em',
              pointerEvents: 'none',
              zIndex: 3,
            }}
          >
            <Loader2 size={16} className="animate-spin" color="#f43f5e" />
            <span style={{ color: '#f43f5e' }}>Signing Out...</span>
          </motion.div>
        )}

        {/* Draggable Slider Thumb */}
        <motion.div
          drag={isCompleted ? false : 'x'}
          dragConstraints={{ left: 0, right: maxDrag }}
          dragElastic={0.06}
          dragMomentum={false}
          onDragEnd={handleDragEnd}
          onPointerDown={(e) => e.stopPropagation()}
          whileHover={isCompleted ? undefined : { scale: 1.04 }}
          whileTap={isCompleted ? undefined : { scale: 0.96 }}
          style={{
            x,
            width: 42,
            height: 42,
            marginLeft: 5,
            borderRadius: '13px',
            background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 55%, #be123c 100%)',
            border: '1px solid rgba(255, 255, 255, 0.35)',
            boxShadow:
              '0 4px 14px rgba(244, 63, 94, 0.45), 0 2px 6px rgba(0, 0, 0, 0.5), inset 0 1px 1.5px rgba(255, 255, 255, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isCompleted ? 'wait' : 'grab',
            zIndex: 4,
            touchAction: 'none',
            flexShrink: 0,
          }}
        >
          {isCompleted ? (
            <Loader2 size={18} className="animate-spin" color="#ffffff" />
          ) : (
            <LogOut size={18} color="#ffffff" strokeWidth={2.4} />
          )}
        </motion.div>
      </div>
    </form>
  );
}

export default function UserProfileDrawer({
  isOpen,
  onClose,
  userName,
  userUsername,
  avatarUrl,
  onAvatarUpdate,
  onProfileUpdate,
  pendingActions = 0,
  netPosition = 0,
}: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [currentName, setCurrentName] = useState(userName);
  const [currentUsername, setCurrentUsername] = useState(userUsername);

  useEffect(() => {
    setCurrentName(userName);
  }, [userName]);

  useEffect(() => {
    setCurrentUsername(userUsername);
  }, [userUsername]);

  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);

  // Edit Name & Username modal state
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editName, setEditName] = useState(userName);
  const [editUsername, setEditUsername] = useState(userUsername);
  const [usernameStatus, setUsernameStatus] = useState<{
    state: 'idle' | 'checking' | 'valid' | 'taken' | 'invalid';
    message?: string;
    error?: string;
  }>({ state: 'valid', message: 'Current username' });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);

  const { isDismissing, dismissSheet, handleHeaderPointerDown } = useSwipeDownDismiss({
    isOpen: isOpen && !isActionSheetOpen && !isAdjustModalOpen && !isEditProfileOpen,
    onClose,
    sheetRef,
    backdropRef,
    scrollRef,
    headerSelector: '.drawer-handle, [data-drag-header="true"], [data-drag-handle="true"]',
    threshold: 110,
  });

  const [currentAvatar, setCurrentAvatar] = useState<string | null>(avatarUrl ?? null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Dynamic photo palette extraction for realistic reflection
  const [photoPalette, setPhotoPalette] = useState<ExtractedPalette | null>(null);
  const [adjustingImageSrc, setAdjustingImageSrc] = useState<string | null>(null);

  // Progression bar state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentAvatar(avatarUrl ?? null);
  }, [avatarUrl]);

  const initials = getInitials(currentName);
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

  // Debounced real-time database search for username availability
  useEffect(() => {
    if (!isEditProfileOpen) return;

    const raw = editUsername.trim().replace(/^@+/, '');

    if (!raw) {
      setUsernameStatus({ state: 'invalid', error: 'Username cannot be empty' });
      return;
    }

    if (raw.length < 3) {
      setUsernameStatus({ state: 'invalid', error: 'Username must be at least 3 characters' });
      return;
    }

    if (raw.length > 30) {
      setUsernameStatus({ state: 'invalid', error: 'Username must be at most 30 characters' });
      return;
    }

    if (!/^[a-z0-9_]+$/i.test(raw)) {
      setUsernameStatus({ state: 'invalid', error: 'Only letters, numbers, and underscores allowed' });
      return;
    }

    // If it matches their existing username
    if (raw.toLowerCase() === currentUsername.toLowerCase()) {
      setUsernameStatus({ state: 'valid', message: 'Current username' });
      return;
    }

    setUsernameStatus({ state: 'checking' });

    const timer = setTimeout(async () => {
      try {
        const res = await checkUsernameAvailabilityAction(raw);
        if (res.available) {
          setUsernameStatus({
            state: 'valid',
            message: res.isCurrent ? 'Current username' : 'Username is available',
          });
        } else {
          setUsernameStatus({
            state: 'taken',
            error: res.error || 'Username is already taken',
          });
        }
      } catch {
        setUsernameStatus({
          state: 'invalid',
          error: 'Failed to verify username',
        });
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [editUsername, isEditProfileOpen, currentUsername]);

  // Lock background scroll when drawer or action sheet is open
  useBodyScrollLock(isOpen || isActionSheetOpen || isAdjustModalOpen || isEditProfileOpen);

  const handleOpenEditProfile = () => {
    setEditName(currentName);
    setEditUsername(currentUsername);
    setUsernameStatus({ state: 'valid', message: 'Current username' });
    setProfileSaveError(null);
    setProfileSaveSuccess(false);
    setIsEditProfileOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingProfile) return;

    const cleanName = editName.trim();
    const cleanUsername = editUsername.trim().replace(/^@+/, '').toLowerCase();

    if (!cleanName) {
      setProfileSaveError('Please enter your display name');
      return;
    }

    if (usernameStatus.state === 'taken') {
      setProfileSaveError('Username is already taken. Please choose another username.');
      return;
    }

    if (usernameStatus.state === 'invalid') {
      setProfileSaveError(usernameStatus.error || 'Please enter a valid username');
      return;
    }

    if (usernameStatus.state === 'checking') {
      return;
    }

    setIsSavingProfile(true);
    setProfileSaveError(null);

    try {
      const res = await updateProfileNameAndUsernameAction({
        name: cleanName,
        username: cleanUsername,
      });

      if (res.error || !res.success) {
        setProfileSaveError(res.error || 'Failed to update profile');
        setIsSavingProfile(false);
        return;
      }

      setCurrentName(res.name || cleanName);
      setCurrentUsername(res.username || cleanUsername);
      onProfileUpdate?.(res.name || cleanName, res.username || cleanUsername);

      setProfileSaveSuccess(true);
      router.refresh();

      setTimeout(() => {
        setIsSavingProfile(false);
        setIsEditProfileOpen(false);
        setProfileSaveSuccess(false);
      }, 500);
    } catch (err: any) {
      setProfileSaveError(err?.message || 'Failed to update profile');
      setIsSavingProfile(false);
    }
  };

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

  // Share app login link via WhatsApp
  const handleShareWhatsApp = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const loginUrl = `${origin}/login`;
    const message = `Manage and track shared expenses easily with Shared Ledger!\n\nAccess or sign up here: ${loginUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
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
              ref={backdropRef}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={isDismissing ? undefined : { opacity: 0 }}
              transition={{ duration: 0.22 }}
              onClick={dismissSheet}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.45)',
                backdropFilter: 'blur(30px) saturate(180%)',
                WebkitBackdropFilter: 'blur(30px) saturate(180%)',
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
              ref={sheetRef}
              initial={{ y: 'calc(100% + 50px)', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={isDismissing ? undefined : { y: 'calc(100% + 50px)', opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              onPointerDown={handleHeaderPointerDown}
              className="profile-drawer-sheet"
              style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                maxWidth: 480,
                margin: '0 auto',
                zIndex: 101,
                pointerEvents: isDismissing ? 'none' : 'auto',
                background: 'var(--bg-surface)',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                borderLeft: '1px solid rgba(255, 255, 255, 0.05)',
                borderRight: '1px solid rgba(255, 255, 255, 0.05)',
                boxShadow: displayImage
                  ? `0 -24px 64px rgba(0, 0, 0, 0.85), 0 0 55px ${activePalette.subtleTint}`
                  : '0 -24px 64px rgba(0, 0, 0, 0.8), 0 0 50px rgba(56, 151, 240, 0.12)',
                borderTopLeftRadius: '28px',
                borderTopRightRadius: '28px',
                overflow: 'visible',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                transition: 'box-shadow 0.4s ease',
              }}
            >
              {/* Drag Handle Bar Pill */}
              <div
                data-drag-handle="true"
                className="drawer-handle"
                style={{
                  width: 44,
                  height: 5,
                  borderRadius: 3,
                  background: 'rgba(255, 255, 255, 0.28)',
                  margin: '0.625rem auto 0.25rem',
                  flexShrink: 0,
                  cursor: 'grab',
                  touchAction: 'none',
                  position: 'relative',
                  zIndex: 20,
                }}
              />
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
                    background: 'radial-gradient(circle, rgba(255, 255, 255, 0.25) 0%, rgba(56, 151, 240, 0.12) 55%, transparent 75%)',
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
                          : `drop-shadow(0 0 7px ${activePalette.dominant || '#3897f0'})`,
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
                      : '0 14px 34px -4px rgba(56, 151, 240, 0.4), 0 6px 20px rgba(0, 0, 0, 0.7), inset 0 2px 3px rgba(255, 255, 255, 0.35)',
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
                      alt={currentName}
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
                      backdropFilter: 'blur(20px) saturate(180%)',
                      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
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
                onClick={dismissSheet}
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
                data-drag-header="true"
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
                  touchAction: 'none',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  cursor: 'grab',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
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
                    {currentName || 'User'}
                  </h3>
                  <button
                    type="button"
                    onClick={handleOpenEditProfile}
                    title="Change Name & Username"
                    aria-label="Change Name & Username"
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      padding: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-secondary)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Edit3 size={13} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleOpenEditProfile}
                  title="Change username"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginTop: '5px',
                    padding: '2px 10px',
                    borderRadius: '9999px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.07)',
                    cursor: 'pointer',
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
                    @{currentUsername}
                  </span>
                </button>

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
                    backdropFilter: 'blur(20px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
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
                ref={scrollRef}
                data-scrollable="true"
                style={{
                  padding: '1.125rem 1.25rem max(1.5rem, env(safe-area-inset-bottom, 1.5rem))',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.625rem',
                  overflowY: 'auto',
                  position: 'relative',
                  zIndex: 1,
                  WebkitOverflowScrolling: 'touch',
                  overscrollBehavior: 'contain',
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

                {/* Option 2: Change Name & Username */}
                <button
                  type="button"
                  onClick={handleOpenEditProfile}
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
                        background: 'rgba(99, 102, 241, 0.14)',
                        border: '1px solid rgba(99, 102, 241, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <UserCheck size={18} color="#818cf8" />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Change Name & Username</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                        Update your display name and handle
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

                {/* Option 4: Share App on WhatsApp */}
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
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
                        background: 'rgba(37, 211, 102, 0.14)',
                        border: '1px solid rgba(37, 211, 102, 0.28)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#25D366',
                        flexShrink: 0,
                      }}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Share App on WhatsApp</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                        Share Shared Ledger login link
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={16} color="var(--text-muted)" />
                </button>

                {/* Subtle Divider */}
                <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '0.375rem 0' }} />

                {/* Premium Slideable Sign Out Button */}
                <SlideToSignOut />
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
                background: 'rgba(0, 0, 0, 0.45)',
                backdropFilter: 'blur(30px) saturate(180%)',
                WebkitBackdropFilter: 'blur(30px) saturate(180%)',
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
                  background: 'rgba(26, 28, 38, 0.88)',
                  backdropFilter: 'blur(60px) saturate(200%)',
                  WebkitBackdropFilter: 'blur(60px) saturate(200%)',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  overflow: 'hidden',
                  boxShadow: displayImage
                    ? `0 24px 60px rgba(0, 0, 0, 0.8), 0 0 35px ${activePalette.subtleTint}`
                    : '0 24px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(56, 151, 240, 0.1)',
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
                  background: 'rgba(32, 35, 45, 0.88)',
                  backdropFilter: 'blur(60px) saturate(200%)',
                  WebkitBackdropFilter: 'blur(60px) saturate(200%)',
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

      {/* Change Name & Username Bottom Sheet Modal */}
      <AnimatePresence>
        {isEditProfileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => !isSavingProfile && setIsEditProfileOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(30px) saturate(180%)',
                WebkitBackdropFilter: 'blur(30px) saturate(180%)',
                zIndex: 110,
              }}
            />

            {/* Modal Card / Bottom Sheet */}
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                maxWidth: 480,
                margin: '0 auto',
                zIndex: 112,
                background: 'var(--bg-surface)',
                borderTop: '1px solid rgba(255, 255, 255, 0.14)',
                borderLeft: '1px solid rgba(255, 255, 255, 0.07)',
                borderRight: '1px solid rgba(255, 255, 255, 0.07)',
                borderTopLeftRadius: '24px',
                borderTopRightRadius: '24px',
                boxShadow: '0 -24px 60px rgba(0, 0, 0, 0.85)',
                padding: '0.875rem 1.25rem max(1.25rem, env(safe-area-inset-bottom, 1.25rem))',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Drag Handle */}
              <div
                style={{
                  width: 44,
                  height: 5,
                  borderRadius: 3,
                  background: 'rgba(255, 255, 255, 0.28)',
                  margin: '0 auto 0.75rem',
                }}
              />

              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: '0.875rem',
                  borderBottom: '1px solid var(--border-subtle)',
                  marginBottom: '1.125rem',
                }}
              >
                <div>
                  <h4
                    style={{
                      margin: 0,
                      fontSize: '1.125rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    Change Name & Username
                  </h4>
                  <p
                    style={{
                      margin: '3px 0 0 0',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                    }}
                  >
                    Update your public display name and unique handle
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  disabled={isSavingProfile}
                  aria-label="Close"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-secondary)',
                    cursor: isSavingProfile ? 'not-allowed' : 'pointer',
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Display Name Input */}
                <div>
                  <label
                    htmlFor="edit-display-name-input"
                    style={{
                      display: 'block',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      marginBottom: '0.375rem',
                    }}
                  >
                    Display Name
                  </label>
                  <input
                    id="edit-display-name-input"
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Enter your name"
                    disabled={isSavingProfile}
                    maxLength={50}
                    style={{
                      width: '100%',
                      height: '46px',
                      padding: '0 0.875rem',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: 'var(--text-primary)',
                      fontSize: '0.9375rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border 0.2s ease',
                    }}
                  />
                </div>

                {/* Username Input with Live Search Indicator */}
                <div>
                  <label
                    htmlFor="edit-username-input"
                    style={{
                      display: 'block',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      marginBottom: '0.375rem',
                    }}
                  >
                    Username
                  </label>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      position: 'relative',
                      width: '100%',
                      height: '46px',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border:
                        usernameStatus.state === 'taken'
                          ? '1.5px solid #f43f5e'
                          : usernameStatus.state === 'valid'
                          ? '1.5px solid #10b981'
                          : usernameStatus.state === 'checking'
                          ? '1.5px solid #38bdf8'
                          : usernameStatus.state === 'invalid'
                          ? '1.5px solid #fb7185'
                          : '1px solid rgba(255, 255, 255, 0.12)',
                      boxSizing: 'border-box',
                      padding: '0 0.875rem',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.9375rem',
                        fontWeight: 600,
                        color: 'var(--text-muted)',
                        userSelect: 'none',
                        marginRight: '3px',
                      }}
                    >
                      @
                    </span>
                    <input
                      id="edit-username-input"
                      type="text"
                      value={editUsername.replace(/^@+/, '')}
                      onChange={(e) =>
                        setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
                      }
                      placeholder="username"
                      disabled={isSavingProfile}
                      maxLength={30}
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-primary)',
                        fontSize: '0.9375rem',
                        outline: 'none',
                        padding: 0,
                        margin: 0,
                      }}
                    />

                    {/* Live Indicator Icon */}
                    <div style={{ marginLeft: '8px', display: 'flex', alignItems: 'center' }}>
                      {usernameStatus.state === 'checking' && (
                        <Loader2 size={18} className="animate-spin" color="#38bdf8" />
                      )}
                      {usernameStatus.state === 'taken' && (
                        <div
                          title="Username is already taken"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            background: 'rgba(244, 63, 94, 0.15)',
                          }}
                        >
                          <XCircle size={18} color="#f43f5e" />
                        </div>
                      )}
                      {usernameStatus.state === 'valid' && (
                        <div
                          title="Username is available"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            background: 'rgba(16, 185, 129, 0.15)',
                          }}
                        >
                          <CheckCircle2 size={18} color="#10b981" />
                        </div>
                      )}
                      {usernameStatus.state === 'invalid' && (
                        <div
                          title={usernameStatus.error || 'Invalid username'}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            background: 'rgba(251, 113, 133, 0.15)',
                          }}
                        >
                          <XCircle size={18} color="#fb7185" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status Helper Message */}
                  <div style={{ marginTop: '5px', minHeight: '18px' }}>
                    {usernameStatus.state === 'checking' && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: '#38bdf8',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        Checking availability in database...
                      </span>
                    )}
                    {usernameStatus.state === 'taken' && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: '#f43f5e',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        <X size={12} strokeWidth={3} />
                        {usernameStatus.error || 'Username is already taken'}
                      </span>
                    )}
                    {usernameStatus.state === 'valid' && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: '#34d399',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        <Check size={12} strokeWidth={3} />
                        {usernameStatus.message || 'Username is available'}
                      </span>
                    )}
                    {usernameStatus.state === 'invalid' && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: '#fb7185',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        <X size={12} strokeWidth={3} />
                        {usernameStatus.error}
                      </span>
                    )}
                  </div>
                </div>

                {/* Error Banner */}
                {profileSaveError && (
                  <div
                    style={{
                      padding: '0.625rem 0.875rem',
                      background: 'rgba(244, 63, 94, 0.1)',
                      border: '1px solid rgba(244, 63, 94, 0.25)',
                      borderRadius: '10px',
                      color: '#f87171',
                      fontSize: '0.8125rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <XCircle size={15} color="#f43f5e" />
                    <span>{profileSaveError}</span>
                  </div>
                )}

                {/* Success Banner */}
                {profileSaveSuccess && (
                  <div
                    style={{
                      padding: '0.625rem 0.875rem',
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      borderRadius: '10px',
                      color: '#34d399',
                      fontSize: '0.8125rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <CheckCircle2 size={15} color="#10b981" />
                    <span>Profile updated successfully!</span>
                  </div>
                )}

                {/* Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.375rem' }}>
                  <motion.button
                    type="submit"
                    disabled={
                      isSavingProfile ||
                      !editName.trim() ||
                      usernameStatus.state === 'checking' ||
                      usernameStatus.state === 'taken' ||
                      usernameStatus.state === 'invalid' ||
                      (editName.trim() === currentName &&
                        editUsername.trim().replace(/^@+/, '').toLowerCase() === currentUsername.toLowerCase())
                    }
                    whileTap={{ scale: 0.98 }}
                    style={{
                      width: '100%',
                      height: 48,
                      borderRadius: '14px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #065DE8 0%, #3897f0 100%)',
                      color: '#ffffff',
                      fontSize: '0.9375rem',
                      fontWeight: 700,
                      cursor:
                        isSavingProfile ||
                        !editName.trim() ||
                        usernameStatus.state === 'checking' ||
                        usernameStatus.state === 'taken' ||
                        usernameStatus.state === 'invalid' ||
                        (editName.trim() === currentName &&
                          editUsername.trim().replace(/^@+/, '').toLowerCase() === currentUsername.toLowerCase())
                          ? 'not-allowed'
                          : 'pointer',
                      opacity:
                        isSavingProfile ||
                        !editName.trim() ||
                        usernameStatus.state === 'checking' ||
                        usernameStatus.state === 'taken' ||
                        usernameStatus.state === 'invalid' ||
                        (editName.trim() === currentName &&
                          editUsername.trim().replace(/^@+/, '').toLowerCase() === currentUsername.toLowerCase())
                          ? 0.55
                          : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 18px rgba(6, 93, 232, 0.35)',
                      transition: 'opacity 0.15s ease',
                    }}
                  >
                    {isSavingProfile ? (
                      <>
                        <Loader2 size={17} className="animate-spin" />
                        <span>Saving Changes...</span>
                      </>
                    ) : (
                      <>
                        <Check size={17} strokeWidth={2.4} />
                        <span>Save Changes</span>
                      </>
                    )}
                  </motion.button>

                  <button
                    type="button"
                    onClick={() => setIsEditProfileOpen(false)}
                    disabled={isSavingProfile}
                    style={{
                      width: '100%',
                      height: 44,
                      borderRadius: '14px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: 'var(--text-secondary)',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      cursor: isSavingProfile ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
