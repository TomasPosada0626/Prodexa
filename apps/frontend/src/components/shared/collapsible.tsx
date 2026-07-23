'use client';

import { useState, type PropsWithChildren } from 'react';
import { ChevronRight } from 'lucide-react';

interface Props extends PropsWithChildren {
  title: string;
  defaultOpen?: boolean;
}

/** Toggle propio (no <details> nativo) para que el look sea consistente con el resto de la app. */
export function Collapsible({ title, defaultOpen = false, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mt-3 border-t border-slate-100 pt-3 dark:border-white/10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 text-sm font-medium text-slate-800 dark:text-zinc-200"
      >
        <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} aria-hidden />
        {title}
      </button>
      {open && <div className="mt-2 pl-6">{children}</div>}
    </div>
  );
}
