'use client';

import { useState } from 'react';
import { FormulacionForm } from '@/components/formulaciones/formulacion-form';
import { FormulacionCard } from '@/components/formulaciones/formulacion-card';
import { EmptyState } from '@/components/shared/empty-state';
import { Skeleton } from '@/components/ui/Skeleton';
import { useFormulations } from '@/lib/use-formulations';
import { useAuth } from '@/context/auth-context';

export default function FormulacionesPage() {
  const [mostrarArchivadas, setMostrarArchivadas] = useState(false);
  const { formulaciones, loading, error, refetch } = useFormulations(mostrarArchivadas);
  const { user } = useAuth();
  const puedeEditar = user?.rol === 'ADMIN' || user?.rol === 'COORDINADOR';
  const [busqueda, setBusqueda] = useState('');

  const termino = busqueda.trim().toLowerCase();
  const formulacionesFiltradas = termino
    ? formulaciones.filter(
        (f) =>
          f.nombreProducto.toLowerCase().includes(termino) ||
          (f.categoria ?? '').toLowerCase().includes(termino),
      )
    : formulaciones;

  const totalCategorias = new Set(formulaciones.map((f) => f.categoria).filter(Boolean)).size;
  const margenPromedio = formulaciones.length
    ? formulaciones.reduce((total, f) => total + Number(f.margenPorcentaje), 0) / formulaciones.length
    : 0;
  const totalIngredientes = formulaciones.reduce((total, f) => total + f.ingredientes.length, 0);

  return (
    <section className="grid gap-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Formulaciones</h2>
        <p className="mt-1 text-slate-600 dark:text-zinc-400">
          Crea formulaciones con su lista de ingredientes y preparacion.
        </p>
      </div>

      {!loading && !error && formulaciones.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/3 dark:shadow-none">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
              Formulaciones
            </p>
            <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">{formulaciones.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/3 dark:shadow-none">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
              Categorias distintas
            </p>
            <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">{totalCategorias}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/3 dark:shadow-none">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
              Margen promedio
            </p>
            <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">
              {margenPromedio.toFixed(1)}%{' '}
              <span className="text-sm font-normal text-slate-500 dark:text-zinc-400">
                · {totalIngredientes} ingredientes en total
              </span>
            </p>
          </div>
        </div>
      )}

      {puedeEditar ? (
        <div id="crear-formulacion">
          <FormulacionForm onSaved={refetch} />
        </div>
      ) : (
        <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-white/10 dark:bg-white/3 dark:text-zinc-400">
          Tu rol (miembro) solo permite ver las formulaciones. Pidele a un administrador o coordinador que cree o
          edite formulas.
        </p>
      )}

      <div className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-zinc-200">
            Formulaciones registradas ({formulacionesFiltradas.length}
            {termino ? ` de ${formulaciones.length}` : ''})
          </h3>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-zinc-400">
              <input
                type="checkbox"
                checked={mostrarArchivadas}
                onChange={(e) => setMostrarArchivadas(e.target.checked)}
              />
              Mostrar archivadas
            </label>
            {formulaciones.length > 0 && (
              <input
                type="search"
                placeholder="Buscar por nombre o categoria..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-zinc-500"
                aria-label="Buscar formulaciones"
              />
            )}
          </div>
        </div>

        {loading && (
          <div className="grid gap-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        )}

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
            {error}
          </p>
        )}

        {!loading && !error && formulaciones.length === 0 && (
          <EmptyState
            title={puedeEditar ? 'Crea tu primera formulacion' : 'Aun no hay formulaciones'}
            description={
              puedeEditar
                ? 'Aun no tienes formulaciones registradas. Usa el formulario de arriba para definir ingredientes y preparacion.'
                : 'Todavia no hay formulaciones en tu empresa. Pidele a un administrador o coordinador que cree la primera.'
            }
            actionLabel={puedeEditar ? 'Crear formulacion' : undefined}
            actionHref={puedeEditar ? '#crear-formulacion' : undefined}
          />
        )}

        {!loading && !error && formulaciones.length > 0 && formulacionesFiltradas.length === 0 && (
          <p className="rounded-xl border border-slate-200 bg-white p-4 text-slate-600 dark:border-white/10 dark:bg-white/3 dark:text-zinc-400">
            Ninguna formulacion coincide con &quot;{busqueda}&quot;.
          </p>
        )}

        {formulacionesFiltradas.map((formulacion) => (
          <FormulacionCard key={formulacion.id} formulacion={formulacion} onDeleted={refetch} onUpdated={refetch} />
        ))}
      </div>
    </section>
  );
}
