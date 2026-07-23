import clsx from 'clsx';

interface SkeletonProps {
  className?: string;
}

/** Bloque con animación de pulso para reemplazar el texto "Cargando..." en tablas y tarjetas. */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={clsx('animate-pulse rounded-md bg-slate-200 dark:bg-white/10', className)}
    />
  );
}
