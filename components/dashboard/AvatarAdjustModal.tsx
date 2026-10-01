'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ZoomIn, ZoomOut, RotateCw, X, Check, RefreshCw } from 'lucide-react';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

type Props = {
  isOpen: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onConfirm: (blob: Blob, dataUrl: string) => void;
};

export default function AvatarAdjustModal({
  isOpen,
  imageSrc,
  onClose,
  onConfirm,
}: Props) {
  useBodyScrollLock(isOpen);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Crop circle diameter in CSS pixels
  const [cropSize, setCropSize] = useState(280);

  // Image natural dimensions
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [isLoaded, setIsLoaded] = useState(false);

  // Transform states
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Drag interaction refs
  const dragStartRef = useRef<{ x: number; y: number; startPanX: number; startPanY: number }>({
    x: 0,
    y: 0,
    startPanX: 0,
    startPanY: 0,
  });

  // Touch pinch-to-zoom ref
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(1);

  // Responsive cropSize calculation
  useEffect(() => {
    const updateSize = () => {
      if (typeof window !== 'undefined') {
        const size = Math.min(300, Math.max(220, window.innerWidth - 64));
        setCropSize(size);
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Reset transforms when imageSrc changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
      setIsLoaded(false);
    }
  }, [isOpen, imageSrc]);

  // Calculate base scale so image fills the crop circle (aspect fill)
  const getBaseScale = useCallback(() => {
    if (!naturalSize.width || !naturalSize.height) return 1;
    const isRotated90 = rotation % 180 !== 0;
    const effectiveWidth = isRotated90 ? naturalSize.height : naturalSize.width;
    const effectiveHeight = isRotated90 ? naturalSize.width : naturalSize.height;

    return Math.max(cropSize / effectiveWidth, cropSize / effectiveHeight);
  }, [cropSize, naturalSize, rotation]);

  // Boundary clamping for pan position so image always covers the circle
  const clampPosition = useCallback(
    (x: number, y: number, currentZoom: number, currentRot: number) => {
      if (!naturalSize.width || !naturalSize.height) return { x: 0, y: 0 };

      const isRotated90 = currentRot % 180 !== 0;
      const effectiveWidth = isRotated90 ? naturalSize.height : naturalSize.width;
      const effectiveHeight = isRotated90 ? naturalSize.width : naturalSize.height;

      const baseScale = Math.max(cropSize / effectiveWidth, cropSize / effectiveHeight);
      const totalScale = baseScale * currentZoom;

      const renderedWidth = effectiveWidth * totalScale;
      const renderedHeight = effectiveHeight * totalScale;

      const maxPanX = Math.max(0, (renderedWidth - cropSize) / 2);
      const maxPanY = Math.max(0, (renderedHeight - cropSize) / 2);

      return {
        x: Math.max(-maxPanX, Math.min(maxPanX, x)),
        y: Math.max(-maxPanY, Math.min(maxPanY, y)),
      };
    },
    [cropSize, naturalSize]
  );

  // When natural size is loaded
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    setIsLoaded(true);
    setPosition({ x: 0, y: 0 });
    setZoom(1);
  };

  // Drag handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startPanX: position.x,
      startPanY: position.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    const rawX = dragStartRef.current.startPanX + dx;
    const rawY = dragStartRef.current.startPanY + dy;

    const clamped = clampPosition(rawX, rawY, zoom, rotation);
    setPosition(clamped);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Zoom change handler with re-clamping
  const handleZoomChange = (newZoom: number) => {
    setZoom(newZoom);
    setPosition((prev) => clampPosition(prev.x, prev.y, newZoom, rotation));
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.0015;
    const nextZoom = Math.min(3, Math.max(1, zoom + delta));
    handleZoomChange(nextZoom);
  };

  // Touch pinch-to-zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchStartDistRef.current = dist;
      pinchStartZoomRef.current = zoom;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStartDistRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / pinchStartDistRef.current;
      const nextZoom = Math.min(3, Math.max(1, pinchStartZoomRef.current * ratio));
      handleZoomChange(nextZoom);
    }
  };

  const handleTouchEnd = () => {
    pinchStartDistRef.current = null;
  };

  // Rotate handler
  const handleRotate = () => {
    const nextRot = (rotation + 90) % 360;
    setRotation(nextRot);
    setPosition({ x: 0, y: 0 });
  };

  // Reset handler
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  // Export cropped image via Canvas on "Done"
  const handleDone = async () => {
    if (!imageRef.current || !naturalSize.width || !naturalSize.height) return;

    const img = imageRef.current;
    const targetSize = 600; // Output square image 600x600 px
    const canvas = document.createElement('canvas');
    canvas.width = targetSize;
    canvas.height = targetSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Smooth image rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const baseScale = getBaseScale();
    const totalScale = baseScale * zoom;

    // Scale factor between screen cropSize and output canvas
    const scaleFactor = targetSize / cropSize;

    ctx.save();

    // Move origin to center of canvas
    ctx.translate(targetSize / 2, targetSize / 2);

    // Apply pan offset
    ctx.translate(position.x * scaleFactor, position.y * scaleFactor);

    // Apply rotation
    ctx.rotate((rotation * Math.PI) / 180);

    // Draw image centered
    const drawWidth = naturalSize.width * totalScale * scaleFactor;
    const drawHeight = naturalSize.height * totalScale * scaleFactor;

    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

    ctx.restore();

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const dataUrl = canvas.toDataURL('image/webp', 0.92);
          onConfirm(blob, dataUrl);
        }
      },
      'image/webp',
      0.92
    );
  };

  const baseScale = getBaseScale();
  const totalScale = baseScale * zoom;

  return (
    <AnimatePresence>
      {isOpen && imageSrc && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 150,
            background: 'rgba(5, 7, 12, 0.96)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 'max(1rem, env(safe-area-inset-top, 1rem)) 1.25rem max(1.25rem, env(safe-area-inset-bottom, 1.25rem))',
            userSelect: 'none',
            overflow: 'hidden',
          }}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Header */}
          <div
            style={{
              width: '100%',
              maxWidth: 480,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              zIndex: 10,
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Cancel"
            >
              <X size={18} />
            </button>

            <div style={{ textAlign: 'center' }}>
              <h3
                style={{
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  letterSpacing: '-0.02em',
                  margin: 0,
                }}
              >
                Move and Scale
              </h3>
              <p
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  margin: '2px 0 0',
                }}
              >
                Drag to adjust circular frame
              </p>
            </div>

            <button
              type="button"
              onClick={handleReset}
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Reset Position"
            >
              <RefreshCw size={16} />
            </button>
          </div>

          {/* Interactive Crop Circle Centerpiece */}
          <div
            ref={containerRef}
            style={{
              position: 'relative',
              width: cropSize,
              height: cropSize,
              margin: 'auto 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Dynamic Photo Ambient Reflection Glow behind Big Circle - Layer 1 (Wide Diffusion) */}
            {imageSrc && (
              <div
                style={{
                  position: 'absolute',
                  inset: -28,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  filter: 'blur(42px) saturate(220%) brightness(1.2)',
                  opacity: 0.8,
                  pointerEvents: 'none',
                  zIndex: 0,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageSrc}
                  alt=""
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: `translate(${position.x * 0.4}px, ${position.y * 0.4}px) rotate(${rotation}deg) scale(${totalScale * 1.3})`,
                    transformOrigin: 'center center',
                    transition: isDragging ? 'none' : 'transform 0.2s ease',
                  }}
                />
              </div>
            )}

            {/* Dynamic Photo Ambient Reflection Glow behind Big Circle - Layer 2 (Chromatic Rim Bloom) */}
            {imageSrc && (
              <div
                style={{
                  position: 'absolute',
                  inset: -10,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  filter: 'blur(18px) saturate(260%) brightness(1.3)',
                  opacity: 0.95,
                  pointerEvents: 'none',
                  zIndex: 0,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageSrc}
                  alt=""
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: `translate(${position.x * 0.8}px, ${position.y * 0.8}px) rotate(${rotation}deg) scale(${totalScale * 1.15})`,
                    transformOrigin: 'center center',
                    transition: isDragging ? 'none' : 'transform 0.2s ease',
                  }}
                />
              </div>
            )}

            {/* Circular Crop Mask Viewport */}
            <div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{
                position: 'relative',
                width: cropSize,
                height: cropSize,
                borderRadius: '50%',
                overflow: 'hidden',
                cursor: isDragging ? 'grabbing' : 'grab',
                touchAction: 'none',
                boxShadow: '0 0 0 9999px rgba(3, 5, 8, 0.78), 0 0 25px rgba(0, 0, 0, 0.8)',
                border: '2.5px solid rgba(255, 255, 255, 0.85)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 5,
              }}
            >
              {/* Underlying Image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Adjust preview"
                crossOrigin="anonymous"
                onLoad={handleImageLoad}
                draggable={false}
                style={{
                  position: 'absolute',
                  transform: `translate(${position.x}px, ${position.y}px) rotate(${rotation}deg) scale(${totalScale})`,
                  transformOrigin: 'center center',
                  maxWidth: 'none',
                  maxHeight: 'none',
                  opacity: isLoaded ? 1 : 0,
                  transition: isDragging ? 'none' : 'opacity 0.2s ease',
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
              />

              {/* Rule of Thirds subtle guidelines when active/dragging */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                  opacity: isDragging ? 0.45 : 0.15,
                  transition: 'opacity 0.2s ease',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '33.33%',
                    left: 0,
                    right: 0,
                    height: 1,
                    background: 'rgba(255, 255, 255, 0.4)',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '66.66%',
                    left: 0,
                    right: 0,
                    height: 1,
                    background: 'rgba(255, 255, 255, 0.4)',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: '33.33%',
                    top: 0,
                    bottom: 0,
                    width: 1,
                    background: 'rgba(255, 255, 255, 0.4)',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: '66.66%',
                    top: 0,
                    bottom: 0,
                    width: 1,
                    background: 'rgba(255, 255, 255, 0.4)',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Bottom Toolbar & Action Bar */}
          <div
            style={{
              width: '100%',
              maxWidth: 440,
              display: 'flex',
              flexDirection: 'column',
              gap: '1.125rem',
              zIndex: 10,
            }}
          >
            {/* Zoom Slider + Rotate Tool */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.875rem',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '0.625rem 1rem',
                borderRadius: '20px',
                backdropFilter: 'blur(16px)',
              }}
            >
              <ZoomOut size={16} color="var(--text-muted)" />
              <input
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={zoom}
                onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                style={{
                  flex: 1,
                  accentColor: '#6366f1',
                  cursor: 'pointer',
                  height: 4,
                }}
              />
              <ZoomIn size={16} color="var(--text-muted)" />

              <div style={{ width: 1, height: 20, background: 'rgba(255, 255, 255, 0.12)', margin: '0 4px' }} />

              <button
                type="button"
                onClick={handleRotate}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                }}
                title="Rotate 90°"
              >
                <RotateCw size={17} />
              </button>
            </div>

            {/* Bottom Actions: Cancel & Done */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1.6fr',
                gap: '0.875rem',
              }}
            >
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '0.875rem 1.25rem',
                  borderRadius: '16px',
                  background: 'rgba(255, 255, 255, 0.07)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDone}
                style={{
                  padding: '0.875rem 1.25rem',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '0.9375rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 8px 24px rgba(99, 102, 241, 0.45)',
                  transition: 'all 0.15s ease',
                }}
              >
                <Check size={18} />
                Done
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
