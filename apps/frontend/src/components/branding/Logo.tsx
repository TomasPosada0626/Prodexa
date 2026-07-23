import clsx from 'clsx';

interface LogoProps {
  className?: string;
}

/** Small crisp wordmark for the navbar/footer — a stroked "P" hook, not the particle field. */
export function Logo({ className }: LogoProps) {
  return (
    <span className={clsx('flex items-center gap-2', className)}>
      <svg viewBox="0 0 64 64" className="h-7 w-7 shrink-0" aria-hidden focusable="false">
        <defs>
          <linearGradient id="prodexa-logomark-gradient" x1="5%" y1="95%" x2="95%" y2="5%">
            <stop offset="0%" stopColor="#00B8FF" />
            <stop offset="50%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#D946EF" />
          </linearGradient>
        </defs>
        <path
          d="M16,54 L22,16 L36,16 A13,13 0 1 1 36,42 L22,42"
          stroke="url(#prodexa-logomark-gradient)"
          strokeWidth={11}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      <span className="font-heading text-lg font-extrabold tracking-tight text-white">PRODEXA</span>
    </span>
  );
}
