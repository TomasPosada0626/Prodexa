'use client';

import { useEffect, useState } from 'react';
import {
  ApiError,
  Formulation,
  ProductionOrder,
  getProductionOrders,
  updateProductionOrder,
} from '@/lib/api';
import { useToast } from '@/context/toast-context';

interface Props {
  formulaciones: Formulation[];
}

/**
 * Control de calidad por lote: lotes que ya se produjeron y estan en EN_CALIDAD esperan
 * aprobacion (pasan a TERMINADO) o rechazo (pasan a RECHAZADO con nota). Un RECHAZADO se
 * conserva aqui para trazabilidad pero se excluye de la rentabilidad en Reportes/Dashboard/Analisis.
 */
export function ControlCalidadLotes({ formulaciones }: Props) {
  const { showToast } = useToast();
  const [ordenes, setOrdenes] = useState<ProductionOrder[] | null>(null);
  const [rechazandoId, setRechazandoId] = useState<string | null>(null);
  const [notaRechazo, setNotaRechazo] = useState('');
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  function cargar() {
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
  }

  useEffect(cargar, []);

  const nombrePorFormulacionId = new Map(formulaciones.map((f) => [f.id, f.nombreProducto]));

  if (ordenes === null) return null;

  const enCalidad = ordenes
    .filter((o) => o.estadoProduccion === 'EN_CALIDAD')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const rechazadosRecientes = ordenes
    .filter((o) => o.estadoProduccion === 'RECHAZADO')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);
  const evaluados = ordenes.filter((o) => o.estadoProduccion === 'TERMINADO' || o.estadoProduccion === 'RECHAZADO');
  const tasaRechazo = evaluados.length
    ? Math.round((ordenes.filter((o) => o.estadoProduccion === 'RECHAZADO').length / evaluados.length) * 100)
    : 0;

  async function aprobar(id: string) {
    setProcesandoId(id);
    try {
      const actualizada = await updateProductionOrder(id, { estadoProduccion: 'TERMINADO' });
      setOrdenes((prev) => prev?.map((o) => (o.id === id ? actualizada : o)) ?? null);
      showToast('Lote aprobado.');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'No se pudo aprobar el lote.', 'error');
    } finally {
      setProcesandoId(null);
    }
  }

  async function confirmarRechazo(id: string) {
    if (!notaRechazo.trim()) {
      showToast('Ingresa el motivo del rechazo.', 'error');
      return;
    }
    setProcesandoId(id);
    try {
      const actualizada = await updateProductionOrder(id, {
        estadoProduccion: 'RECHAZADO',
        notasCalidad: notaRechazo.trim(),
      });
      setOrdenes((prev) => prev?.map((o) => (o.id === id ? actualizada : o)) ?? null);
      setRechazandoId(null);
      setNotaRechazo('');
      showToast('Lote rechazado.');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'No se pudo rechazar el lote.', 'error');
    } finally {
      setProcesandoId(null);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/3 dark:shadow-none">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
            Lotes esperando revision
          </p>
          <p className="mt-1 text-3xl font-bold text-amber-700 dark:text-amber-400">{enCalidad.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/3 dark:shadow-none">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
            Tasa de rechazo (historica)
          </p>
          <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">{tasaRechazo}%</p>
        </div>
      </div>

      {enCalidad.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-zinc-500">
          No hay lotes esperando revision de calidad. Marca un lote como &quot;En calidad&quot; desde Preparar cuando
          termine de producirse.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/3">
          <table className="w-full min-w-160 text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-white/10 dark:text-zinc-500">
                <th className="py-2">Lote</th>
                <th className="py-2">Formulacion</th>
                <th className="py-2">Registrado</th>
                <th className="py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {enCalidad.map((orden) => (
                <tr key={orden.id} className="border-b border-slate-100 dark:border-white/5">
                  {rechazandoId === orden.id ? (
                    <td colSpan={4} className="py-2">
                      <div className="grid gap-2 rounded-md border border-red-200 bg-red-50 p-2 dark:border-red-500/30 dark:bg-red-500/10">
                        <label className="grid gap-0.5 text-xs text-slate-700 dark:text-zinc-300">
                          Motivo del rechazo
                          <textarea
                            autoFocus
                            value={notaRechazo}
                            onChange={(e) => setNotaRechazo(e.target.value)}
                            rows={2}
                            placeholder="Ej. olor fuera de especificacion, contaminacion visible..."
                            className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs dark:border-white/10 dark:bg-white/5 dark:text-white"
                          />
                        </label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => void confirmarRechazo(orden.id)}
                            disabled={procesandoId === orden.id}
                            className="rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
                          >
                            {procesandoId === orden.id ? 'Guardando...' : 'Confirmar rechazo'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRechazandoId(null);
                              setNotaRechazo('');
                            }}
                            disabled={procesandoId === orden.id}
                            className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-600 disabled:opacity-60 dark:border-white/10 dark:text-zinc-400"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    </td>
                  ) : (
                    <>
                      <td className="py-2 font-mono text-slate-800 dark:text-zinc-200">{orden.numeroLote}</td>
                      <td className="py-2 text-slate-600 dark:text-zinc-400">
                        {nombrePorFormulacionId.get(orden.formulationId) ?? 'formulacion eliminada'}
                      </td>
                      <td className="py-2 whitespace-nowrap text-slate-600 dark:text-zinc-400">
                        {new Date(orden.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-2">
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => void aprobar(orden.id)}
                            disabled={procesandoId === orden.id}
                            className="rounded-full border border-emerald-300 px-2 py-0.5 text-xs text-emerald-700 hover:bg-emerald-50 disabled:opacity-60 dark:border-emerald-500/30 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                          >
                            Aprobar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRechazandoId(orden.id);
                              setNotaRechazo('');
                            }}
                            disabled={procesandoId === orden.id}
                            className="rounded-full border border-red-300 px-2 py-0.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
                          >
                            Rechazar
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rechazadosRecientes.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/3">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-500">
            Rechazados recientes
          </h4>
          <table className="w-full min-w-160 text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-white/10 dark:text-zinc-500">
                <th className="py-2">Lote</th>
                <th className="py-2">Formulacion</th>
                <th className="py-2">Fecha</th>
                <th className="py-2">Motivo</th>
              </tr>
            </thead>
            <tbody>
              {rechazadosRecientes.map((orden) => (
                <tr key={orden.id} className="border-b border-slate-100 dark:border-white/5">
                  <td className="py-2 font-mono text-slate-800 dark:text-zinc-200">{orden.numeroLote}</td>
                  <td className="py-2 text-slate-600 dark:text-zinc-400">
                    {nombrePorFormulacionId.get(orden.formulationId) ?? 'formulacion eliminada'}
                  </td>
                  <td className="py-2 whitespace-nowrap text-slate-600 dark:text-zinc-400">
                    {new Date(orden.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-2 text-slate-600 dark:text-zinc-400">{orden.notasCalidad ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
