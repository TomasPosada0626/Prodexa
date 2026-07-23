'use client';

import { Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { PrepararForm, type PrepararInitialValues } from '@/components/preparar/preparar-form';
import { Skeleton } from '@/components/ui/Skeleton';
import { UnidadPresentacion } from '@/lib/api';
import { useFormulations } from '@/lib/use-formulations';

const UNIDADES_VALIDAS: UnidadPresentacion[] = ['ml', 'L', 'g', 'kg'];

function initialValuesFromParams(searchParams: URLSearchParams): PrepararInitialValues | undefined {
  const formulationId = searchParams.get('formulationId');
  if (!formulationId) return undefined;

  const unidad = searchParams.get('unidadPresentacion');
  return {
    formulationId,
    cantidadObjetivoKg: searchParams.get('cantidadObjetivoKg') ?? undefined,
    tamanoPresentacion: searchParams.get('tamanoPresentacion') ?? undefined,
    unidadPresentacion: UNIDADES_VALIDAS.find((u) => u === unidad),
    costoEmpaque: searchParams.get('costoEmpaque') ?? undefined,
    costoEtiqueta: searchParams.get('costoEtiqueta') ?? undefined,
    costoTransporte: searchParams.get('costoTransporte') ?? undefined,
    costoMermas: searchParams.get('costoMermas') ?? undefined,
  };
}

function PrepararContent() {
  const { formulaciones, loading, error } = useFormulations();
  const searchParams = useSearchParams();
  const initial = useMemo(() => initialValuesFromParams(searchParams), [searchParams]);

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

      {!loading && !error && <PrepararForm formulaciones={formulaciones} initial={initial} />}
    </section>
  );
}

export default function PrepararPage() {
  return (
    <Suspense fallback={null}>
      <PrepararContent />
    </Suspense>
  );
}
