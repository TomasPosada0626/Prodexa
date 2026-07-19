import Link from 'next/link';
import { PropsWithChildren } from 'react';

const links = [
  { href: '/', label: 'Inicio' },
  { href: '/formulaciones', label: 'Formulaciones' },
  { href: '/simulador', label: 'Simulador' },
];

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#e6f4ff,transparent_50%),linear-gradient(#f7fbff,#eef5fb)] text-slate-900">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">Prodexa</p>
            <h1 className="text-lg font-bold sm:text-xl">Gestion de formulaciones y costos</h1>
          </div>
          <nav className="flex flex-wrap gap-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-sky-500 hover:text-sky-700"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
