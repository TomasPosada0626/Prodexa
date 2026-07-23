'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { useFormulations } from '@/lib/use-formulations';
import {
  calculateCost,
  capacidadUtilizadaMesActual,
  costoRealTotal,
  ingresoRealDeOrden,
  montoCobradoDeOrden,
  montoPendienteDeOrden,
  ordenesParaRentabilidad,
} from '@/lib/costing';
import { CapacidadPanel } from '@/components/dashboard/capacidad-panel';
import { ForecastPanel } from '@/components/dashboard/forecast-panel';
import { proyeccionProximaSemana, proyeccionProximoMes, serieMensual, serieSemanal } from '@/lib/forecast';
import { SugerenciasPanel } from '@/components/dashboard/sugerencias-panel';
import { sugerenciasProduccion } from '@/lib/sugerencias';
import { calcularEstadoRegistro } from '@/lib/calidad';
import { formatCosto } from '@/lib/format';
import { getProductionOrders, ProductionOrder } from '@/lib/api';
import { EmptyState } from '@/components/shared/empty-state';
import { Skeleton } from '@/components/ui/Skeleton';
import { MargenChart } from '@/components/dashboard/margen-chart';
import { CostoCategoriaChart } from '@/components/dashboard/costo-categoria-chart';
import { VariacionSemanalCostos } from '@/components/dashboard/variacion-semanal-costos';

// Un lote fisico tiene vida util mas corta e inmediata que el papeleo del registro sanitario,
// por eso su ventana de alerta es mas corta (30 dias) que la de renovacion sanitaria (120 dias).
const DIAS_ALERTA_LOTE = 30;

type Periodo = 'todo' | '7' | '30' | '90';

const PERIODO_LABELS: Record<Periodo, string> = {
  todo: 'Todo el tiempo',
  '7': 'Ultimos 7 dias',
  '30': 'Ultimos 30 dias',
  '90': 'Ultimos 90 dias',
};

const selectClasses =
  'rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200';

function diasHastaVencimiento(fechaVencimiento: string): number {
  return Math.ceil((new Date(fechaVencimiento).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

/** Delta porcentual vs. el valor anterior; null si no hay base valida para comparar (ej. periodo anterior sin datos). */
function calcularDelta(actual: number, anterior: number): number | null {
  if (anterior === 0) return null;
  return ((actual - anterior) / Math.abs(anterior)) * 100;
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return null;
  const positivo = delta >= 0;
  return (
    <span
      className={`ml-2 inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-semibold ${
        positivo
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
          : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'
      }`}
    >
      {positivo ? '+' : ''}
      {delta.toFixed(1)}%
    </span>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { formulaciones, loading, error } = useFormulations();
  const [periodo, setPeriodo] = useState<Periodo>('todo');
  const [formulationId, setFormulationId] = useState<string>('todas');
  const [categoria, setCategoria] = useState<string>('todas');
  // El corte se calcula en el momento de seleccionar el periodo (evento), no durante el render,
  // para no llamar Date.now() de forma impura dentro de un useMemo.
  const [corteTimestamp, setCorteTimestamp] = useState<number | null>(null);
  const [ordenes, setOrdenes] = useState<ProductionOrder[]>([]);

  useEffect(() => {
    let cancelled = false;
    getProductionOrders()
      .then((data) => {
        if (!cancelled) setOrdenes(data);
      })
      .catch(() => {
        if (!cancelled) setOrdenes([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handlePeriodoChange(nuevoPeriodo: Periodo) {
    setPeriodo(nuevoPeriodo);
    if (nuevoPeriodo === 'todo') {
      setCorteTimestamp(null);
    } else {
      const dias = Number(nuevoPeriodo);
      setCorteTimestamp(Date.now() - dias * 24 * 60 * 60 * 1000);
    }
  }

  const categorias = useMemo(
    () => Array.from(new Set(formulaciones.map((f) => f.categoria).filter((c): c is string => Boolean(c)))).sort(),
    [formulaciones],
  );

  const formulacionesFiltradas = useMemo(() => {
    let lista = formulaciones;

    if (corteTimestamp !== null) {
      lista = lista.filter((f) => new Date(f.createdAt).getTime() >= corteTimestamp);
    }

    if (formulationId !== 'todas') {
      lista = lista.filter((f) => f.id === formulationId);
    }

    if (categoria !== 'todas') {
      lista = lista.filter((f) => f.categoria === categoria);
    }

    return lista;
  }, [formulaciones, corteTimestamp, formulationId, categoria]);

  const analizadas = formulacionesFiltradas.map((formulacion) => {
    const costoBaseTotal = formulacion.ingredientes.reduce((total, i) => total + Number(i.precioTotal), 0);
    const cantidadBaseKg = Number(formulacion.cantidadBaseKg);
    const resultado = calculateCost({
      costoBaseTotal,
      cantidadBaseKg,
      cantidadObjetivoKg: cantidadBaseKg,
      margenPorcentaje: Number(formulacion.margenPorcentaje),
      impuestoPorcentaje: Number(formulacion.impuestoPorcentaje),
    });
    return { formulacion, resultado };
  });

  const totalFormulaciones = formulacionesFiltradas.length;
  const margenPromedio = totalFormulaciones
    ? formulacionesFiltradas.reduce((total, f) => total + Number(f.margenPorcentaje), 0) / totalFormulaciones
    : 0;
  const utilidadTotal = analizadas.reduce((total, item) => total + (item.resultado?.utilidadEstimada ?? 0), 0);

  // Ventana anterior equivalente (ej. si el periodo es "ultimos 30 dias", los 30 dias antes de esos),
  // con los mismos filtros de formulacion/categoria, para poder mostrar el delta +/-% en los KPI.
  const diasPeriodo = periodo === 'todo' ? null : Number(periodo);
  const formulacionesPeriodoAnterior = useMemo(() => {
    if (corteTimestamp === null || diasPeriodo === null) return [];
    const inicioAnterior = corteTimestamp - diasPeriodo * 24 * 60 * 60 * 1000;
    return formulaciones.filter((f) => {
      const creada = new Date(f.createdAt).getTime();
      if (creada < inicioAnterior || creada >= corteTimestamp) return false;
      if (formulationId !== 'todas' && f.id !== formulationId) return false;
      if (categoria !== 'todas' && f.categoria !== categoria) return false;
      return true;
    });
  }, [formulaciones, corteTimestamp, diasPeriodo, formulationId, categoria]);

  const totalFormulacionesAnterior = formulacionesPeriodoAnterior.length;
  const margenPromedioAnterior = totalFormulacionesAnterior
    ? formulacionesPeriodoAnterior.reduce((total, f) => total + Number(f.margenPorcentaje), 0) /
      totalFormulacionesAnterior
    : 0;
  const utilidadTotalAnterior = formulacionesPeriodoAnterior.reduce((total, formulacion) => {
    const costoBaseTotal = formulacion.ingredientes.reduce((t, i) => t + Number(i.precioTotal), 0);
    const cantidadBaseKg = Number(formulacion.cantidadBaseKg);
    const resultado = calculateCost({
      costoBaseTotal,
      cantidadBaseKg,
      cantidadObjetivoKg: cantidadBaseKg,
      margenPorcentaje: Number(formulacion.margenPorcentaje),
      impuestoPorcentaje: Number(formulacion.impuestoPorcentaje),
    });
    return total + (resultado?.utilidadEstimada ?? 0);
  }, 0);

  const mostrarDeltas = periodo !== 'todo' && totalFormulacionesAnterior > 0;
  const deltaFormulaciones = mostrarDeltas ? calcularDelta(totalFormulaciones, totalFormulacionesAnterior) : null;
  const deltaMargen = mostrarDeltas ? calcularDelta(margenPromedio, margenPromedioAnterior) : null;
  const deltaUtilidad = mostrarDeltas ? calcularDelta(utilidadTotal, utilidadTotalAnterior) : null;
  const topRentables = [...analizadas]
    .filter((item) => item.resultado)
    .sort((a, b) => (b.resultado?.utilidadEstimada ?? 0) - (a.resultado?.utilidadEstimada ?? 0))
    .slice(0, 3);
  const margenChartData = formulacionesFiltradas.map((f) => ({
    id: f.id,
    nombre: f.nombreProducto,
    margen: Number(f.margenPorcentaje),
  }));

  const costoCategoriaData = (() => {
    const porCategoria = new Map<string, number[]>();
    analizadas.forEach(({ formulacion, resultado }) => {
      if (!resultado) return;
      const categoria = formulacion.categoria ?? 'Sin categoria';
      const lista = porCategoria.get(categoria) ?? [];
      lista.push(resultado.costoEscalado);
      porCategoria.set(categoria, lista);
    });
    return Array.from(porCategoria.entries())
      .map(([categoria, costos]) => ({
        categoria,
        costoPromedio: costos.reduce((total, c) => total + c, 0) / costos.length,
      }))
      .sort((a, b) => b.costoPromedio - a.costoPromedio);
  })();

  const primerNombre = user?.nombre?.split(' ')[0] || user?.email?.split('@')[0];

  const registrosPorVencer = formulaciones
    .map((f) => ({ formulacion: f, ...calcularEstadoRegistro(f) }))
    .filter((f) => f.estado === 'por-vencer' || f.estado === 'vencido');

  const lotesPorVencer = ordenes.filter(
    (orden) => orden.fechaVencimiento !== null && diasHastaVencimiento(orden.fechaVencimiento) <= DIAS_ALERTA_LOTE,
  );

  const nombrePorFormulacionId = new Map(formulaciones.map((f) => [f.id, f.nombreProducto]));
  const totalAlertas = registrosPorVencer.length + lotesPorVencer.length;

  // Mismos filtros de periodo/formulacion/categoria que las formulaciones, pero aplicados a las
  // ordenes de produccion reales: son los unicos numeros de este panel que vienen de lo que de
  // verdad se produjo y vendio, no de una estimacion sobre la formula base.
  const categoriaPorFormulacionId = new Map(formulaciones.map((f) => [f.id, f.categoria]));
  const ordenesFiltradas = ordenes.filter((orden) => {
    if (corteTimestamp !== null && new Date(orden.createdAt).getTime() < corteTimestamp) return false;
    if (formulationId !== 'todas' && orden.formulationId !== formulationId) return false;
    if (categoria !== 'todas' && categoriaPorFormulacionId.get(orden.formulationId) !== categoria) return false;
    return true;
  });
  // Un lote RECHAZADO no se vendio: se excluye de estos numeros de rentabilidad, aunque
  // sigue contando en las alertas de vencimiento de arriba (lotesPorVencer) para trazabilidad.
  const ordenesRentablesFiltradas = ordenesParaRentabilidad(ordenesFiltradas);
  const produccionReal = {
    lotes: ordenesRentablesFiltradas.length,
    ingresoCobrado: ordenesRentablesFiltradas.reduce((total, o) => total + montoCobradoDeOrden(o), 0),
    pendienteCobro: ordenesRentablesFiltradas
      .filter((o) => o.estadoPago !== 'PAGADO')
      .reduce((total, o) => total + montoPendienteDeOrden(o), 0),
    utilidadReal: ordenesRentablesFiltradas.reduce(
      (total, o) => total + (ingresoRealDeOrden(o) - costoRealTotal(o)),
      0,
    ),
  };

  // Siempre del mes calendario actual, independiente del filtro de periodo de arriba: la
  // capacidad instalada se mide mes a mes, no sobre un rango arbitrario.
  const capacidad = capacidadUtilizadaMesActual(ordenes, Number(user?.capacidadProduccionMensualKg ?? 0));
  // Siempre con el historial completo (no el filtro de periodo de arriba): la proyeccion necesita
  // su propia serie semanal continua, sin que un filtro corto la trunque artificialmente.
  const proyeccion = proyeccionProximaSemana(serieSemanal(ordenes));
  const proyeccionMensual = proyeccionProximoMes(serieMensual(ordenes));
  const sugerencias = sugerenciasProduccion(formulaciones, ordenes);

  return (
    <section className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Hola, {primerNombre}</h2>
          <p className="mt-1 text-slate-600 dark:text-zinc-400">Un vistazo rapido a tus formulaciones y su rentabilidad.</p>
        </div>

        {!loading && !error && formulaciones.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <select
              className={selectClasses}
              value={periodo}
              onChange={(e) => handlePeriodoChange(e.target.value as Periodo)}
              aria-label="Filtrar por periodo"
            >
              {(Object.keys(PERIODO_LABELS) as Periodo[]).map((key) => (
                <option key={key} value={key} className="text-slate-900">
                  {PERIODO_LABELS[key]}
                </option>
              ))}
            </select>
            <select
              className={selectClasses}
              value={formulationId}
              onChange={(e) => setFormulationId(e.target.value)}
              aria-label="Filtrar por formulacion"
            >
              <option value="todas" className="text-slate-900">
                Todas las formulaciones
              </option>
              {formulaciones.map((f) => (
                <option key={f.id} value={f.id} className="text-slate-900">
                  {f.nombreProducto}
                </option>
              ))}
            </select>
            {categorias.length > 0 && (
              <select
                className={selectClasses}
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                aria-label="Filtrar por categoria"
              >
                <option value="todas" className="text-slate-900">
                  Todas las categorias
                </option>
                {categorias.map((c) => (
                  <option key={c} value={c} className="text-slate-900">
                    {c}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      {loading && (
        <div className="grid gap-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-48" />
        </div>
      )}

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </p>
      )}

      {!loading && !error && formulaciones.length === 0 && (
        <EmptyState
          title="Crea tu primera formulacion"
          description="Aun no tienes formulaciones. Registra la primera para empezar a ver tus metricas aqui."
          actionLabel="Ir a Formulaciones"
          actionHref="/formulaciones"
        />
      )}

      {!loading && !error && formulaciones.length > 0 && totalFormulaciones === 0 && (
        <p className="rounded-xl border border-slate-200 bg-white p-4 text-slate-600 dark:border-white/10 dark:bg-white/3 dark:text-zinc-400">
          Ninguna formulacion coincide con este filtro.
        </p>
      )}

      {!loading && !error && totalAlertas > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
            {totalAlertas} alerta{totalAlertas === 1 ? '' : 's'} que requiere{totalAlertas === 1 ? '' : 'n'} atencion
          </h3>
          <ul className="mt-2 grid gap-1 text-sm text-amber-700 dark:text-amber-400">
            {registrosPorVencer.map(({ formulacion, estado, diasRestantes }) => (
              <li key={formulacion.id}>
                <Link href="/calidad" className="hover:underline">
                  {formulacion.nombreProducto}
                </Link>
                : registro sanitario{' '}
                {estado === 'vencido' ? 'vencido' : `vence en ${diasRestantes} dia${diasRestantes === 1 ? '' : 's'}`}
              </li>
            ))}
            {lotesPorVencer.map((orden) => {
              const diasRestantes = diasHastaVencimiento(orden.fechaVencimiento as string);
              return (
                <li key={orden.id}>
                  <Link href="/reportes" className="hover:underline">
                    Lote {orden.numeroLote}
                  </Link>{' '}
                  ({nombrePorFormulacionId.get(orden.formulationId) ?? 'formulacion eliminada'}):{' '}
                  {diasRestantes < 0 ? 'vencido' : `vence en ${diasRestantes} dia${diasRestantes === 1 ? '' : 's'}`}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {!loading && !error && totalFormulaciones > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/3 dark:shadow-none">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">Formulaciones</p>
              <p className="mt-1 flex items-center text-3xl font-bold text-slate-900 dark:text-white">
                {totalFormulaciones}
                <DeltaBadge delta={deltaFormulaciones} />
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/3 dark:shadow-none">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">Margen promedio</p>
              <p className="mt-1 flex items-center text-3xl font-bold text-slate-900 dark:text-white">
                {margenPromedio.toFixed(1)}%
                <DeltaBadge delta={deltaMargen} />
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/3 dark:shadow-none">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">Utilidad total (lote base)</p>
              <p className="mt-1 flex items-center text-3xl font-bold text-emerald-700 dark:text-emerald-400">
                {formatCosto(utilidadTotal)}
                <DeltaBadge delta={deltaUtilidad} />
              </p>
            </div>
          </div>

          {produccionReal.lotes > 0 && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
                Produccion real del periodo (lo que de verdad se produjo y vendio)
              </h3>
              <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400">Lotes producidos</p>
                  <p className="mt-0.5 text-xl font-bold text-emerald-900 dark:text-emerald-200">
                    {produccionReal.lotes}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400">Ingresos cobrados</p>
                  <p className="mt-0.5 text-xl font-bold text-emerald-900 dark:text-emerald-200">
                    {formatCosto(produccionReal.ingresoCobrado)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400">Pendiente de cobro</p>
                  <p className="mt-0.5 text-xl font-bold text-emerald-900 dark:text-emerald-200">
                    {formatCosto(produccionReal.pendienteCobro)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400">Utilidad real</p>
                  <p
                    className={`mt-0.5 text-xl font-bold ${produccionReal.utilidadReal < 0 ? 'text-red-700 dark:text-red-400' : 'text-emerald-900 dark:text-emerald-200'}`}
                  >
                    {formatCosto(produccionReal.utilidadReal)}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <CapacidadPanel capacidad={capacidad} />
            <ForecastPanel proyeccion={proyeccion} proyeccionMensual={proyeccionMensual} />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
              Margen por formulacion
            </h3>
            <div className="mt-4">
              <MargenChart data={margenChartData} />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
                Costo promedio por categoria
              </h3>
              <div className="mt-4">
                <CostoCategoriaChart data={costoCategoriaData} formatValor={formatCosto} />
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
                Variacion semanal del costo
              </h3>
              <div className="mt-4">
                <VariacionSemanalCostos key={formulacionesFiltradas.map((f) => f.id).join(',')} formulaciones={formulacionesFiltradas} />
              </div>
            </div>
          </div>

          <SugerenciasPanel sugerencias={sugerencias} />

          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">Top 3 mas rentables</h3>
            <ol className="mt-3 grid gap-2">
              {topRentables.map(({ formulacion, resultado }, index) => (
                <li
                  key={formulacion.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 dark:border-white/5 dark:bg-white/3"
                >
                  <span className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-zinc-200">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-sky-700 text-xs font-bold text-white dark:bg-[#8B5CF6]">
                      {index + 1}
                    </span>
                    {formulacion.nombreProducto}
                  </span>
                  <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                    {formatCosto(resultado?.utilidadEstimada ?? 0)}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/formulaciones"
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-sky-500 hover:text-sky-700 dark:border-white/10 dark:bg-white/3 dark:text-zinc-300 dark:hover:border-[#8B5CF6] dark:hover:text-white"
            >
              Ver formulaciones
            </Link>
            <Link
              href="/costos"
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-sky-500 hover:text-sky-700 dark:border-white/10 dark:bg-white/3 dark:text-zinc-300 dark:hover:border-[#8B5CF6] dark:hover:text-white"
            >
              Analizar costos
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
