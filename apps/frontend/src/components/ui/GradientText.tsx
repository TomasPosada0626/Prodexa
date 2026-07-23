import type { PropsWithChildren } from 'react';
import clsx from 'clsx';

interface GradientTextProps {
  className?: string;
}

export function GradientText({ children, className }: PropsWithChildren<GradientTextProps>) {
  return (
    <span className={clsx('bg-[image:var(--brand-gradient)] bg-clip-text text-transparent', className)}>
      {children}
    </span>
  );
}
