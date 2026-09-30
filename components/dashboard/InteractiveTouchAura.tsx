'use client';

import { useEffect, useRef } from 'react';

type Props = {
  netPosition: number;
};

interface TouchAura {
  x: number;
  y: number;
  startTime: number;
  maxRadius: number;
  colorRgb: string;
}

export default function InteractiveTouchAura({ netPosition }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const aurasRef = useRef<TouchAura[]>([]);
  const isRunningRef = useRef(false);
  const lastTouchRef = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });

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

        const grad = ctx.createRadialGradient(
          aura.x,
          aura.y,
          0,
          aura.x,
          aura.y,
          currentRadius
        );
        grad.addColorStop(0, `rgba(${aura.colorRgb}, ${alpha})`);
        grad.addColorStop(0.4, `rgba(${aura.colorRgb}, ${alpha * 0.55})`);
        grad.addColorStop(0.75, `rgba(${aura.colorRgb}, ${alpha * 0.16})`);
        grad.addColorStop(1, `rgba(${aura.colorRgb}, 0)`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(aura.x, aura.y, currentRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      requestAnimationFrame(render);
    };

    // Strict single-coat logic:
    // If user taps in the same area (< 42px), refresh the existing aura's timer instead of adding a second coat!
    const addOrUpdateAura = (x: number, y: number) => {
      const now = performance.now();
      const existingIndex = aurasRef.current.findIndex(
        (a) => Math.hypot(a.x - x, a.y - y) < 42
      );

      if (existingIndex !== -1) {
        // Refresh timer and position for single coat — NEVER stacks or gets darker!
        aurasRef.current[existingIndex].x = x;
        aurasRef.current[existingIndex].y = y;
        aurasRef.current[existingIndex].startTime = now;
        startAnimation();
        return;
      }

      // Allow up to 20 active compact auras across the screen for 15s persistence
      if (aurasRef.current.length >= 20) {
        aurasRef.current.shift();
      }

      aurasRef.current.push({
        x,
        y,
        startTime: now,
        maxRadius: Math.random() * 8 + 32, // 32px - 40px expansion
        colorRgb,
      });
      startAnimation();
    };

    // 1. Pointer Down (single tap or click)
    const onPointerDown = (e: PointerEvent) => {
      lastTouchRef.current = { x: e.clientX, y: e.clientY, time: performance.now() };
      addOrUpdateAura(e.clientX, e.clientY);
    };

    // 2. Pointer Move / Drag / Swipe
    const onPointerMove = (e: PointerEvent) => {
      if (e.buttons > 0 || e.pointerType === 'touch') {
        const dx = e.clientX - lastTouchRef.current.x;
        const dy = e.clientY - lastTouchRef.current.y;
        const dist = Math.hypot(dx, dy);

        // Spawn along movement path if moved > 25px
        if (dist > 25) {
          lastTouchRef.current = { x: e.clientX, y: e.clientY, time: performance.now() };
          addOrUpdateAura(e.clientX, e.clientY);
        }
      } else {
        lastTouchRef.current.x = e.clientX;
        lastTouchRef.current.y = e.clientY;
      }
    };

    // 3. Scroll / Wheel Interaction
    const onWheel = (e: WheelEvent) => {
      const now = performance.now();
      if (now - lastTouchRef.current.time > 200) {
        lastTouchRef.current.time = now;
        const x = lastTouchRef.current.x || window.innerWidth / 2;
        const y = lastTouchRef.current.y || window.innerHeight / 2;
        addOrUpdateAura(x, y);
      }
    };

    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('wheel', onWheel, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('wheel', onWheel);
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
