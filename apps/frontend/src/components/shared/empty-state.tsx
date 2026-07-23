interface Props {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}

export function EmptyState({ title, description, actionLabel, actionHref }: Props) {
  return (
    <div className="grid place-items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-10 text-center dark:border-white/10 dark:bg-white/3">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-sky-50 text-sky-600 dark:bg-[#8B5CF6]/10 dark:text-[#a78bfa]">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-6 w-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 2h6M10 2v6.5L4.6 18a2 2 0 0 0 1.7 3h11.4a2 2 0 0 0 1.7-3L14 8.5V2" />
        </svg>
      </div>
      <h4 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h4>
      <p className="max-w-sm text-sm text-slate-600 dark:text-zinc-400">{description}</p>
      {actionLabel && actionHref && (
        <a
          href={actionHref}
          className="mt-1 rounded-full bg-sky-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-800 dark:bg-[#8B5CF6] dark:hover:bg-[#7c3aed]"
        >
          {actionLabel}
        </a>
      )}
    </div>
  );
}
