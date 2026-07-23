'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/context/theme-context';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      onClick={toggleTheme}
      className="relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border border-slate-300 bg-slate-100 transition-colors dark:border-white/10 dark:bg-white/5"
    >
      <span
        className={`absolute left-1 grid h-6 w-6 place-items-center rounded-full bg-white text-slate-500 shadow transition-transform duration-200 dark:bg-[#0b0a16] dark:text-[#8B5CF6] ${
          isDark ? 'translate-x-6' : 'translate-x-0'
        }`}
      >
        {isDark ? <Moon className="h-3.5 w-3.5" aria-hidden /> : <Sun className="h-3.5 w-3.5" aria-hidden />}
      </span>
    </button>
  );
}
