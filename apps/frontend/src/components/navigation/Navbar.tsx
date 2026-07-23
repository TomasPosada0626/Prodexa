'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { Logo } from '@/components/branding/Logo';
import { Container } from '@/components/ui/Container';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { useAuth } from '@/context/auth-context';

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, loading } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the mobile panel automatically when the viewport grows past `lg`,
  // so it can't be left open-but-hidden after a resize.
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)');
    const onChange = () => setMobileOpen(false);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={clsx(
        'sticky top-0 z-40 border-b transition-colors duration-300',
        scrolled || mobileOpen ? 'border-white/10 bg-[#050816]/80 backdrop-blur-xl' : 'border-transparent bg-transparent',
      )}
    >
      <Container className="flex h-20 items-center justify-between">
        <Link href="/" aria-label="Prodexa, ir al inicio" onClick={() => setMobileOpen(false)}>
          <Logo />
        </Link>

        <div className="flex items-center gap-3">
          {!loading && !user && (
            <Link
              href="/login"
              className="hidden text-sm font-medium text-zinc-300 transition-colors hover:text-white sm:inline-block"
            >
              Iniciar sesion
            </Link>
          )}
          <ButtonLink href={user ? '/dashboard' : '/registro'} variant="primary">
            {user ? 'Ir a la app' : 'Empezar gratis'}
          </ButtonLink>

          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-white lg:hidden"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav-panel"
            aria-label={mobileOpen ? 'Cerrar menu' : 'Abrir menu'}
          >
            {mobileOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </Container>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            id="mobile-nav-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden border-t border-white/10 bg-[#050816] lg:hidden"
          >
            <Container className="flex flex-col gap-1 py-4">
              {!loading && !user && (
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/5"
                >
                  Iniciar sesion
                </Link>
              )}
              <div className="px-3 pt-2">
                <ButtonLink href={user ? '/dashboard' : '/registro'} variant="primary" className="w-full justify-center">
                  {user ? 'Ir a la app' : 'Empezar gratis'}
                </ButtonLink>
              </div>
            </Container>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
