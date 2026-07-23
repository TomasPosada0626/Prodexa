'use client';

import { motion, type Variants } from 'framer-motion';
import type { PropsWithChildren } from 'react';

const variants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

interface RevealOnLoadProps {
  delay?: number;
  className?: string;
}

/**
 * A one-time fade + slide-up on mount. Deliberately not scroll-triggered and
 * not looping — subtle entrance polish, not continuous motion.
 */
export function RevealOnLoad({ children, delay = 0, className }: PropsWithChildren<RevealOnLoadProps>) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={variants}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
