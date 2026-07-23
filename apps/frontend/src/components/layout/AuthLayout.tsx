import Image from 'next/image';
import Link from 'next/link';
import type { PropsWithChildren } from 'react';
import { Logo } from '@/components/branding/Logo';

/** Shared shell for /login and /registro: same hero background, minimal header. */
export function AuthLayout({ children }: PropsWithChildren) {
  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-[#050816] text-white">
      <div className="absolute inset-0 -z-10" aria-hidden>
        <Image src="/images/hero-background.png" alt="" fill priority className="object-cover object-center opacity-50" />
        <div className="absolute inset-0 bg-[#050816]/75" />
      </div>

      <header>
        <div className="mx-auto flex w-full max-w-7xl items-center px-6 py-6 lg:px-8">
          <Link href="/" aria-label="Prodexa, ir al inicio">
            <Logo />
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-6 pb-16 pt-6">{children}</main>
    </div>
  );
}
