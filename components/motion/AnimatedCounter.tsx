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

    const from = prevValue.current;
    const to = value;
    prevValue.current = value;

    const obj = { val: from };

    gsap.to(obj, {
      val: to,
      duration,
      ease: 'power3.out',
      onUpdate: () => {
        if (!el) return;
        const current = obj.val;
        if (formatFn) {
          el.textContent = `${prefix}${formatFn(current)}${suffix}`;
        } else {
          el.textContent = `${prefix}${current.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${suffix}`;
        }
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
