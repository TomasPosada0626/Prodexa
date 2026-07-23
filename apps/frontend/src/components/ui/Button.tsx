'use client';

import clsx from 'clsx';
import { motion, type HTMLMotionProps } from 'framer-motion';
import type { ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'ghost';

/** Shared class builder so Button (native <button>) and ButtonLink (Next <Link>) render identically. */
export function buttonClasses(variant: ButtonVariant = 'primary'): string {
  if (variant === 'ghost') {
    return 'inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white transition-colors hover:border-white/30 hover:bg-white/5';
  }
  return 'inline-flex items-center gap-2 rounded-full bg-[image:var(--brand-gradient)] p-[1.5px] shadow-[0_0_24px_-6px_rgba(139,92,246,0.55)] transition-shadow hover:shadow-[0_0_32px_-4px_rgba(139,92,246,0.75)]';
}

export const PRIMARY_INNER_CLASSES =
  'inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#050816] px-6 py-3 text-sm font-semibold text-white';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: ButtonVariant;
  children?: ReactNode;
}

export function Button({ variant = 'primary', className, children, ...props }: ButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={clsx(buttonClasses(variant), className)}
      {...props}
    >
      {variant === 'primary' ? <span className={PRIMARY_INNER_CLASSES}>{children}</span> : children}
    </motion.button>
  );
}
