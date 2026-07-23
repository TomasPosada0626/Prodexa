'use client';

import { useEffect, useState } from 'react';
import {
  ApiError,
  Formulation,
  FormulationSnapshot,
  FormulationVersion,
  ProductionOrder,
  getFormulationVersions,
  getProductionOrders,
} from '@/lib/api';
import {
  ESTADO_PRODUCCION_INFO,
  calculateCost,
  costoRealTotal,
  ingresoRealDeOrden,
  montoPendienteDeOrden,
  ordenesParaRentabilidad,
} from '@/lib/costing';
import { formatCosto, formatKg, utilidadClassName } from '@/lib/format';
import { ProyeccionMensual, proyeccionProximoMes, serieMensual } from '@/lib/forecast';
import { exportAnalisisPdf } from '@/lib/pdf';
import { useFormulations } from '@/lib/use-formulations';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { TendenciaChart } from '@/components/analisis/tendencia-chart';
import { DesgloseIngredientesChart } from '@/components/analisis/desglose-ingredientes-chart';
import { RankingChart } from '@/components/analisis/ranking-chart';

interface Punto {
  fecha: string;
  fechaCorta: string;
  costoProduccion: number;
  margen: number;
  utilidad: number;
}

const ESTADO_PAGO_LABEL: Record<ProductionOrder['estadoPago'], string> = {
  PENDIENTE: 'Pendiente de cobro',
  PARCIAL: 'Abono parcial',
  PAGADO: 'Cobrado',
};

const TENDENCIA_VOLUMEN_LABEL: Record<ProyeccionMensual['tendenciaVolumen'], string> = {
  creciendo: '↑ Creciendo en volumen',
  cayendo: '↓ Cayendo en volumen',
  estable: '→ Volumen estable',
};

const TENDENCIA_VOLUMEN_CLASSNAME: Record<ProyeccionMensual['tendenciaVolumen'], string> = {
  creciendo: 'text-emerald-700 dark:text-emerald-400',
  cayendo: 'text-red-600 dark:text-red-400',
  estable: 'text-slate-600 dark:text-zinc-400',
};

function puntoDesdeSnapshot(fechaIso: string, snapshot: FormulationSnapshot): Punto {
  const costoBaseTotal = snapshot.ingredientes.reduce((total, i) => total + Number(i.precioTotal), 0);
  const cantidadBaseKg = Number(snapshot.cantidadBaseKg);
  const margen = Number(snapshot.margenPorcentaje);
  const resultado = calculateCost({
    costoBaseTotal,
    cantidadBaseKg,
    cantidadObjetivoKg: cantidadBaseKg,
    margenPorcentaje: margen,
    impuestoPorcentaje: Number(snapshot.impuestoPorcentaje),
  });

  return {
    fecha: fechaIso,
    fechaCorta: new Date(fechaIso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }),
    costoProduccion: resultado?.costoEscalado ?? 0,
    margen,
    utilidad: resultado?.utilidadEstimada ?? 0,
  };
}

function calcularResultadoActual(formulacion: Formulation) {
  const costoBaseTotal = formulacion.ingredientes.reduce((total, i) => total + Number(i.precioTotal), 0);
  const cantidadBaseKg = Number(formulacion.cantidadBaseKg);
  return calculateCost({
    costoBaseTotal,
    cantidadBaseKg,
    cantidadObjetivoKg: cantidadBaseKg,
    margenPorcentaje: Number(formulacion.margenPorcentaje),
    impuestoPorcentaje: Number(formulacion.impuestoPorcentaje),
  });
}

interface AnalisisDetalleProps {
  formulacion: Formulation;
  todasLasFormulaciones: Formulation[];
}

/** Keyed por formulacion.id en el padre para que su estado se reinicie solo al cambiar de seleccion, sin efecto de reset. */
function AnalisisDetalle({ formulacion, todasLasFormulaciones }: AnalisisDetalleProps) {
  const [puntos, setPuntos] = useState<Punto[] | null>(null);
  const [ultimaVersion, setUltimaVersion] = useState<FormulationVersion | null>(null);
  const [ordenes, setOrdenes] = useState<ProductionOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([getFormulationVersions(formulacion.id), getProductionOrders(formulacion.id)])
      .then(([versiones, ordenesProduccion]) => {
        if (cancelled) return;
        // Mas antigua primero, y el estado actual de la formulacion al final (es el punto mas reciente).
        const historicos = [...versiones].reverse().map((v) => puntoDesdeSnapshot(v.createdAt, v.snapshot));
        const actual = puntoDesdeSnapshot(new Date().toISOString(), {
          nombreProducto: formulacion.nombreProducto,
          registroSanitario: formulacion.registroSanitario,
          registroSanitarioVencimiento: formulacion.registroSanitarioVencimiento,
          preparacionHtml: formulacion.preparacionHtml,
          cantidadBaseKg: formulacion.cantidadBaseKg,
          margenPorcentaje: formulacion.margenPorcentaje,
          impuestoPorcentaje: formulacion.impuestoPorcentaje,
          ingredientes: formulacion.ingredientes,
        });
        actual.fechaCorta = 'Actual';
        setPuntos([...historicos, actual]);
        // La API devuelve las versiones mas reciente primero: la [0] es el ultimo snapshot
        // antes del estado actual, la base de comparacion para "que cambio desde la ultima edicion".
        setUltimaVersion(versiones[0] ?? null);
        setOrdenes(ordenesProduccion);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar el analisis.');
      });

    return () => {
      cancelled = true;
    };
  }, [formulacion]);

  // Un lote RECHAZADO no se vendio: se excluye de estos numeros de rentabilidad, aunque sigue
  // apareciendo en la tabla de trazabilidad de abajo (con todos los lotes, incluidos los rechazados).
  const ordenesRentables = ordenes ? ordenesParaRentabilidad(ordenes) : null;
  const produccionReal =
    ordenesRentables && ordenesRentables.length > 0
      ? {
          lotes: ordenesRentables.length,
          kgProducidos: ordenesRentables.reduce((total, o) => total + Number(o.cantidadObjetivoKg), 0),
          costoReal: ordenesRentables.reduce((total, o) => total + costoRealTotal(o), 0),
          ingresoReal: ordenesRentables.reduce((total, o) => total + ingresoRealDeOrden(o), 0),
          utilidadReal: ordenesRentables.reduce((total, o) => total + ingresoRealDeOrden(o) - costoRealTotal(o), 0),
          pendienteCobro: ordenesRentables
            .filter((o) => o.estadoPago !== 'PAGADO')
            .reduce((total, o) => total + montoPendienteDeOrden(o), 0),
        }
      : null;
  const utilidadRealAcumulada = produccionReal?.utilidadReal ?? null;
  // Proyeccion mensual y tendencia de volumen de ESTE producto especifico (no agregada con las
  // demas formulaciones), para planeacion comercial: cuanto vas a producir/facturar/ganar el
  // proximo mes con este producto si sigue la tendencia, y si esta creciendo o cayendo.
  const proyeccionMensual: ProyeccionMensual | null = ordenes ? proyeccionProximoMes(serieMensual(ordenes)) : null;

  const resultadoActual = calcularResultadoActual(formulacion);
  const costoBaseTotal = formulacion.ingredientes.reduce((total, i) => total + Number(i.precioTotal), 0);
  const desglose = formulacion.ingredientes
    .map((i) => ({
      id: i.id,
      nombre: i.nombre,
      costo: Number(i.precioTotal),
      porcentaje: costoBaseTotal > 0 ? (Number(i.precioTotal) / costoBaseTotal) * 100 : 0,
    }))
    .sort((a, b) => b.porcentaje - a.porcentaje);

  // Compara el costo actual de cada ingrediente contra el ultimo snapshot guardado (antes de la
  // ultima edicion), para explicar QUE ingrediente causo el cambio de costo, no solo que cambio.
  const comparacionCosto = ultimaVersion
    ? (() => {
        const anteriorPorNombre = new Map(
          ultimaVersion.snapshot.ingredientes.map((i) => [i.nombre, Number(i.precioTotal)]),
        );
        const actualPorNombre = new Map(formulacion.ingredientes.map((i) => [i.nombre, Number(i.precioTotal)]));
        const nombres = new Set([...anteriorPorNombre.keys(), ...actualPorNombre.keys()]);
        const filas = Array.from(nombres)
          .map((nombre) => {
            const costoAnterior = anteriorPorNombre.get(nombre) ?? 0;
            const costoActual = actualPorNombre.get(nombre) ?? 0;
            return { nombre, costoAnterior, costoActual, deltaCosto: costoActual - costoAnterior };
          })
          .filter((f) => Math.abs(f.deltaCosto) >= 0.01)
          .sort((a, b) => Math.abs(b.deltaCosto) - Math.abs(a.deltaCosto));
        const deltaCostoTotal = filas.reduce((total, f) => total + f.deltaCosto, 0);
        return { filas, deltaCostoTotal, fecha: ultimaVersion.createdAt };
      })()
    : null;

  const ranking = todasLasFormulaciones.map((f) => {
    const r = calcularResultadoActual(f);
    return { id: f.id, nombre: f.nombreProducto, valor: r?.utilidadEstimada ?? 0 };
  });

  const puntoEquilibrioPorcentaje =
    resultadoActual && resultadoActual.precioVentaSugerido > 0
      ? (resultadoActual.costoEscalado / resultadoActual.precioVentaSugerido) * 100
      : 0;

  function handleExportPdf() {
    if (!resultadoActual) return;
    exportAnalisisPdf(
      formulacion,
      {
        costoEscalado: resultadoActual.costoEscalado,
        precioVentaSugerido: resultadoActual.precioVentaSugerido,
        margenPorcentaje: Number(formulacion.margenPorcentaje),
        utilidadEstimada: resultadoActual.utilidadEstimada,
        utilidadRealAcumulada,
        puntoEquilibrioPorcentaje,
      },
      desglose,
    );
  }

  if (error) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
        {error}
      </p>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
          Indicadores de rendimiento
        </h3>
        <button
          type="button"
          onClick={handleExportPdf}
          className="rounded-full border border-sky-300 px-3 py-1 text-xs font-medium text-sky-700 hover:bg-sky-50 dark:border-[#8B5CF6]/40 dark:text-[#a78bfa] dark:hover:bg-[#8B5CF6]/10"
        >
          Exportar ficha de rendimiento (PDF)
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/3 dark:shadow-none">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
            Costo de produccion
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            {resultadoActual ? formatCosto(resultadoActual.costoEscalado) : '—'}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/3 dark:shadow-none">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
            Precio de venta sugerido
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            {resultadoActual ? formatCosto(resultadoActual.precioVentaSugerido) : '—'}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/3 dark:shadow-none">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
            Utilidad estimada
          </p>
          <p className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-400">
            {resultadoActual ? formatCosto(resultadoActual.utilidadEstimada) : '—'}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/3 dark:shadow-none">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
            Punto de equilibrio
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            {puntoEquilibrioPorcentaje.toFixed(0)}% del lote
          </p>
        </div>
      </div>

      {produccionReal && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
            Produccion real acumulada (lo que de verdad se ha producido y vendido)
          </h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <div>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">Lotes producidos</p>
              <p className="mt-0.5 text-xl font-bold text-emerald-900 dark:text-emerald-200">{produccionReal.lotes}</p>
            </div>
            <div>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">Kg reales producidos</p>
              <p className="mt-0.5 text-xl font-bold text-emerald-900 dark:text-emerald-200">
                {formatKg(produccionReal.kgProducidos)} kg
              </p>
            </div>
            <div>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">Costo real</p>
              <p className="mt-0.5 text-xl font-bold text-emerald-900 dark:text-emerald-200">
                {formatCosto(produccionReal.costoReal)}
              </p>
            </div>
            <div>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">Ingreso real</p>
              <p className="mt-0.5 text-xl font-bold text-emerald-900 dark:text-emerald-200">
                {formatCosto(produccionReal.ingresoReal)}
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
            <div>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">Pendiente de cobro</p>
              <p className="mt-0.5 text-xl font-bold text-emerald-900 dark:text-emerald-200">
                {formatCosto(produccionReal.pendienteCobro)}
              </p>
            </div>
          </div>
        </div>
      )}

      {proyeccionMensual && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
              Proyeccion del proximo mes para este producto
            </h3>
            <span
              className={`text-xs font-semibold ${TENDENCIA_VOLUMEN_CLASSNAME[proyeccionMensual.tendenciaVolumen]}`}
            >
              {TENDENCIA_VOLUMEN_LABEL[proyeccionMensual.tendenciaVolumen]}
              {proyeccionMensual.variacionVolumenPorcentaje !== null &&
                ` (${proyeccionMensual.variacionVolumenPorcentaje > 0 ? '+' : ''}${proyeccionMensual.variacionVolumenPorcentaje.toFixed(0)}%)`}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">
            Promedio movil de los ultimos {proyeccionMensual.mesesBase} meses completos de este producto — si sigue
            la tendencia actual, el proximo mes deberia producir/vender aproximadamente:
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-slate-500 dark:text-zinc-500">Kg a producir</p>
              <p className="mt-0.5 text-xl font-bold text-slate-900 dark:text-white">
                {formatKg(proyeccionMensual.kgProyectado)} kg
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-zinc-500">Facturacion esperada</p>
              <p className="mt-0.5 text-xl font-bold text-slate-900 dark:text-white">
                {formatCosto(proyeccionMensual.ingresoProyectado)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-zinc-500">Ganancia esperada</p>
              <p
                className={`mt-0.5 text-xl font-bold ${proyeccionMensual.utilidadProyectada < 0 ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}
              >
                {formatCosto(proyeccionMensual.utilidadProyectada)}
              </p>
            </div>
          </div>
        </div>
      )}

      {ordenes && ordenes.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
            Trazabilidad de lotes producidos
          </h3>
          <table className="mt-3 w-full min-w-160 text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-white/10 dark:text-zinc-500">
                <th className="py-2">Lote</th>
                <th className="py-2">Fecha</th>
                <th className="py-2">Cantidad</th>
                <th className="py-2">Vencimiento</th>
                <th className="py-2">Utilidad real</th>
                <th className="py-2">Estado</th>
                <th className="py-2">Produccion</th>
              </tr>
            </thead>
            <tbody>
              {ordenes.map((orden) => (
                <tr key={orden.id} className="border-b border-slate-100 dark:border-white/5">
                  <td className="py-2 font-mono text-slate-800 dark:text-zinc-200">{orden.numeroLote}</td>
                  <td className="py-2 text-slate-600 dark:text-zinc-400">
                    {new Date(orden.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-2 text-slate-600 dark:text-zinc-400">
                    {formatKg(Number(orden.cantidadObjetivoKg))} kg
                  </td>
                  <td className="py-2 text-slate-600 dark:text-zinc-400">
                    {orden.fechaVencimiento ? new Date(orden.fechaVencimiento).toLocaleDateString() : '—'}
                  </td>
                  <td className={`py-2 font-medium ${utilidadClassName(ingresoRealDeOrden(orden) - costoRealTotal(orden))}`}>
                    {formatCosto(ingresoRealDeOrden(orden) - costoRealTotal(orden))}
                  </td>
                  <td className="py-2 text-slate-600 dark:text-zinc-400">{ESTADO_PAGO_LABEL[orden.estadoPago]}</td>
                  <td className="py-2">
                    <span
                      title={orden.notasCalidad ?? undefined}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap ${ESTADO_PRODUCCION_INFO[orden.estadoProduccion].className}`}
                    >
                      {ESTADO_PRODUCCION_INFO[orden.estadoProduccion].label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
            Desglose de costo por ingrediente
          </h3>
          <div className="mt-4">
            <DesgloseIngredientesChart data={desglose} />
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
            Donde queda frente a las demas (utilidad)
          </h3>
          <div className="mt-4">
            <RankingChart data={ranking} idSeleccionado={formulacion.id} formatValor={formatCosto} />
          </div>
        </div>
      </div>

      {comparacionCosto && comparacionCosto.filas.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
            ¿Por que cambio el costo?
          </h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
            Desde la ultima edicion ({new Date(comparacionCosto.fecha).toLocaleDateString()}), el costo del lote base{' '}
            <span className={`font-semibold ${comparacionCosto.deltaCostoTotal > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
              {comparacionCosto.deltaCostoTotal > 0 ? 'subio' : 'bajo'} {formatCosto(Math.abs(comparacionCosto.deltaCostoTotal))}
            </span>
            . El ingrediente que mas influye en ese cambio (y por lo tanto en el margen) es:
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-120 text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-white/10 dark:text-zinc-500">
                  <th className="py-2">Ingrediente</th>
                  <th className="py-2">Costo anterior</th>
                  <th className="py-2">Costo actual</th>
                  <th className="py-2">Variacion</th>
                </tr>
              </thead>
              <tbody>
                {comparacionCosto.filas.slice(0, 5).map((fila) => (
                  <tr key={fila.nombre} className="border-b border-slate-100 dark:border-white/5">
                    <td className="py-2 font-medium text-slate-800 dark:text-zinc-200">{fila.nombre}</td>
                    <td className="py-2 text-slate-600 dark:text-zinc-400">{formatCosto(fila.costoAnterior)}</td>
                    <td className="py-2 text-slate-600 dark:text-zinc-400">{formatCosto(fila.costoActual)}</td>
                    <td
                      className={`py-2 font-medium ${fila.deltaCosto > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}
                    >
                      {fila.deltaCosto > 0 ? '+' : ''}
                      {formatCosto(fila.deltaCosto)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {puntos === null && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      )}

      {puntos !== null && puntos.length < 2 && (
        <p className="rounded-xl border border-slate-200 bg-white p-4 text-slate-600 dark:border-white/10 dark:bg-white/3 dark:text-zinc-400">
          Esta formulacion aun no tiene historial de ediciones. Edita alguno de sus datos (margen, ingredientes, etc.)
          para empezar a ver su tendencia aqui.
        </p>
      )}

      {puntos !== null && puntos.length >= 2 && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
              Costo de produccion (lote base)
            </h3>
            <div className="mt-4">
              <TendenciaChart
                data={puntos.map((p) => ({ fecha: p.fechaCorta, valor: p.costoProduccion }))}
                ariaLabel="Tendencia del costo de produccion"
                formatValor={formatCosto}
              />
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
              Margen (%)
            </h3>
            <div className="mt-4">
              <TendenciaChart
                data={puntos.map((p) => ({ fecha: p.fechaCorta, valor: p.margen }))}
                ariaLabel="Tendencia del margen"
                formatValor={(n) => `${n.toFixed(1)}%`}
              />
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
              Utilidad estimada
            </h3>
            <div className="mt-4">
              <TendenciaChart
                data={puntos.map((p) => ({ fecha: p.fechaCorta, valor: p.utilidad }))}
                ariaLabel="Tendencia de la utilidad estimada"
                formatValor={formatCosto}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function AnalisisPage() {
  const { formulaciones, loading, error } = useFormulations();
  const [formulationId, setFormulationId] = useState<string>('');

  const selectedId = formulationId || formulaciones[0]?.id || '';
  const formulacionSeleccionada = formulaciones.find((f) => f.id === selectedId);

  return (
    <section className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Analisis</h2>
          <p className="mt-1 text-slate-600 dark:text-zinc-400">
            Rendimiento completo de una formulacion: cuanto deja, como se compone su costo y como se ha comportado a
            traves del tiempo.
          </p>
        </div>

        {!loading && !error && formulaciones.length > 0 && (
          <select
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200"
            value={selectedId}
            onChange={(e) => setFormulationId(e.target.value)}
            aria-label="Seleccionar formulacion"
          >
            {formulaciones.map((f) => (
              <option key={f.id} value={f.id} className="text-slate-900">
                {f.nombreProducto}
              </option>
            ))}
          </select>
        )}
      </div>

      {loading && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
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
          description="Cuando tengas al menos una formulacion, aqui veras su rendimiento completo: costo, margen, utilidad y comportamiento en el tiempo."
          actionLabel="Ir a Formulaciones"
          actionHref="/formulaciones"
        />
      )}

      {!loading && !error && formulacionSeleccionada && (
        <AnalisisDetalle
          key={formulacionSeleccionada.id}
          formulacion={formulacionSeleccionada}
          todasLasFormulaciones={formulaciones}
        />
      )}
    </section>
  );
}
