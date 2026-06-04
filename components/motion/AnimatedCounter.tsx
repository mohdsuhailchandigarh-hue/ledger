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
  duration = 1.2,
  prefix = '',
  suffix = '',
  decimals = 0,
  className,
  style,
  formatFn,
}: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const prevValue = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Check if this is the initial mount/render of the DOM node
    // to ensure the counter always animates from 0 when the page loads
    const isFirstMount = !el.getAttribute('data-mounted');
    el.setAttribute('data-mounted', 'true');

    const from = isFirstMount ? 0 : prevValue.current;
    const to = value;
    prevValue.current = value;

    const obj = { val: from };

    // Explicitly set the text content to the starting value immediately
    // to prevent any flashing of the final value before the animation starts
    const updateText = (current: number) => {
      if (!el) return;
      if (formatFn) {
        el.textContent = `${prefix}${formatFn(current)}${suffix}`;
      } else {
        el.textContent = `${prefix}${current.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${suffix}`;
      }
    };

    updateText(from);

    gsap.to(obj, {
      val: to,
      duration,
      ease: 'power3.out',
      onUpdate: () => {
        updateText(obj.val);
      },
    });

    return () => {
      gsap.killTweensOf(obj);
    };
  }, [value, duration, prefix, suffix, decimals, formatFn]);

  const initial = formatFn
    ? `${prefix}${formatFn(value)}${suffix}`
    : `${prefix}${value.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${suffix}`;

  return (
    <span ref={ref} className={className} style={style}>
      {initial}
    </span>
  );
}
