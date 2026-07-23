'use client';

import { RentabilidadResumen } from '@/components/costos/rentabilidad-resumen';
import { CostosForm } from '@/components/costos/costos-form';
import { Skeleton } from '@/components/ui/Skeleton';
import { useFormulations } from '@/lib/use-formulations';

export default function CostosPage() {
  const { formulaciones, loading, error, refetch } = useFormulations();

  return (
    <section className="grid gap-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Costos y rentabilidad</h2>
        <p className="mt-1 text-slate-600 dark:text-zinc-400">
          Consulta la utilidad de cada formulacion y analiza el costo de producir una cantidad especifica, con
          descuentos opcionales.
        </p>
      </div>

      {loading && (
        <div className="grid gap-6">
          <Skeleton className="h-32" />
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </p>
      )}

      {!loading && !error && formulaciones.length === 0 && (
        <p className="rounded-xl border border-slate-200 bg-white p-4 text-slate-600 dark:border-white/10 dark:bg-white/3 dark:text-zinc-400">
          Todavia no hay formulaciones creadas. Crea una en la seccion Formulaciones.
        </p>
      )}

      {!loading && !error && formulaciones.length > 0 && (
        <>
          <RentabilidadResumen formulaciones={formulaciones} />
          <CostosForm formulaciones={formulaciones} onFormulationUpdated={refetch} />
        </>
      )}
    </section>
  );
}
