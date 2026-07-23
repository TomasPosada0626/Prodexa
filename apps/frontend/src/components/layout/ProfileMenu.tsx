'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { ChevronDown, KeyRound, LogOut, UserRound } from 'lucide-react';
import { useAuth } from '@/context/auth-context';

interface MenuItem {
  label: string;
  icon: typeof UserRound;
}

const MENU_ITEMS: MenuItem[] = [
  { label: 'Editar perfil', icon: UserRound },
  { label: 'Cambiar contrasena', icon: KeyRound },
];

export function ProfileMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      router.replace('/login');
    } finally {
      setLoggingOut(false);
    }
  }

  const displayName = user?.nombre || user?.email?.split('@')[0] || 'Usuario';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-full border border-transparent py-1 pl-1 pr-2 transition-colors hover:border-slate-200 dark:hover:border-white/10"
      >
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-(image:--brand-gradient) text-sm font-semibold text-white">
          {initial}
        </div>
        <span className="hidden text-sm font-medium text-slate-700 sm:inline dark:text-zinc-200">{displayName}</span>
        <ChevronDown
          className={clsx('h-4 w-4 text-slate-400 transition-transform dark:text-zinc-500', open && 'rotate-180')}
          aria-hidden
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-20 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl shadow-slate-900/10 dark:border-white/10 dark:bg-[#0b0a16] dark:shadow-black/60"
        >
          <div className="border-b border-slate-100 px-3 py-2.5 dark:border-white/10">
            <p className="truncate text-sm font-semibold text-slate-800 dark:text-zinc-100">{displayName}</p>
            <p className="truncate text-xs text-slate-500 dark:text-zinc-500">{user?.email}</p>
          </div>

          <div className="py-1">
            {MENU_ITEMS.map((item) => (
              <Link
                key={item.label}
                href="/configuracion"
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-600 transition-colors hover:bg-slate-50 dark:text-zinc-300 dark:hover:bg-white/5"
              >
                <item.icon className="h-4 w-4" aria-hidden />
                {item.label}
              </Link>
            ))}
          </div>

          <div className="border-t border-slate-100 py-1 dark:border-white/10">
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              {loggingOut ? 'Cerrando sesion...' : 'Cerrar sesion'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
