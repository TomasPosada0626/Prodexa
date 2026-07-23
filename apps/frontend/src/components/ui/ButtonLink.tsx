'use client';

import Link from 'next/link';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import type { PropsWithChildren } from 'react';
import { buttonClasses, PRIMARY_INNER_CLASSES, type ButtonVariant } from './Button';

interface ButtonLinkProps {
  href: string;
  variant?: ButtonVariant;
  className?: string;
  'aria-label'?: string;
}

export function ButtonLink({
  href,
  variant = 'primary',
  className,
  children,
  ...rest
}: PropsWithChildren<ButtonLinkProps>) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="inline-block"
    >
      <Link href={href} className={clsx(buttonClasses(variant), className)} {...rest}>
        {variant === 'primary' ? <span className={PRIMARY_INNER_CLASSES}>{children}</span> : children}
      </Link>
    </motion.div>
  );
}
