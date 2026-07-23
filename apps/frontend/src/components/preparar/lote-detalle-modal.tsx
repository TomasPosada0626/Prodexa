'use client';

import { useEffect, useState } from 'react';
import { ApiError, Formulation, Pago, ProductionOrder, addPago, deletePago, getPagos } from '@/lib/api';
import { formatCosto, formatKg, utilidadClassName } from '@/lib/format';
import { costoRealTotal, ingresoRealDeOrden, montoCobradoDeOrden, montoPendienteDeOrden } from '@/lib/costing';
import { useToast } from '@/context/toast-context';
import { useAuth } from '@/context/auth-context';

interface Props {
  orden: ProductionOrder | null;
  formulacion: Formulation | undefined;
  onClose: () => void;
  /** El backend recalcula montoCobrado/estadoPago al agregar o quitar un abono: el padre
   * necesita la orden actualizada para que el historial no quede desincronizado. */
  onOrdenActualizada?: (orden: ProductionOrder) => void;
}

interface FilaCosto {
  label: string;
  valor: string;
  nota?: string;
}

const inputEdicionClasses =
  'w-full rounded-md border border-slate-300 px-1.5 py-1 text-xs dark:border-white/10 dark:bg-white/5 dark:text-white';

/** Modal flotante con el desglose completo de costos de un lote, y los abonos/pagos parciales registrados. */
export function LoteDetalleModal({ orden, formulacion, onClose, onOrdenActualizada }: Props) {
  const { showToast } = useToast();
  const { user } = useAuth();
  // Borrar un abono es irreversible y afecta dinero ya registrado como cobrado: solo
  // ADMIN/COORDINADOR, igual que el backend (production-orders.controller.ts).
  const puedeBorrarPago = user?.rol === 'ADMIN' || user?.rol === 'COORDINADOR';
  const [pagos, setPagos] = useState<Pago[] | null>(null);
  const [montoAbono, setMontoAbono] = useState('');
  const [fechaAbono, setFechaAbono] = useState('');
  const [guardandoAbono, setGuardandoAbono] = useState(false);
  const [confirmarExceso, setConfirmarExceso] = useState(false);
  const [borrandoPagoId, setBorrandoPagoId] = useState<string | null>(null);

  // Sin reset manual al cambiar de orden: el padre monta este componente con key={orden.id},
  // asi que un lote distinto es una instancia nueva (estado local ya arranca limpio).
  const ordenId = orden?.id;
  useEffect(() => {
    if (!ordenId) return;
    let cancelled = false;
    getPagos(ordenId)
      .then((data) => {
        if (!cancelled) setPagos(data);
      })
      .catch(() => {
        if (!cancelled) setPagos([]);
      });
    return () => {
      cancelled = true;
    };
  }, [ordenId]);

  if (!orden) return null;

  async function handleAgregarAbono() {
    if (!orden) return;
    const monto = Number(montoAbono);
    if (!(monto > 0)) {
      showToast('Ingresa un monto valido para el abono.', 'error');
      return;
    }
    // Si el abono supera lo pendiente, no lo bloqueamos (puede ser un pago de mas real), pero
    // exigimos un segundo clic para confirmar: evita que un error de digitacion pase desapercibido.
    if (monto > pendiente && !confirmarExceso) {
      setConfirmarExceso(true);
      return;
    }
    setGuardandoAbono(true);
    try {
      const actualizada = await addPago(orden.id, {
        monto,
        fecha: fechaAbono || undefined,
      });
      const nuevosPagos = await getPagos(orden.id);
      setPagos(nuevosPagos);
      onOrdenActualizada?.(actualizada);
      setMontoAbono('');
      setFechaAbono('');
      setConfirmarExceso(false);
      showToast('Abono registrado.');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'No se pudo registrar el abono.', 'error');
    } finally {
      setGuardandoAbono(false);
    }
  }

  async function handleBorrarAbono(pagoId: string) {
    if (!orden) return;
    setBorrandoPagoId(pagoId);
    try {
      const actualizada = await deletePago(orden.id, pagoId);
      setPagos((prev) => prev?.filter((p) => p.id !== pagoId) ?? null);
      onOrdenActualizada?.(actualizada);
      showToast('Abono eliminado.');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'No se pudo eliminar el abono.', 'error');
    } finally {
      setBorrandoPagoId(null);
    }
  }

  const empaqueEtiquetaIncluidos = orden.esMaquila && orden.maquilaIncluyeEmpaque;

  const filas: FilaCosto[] = [
    { label: 'Ingredientes', valor: formatCosto(Number(orden.costoEscalado)) },
    {
      label: 'Empaque',
      valor: formatCosto(Number(orden.costoEmpaque)),
      nota: empaqueEtiquetaIncluidos ? 'Incluido en el costo de maquila.' : undefined,
    },
    {
      label: 'Etiqueta',
      valor: formatCosto(Number(orden.costoEtiqueta)),
      nota: empaqueEtiquetaIncluidos ? 'Incluido en el costo de maquila.' : undefined,
    },
    {
      label: orden.esMaquila ? 'Maquila (tercero)' : 'Mano de obra (propia)',
      valor: formatCosto(Number(orden.costoManoObra)),
      nota: orden.esMaquila
        ? `Cobrado por el maquilador${empaqueEtiquetaIncluidos ? ', incluye empaque y etiqueta' : ''}.`
        : 'Calculada por tiempo estimado x tarifa/hora.',
    },
    {
      label: 'Energia / gas',
      valor: formatCosto(Number(orden.costoEnergia)),
      nota: orden.esMaquila
        ? 'No se cobra: el maquilador asumio su propio gasto de energia/gas.'
        : 'Calculada por tiempo estimado x tarifa/hora.',
    },
    {
      label: 'Gastos generales',
      valor: formatCosto(Number(orden.costoGastosGenerales)),
      nota: 'Prorrateo de arriendo/nomina administrativa; aplica aunque el lote se haya maquilado.',
    },
    { label: 'Transporte', valor: formatCosto(Number(orden.costoTransporte)) },
    {
      label: 'Mermas',
      valor: formatCosto(Number(orden.costoMermas)),
      nota: orden.esMaquila ? 'No se cobra: la merma del proceso es responsabilidad del maquilador.' : undefined,
    },
  ];

  const ingresoTotal = ingresoRealDeOrden(orden);
  const cobrado = montoCobradoDeOrden(orden);
  const pendiente = montoPendienteDeOrden(orden);
  const porcentajeCobrado = ingresoTotal > 0 ? Math.min(100, (cobrado / ingresoTotal) * 100) : 0;

  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center bg-slate-900/40 px-4 dark:bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lote-detalle-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-[#0b0a16] dark:shadow-black/60"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 id="lote-detalle-title" className="text-base font-semibold text-slate-900 dark:text-white">
              Lote {orden.numeroLote}
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-500">
              {formulacion?.nombreProducto ?? 'Formulacion'} · {formatKg(Number(orden.cantidadObjetivoKg))} kg ·{' '}
              {new Date(orden.createdAt).toLocaleDateString()}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-full border border-slate-300 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-white/5"
          >
            Cerrar
          </button>
        </div>

        <dl className="mt-4 grid gap-1.5">
          {filas.map((fila) => (
            <div key={fila.label} className="border-b border-slate-100 py-1.5 dark:border-white/5">
              <div className="flex items-center justify-between">
                <dt className="text-sm text-slate-600 dark:text-zinc-400">{fila.label}</dt>
                <dd className="text-sm font-semibold text-slate-900 dark:text-white">{fila.valor}</dd>
              </div>
              {fila.nota && <p className="text-[11px] text-slate-500 dark:text-zinc-500">{fila.nota}</p>}
            </div>
          ))}
          <div className="border-b border-slate-100 py-1.5 dark:border-white/5">
            <div className="flex items-center justify-between">
              <dt className="text-sm text-slate-600 dark:text-zinc-400">Duracion de produccion</dt>
              <dd className="text-sm font-semibold text-slate-900 dark:text-white">
                {orden.tiempoProduccionHoras ? `${Number(orden.tiempoProduccionHoras).toFixed(2)} h` : '—'}
              </dd>
            </div>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <dt className="text-sm font-semibold text-slate-900 dark:text-white">Costo real total</dt>
            <dd className="text-sm font-bold text-slate-900 dark:text-white">
              {formatCosto(costoRealTotal(orden))}
            </dd>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <dt className="text-sm text-slate-600 dark:text-zinc-400">Ingreso (real o sugerido)</dt>
            <dd className="text-sm font-semibold text-slate-900 dark:text-white">{formatCosto(ingresoTotal)}</dd>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <dt className="text-sm font-semibold text-slate-900 dark:text-white">Utilidad real</dt>
            <dd className={`text-sm font-bold ${utilidadClassName(ingresoTotal - costoRealTotal(orden))}`}>
              {formatCosto(ingresoTotal - costoRealTotal(orden))}
            </dd>
          </div>
        </dl>

        <div className="mt-5 border-t border-slate-100 pt-4 dark:border-white/10">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-500">
              Cobros de este lote
            </h4>
            <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
              {formatCosto(cobrado)} de {formatCosto(ingresoTotal)}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
            <div
              className="h-full rounded-full bg-emerald-500 dark:bg-emerald-400"
              style={{ width: `${porcentajeCobrado}%` }}
            />
          </div>
          {pendiente > 0 && (
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">Falta cobrar {formatCosto(pendiente)}.</p>
          )}

          {pagos === null ? (
            <p className="mt-2 text-xs text-slate-500 dark:text-zinc-500">Cargando abonos...</p>
          ) : pagos.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500 dark:text-zinc-500">
              Aun no has registrado ningun abono para este lote.
            </p>
          ) : (
            <ul className="mt-2 grid gap-1">
              {pagos.map((pago) => (
                <li key={pago.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-600 dark:text-zinc-400">
                    {new Date(pago.fecha).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="font-medium text-slate-800 dark:text-zinc-200">
                      {formatCosto(Number(pago.monto))}
                    </span>
                    {puedeBorrarPago && (
                      <button
                        type="button"
                        onClick={() => void handleBorrarAbono(pago.id)}
                        disabled={borrandoPagoId === pago.id}
                        className="rounded-full border border-red-300 px-1.5 py-0.5 text-[11px] text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
                      >
                        {borrandoPagoId === pago.id ? '...' : 'Quitar'}
                      </button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {pendiente > 0 && (
            <div className="mt-3">
              <div className="flex flex-wrap items-end gap-2">
                <label className="grid gap-0.5 text-xs text-slate-600 dark:text-zinc-400">
                  Monto del abono
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0"
                    value={montoAbono}
                    onChange={(e) => {
                      setMontoAbono(e.target.value);
                      setConfirmarExceso(false);
                    }}
                    className={inputEdicionClasses}
                  />
                </label>
                <label className="grid gap-0.5 text-xs text-slate-600 dark:text-zinc-400">
                  Fecha
                  <input
                    type="date"
                    value={fechaAbono}
                    onChange={(e) => setFechaAbono(e.target.value)}
                    className={inputEdicionClasses}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void handleAgregarAbono()}
                  disabled={guardandoAbono}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60 ${
                    confirmarExceso
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-sky-700 dark:bg-[#8B5CF6]'
                  }`}
                >
                  {guardandoAbono ? 'Guardando...' : confirmarExceso ? 'Confirmar de todas formas' : 'Agregar abono'}
                </button>
              </div>
              {Number(montoAbono) > pendiente && (
                <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                  ⚠ Ese abono ({formatCosto(Number(montoAbono))}) es mayor a lo pendiente ({formatCosto(pendiente)}).
                  Vuelve a hacer clic para confirmarlo de todas formas.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
