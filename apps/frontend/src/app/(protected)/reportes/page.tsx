'use client';

import { useEffect, useState } from 'react';
import { FileDown } from 'lucide-react';
import { ApiError, ProductionOrder, deleteProductionOrder } from '@/lib/api';
import { useFormulations } from '@/lib/use-formulations';
import { formatCosto, formatKg, utilidadClassName } from '@/lib/format';
import {
  ESTADO_PRODUCCION_INFO,
  NIVEL_CARTERA_CLASSNAME,
  capacidadUtilizadaMesActual,
  costoRealTotal,
  diasPendiente,
  ingresoRealDeOrden,
  montoCobradoDeOrden,
  montoPendienteDeOrden,
  nivelCartera,
  ordenesParaRentabilidad,
} from '@/lib/costing';
import { CapacidadPanel } from '@/components/dashboard/capacidad-panel';
import { ForecastPanel } from '@/components/dashboard/forecast-panel';
import { proyeccionProximaSemana, proyeccionProximoMes, serieMensual, serieSemanal } from '@/lib/forecast';
import { useAuth } from '@/context/auth-context';
import { exportReporteFinancieroPdf } from '@/lib/pdf';
import { downloadCsv } from '@/lib/export';
import { getProductionOrders } from '@/lib/api';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { RankingChart } from '@/components/analisis/ranking-chart';
import { TendenciaChart } from '@/components/analisis/tendencia-chart';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { useToast } from '@/context/toast-context';

/** Lunes de la semana ISO a la que pertenece una fecha, como clave de agrupacion (YYYY-MM-DD). */
function inicioDeSemana(fecha: Date): string {
  const dia = fecha.getDay();
  const diff = (dia === 0 ? -6 : 1) - dia; // retrocede hasta el lunes
  const lunes = new Date(fecha);
  lunes.setDate(fecha.getDate() + diff);
  lunes.setHours(0, 0, 0, 0);
  return lunes.toISOString().slice(0, 10);
}

const inputClasses =
  'rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200';

const ESTADO_PAGO_LABEL: Record<ProductionOrder['estadoPago'], string> = {
  PENDIENTE: 'Pendiente',
  PARCIAL: 'Abono parcial',
  PAGADO: 'Cobrado',
};

interface FilaFinanciera {
  formulacionId: string;
  nombre: string;
  lotes: number;
  kgProducidos: number;
  costoReal: number;
  ingresoReal: number;
  utilidadReal: number;
  margenPorcentaje: number;
}

export default function ReportesPage() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const { formulaciones, loading, error } = useFormulations();
  const [ordenes, setOrdenes] = useState<ProductionOrder[] | null>(null);
  const [ordenesError, setOrdenesError] = useState<string | null>(null);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [busquedaLote, setBusquedaLote] = useState('');
  const [ordenAEliminar, setOrdenAEliminar] = useState<ProductionOrder | null>(null);
  const [eliminando, setEliminando] = useState(false);

  async function confirmarEliminarOrden() {
    if (!ordenAEliminar) return;
    setEliminando(true);
    try {
      await deleteProductionOrder(ordenAEliminar.id);
      setOrdenes((prev) => prev?.filter((o) => o.id !== ordenAEliminar.id) ?? null);
      setOrdenAEliminar(null);
      showToast('Orden de produccion anulada.');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'No se pudo anular la orden.', 'error');
    } finally {
      setEliminando(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    getProductionOrders()
      .then((data) => {
        if (!cancelled) setOrdenes(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setOrdenesError(err instanceof ApiError ? err.message : 'No se pudo cargar el historial de produccion.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const ordenesEnRango = (ordenes ?? []).filter((orden) => {
    const creada = new Date(orden.createdAt).getTime();
    if (desde && creada < new Date(desde).getTime()) return false;
    if (hasta && creada > new Date(hasta).getTime() + 24 * 60 * 60 * 1000 - 1) return false;
    return true;
  });

  const ordenesFiltradasPorLote = busquedaLote.trim()
    ? ordenesEnRango.filter((o) => o.numeroLote.toLowerCase().includes(busquedaLote.trim().toLowerCase()))
    : ordenesEnRango;

  // Un lote RECHAZADO no se vendio: se excluye de estos totales/rankings de rentabilidad, aunque
  // sigue apareciendo en la tabla de ordenes de abajo para trazabilidad.
  const ordenesRentables = ordenesParaRentabilidad(ordenesFiltradasPorLote);

  const filasFinancieras: FilaFinanciera[] = formulaciones
    .map((formulacion) => {
      const propias = ordenesRentables.filter((o) => o.formulationId === formulacion.id);
      if (propias.length === 0) return null;
      const kgProducidos = propias.reduce((total, o) => total + Number(o.cantidadObjetivoKg), 0);
      const costoReal = propias.reduce((total, o) => total + costoRealTotal(o), 0);
      const ingresoReal = propias.reduce((total, o) => total + ingresoRealDeOrden(o), 0);
      const utilidadReal = ingresoReal - costoReal;
      return {
        formulacionId: formulacion.id,
        nombre: formulacion.nombreProducto,
        lotes: propias.length,
        kgProducidos,
        costoReal,
        ingresoReal,
        utilidadReal,
        margenPorcentaje: ingresoReal > 0 ? (utilidadReal / ingresoReal) * 100 : 0,
      };
    })
    .filter((fila): fila is FilaFinanciera => fila !== null)
    .sort((a, b) => b.utilidadReal - a.utilidadReal);

  const totales = filasFinancieras.reduce(
    (acc, fila) => ({
      lotes: acc.lotes + fila.lotes,
      kgProducidos: acc.kgProducidos + fila.kgProducidos,
      costoReal: acc.costoReal + fila.costoReal,
      ingresoReal: acc.ingresoReal + fila.ingresoReal,
      utilidadReal: acc.utilidadReal + fila.utilidadReal,
    }),
    { lotes: 0, kgProducidos: 0, costoReal: 0, ingresoReal: 0, utilidadReal: 0 },
  );

  // montoCobrado ya refleja lo realmente abonado (incluye PARCIAL, no solo PAGADO); el
  // pendiente usa ingreso real menos lo abonado, para no perder los abonos parciales.
  const cobrado = ordenesRentables.reduce((total, o) => total + montoCobradoDeOrden(o), 0);
  const pendienteCobro = ordenesRentables
    .filter((o) => o.estadoPago !== 'PAGADO')
    .reduce((total, o) => total + montoPendienteDeOrden(o), 0);
  const carteraVencida = ordenesRentables
    .filter((o) => o.estadoPago !== 'PAGADO' && diasPendiente(o) > 30)
    .reduce((total, o) => total + montoPendienteDeOrden(o), 0);

  // Vista dedicada de cartera por cobrar: solo lotes con saldo pendiente (PENDIENTE o PARCIAL),
  // de mas a menos urgente, separada del reporte financiero general (que mezcla todo, cobrado o no).
  const carteraPorCobrar = ordenesRentables
    .filter((o) => o.estadoPago !== 'PAGADO')
    .sort((a, b) => diasPendiente(b) - diasPendiente(a));

  const nombrePorFormulacionId = new Map(formulaciones.map((f) => [f.id, f.nombreProducto]));
  const capacidad = capacidadUtilizadaMesActual(ordenes ?? [], Number(user?.capacidadProduccionMensualKg ?? 0));
  // Anular un lote es irreversible y borra un registro financiero: solo ADMIN/COORDINADOR,
  // igual que el backend (production-orders.controller.ts).
  const puedeAnular = user?.rol === 'ADMIN' || user?.rol === 'COORDINADOR';
  // Con el historial completo (no el rango de fechas del filtro de arriba): la proyeccion necesita
  // su propia serie semanal continua para no truncar el promedio movil artificialmente.
  const proyeccion = proyeccionProximaSemana(serieSemanal(ordenes ?? []));
  const proyeccionMensual = proyeccionProximoMes(serieMensual(ordenes ?? []));

  const utilidadPorSemana = (() => {
    const porSemana = new Map<string, number>();
    ordenesRentables.forEach((orden) => {
      const clave = inicioDeSemana(new Date(orden.createdAt));
      const utilidad = ingresoRealDeOrden(orden) - costoRealTotal(orden);
      porSemana.set(clave, (porSemana.get(clave) ?? 0) + utilidad);
    });
    return Array.from(porSemana.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([semana, utilidad]) => ({
        fecha: new Date(semana).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }),
        valor: utilidad,
      }));
  })();

  function handleExportPdfFinanciero() {
    exportReporteFinancieroPdf(
      filasFinancieras.map((f) => ({ ...f, margenRealPorcentaje: f.margenPorcentaje })),
      totales,
    );
  }

  function handleExportCsvFinanciero() {
    const fecha = new Date().toISOString().slice(0, 10);
    downloadCsv(
      `reporte-financiero-${fecha}.csv`,
      ['Formulacion', 'Lotes', 'Kg producidos', 'Costo real', 'Ingreso real', 'Utilidad real', 'Margen (%)'],
      filasFinancieras.map((fila) => [
        fila.nombre,
        fila.lotes,
        fila.kgProducidos.toFixed(4),
        fila.costoReal.toFixed(2),
        fila.ingresoReal.toFixed(2),
        fila.utilidadReal.toFixed(2),
        fila.margenPorcentaje.toFixed(1),
      ]),
    );
  }

  function handleExportCsvCartera() {
    const fecha = new Date().toISOString().slice(0, 10);
    downloadCsv(
      `cartera-por-cobrar-${fecha}.csv`,
      ['Lote', 'Formulacion', 'Fecha del lote', 'Estado de pago', 'Dias pendiente', 'Monto pendiente'],
      carteraPorCobrar.map((orden) => [
        orden.numeroLote,
        nombrePorFormulacionId.get(orden.formulationId) ?? '—',
        new Date(orden.createdAt).toLocaleDateString(),
        ESTADO_PAGO_LABEL[orden.estadoPago],
        String(diasPendiente(orden)),
        montoPendienteDeOrden(orden).toFixed(2),
      ]),
    );
  }

  function handleExportCsvLotes() {
    const fecha = new Date().toISOString().slice(0, 10);
    downloadCsv(
      `reporte-lotes-${fecha}.csv`,
      [
        'Lote',
        'Formulacion',
        'Fecha',
        'Vencimiento',
        'Cantidad (kg)',
        'Costo real',
        'Ingreso real',
        'Utilidad real',
        'Estado de pago',
        'Estado de produccion',
        'Dias pendiente',
      ],
      ordenesFiltradasPorLote.map((orden) => [
        orden.numeroLote,
        nombrePorFormulacionId.get(orden.formulationId) ?? '—',
        new Date(orden.createdAt).toLocaleDateString(),
        orden.fechaVencimiento ? new Date(orden.fechaVencimiento).toLocaleDateString() : '',
        Number(orden.cantidadObjetivoKg).toFixed(4),
        costoRealTotal(orden).toFixed(2),
        ingresoRealDeOrden(orden).toFixed(2),
        (ingresoRealDeOrden(orden) - costoRealTotal(orden)).toFixed(2),
        ESTADO_PAGO_LABEL[orden.estadoPago],
        ESTADO_PRODUCCION_INFO[orden.estadoProduccion].label,
        orden.estadoPago === 'PAGADO' ? '' : String(diasPendiente(orden)),
      ]),
    );
  }

  return (
    <section className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Reportes</h2>
          <p className="mt-1 text-slate-600 dark:text-zinc-400">
            Reporte financiero con las ganancias y gastos reales de lo que ya produjiste.
          </p>
        </div>

        {!loading && !error && formulaciones.length > 0 && (
          <div className="flex flex-wrap items-end gap-2">
            <label className="grid gap-1 text-xs text-slate-600 dark:text-zinc-400">
              Desde
              <input type="date" className={inputClasses} value={desde} onChange={(e) => setDesde(e.target.value)} />
            </label>
            <label className="grid gap-1 text-xs text-slate-600 dark:text-zinc-400">
              Hasta
              <input type="date" className={inputClasses} value={hasta} onChange={(e) => setHasta(e.target.value)} />
            </label>
            <label className="grid gap-1 text-xs text-slate-600 dark:text-zinc-400">
              Buscar por lote
              <input
                type="text"
                placeholder="Ej. LOTE-2026..."
                className={inputClasses}
                value={busquedaLote}
                onChange={(e) => setBusquedaLote(e.target.value)}
              />
            </label>
          </div>
        )}
      </div>

      {loading && (
        <div className="grid gap-4">
          <Skeleton className="h-64" />
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
          description="Cuando tengas formulaciones y ordenes de produccion registradas, aqui veras tu reporte financiero real."
          actionLabel="Ir a Formulaciones"
          actionHref="/formulaciones"
        />
      )}

      {!loading && !error && formulaciones.length > 0 && (
        <>
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
                Reporte financiero real (ordenes de produccion registradas)
              </h3>
              {filasFinancieras.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportCsvFinanciero}
                    className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/5"
                  >
                    Exportar CSV
                  </button>
                  <button
                    type="button"
                    onClick={handleExportPdfFinanciero}
                    className="flex items-center gap-1.5 rounded-full bg-sky-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-800 dark:bg-[#8B5CF6] dark:hover:bg-[#7c3aed]"
                  >
                    <FileDown className="h-3.5 w-3.5" aria-hidden />
                    Exportar PDF
                  </button>
                </div>
              )}
            </div>

            {ordenesError && (
              <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
                {ordenesError}
              </p>
            )}

            {!ordenesError && ordenes === null && (
              <div className="mt-3 grid gap-4">
                <Skeleton className="h-48" />
              </div>
            )}

            {!ordenesError && ordenes !== null && filasFinancieras.length === 0 && (
              <p className="mt-3 rounded-xl border border-slate-200 bg-white p-4 text-slate-600 dark:border-white/10 dark:bg-white/3 dark:text-zinc-400">
                Aun no hay ordenes de produccion registradas en el rango o busqueda seleccionados. Registra lotes en
                la seccion Producir para ver aqui tus ganancias y gastos reales.
              </p>
            )}

            {!ordenesError && filasFinancieras.length > 0 && (
              <>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/3 dark:shadow-none">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
                      Lotes producidos
                    </p>
                    <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{totales.lotes}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/3 dark:shadow-none">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
                      Gastos (costo real)
                    </p>
                    <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                      {formatCosto(totales.costoReal)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/3 dark:shadow-none">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
                      Ingresos (ventas)
                    </p>
                    <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                      {formatCosto(totales.ingresoReal)}
                    </p>
                  </div>
                  <div
                    className={
                      totales.utilidadReal < 0
                        ? 'rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm dark:border-red-500/30 dark:bg-red-500/10'
                        : 'rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm dark:border-emerald-500/30 dark:bg-emerald-500/10'
                    }
                  >
                    <p
                      className={
                        totales.utilidadReal < 0
                          ? 'text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-400'
                          : 'text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400'
                      }
                    >
                      {totales.utilidadReal < 0 ? 'Perdidas (utilidad real)' : 'Ganancias (utilidad real)'}
                    </p>
                    <p
                      className={`mt-1 text-2xl font-bold ${totales.utilidadReal < 0 ? 'text-red-800 dark:text-red-300' : 'text-emerald-800 dark:text-emerald-300'}`}
                    >
                      {formatCosto(totales.utilidadReal)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm dark:border-emerald-500/30 dark:bg-emerald-500/10">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                      Cobrado
                    </p>
                    <p className="mt-1 text-2xl font-bold text-emerald-800 dark:text-emerald-300">
                      {formatCosto(cobrado)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                      Pendiente de cobro
                    </p>
                    <p className="mt-1 text-2xl font-bold text-amber-800 dark:text-amber-300">
                      {formatCosto(pendienteCobro)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm dark:border-red-500/30 dark:bg-red-500/10">
                    <p className="text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-400">
                      Cartera vencida (+30 dias)
                    </p>
                    <p className="mt-1 text-2xl font-bold text-red-800 dark:text-red-300">
                      {formatCosto(carteraVencida)}
                    </p>
                  </div>
                </div>

                {carteraPorCobrar.length > 0 && (
                  <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
                        Cartera por cobrar (lotes con saldo pendiente)
                      </h4>
                      <button
                        type="button"
                        onClick={handleExportCsvCartera}
                        className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/5"
                      >
                        Exportar CSV
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">
                      Ordenado del mas urgente al menos urgente, para saber a quien cobrarle primero.
                    </p>
                    <table className="mt-3 w-full min-w-140 text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-white/10 dark:text-zinc-500">
                          <th className="py-2">Lote</th>
                          <th className="py-2">Formulacion</th>
                          <th className="py-2">Fecha del lote</th>
                          <th className="py-2">Estado</th>
                          <th className="py-2">Dias pendiente</th>
                          <th className="py-2">Monto pendiente</th>
                        </tr>
                      </thead>
                      <tbody>
                        {carteraPorCobrar.map((orden) => (
                          <tr key={orden.id} className="border-b border-slate-100 dark:border-white/5">
                            <td className="py-2 font-mono text-slate-800 dark:text-zinc-200">{orden.numeroLote}</td>
                            <td className="py-2 text-slate-600 dark:text-zinc-400">
                              {nombrePorFormulacionId.get(orden.formulationId) ?? '—'}
                            </td>
                            <td className="py-2 text-slate-600 dark:text-zinc-400">
                              {new Date(orden.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-2 text-slate-600 dark:text-zinc-400">
                              {ESTADO_PAGO_LABEL[orden.estadoPago]}
                            </td>
                            <td className={`py-2 ${NIVEL_CARTERA_CLASSNAME[nivelCartera(diasPendiente(orden))]}`}>
                              {diasPendiente(orden)} dias
                            </td>
                            <td className="py-2 font-medium text-slate-900 dark:text-white">
                              {formatCosto(montoPendienteDeOrden(orden))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="mt-6 grid gap-6">
                  <div className="grid gap-6 lg:grid-cols-2">
                    <CapacidadPanel capacidad={capacidad} />
                    <ForecastPanel proyeccion={proyeccion} proyeccionMensual={proyeccionMensual} />
                  </div>
                  {utilidadPorSemana.length >= 2 && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/3">
                      <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
                        Utilidad real por semana
                      </h4>
                      <div className="mt-4">
                        <TendenciaChart
                          data={utilidadPorSemana}
                          ariaLabel="Utilidad real por semana"
                          formatValor={formatCosto}
                        />
                      </div>
                    </div>
                  )}
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/3">
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
                      Donde estan las ganancias (utilidad real por formulacion)
                    </h4>
                    <div className="mt-4">
                      <RankingChart
                        data={filasFinancieras.map((f) => ({ id: f.formulacionId, nombre: f.nombre, valor: f.utilidadReal }))}
                        idSeleccionado=""
                        formatValor={formatCosto}
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/3">
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
                      Detalle por formulacion
                    </h4>
                    <table className="mt-3 w-full min-w-160 text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-white/10 dark:text-zinc-500">
                          <th className="py-2">Formulacion</th>
                          <th className="py-2">Lotes</th>
                          <th className="py-2">Kg producidos</th>
                          <th className="py-2">Gastos</th>
                          <th className="py-2">Ingresos</th>
                          <th className="py-2">Ganancias</th>
                          <th className="py-2">Margen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filasFinancieras.map((fila) => (
                          <tr key={fila.formulacionId} className="border-b border-slate-100 dark:border-white/5">
                            <td className="py-2 font-medium text-slate-800 dark:text-zinc-200">{fila.nombre}</td>
                            <td className="py-2 text-slate-600 dark:text-zinc-400">{fila.lotes}</td>
                            <td className="py-2 text-slate-600 dark:text-zinc-400">{formatKg(fila.kgProducidos)} kg</td>
                            <td className="py-2 text-slate-600 dark:text-zinc-400">{formatCosto(fila.costoReal)}</td>
                            <td className="py-2 text-slate-600 dark:text-zinc-400">{formatCosto(fila.ingresoReal)}</td>
                            <td className={`py-2 font-medium ${utilidadClassName(fila.utilidadReal)}`}>
                              {formatCosto(fila.utilidadReal)}
                            </td>
                            <td className="py-2 text-slate-600 dark:text-zinc-400">
                              {fila.margenPorcentaje.toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
                        Detalle por lote
                      </h4>
                      <button
                        type="button"
                        onClick={handleExportCsvLotes}
                        className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/5"
                      >
                        Exportar CSV
                      </button>
                    </div>
                    <table className="mt-3 w-full min-w-180 text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-white/10 dark:text-zinc-500">
                          <th className="py-2">Lote</th>
                          <th className="py-2">Formulacion</th>
                          <th className="py-2">Fecha</th>
                          <th className="py-2">Vencimiento</th>
                          <th className="py-2">Costo real</th>
                          <th className="py-2">Ingreso real</th>
                          <th className="py-2">Utilidad</th>
                          <th className="py-2">Estado</th>
                          <th className="py-2">Produccion</th>
                          <th className="py-2">Dias pendiente</th>
                          <th className="py-2">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ordenesFiltradasPorLote.map((orden) => (
                          <tr key={orden.id} className="border-b border-slate-100 dark:border-white/5">
                            <td className="py-2 font-mono text-slate-800 dark:text-zinc-200">{orden.numeroLote}</td>
                            <td className="py-2 text-slate-600 dark:text-zinc-400">
                              {nombrePorFormulacionId.get(orden.formulationId) ?? '—'}
                            </td>
                            <td className="py-2 text-slate-600 dark:text-zinc-400">
                              {new Date(orden.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-2 text-slate-600 dark:text-zinc-400">
                              {orden.fechaVencimiento ? new Date(orden.fechaVencimiento).toLocaleDateString() : '—'}
                            </td>
                            <td className="py-2 text-slate-600 dark:text-zinc-400">{formatCosto(costoRealTotal(orden))}</td>
                            <td className="py-2 text-slate-600 dark:text-zinc-400">
                              {formatCosto(ingresoRealDeOrden(orden))}
                            </td>
                            <td className={`py-2 font-medium ${utilidadClassName(ingresoRealDeOrden(orden) - costoRealTotal(orden))}`}>
                              {formatCosto(ingresoRealDeOrden(orden) - costoRealTotal(orden))}
                            </td>
                            <td className="py-2 text-slate-600 dark:text-zinc-400">
                              {ESTADO_PAGO_LABEL[orden.estadoPago]}
                            </td>
                            <td className="py-2">
                              <span
                                title={orden.notasCalidad ?? undefined}
                                className={`rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap ${ESTADO_PRODUCCION_INFO[orden.estadoProduccion].className}`}
                              >
                                {ESTADO_PRODUCCION_INFO[orden.estadoProduccion].label}
                              </span>
                            </td>
                            <td className={`py-2 ${NIVEL_CARTERA_CLASSNAME[nivelCartera(diasPendiente(orden))]}`}>
                              {orden.estadoPago === 'PAGADO' ? '—' : `${diasPendiente(orden)} dias`}
                            </td>
                            <td className="py-2">
                              {puedeAnular && (
                                <button
                                  type="button"
                                  onClick={() => setOrdenAEliminar(orden)}
                                  className="rounded-full border border-red-300 px-2 py-0.5 text-xs text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
                                >
                                  Anular
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}

      <ConfirmDialog
        open={ordenAEliminar !== null}
        title="Anular orden de produccion"
        description={
          ordenAEliminar
            ? `Vas a anular el lote "${ordenAEliminar.numeroLote}". Esta accion elimina el registro y no se puede deshacer.`
            : ''
        }
        confirmLabel="Anular"
        danger
        loading={eliminando}
        onConfirm={() => void confirmarEliminarOrden()}
        onCancel={() => setOrdenAEliminar(null)}
      />
    </section>
  );
}
