'use client';

import { useEffect, useRef } from 'react';

type Props = {
  netPosition: number;
};

interface TouchAura {
  pageX: number;
  pageY: number;
  startTime: number;
  maxRadius: number;
  colorRgb: string;
}

export default function InteractiveTouchAura({ netPosition }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const aurasRef = useRef<TouchAura[]>([]);
  const isRunningRef = useRef(false);
  const lastTouchRef = useRef<{ pageX: number; pageY: number; time: number }>({ pageX: 0, pageY: 0, time: 0 });

  const isPositive = netPosition > 0;
  const isNegative = netPosition < 0;

  // Soft, muted, desaturated status colors (gentle ambient blush, never stark or highlighted)
  const colorRgb = isPositive
    ? '50, 160, 125'  // Soft muted sage/mineral green
    : isNegative
    ? '200, 100, 118' // Soft muted dusty rose
    : '125, 135, 200'; // Soft muted slate periwinkle

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI displays
    const handleResize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (aurasRef.current.length > 0) {
        startAnimation();
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const startAnimation = () => {
      if (isRunningRef.current) return;
      isRunningRef.current = true;
      requestAnimationFrame(render);
    };

    const render = (time: number) => {
      const auras = aurasRef.current;
      if (auras.length === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        isRunningRef.current = false;
        return;
      }

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      const DURATION = 15000; // 15 seconds duration
      const scrollX = window.scrollX || window.pageXOffset || 0;
      const scrollY = window.scrollY || window.pageYOffset || 0;

      for (let i = auras.length - 1; i >= 0; i--) {
        const aura = auras[i];
        const elapsed = time - aura.startTime;

        // Stays on screen for exactly 15 seconds (15000ms)
        if (elapsed >= DURATION) {
          auras.splice(i, 1);
          continue;
        }

        const progress = elapsed / DURATION; // 0 to 1 over 15 seconds
        // Soft, muted alpha (peak 0.16) — never stark or overly highlighted
        const fadeProgress = progress < 0.67 ? 0 : (progress - 0.67) / 0.33;
        const alpha = (1 - fadeProgress) * 0.16;
        // Expands smoothly in first 0.8s to full size and then stays steady
        const expandFactor = Math.min(1, elapsed / 800);
        // Compact, slim fingertip touch size (radius ~36-42px, diameter ~75-85px)
        const currentRadius = 14 + aura.maxRadius * Math.sin(expandFactor * Math.PI * 0.5) * 0.7;

        // Calculate screen viewport position relative to page scroll
        const screenX = aura.pageX - scrollX;
        const screenY = aura.pageY - scrollY;

        // Skip rendering if scrolled completely out of viewport bounds
        if (
          screenX + currentRadius < -60 ||
          screenX - currentRadius > window.innerWidth + 60 ||
          screenY + currentRadius < -60 ||
          screenY - currentRadius > window.innerHeight + 60
        ) {
          continue;
        }

        const grad = ctx.createRadialGradient(
          screenX,
          screenY,
          0,
          screenX,
          screenY,
          currentRadius
        );
        grad.addColorStop(0, `rgba(${aura.colorRgb}, ${alpha})`);
        grad.addColorStop(0.4, `rgba(${aura.colorRgb}, ${alpha * 0.55})`);
        grad.addColorStop(0.75, `rgba(${aura.colorRgb}, ${alpha * 0.16})`);
        grad.addColorStop(1, `rgba(${aura.colorRgb}, 0)`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(screenX, screenY, currentRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      requestAnimationFrame(render);
    };

    // Strict single-coat logic with fixed document coordinates:
    // If user taps in the same area on the page (< 42px), refresh the existing aura's timer instead of adding a second coat!
    const addOrUpdateAura = (clientX: number, clientY: number) => {
      const scrollX = window.scrollX || window.pageXOffset || 0;
      const scrollY = window.scrollY || window.pageYOffset || 0;
      const pageX = clientX + scrollX;
      const pageY = clientY + scrollY;
      const now = performance.now();

      const existingIndex = aurasRef.current.findIndex(
        (a) => Math.hypot(a.pageX - pageX, a.pageY - pageY) < 42
      );

      if (existingIndex !== -1) {
        // Refresh timer and position for single coat — NEVER stacks or gets darker!
        aurasRef.current[existingIndex].pageX = pageX;
        aurasRef.current[existingIndex].pageY = pageY;
        aurasRef.current[existingIndex].startTime = now;
        startAnimation();
        return;
      }

      // Allow up to 20 active compact auras across the page for 15s persistence
      if (aurasRef.current.length >= 20) {
        aurasRef.current.shift();
      }

      aurasRef.current.push({
        pageX,
        pageY,
        startTime: now,
        maxRadius: Math.random() * 8 + 32, // 32px - 40px expansion
        colorRgb,
      });
      startAnimation();
    };

    // 1. Pointer Down (single tap or click)
    const onPointerDown = (e: PointerEvent) => {
      // Do not create residual background auras on text inputs, drawers, or the floating action button
      if ((e.target as HTMLElement)?.closest('input, textarea, select, .add-connection-fab, .profile-drawer-sheet')) {
        return;
      }
      const scrollX = window.scrollX || window.pageXOffset || 0;
      const scrollY = window.scrollY || window.pageYOffset || 0;
      lastTouchRef.current = { pageX: e.clientX + scrollX, pageY: e.clientY + scrollY, time: performance.now() };
      addOrUpdateAura(e.clientX, e.clientY);
    };

    // 2. Pointer Move / Drag / Swipe
    const onPointerMove = (e: PointerEvent) => {
      if ((e.target as HTMLElement)?.closest('input, textarea, select, .add-connection-fab, .profile-drawer-sheet')) {
        return;
      }
      const scrollX = window.scrollX || window.pageXOffset || 0;
      const scrollY = window.scrollY || window.pageYOffset || 0;
      const currentTouchX = e.clientX + scrollX;
      const currentTouchY = e.clientY + scrollY;

      if (e.buttons > 0 || e.pointerType === 'touch') {
        const dx = currentTouchX - lastTouchRef.current.pageX;
        const dy = currentTouchY - lastTouchRef.current.pageY;
        const dist = Math.hypot(dx, dy);

        // Spawn along movement path if moved > 25px
        if (dist > 25) {
          lastTouchRef.current = { pageX: currentTouchX, pageY: currentTouchY, time: performance.now() };
          addOrUpdateAura(e.clientX, e.clientY);
        }
      } else {
        lastTouchRef.current.pageX = currentTouchX;
        lastTouchRef.current.pageY = currentTouchY;
      }
    };

    // 3. Scroll Listener:
    // When the user scrolls, start animation so auras immediately move up and down with the page smoothly
    const onScroll = () => {
      if (aurasRef.current.length > 0) {
        startAnimation();
      }
    };

    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('scroll', onScroll);
    };
  }, [colorRgb]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 15, // in front of cards (zIndex 10) so touch aura is visible on cards, behind sticky topbar (zIndex 40)
      }}
    />
  );
}
