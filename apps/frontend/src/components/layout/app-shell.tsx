'use client';

import { PropsWithChildren, useState } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { ProfileMenu } from './ProfileMenu';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export function AppShell({ children }: PropsWithChildren) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-white dark:bg-[#050816]">
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-4 sm:px-6 dark:border-white/10">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden dark:text-zinc-300 dark:hover:bg-white/5"
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>
          <div className="flex flex-1 items-center justify-end gap-4">
            <ThemeToggle />
            <div className="h-6 w-px bg-slate-200 dark:bg-white/10" aria-hidden />
            <ProfileMenu />
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden px-4 py-6 text-slate-900 sm:px-6 lg:px-8 dark:text-zinc-100">
          {children}
        </main>
      </div>
    </div>
  );
}
