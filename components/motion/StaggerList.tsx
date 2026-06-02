'use client';

import { motion, type Variants } from 'framer-motion';
import { ReactNode } from 'react';

type Props = {
  children: ReactNode[];
  delay?: number;
  stagger?: number;
  className?: string;
  style?: React.CSSProperties;
};

const containerVariants = {
  hidden: {},
  visible: (stagger: number) => ({
    transition: {
      staggerChildren: stagger,
    },
  }),
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.45,
      ease: 'easeOut',
    },
  },
};

export default function StaggerList({
  children,
  delay = 0,
  stagger = 0.07,
  className,
  style,
}: Props) {
  return (
    <motion.div
      variants={containerVariants}
      custom={stagger}
      initial="hidden"
      animate="visible"
      transition={{ delayChildren: delay }}
      className={className}
      style={style}
    >
      {children.map((child, i) => (
        <motion.div key={i} variants={itemVariants}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}

// Single item variant export
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
};
