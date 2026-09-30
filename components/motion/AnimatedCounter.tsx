'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

type Props = {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
  style?: React.CSSProperties;
  formatFn?: (val: number) => string;
};

export default function AnimatedCounter({
  value,
  duration = 1.3,
  prefix = '',
  suffix = '',
  decimals = 0,
  className,
  style,
  formatFn,
}: Props) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const from = 0;
    const target = Number(value) || 0;
    const obj = { val: from };

    const updateText = (current: number) => {
      if (!el) return;
      const rounded = decimals > 0 ? current : Math.round(current);
      if (formatFn) {
        el.textContent = `${prefix}${formatFn(rounded)}${suffix}`;
      } else {
        el.textContent = `${prefix}${rounded.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${suffix}`;
      }
    };

    updateText(0);

    const tween = gsap.to(obj, {
      val: target,
      duration,
      ease: 'power2.out',
      onUpdate: () => {
        updateText(obj.val);
      },
      onComplete: () => {
        updateText(target);
      },
    });

    return () => {
      tween.kill();
    };
  }, [value, duration, prefix, suffix, decimals, formatFn]);

  const initial = formatFn
    ? `${prefix}${formatFn(0)}${suffix}`
    : `${prefix}0${suffix}`;

  return (
    <span
      ref={ref}
      className={className}
      style={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
        caretColor: 'transparent',
        cursor: 'default',
        ...style,
      }}
      suppressHydrationWarning
    >
      {initial}
    </span>
  );
}
