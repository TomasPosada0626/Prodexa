import type { HTMLAttributes, PropsWithChildren } from 'react';
import clsx from 'clsx';

type ContainerProps = HTMLAttributes<HTMLDivElement>;

export function Container({ children, className, ...props }: PropsWithChildren<ContainerProps>) {
  return (
    <div className={clsx('mx-auto w-full max-w-7xl px-6 lg:px-8', className)} {...props}>
      {children}
    </div>
  );
}
