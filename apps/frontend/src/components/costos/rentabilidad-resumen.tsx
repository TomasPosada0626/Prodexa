'use client';

import { Formulation } from '@/lib/api';
import { calculateCost } from '@/lib/costing';
import { formatCosto, formatKg } from '@/lib/format';
import { downloadCsv } from '@/lib/export';
import { CostoVsPrecioChart } from './costo-vs-precio-chart';

interface Props {
  formulaciones: Formulation[];
}

export function RentabilidadResumen({ formulaciones }: Props) {
  const filas = formulaciones.map((formulacion) => {
    const costoBaseTotal = formulacion.ingredientes.reduce((total, i) => total + Number(i.precioTotal), 0);
    const cantidadBaseKg = Number(formulacion.cantidadBaseKg);
    const resultado = calculateCost({
      costoBaseTotal,
      cantidadBaseKg,
      cantidadObjetivoKg: cantidadBaseKg,
      margenPorcentaje: Number(formulacion.margenPorcentaje),
      impuestoPorcentaje: Number(formulacion.impuestoPorcentaje),
    });

    return { formulacion, cantidadBaseKg, resultado };
  });

  function handleExportCsv() {
    const fecha = new Date().toISOString().slice(0, 10);
    downloadCsv(
      `rentabilidad-${fecha}.csv`,
      ['Formulacion', 'Lote base (kg)', 'Costo produccion', 'Precio venta', 'Utilidad', 'Margen (%)'],
      filas.map(({ formulacion, cantidadBaseKg, resultado }) => [
        formulacion.nombreProducto,
        cantidadBaseKg.toFixed(4),
        resultado ? resultado.costoEscalado.toFixed(2) : '',
        resultado ? resultado.precioVentaSugerido.toFixed(2) : '',
        resultado ? resultado.utilidadEstimada.toFixed(2) : '',
        Number(formulacion.margenPorcentaje),
      ]),
    );
  }

  return (
    <div className="grid gap-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-500">
          Costo de produccion vs. precio de venta
        </h3>
        <div className="mt-4">
          <CostoVsPrecioChart
            data={filas
              .filter(({ resultado }) => resultado !== null)
              .map(({ formulacion, resultado }) => ({
                id: formulacion.id,
                nombre: formulacion.nombreProducto,
                costo: resultado?.costoEscalado ?? 0,
                precioVenta: resultado?.precioVentaSugerido ?? 0,
              }))}
            formatValor={formatCosto}
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-500">
          Rentabilidad por lote base de cada formulacion
        </h3>
        <button
          type="button"
          onClick={handleExportCsv}
          className="rounded-full border border-sky-300 px-3 py-1 text-xs font-medium text-sky-700 hover:bg-sky-50 dark:border-[#8B5CF6]/40 dark:text-[#a78bfa] dark:hover:bg-[#8B5CF6]/10"
        >
          Exportar CSV
        </button>
      </div>
      <table className="mt-3 w-full min-w-160 text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-white/10 dark:text-zinc-500">
            <th className="py-2">Formulacion</th>
            <th className="py-2">Lote base</th>
            <th className="py-2">Costo produccion</th>
            <th className="py-2">Precio venta</th>
            <th className="py-2">Utilidad</th>
            <th className="py-2">Margen</th>
          </tr>
        </thead>
        <tbody>
          {filas.map(({ formulacion, cantidadBaseKg, resultado }) => (
            <tr key={formulacion.id} className="border-b border-slate-100 dark:border-white/5">
              <td className="py-2 font-medium text-slate-800 dark:text-zinc-200">{formulacion.nombreProducto}</td>
              <td className="py-2 text-slate-600 dark:text-zinc-400">{formatKg(cantidadBaseKg)} kg</td>
              <td className="py-2 text-slate-600 dark:text-zinc-400">
                {resultado ? formatCosto(resultado.costoEscalado) : '—'}
              </td>
              <td className="py-2 text-slate-600 dark:text-zinc-400">
                {resultado ? formatCosto(resultado.precioVentaSugerido) : '—'}
              </td>
              <td className="py-2 font-medium text-emerald-700 dark:text-emerald-400">
                {resultado ? formatCosto(resultado.utilidadEstimada) : '—'}
              </td>
              <td className="py-2 text-slate-600 dark:text-zinc-400">{Number(formulacion.margenPorcentaje)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
