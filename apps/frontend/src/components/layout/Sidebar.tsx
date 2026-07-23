'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import clsx from 'clsx';
import {
  BarChart3,
  ChevronsLeft,
  FileText,
  FlaskConical,
  History,
  Layers,
  LayoutDashboard,
  LineChart,
  Settings,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { SidebarLogo } from '@/components/branding/SidebarLogo';
import { useAuth } from '@/context/auth-context';

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  comingSoon?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Inicio', icon: LayoutDashboard },
  { href: '/formulaciones', label: 'Formulaciones', icon: FlaskConical },
  { href: '/preparar', label: 'Produccion', icon: Layers },
  { href: '/costos', label: 'Costos', icon: LineChart },
  { href: '/analisis', label: 'Analisis', icon: BarChart3 },
  { href: '/calidad', label: 'Calidad', icon: ShieldCheck },
  { href: '/proveedores', label: 'Proveedores', icon: Truck },
  { href: '/reportes', label: 'Reportes', icon: FileText },
  { href: '/configuracion', label: 'Configuracion', icon: Settings },
];

const NAV_ITEM_AUDITORIA: NavItem = { href: '/auditoria', label: 'Auditoria', icon: History };

const STORAGE_KEY = 'prodexa-sidebar-collapsed';

interface Props {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ mobileOpen, onCloseMobile }: Props) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY) === '1',
  );
  const navItems = user?.rol === 'ADMIN' ? [...NAV_ITEMS, NAV_ITEM_AUDITORIA] : NAV_ITEMS;

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      return next;
    });
  }

  return (
    <>
      {mobileOpen && (
        <div
          aria-hidden
          onClick={onCloseMobile}
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
        />
      )}

      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-40 flex h-screen w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 dark:border-white/10 dark:bg-[#0b0a16]',
          'lg:sticky lg:top-0 lg:translate-x-0 lg:transition-[width]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          collapsed ? 'lg:w-19' : 'lg:w-64',
        )}
      >
        <div
          className={clsx(
            'flex h-16 shrink-0 items-center border-b border-slate-100 px-4 dark:border-white/10',
            collapsed && 'lg:justify-center lg:px-0',
          )}
        >
          {collapsed ? (
            <>
              <Link href="/dashboard" aria-label="Prodexa, ir al inicio" className="hidden lg:block">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-(image:--brand-gradient) font-heading text-sm font-bold text-white">
                  P
                </span>
              </Link>
              <Link href="/dashboard" aria-label="Prodexa, ir al inicio" className="lg:hidden">
                <SidebarLogo />
              </Link>
            </>
          ) : (
            <Link href="/dashboard" aria-label="Prodexa, ir al inicio">
              <SidebarLogo />
            </Link>
          )}
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3" aria-label="Navegacion principal">
          {navItems.map((item) => {
            const isActive = !item.comingSoon && pathname?.startsWith(item.href);

            if (item.comingSoon) {
              return (
                <span
                  key={item.label}
                  title="Proximamente"
                  className={clsx(
                    'flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 dark:text-zinc-400',
                    collapsed && 'lg:justify-center lg:px-0',
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" aria-hidden />
                  <span className={clsx('flex flex-1 items-center justify-between', collapsed && 'lg:hidden')}>
                    {item.label}
                    <span className="rounded-full bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-slate-600 dark:bg-white/5 dark:text-zinc-300">
                      Pronto
                    </span>
                  </span>
                </span>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                title={collapsed ? item.label : undefined}
                className={clsx(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  collapsed && 'lg:justify-center lg:px-0',
                  isActive
                    ? 'bg-[#8B5CF6]/10 text-[#6D28D9] dark:bg-[#8B5CF6]/15 dark:text-[#a78bfa]'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-100',
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" aria-hidden />
                <span className={clsx(collapsed && 'lg:hidden')}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="hidden border-t border-slate-100 p-3 dark:border-white/10 lg:block">
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expandir menu' : 'Colapsar menu'}
            className={clsx(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-200',
              collapsed && 'justify-center px-0',
            )}
          >
            <ChevronsLeft className={clsx('h-5 w-5 shrink-0 transition-transform', collapsed && 'rotate-180')} aria-hidden />
            {!collapsed && 'Colapsar'}
          </button>
        </div>
      </aside>
    </>
  );
}
