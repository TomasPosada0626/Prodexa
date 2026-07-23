'use client';

import { PrepararForm } from '@/components/preparar/preparar-form';
import { Skeleton } from '@/components/ui/Skeleton';
import { useFormulations } from '@/lib/use-formulations';

export default function PrepararPage() {
  const { formulaciones, loading, error } = useFormulations();

  return (
    <section className="grid gap-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Preparar</h2>
        <p className="mt-1 text-slate-600 dark:text-zinc-400">
          Selecciona una formulacion y la cantidad que vas a producir para obtener las cantidades exactas de cada
          ingrediente.
        </p>
      </div>

      {loading && (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,320px)_1fr]">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
      )}

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </p>
      )}

      {!loading && !error && <PrepararForm formulaciones={formulaciones} />}
    </section>
  );
}
