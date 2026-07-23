'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ApiError,
  EstadoPago,
  EstadoProduccion,
  Formulation,
  ProductionOrder,
  UnidadPresentacion,
  createProductionOrder,
  deleteProductionOrder,
  getProductionOrders,
  updateProductionOrder,
} from '@/lib/api';
import { formatCosto, formatGramos, formatKg, utilidadClassName } from '@/lib/format';
import {
  ESTADO_PRODUCCION_INFO,
  NIVEL_CARTERA_CLASSNAME,
  costoRealTotal,
  diasPendiente,
  ingresoRealDeOrden,
  montoPendienteDeOrden,
  nivelCartera,
  opcionesEstadoProduccion,
} from '@/lib/costing';
import { useToast } from '@/context/toast-context';
import { useAuth } from '@/context/auth-context';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Collapsible } from '@/components/shared/collapsible';
import { LoteDetalleModal } from '@/components/preparar/lote-detalle-modal';

const UNIDADES_PRESENTACION: UnidadPresentacion[] = ['ml', 'L', 'g', 'kg'];

const inputClasses =
  'rounded-lg border border-slate-300 px-3 py-2 dark:border-white/10 dark:bg-white/5 dark:text-white';
const inputEdicionClasses =
  'w-full rounded-md border border-slate-300 px-1.5 py-1 text-xs dark:border-white/10 dark:bg-white/5 dark:text-white';

/** Aproxima ml como g (densidad 1) para poder estimar envases: es una guia informativa, no afecta el costeo. */
function gramosPorUnidad(cantidad: number, unidad: UnidadPresentacion): number {
  if (unidad === 'kg' || unidad === 'L') return cantidad * 1000;
  return cantidad;
}

function envasesDeOrden(orden: ProductionOrder): number | null {
  if (!orden.tamanoPresentacion || !orden.unidadPresentacion) return null;
  const gramosPresentacion = gramosPorUnidad(Number(orden.tamanoPresentacion), orden.unidadPresentacion);
  if (gramosPresentacion <= 0) return null;
  return (Number(orden.cantidadObjetivoKg) * 1000) / gramosPresentacion;
}

export interface PrepararInitialValues {
  formulationId?: string;
  cantidadObjetivoKg?: string;
  tamanoPresentacion?: string;
  unidadPresentacion?: UnidadPresentacion;
  costoEmpaque?: string;
  costoEtiqueta?: string;
  costoTransporte?: string;
  costoMermas?: string;
}

interface Props {
  formulaciones: Formulation[];
  /** Viene de Costos ("Registrar como orden de produccion"): pre-llena el formulario con el
   * analisis ya hecho, para no tener que retipear todo si el analisis convencio. */
  initial?: PrepararInitialValues;
}

interface EscaladoRow {
  nombre: string;
  porcentaje: number;
  cantidadGramos: number;
  cantidadKg: number;
  costo: number;
}

interface EdicionOrden {
  cantidadObjetivoKg: string;
  numeroLote: string;
  fechaVencimiento: string;
  costoEmpaque: string;
  costoEtiqueta: string;
  esMaquila: boolean;
  maquilaIncluyeEmpaque: boolean;
  costoManoObra: string;
  costoTransporte: string;
  costoMermas: string;
  precioVentaReal: string;
  estadoPago: EstadoPago;
  fechaPago: string;
  estadoProduccion: EstadoProduccion;
  notasCalidad: string;
}

/** Convierte un costo total guardado de vuelta a costo por envase, usando los envases de la orden. */
function costoUnitarioDesdeTotal(total: string, envases: number | null): string {
  const unitario = envases && envases > 0 ? Number(total) / envases : Number(total);
  return unitario ? String(Math.round(unitario * 100) / 100) : '';
}

/** Empaque y etiqueta se editan como costo por envase, y mermas como % del costo de ingredientes:
 * aqui se convierten los totales guardados de vuelta a esas unidades para el formulario. */
function edicionDesdeOrden(orden: ProductionOrder): EdicionOrden {
  const envases = envasesDeOrden(orden);
  const costoEscalado = Number(orden.costoEscalado);
  const mermasPorcentaje = costoEscalado > 0 ? (Number(orden.costoMermas) / costoEscalado) * 100 : 0;

  return {
    cantidadObjetivoKg: orden.cantidadObjetivoKg,
    numeroLote: orden.numeroLote,
    fechaVencimiento: orden.fechaVencimiento?.slice(0, 10) ?? '',
    costoEmpaque: costoUnitarioDesdeTotal(orden.costoEmpaque, envases),
    costoEtiqueta: costoUnitarioDesdeTotal(orden.costoEtiqueta, envases),
    esMaquila: orden.esMaquila,
    maquilaIncluyeEmpaque: orden.maquilaIncluyeEmpaque,
    costoManoObra: orden.costoManoObra,
    costoTransporte: orden.costoTransporte,
    costoMermas: mermasPorcentaje ? String(Math.round(mermasPorcentaje * 100) / 100) : '',
    precioVentaReal: orden.precioVentaReal ?? '',
    estadoPago: orden.estadoPago,
    fechaPago: orden.fechaPago?.slice(0, 10) ?? '',
    estadoProduccion: orden.estadoProduccion,
    notasCalidad: orden.notasCalidad ?? '',
  };
}

const ESTADO_PAGO_INFO: Record<EstadoPago, { label: string; className: string }> = {
  PENDIENTE: {
    label: 'Pendiente de cobro',
    className: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  },
  PARCIAL: {
    label: 'Abono parcial',
    className: 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',
  },
  PAGADO: {
    label: 'Cobrado',
    className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  },
};

interface HistorialProduccionProps {
  formulationId: string;
  formulacion: Formulation | undefined;
}

/** Keyed por formulationId+refreshKey en el padre para que recargue al cambiar de formulacion o guardar una orden. */
function HistorialProduccion({ formulationId, formulacion }: HistorialProduccionProps) {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [ordenes, setOrdenes] = useState<ProductionOrder[] | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [edicion, setEdicion] = useState<EdicionOrden | null>(null);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [ordenAEliminar, setOrdenAEliminar] = useState<ProductionOrder | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [ordenDetalle, setOrdenDetalle] = useState<ProductionOrder | null>(null);
  // Anular un lote es irreversible y borra un registro financiero: solo ADMIN/COORDINADOR,
  // igual que el backend (production-orders.controller.ts).
  const puedeAnular = user?.rol === 'ADMIN' || user?.rol === 'COORDINADOR';

  function cargar() {
    let cancelled = false;
    getProductionOrders(formulationId)
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

  useEffect(cargar, [formulationId]);

  function iniciarEdicion(orden: ProductionOrder) {
    setEditandoId(orden.id);
    setEdicion(edicionDesdeOrden(orden));
  }

  function actualizarCampoEdicion<K extends keyof EdicionOrden>(campo: K, valor: EdicionOrden[K]) {
    setEdicion((prev) => (prev ? { ...prev, [campo]: valor } : prev));
  }

  async function guardarEdicion(id: string) {
    if (!edicion) return;
    const cantidad = Number(edicion.cantidadObjetivoKg);
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      showToast('Ingresa una cantidad valida.', 'error');
      return;
    }
    if (!edicion.numeroLote.trim()) {
      showToast('El numero de lote es obligatorio.', 'error');
      return;
    }
    if (edicion.esMaquila && !(Number(edicion.costoManoObra) > 0)) {
      showToast('Ingresa cuanto te cobro el maquilador (costo de maquila).', 'error');
      return;
    }
    const ordenOriginal = ordenes?.find((o) => o.id === id);
    setGuardandoEdicion(true);
    try {
      // Empaque se edita como costo por envase y mermas como % del costo de ingredientes:
      // se convierten de vuelta a totales aqui, usando la presentacion de la orden original y
      // el costo de ingredientes escalado proporcionalmente si la cantidad tambien cambio.
      const ratio = ordenOriginal ? cantidad / Number(ordenOriginal.cantidadObjetivoKg) : 1;
      const envasesEditados =
        ordenOriginal?.tamanoPresentacion && ordenOriginal.unidadPresentacion
          ? (cantidad * 1000) /
            gramosPorUnidad(Number(ordenOriginal.tamanoPresentacion), ordenOriginal.unidadPresentacion)
          : null;
      const costoEscaladoEstimado = ordenOriginal ? Number(ordenOriginal.costoEscalado) * ratio : 0;

      const cantidadBaseKgFormulacion = Number(formulacion?.cantidadBaseKg ?? 0);
      const tiempoEscalado =
        formulacion?.tiempoProduccionHoras && cantidadBaseKgFormulacion > 0
          ? (Number(formulacion.tiempoProduccionHoras) * cantidad) / cantidadBaseKgFormulacion
          : 0;
      const costoEnergiaCalculado = tiempoEscalado * Number(user?.tarifaEnergiaHora ?? 0);
      const costoManoObraCalculado = tiempoEscalado * Number(user?.tarifaManoObraHora ?? 0);
      // Prorrateo de gastos generales, en base a la cantidad (editada) de este lote: aplica
      // siempre, aunque el lote se haya maquilado.
      const costoGastosGeneralesCalculado =
        Number(user?.capacidadProduccionMensualKg ?? 0) > 0
          ? (Number(user?.gastoGeneralMensual ?? 0) / Number(user?.capacidadProduccionMensualKg ?? 1)) * cantidad
          : 0;
      // Si se maquilo y el maquilador ya entrega empacado/etiquetado, ese costo va incluido en
      // costoManoObra: no se cobra aparte. La energia y la merma tampoco se cobran si se maquilo.
      const empaqueEtiquetaBloqueados = edicion.esMaquila && edicion.maquilaIncluyeEmpaque;

      const actualizada = await updateProductionOrder(id, {
        cantidadObjetivoKg: cantidad,
        numeroLote: edicion.numeroLote.trim(),
        fechaVencimiento: edicion.fechaVencimiento || undefined,
        costoEmpaque:
          !empaqueEtiquetaBloqueados && Number(edicion.costoEmpaque) > 0
            ? Number(edicion.costoEmpaque) * (envasesEditados ?? 1)
            : 0,
        costoEtiqueta:
          !empaqueEtiquetaBloqueados && Number(edicion.costoEtiqueta) > 0
            ? Number(edicion.costoEtiqueta) * (envasesEditados ?? 1)
            : 0,
        esMaquila: edicion.esMaquila,
        maquilaIncluyeEmpaque: edicion.esMaquila ? edicion.maquilaIncluyeEmpaque : false,
        costoManoObra: edicion.esMaquila ? Number(edicion.costoManoObra) || 0 : costoManoObraCalculado,
        costoEnergia: edicion.esMaquila ? 0 : costoEnergiaCalculado,
        tiempoProduccionHoras: tiempoEscalado || undefined,
        costoGastosGenerales: costoGastosGeneralesCalculado,
        costoTransporte: Number(edicion.costoTransporte) || 0,
        costoMermas:
          !edicion.esMaquila && Number(edicion.costoMermas) > 0
            ? (Number(edicion.costoMermas) / 100) * costoEscaladoEstimado
            : 0,
        precioVentaReal: edicion.precioVentaReal ? Number(edicion.precioVentaReal) : undefined,
        estadoPago: edicion.estadoPago,
        fechaPago: edicion.estadoPago === 'PAGADO' && edicion.fechaPago ? edicion.fechaPago : undefined,
        estadoProduccion: edicion.estadoProduccion,
        notasCalidad: edicion.notasCalidad.trim() || undefined,
      });
      setOrdenes((prev) => prev?.map((o) => (o.id === id ? actualizada : o)) ?? null);
      setEditandoId(null);
      setEdicion(null);
      showToast('Orden de produccion actualizada.');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'No se pudo actualizar la orden.', 'error');
    } finally {
      setGuardandoEdicion(false);
    }
  }

  async function confirmarEliminar() {
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

  if (ordenes === null) return null;
  if (ordenes.length === 0) {
    return (
      <p className="text-xs text-slate-500 dark:text-zinc-500">Aun no has registrado ordenes de produccion para esta formulacion.</p>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-220 text-left text-xs text-slate-600 dark:text-zinc-400">
          <thead>
            <tr className="border-b border-slate-200 uppercase tracking-wide text-slate-500 dark:border-white/10 dark:text-zinc-500">
              <th className="py-1.5 pr-2 font-medium">Fecha</th>
              <th className="py-1.5 pr-2 font-medium">Lote</th>
              <th className="py-1.5 pr-2 font-medium">Cantidad</th>
              <th className="py-1.5 pr-2 font-medium">Presentacion</th>
              <th className="py-1.5 pr-2 font-medium">Envases</th>
              <th className="py-1.5 pr-2 font-medium">Vencimiento</th>
              <th className="py-1.5 pr-2 font-medium">Costo real</th>
              <th className="py-1.5 pr-2 font-medium">Utilidad</th>
              <th className="py-1.5 pr-2 font-medium">Pago</th>
              <th className="py-1.5 pr-2 font-medium">Produccion</th>
              <th className="py-1.5 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {ordenes.slice(0, 5).map((orden) => (
              <tr key={orden.id} className="border-b border-slate-100 dark:border-white/5">
                {editandoId === orden.id && edicion ? (
                  <td colSpan={11} className="py-2">
                    <div className="grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-2 dark:border-white/10 dark:bg-white/3">
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <label className="grid gap-0.5">
                          Cantidad (kg)
                          <input
                            type="number"
                            min="0.001"
                            step="0.001"
                            autoFocus
                            value={edicion.cantidadObjetivoKg}
                            onChange={(e) => actualizarCampoEdicion('cantidadObjetivoKg', e.target.value)}
                            className={inputEdicionClasses}
                          />
                        </label>
                        <label className="grid gap-0.5">
                          Numero de lote
                          <input
                            type="text"
                            value={edicion.numeroLote}
                            onChange={(e) => actualizarCampoEdicion('numeroLote', e.target.value)}
                            className={inputEdicionClasses}
                          />
                        </label>
                        <label className="grid gap-0.5">
                          Vencimiento
                          <input
                            type="date"
                            value={edicion.fechaVencimiento}
                            onChange={(e) => actualizarCampoEdicion('fechaVencimiento', e.target.value)}
                            className={inputEdicionClasses}
                          />
                        </label>
                        <label className="grid gap-0.5">
                          Precio de venta real
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Opcional"
                            value={edicion.precioVentaReal}
                            onChange={(e) => actualizarCampoEdicion('precioVentaReal', e.target.value)}
                            className={inputEdicionClasses}
                          />
                        </label>
                      </div>

                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <label className="col-span-2 flex items-center gap-1.5 sm:col-span-1" title="Marca esto si el lote se mando a producir con un tercero (maquilador).">
                          <input
                            type="checkbox"
                            checked={edicion.esMaquila}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              // Al activar el check, costoManoObra trae heredado el ultimo valor
                              // guardado (que si NO era maquila, es la mano de obra propia
                              // auto-calculada, no lo que cobraria un maquilador): se limpia para
                              // obligar a escribir el monto real, en vez de guardar ese residuo sin querer.
                              setEdicion((prev) =>
                                prev ? { ...prev, esMaquila: checked, costoManoObra: checked ? '' : prev.costoManoObra } : prev,
                              );
                            }}
                          />
                          ¿Se mando a maquilar?
                        </label>
                        {edicion.esMaquila && (
                          <label className="col-span-2 flex items-center gap-1.5 sm:col-span-1" title="Si el maquilador ya entrega el producto empacado y etiquetado, ese costo va incluido en lo que cobro.">
                            <input
                              type="checkbox"
                              checked={edicion.maquilaIncluyeEmpaque}
                              onChange={(e) => actualizarCampoEdicion('maquilaIncluyeEmpaque', e.target.checked)}
                            />
                            ¿Incluye empaque/etiqueta?
                          </label>
                        )}
                        {edicion.esMaquila ? (
                          <label className="grid gap-0.5">
                            Costo de maquila
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={edicion.costoManoObra}
                              onChange={(e) => actualizarCampoEdicion('costoManoObra', e.target.value)}
                              className={inputEdicionClasses}
                            />
                          </label>
                        ) : (
                          <label className="grid gap-0.5 opacity-70" title="Calculada: tiempo estimado de produccion x tarifa/hora configurada en Configuracion.">
                            Mano de obra (auto)
                            <input
                              type="text"
                              disabled
                              value={formatCosto(
                                formulacion?.tiempoProduccionHoras && Number(formulacion.cantidadBaseKg) > 0
                                  ? ((Number(formulacion.tiempoProduccionHoras) * Number(edicion.cantidadObjetivoKg)) /
                                      Number(formulacion.cantidadBaseKg)) *
                                      Number(user?.tarifaManoObraHora ?? 0)
                                  : 0,
                              )}
                              className={inputEdicionClasses}
                            />
                          </label>
                        )}
                        <label
                          className="grid gap-0.5 opacity-70"
                          title={
                            edicion.esMaquila
                              ? 'No aplica: el maquilador ya asumio su propio gasto de energia/gas.'
                              : 'Calculada: tiempo estimado de produccion x tarifa/hora de energia configurada en Configuracion.'
                          }
                        >
                          Energia/gas (auto)
                          <input
                            type="text"
                            disabled
                            value={
                              edicion.esMaquila
                                ? 'No aplica'
                                : formatCosto(
                                    formulacion?.tiempoProduccionHoras && Number(formulacion.cantidadBaseKg) > 0
                                      ? ((Number(formulacion.tiempoProduccionHoras) *
                                          Number(edicion.cantidadObjetivoKg)) /
                                          Number(formulacion.cantidadBaseKg)) *
                                          Number(user?.tarifaEnergiaHora ?? 0)
                                      : 0,
                                  )
                            }
                            className={inputEdicionClasses}
                          />
                        </label>
                        <label
                          className="grid gap-0.5 opacity-70"
                          title="Prorrateo de gastos generales de la empresa, segun cuantos kg produce al mes. Aplica siempre, aunque el lote se haya maquilado."
                        >
                          Gastos generales (auto)
                          <input
                            type="text"
                            disabled
                            value={formatCosto(
                              Number(user?.capacidadProduccionMensualKg ?? 0) > 0
                                ? (Number(user?.gastoGeneralMensual ?? 0) /
                                    Number(user?.capacidadProduccionMensualKg ?? 1)) *
                                    Number(edicion.cantidadObjetivoKg)
                                : 0,
                            )}
                            className={inputEdicionClasses}
                          />
                        </label>
                        {(() => {
                          const empaqueEtiquetaBloqueados = edicion.esMaquila && edicion.maquilaIncluyeEmpaque;
                          const cantidadBaseKgFormulacion = Number(formulacion?.cantidadBaseKg ?? 0);
                          const tiempoEscaladoEdicion =
                            formulacion?.tiempoProduccionHoras && cantidadBaseKgFormulacion > 0
                              ? (Number(formulacion.tiempoProduccionHoras) * Number(edicion.cantidadObjetivoKg)) /
                                cantidadBaseKgFormulacion
                              : 0;
                          const sinCostoLaboral =
                            !edicion.esMaquila &&
                            tiempoEscaladoEdicion * Number(user?.tarifaManoObraHora ?? 0) === 0 &&
                            tiempoEscaladoEdicion * Number(user?.tarifaEnergiaHora ?? 0) === 0;
                          return (
                            <>
                              {sinCostoLaboral && (
                                <p className="col-span-2 -mt-1 text-[11px] font-medium text-amber-700 sm:col-span-4 dark:text-amber-400">
                                  ⚠ Mano de obra y energia van a quedar en $0 en este lote:{' '}
                                  {!formulacion?.tiempoProduccionHoras
                                    ? 'a esta formulacion le falta el tiempo estimado de produccion.'
                                    : 'tu empresa aun no configuro las tarifas por hora en Configuracion.'}
                                </p>
                              )}
                              <label
                                className={`grid gap-0.5 ${empaqueEtiquetaBloqueados ? 'opacity-50' : ''}`}
                                title={empaqueEtiquetaBloqueados ? 'No aplica: ya esta incluido en el costo de maquila.' : undefined}
                              >
                                Empaque (por envase)
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  disabled={empaqueEtiquetaBloqueados}
                                  value={empaqueEtiquetaBloqueados ? '' : edicion.costoEmpaque}
                                  onChange={(e) => actualizarCampoEdicion('costoEmpaque', e.target.value)}
                                  className={inputEdicionClasses}
                                />
                              </label>
                              <label
                                className={`grid gap-0.5 ${empaqueEtiquetaBloqueados ? 'opacity-50' : ''}`}
                                title={empaqueEtiquetaBloqueados ? 'No aplica: ya esta incluido en el costo de maquila.' : undefined}
                              >
                                Etiqueta (por envase)
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  disabled={empaqueEtiquetaBloqueados}
                                  value={empaqueEtiquetaBloqueados ? '' : edicion.costoEtiqueta}
                                  onChange={(e) => actualizarCampoEdicion('costoEtiqueta', e.target.value)}
                                  className={inputEdicionClasses}
                                />
                              </label>
                            </>
                          );
                        })()}
                        <label className="grid gap-0.5">
                          Transporte
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={edicion.costoTransporte}
                            onChange={(e) => actualizarCampoEdicion('costoTransporte', e.target.value)}
                            className={inputEdicionClasses}
                          />
                        </label>
                        <label
                          className={`grid gap-0.5 ${edicion.esMaquila ? 'opacity-50' : ''}`}
                          title={edicion.esMaquila ? 'No aplica: la merma del proceso es responsabilidad del maquilador.' : undefined}
                        >
                          Mermas (%)
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            disabled={edicion.esMaquila}
                            value={edicion.esMaquila ? '' : edicion.costoMermas}
                            onChange={(e) => actualizarCampoEdicion('costoMermas', e.target.value)}
                            className={inputEdicionClasses}
                          />
                        </label>
                      </div>

                      <div className="flex flex-wrap items-end gap-2">
                        <label className="grid gap-0.5">
                          Estado de pago
                          <select
                            value={edicion.estadoPago}
                            onChange={(e) => actualizarCampoEdicion('estadoPago', e.target.value as EstadoPago)}
                            className={inputEdicionClasses}
                          >
                            <option value="PENDIENTE" className="text-slate-900">Pendiente</option>
                            <option value="PAGADO" className="text-slate-900">Pagado</option>
                          </select>
                        </label>
                        {edicion.estadoPago === 'PAGADO' && (
                          <label className="grid gap-0.5">
                            Fecha de pago
                            <input
                              type="date"
                              value={edicion.fechaPago}
                              onChange={(e) => actualizarCampoEdicion('fechaPago', e.target.value)}
                              className={inputEdicionClasses}
                            />
                          </label>
                        )}
                        <label className="grid gap-0.5">
                          Estado de produccion
                          <select
                            value={edicion.estadoProduccion}
                            onChange={(e) => actualizarCampoEdicion('estadoProduccion', e.target.value as EstadoProduccion)}
                            className={inputEdicionClasses}
                          >
                            {opcionesEstadoProduccion(orden.estadoProduccion).map((estado) => (
                              <option key={estado} value={estado} className="text-slate-900">
                                {ESTADO_PRODUCCION_INFO[estado].label}
                              </option>
                            ))}
                          </select>
                        </label>
                        {(edicion.estadoProduccion === 'EN_CALIDAD' || edicion.estadoProduccion === 'RECHAZADO') && (
                          <label className="grid w-full gap-0.5">
                            Notas de calidad
                            <textarea
                              value={edicion.notasCalidad}
                              onChange={(e) => actualizarCampoEdicion('notasCalidad', e.target.value)}
                              placeholder="Ej. motivo del rechazo u observaciones de la revision"
                              rows={2}
                              className={inputEdicionClasses}
                            />
                          </label>
                        )}
                        <button
                          type="button"
                          onClick={() => void guardarEdicion(orden.id)}
                          disabled={guardandoEdicion}
                          className="rounded-full bg-sky-700 px-3 py-1 text-xs font-semibold text-white disabled:opacity-60 dark:bg-[#8B5CF6]"
                        >
                          {guardandoEdicion ? 'Guardando...' : 'Guardar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditandoId(null);
                            setEdicion(null);
                          }}
                          disabled={guardandoEdicion}
                          className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-600 disabled:opacity-60 dark:border-white/10 dark:text-zinc-400"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </td>
                ) : (
                  <>
                    <td className="py-1.5 pr-2 whitespace-nowrap">{new Date(orden.createdAt).toLocaleString()}</td>
                    <td className="py-1.5 pr-2 font-mono">
                      <button
                        type="button"
                        onClick={() => setOrdenDetalle(orden)}
                        className="underline decoration-dotted hover:text-sky-700 dark:hover:text-[#a78bfa]"
                        title="Ver desglose completo de costos de este lote"
                      >
                        {orden.numeroLote}
                      </button>
                    </td>
                    <td className="py-1.5 pr-2 whitespace-nowrap">{formatKg(Number(orden.cantidadObjetivoKg))} kg</td>
                    <td className="py-1.5 pr-2 whitespace-nowrap">
                      {orden.tamanoPresentacion && orden.unidadPresentacion
                        ? `${Number(orden.tamanoPresentacion)} ${orden.unidadPresentacion}`
                        : '—'}
                    </td>
                    <td className="py-1.5 pr-2">
                      {(() => {
                        const envases = envasesDeOrden(orden);
                        return envases !== null ? `≈ ${envases.toFixed(1)}` : '—';
                      })()}
                    </td>
                    <td className="py-1.5 pr-2 whitespace-nowrap">
                      {orden.fechaVencimiento ? new Date(orden.fechaVencimiento).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-1.5 pr-2 whitespace-nowrap">{formatCosto(costoRealTotal(orden))}</td>
                    <td
                      className={`py-1.5 pr-2 font-medium whitespace-nowrap ${utilidadClassName(ingresoRealDeOrden(orden) - costoRealTotal(orden))}`}
                    >
                      {formatCosto(ingresoRealDeOrden(orden) - costoRealTotal(orden))}
                    </td>
                    <td className="py-1.5 pr-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap ${ESTADO_PAGO_INFO[orden.estadoPago].className}`}
                      >
                        {ESTADO_PAGO_INFO[orden.estadoPago].label}
                      </span>
                    </td>
                    <td className="py-1.5 pr-2">
                      <span
                        title={orden.notasCalidad ?? undefined}
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap ${ESTADO_PRODUCCION_INFO[orden.estadoProduccion].className}`}
                      >
                        {ESTADO_PRODUCCION_INFO[orden.estadoProduccion].label}
                      </span>
                    </td>
                    <td className="py-1.5">
                      <div className="flex items-center gap-1 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => iniciarEdicion(orden)}
                          className="rounded-full border border-slate-300 px-2 py-0.5 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-white/5"
                        >
                          Editar
                        </button>
                        {puedeAnular && (
                          <button
                            type="button"
                            onClick={() => setOrdenAEliminar(orden)}
                            className="rounded-full border border-red-300 px-2 py-0.5 text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
                          >
                            Anular
                          </button>
                        )}
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={ordenAEliminar !== null}
        title="Anular orden de produccion"
        description="Esta accion elimina el registro de este lote producido. No se puede deshacer."
        confirmLabel="Anular"
        danger
        loading={eliminando}
        onConfirm={() => void confirmarEliminar()}
        onCancel={() => setOrdenAEliminar(null)}
      />

      <LoteDetalleModal
        key={ordenDetalle?.id}
        orden={ordenDetalle}
        formulacion={formulacion}
        onClose={() => setOrdenDetalle(null)}
        onOrdenActualizada={(actualizada) => {
          setOrdenes((prev) => prev?.map((o) => (o.id === actualizada.id ? actualizada : o)) ?? null);
          setOrdenDetalle(actualizada);
        }}
      />
    </>
  );
}

export function PrepararForm({ formulaciones, initial }: Props) {
  const { showToast } = useToast();
  const { user } = useAuth();
  const formulationIdInicial =
    initial?.formulationId && formulaciones.some((f) => f.id === initial.formulationId)
      ? initial.formulationId
      : (formulaciones[0]?.id ?? '');
  const [formulationId, setFormulationId] = useState(formulationIdInicial);
  const [cantidadObjetivoKg, setCantidadObjetivoKg] = useState(initial?.cantidadObjetivoKg ?? '1');
  const [tamanoPresentacion, setTamanoPresentacion] = useState(initial?.tamanoPresentacion ?? '');
  const [unidadPresentacion, setUnidadPresentacion] = useState<UnidadPresentacion>(
    initial?.unidadPresentacion ?? 'g',
  );
  const [numeroLote, setNumeroLote] = useState('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [costoEmpaque, setCostoEmpaque] = useState(initial?.costoEmpaque ?? '');
  const [costoEtiqueta, setCostoEtiqueta] = useState(initial?.costoEtiqueta ?? '');
  const [esMaquila, setEsMaquila] = useState(false);
  const [maquilaIncluyeEmpaque, setMaquilaIncluyeEmpaque] = useState(false);
  const [costoManoObra, setCostoManoObra] = useState('');
  const [costoTransporte, setCostoTransporte] = useState(initial?.costoTransporte ?? '');
  const [costoMermas, setCostoMermas] = useState(initial?.costoMermas ?? '');
  const [precioVentaReal, setPrecioVentaReal] = useState('');
  const [estadoPago, setEstadoPago] = useState<EstadoPago>('PENDIENTE');
  const [fechaPago, setFechaPago] = useState('');
  const [guardandoOrden, setGuardandoOrden] = useState(false);
  const [historialKey, setHistorialKey] = useState(0);
  const [ordenesPendientes, setOrdenesPendientes] = useState<ProductionOrder[]>([]);

  useEffect(() => {
    let cancelled = false;
    getProductionOrders()
      .then((data) => {
        if (cancelled) return;
        // Mas antiguo primero: lo mas urgente de cobrar va arriba. Incluye PARCIAL: todavia
        // falta cobrar algo de esos lotes, no solo de los que no tienen ningun abono.
        const pendientes = data
          .filter((o) => o.estadoPago !== 'PAGADO')
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        setOrdenesPendientes(pendientes);
      })
      .catch(() => {
        if (!cancelled) setOrdenesPendientes([]);
      });
    return () => {
      cancelled = true;
    };
  }, [historialKey]);

  const nombrePorFormulacionId = new Map(formulaciones.map((f) => [f.id, f.nombreProducto]));
  const totalPendienteCobro = ordenesPendientes.reduce((total, o) => total + montoPendienteDeOrden(o), 0);

  const formulacion = formulaciones.find((f) => f.id === formulationId);

  const { filas, cantidadBaseKg, costoBaseTotal, error } = useMemo(() => {
    if (!formulacion) {
      return { filas: [] as EscaladoRow[], cantidadBaseKg: 0, costoBaseTotal: 0, error: null as string | null };
    }

    const baseKg = Number(formulacion.cantidadBaseKg);
    const baseCosto = formulacion.ingredientes.reduce((total, i) => total + Number(i.precioTotal), 0);
    const objetivo = Number(cantidadObjetivoKg);

    if (baseKg <= 0) {
      return {
        filas: [],
        cantidadBaseKg: baseKg,
        costoBaseTotal: baseCosto,
        error: 'Esta formulacion no tiene una cantidad base valida para escalar.',
      };
    }
    if (!Number.isFinite(objetivo) || objetivo <= 0) {
      return { filas: [], cantidadBaseKg: baseKg, costoBaseTotal: baseCosto, error: null };
    }

    const ratio = objetivo / baseKg;
    const filasEscaladas = formulacion.ingredientes.map((ingrediente) => ({
      nombre: ingrediente.nombre,
      porcentaje: Number(ingrediente.porcentaje),
      cantidadGramos: Number(ingrediente.cantidadGramosBase) * ratio,
      cantidadKg: Number(ingrediente.cantidadKg) * ratio,
      costo: Number(ingrediente.precioTotal) * ratio,
    }));

    return { filas: filasEscaladas, cantidadBaseKg: baseKg, costoBaseTotal: baseCosto, error: null };
  }, [formulacion, cantidadObjetivoKg]);

  if (formulaciones.length === 0) {
    return (
      <p className="rounded-xl border border-slate-200 bg-white p-4 text-slate-600 dark:border-white/10 dark:bg-white/3 dark:text-zinc-400">
        Crea una formulacion en la seccion Formulaciones antes de preparar un lote.
      </p>
    );
  }

  const costoTotalEscalado = filas.reduce((total, fila) => total + fila.costo, 0);

  const cantidadPresentacion = Number(tamanoPresentacion);
  const envasesEstimados =
    cantidadPresentacion > 0 && Number.isFinite(cantidadPresentacion)
      ? (Number(cantidadObjetivoKg) * 1000) / gramosPorUnidad(cantidadPresentacion, unidadPresentacion)
      : null;

  const tiempoEscalado =
    formulacion?.tiempoProduccionHoras && cantidadBaseKg > 0
      ? (Number(formulacion.tiempoProduccionHoras) * Number(cantidadObjetivoKg)) / cantidadBaseKg
      : 0;
  const costoManoObraAuto = tiempoEscalado * Number(user?.tarifaManoObraHora ?? 0);
  const costoEnergiaAuto = tiempoEscalado * Number(user?.tarifaEnergiaHora ?? 0);
  // Prorrateo de gastos generales: aplica SIEMPRE, aunque el lote se haya maquilado (el
  // arriendo y la nomina administrativa se pagan sin importar quien produjo este lote).
  const costoGastosGeneralesAuto =
    Number(user?.capacidadProduccionMensualKg ?? 0) > 0
      ? (Number(user?.gastoGeneralMensual ?? 0) / Number(user?.capacidadProduccionMensualKg ?? 1)) *
        Number(cantidadObjetivoKg)
      : 0;

  // Si se maquilo y el maquilador ya entrega el producto empacado/etiquetado, ese costo va incluido
  // en costoManoObra: no se cobra aparte para no duplicarlo.
  const empaqueEtiquetaBloqueados = esMaquila && maquilaIncluyeEmpaque;

  function resetCamposAdicionales() {
    setNumeroLote('');
    setFechaVencimiento('');
    setCostoEmpaque('');
    setCostoEtiqueta('');
    setEsMaquila(false);
    setMaquilaIncluyeEmpaque(false);
    setCostoManoObra('');
    setCostoTransporte('');
    setCostoMermas('');
    setPrecioVentaReal('');
    setEstadoPago('PENDIENTE');
    setFechaPago('');
  }

  async function handleGuardarOrden() {
    if (!formulationId) return;
    if (esMaquila && !(Number(costoManoObra) > 0)) {
      showToast('Ingresa cuanto te cobro el maquilador (costo de maquila).', 'error');
      return;
    }
    setGuardandoOrden(true);
    try {
      await createProductionOrder({
        formulationId,
        cantidadObjetivoKg: Number(cantidadObjetivoKg),
        ...(cantidadPresentacion > 0 && {
          tamanoPresentacion: cantidadPresentacion,
          unidadPresentacion,
        }),
        numeroLote: numeroLote.trim() || undefined,
        fechaVencimiento: fechaVencimiento || undefined,
        costoEmpaque:
          !empaqueEtiquetaBloqueados && Number(costoEmpaque) > 0
            ? Number(costoEmpaque) * (envasesEstimados ?? 1)
            : undefined,
        costoEtiqueta:
          !empaqueEtiquetaBloqueados && Number(costoEtiqueta) > 0
            ? Number(costoEtiqueta) * (envasesEstimados ?? 1)
            : undefined,
        esMaquila,
        maquilaIncluyeEmpaque: esMaquila ? maquilaIncluyeEmpaque : undefined,
        costoManoObra: esMaquila ? Number(costoManoObra) || undefined : costoManoObraAuto || undefined,
        // Si se maquilo, la energia/gas ya la asumio el maquilador: no se cobra aparte.
        costoEnergia: esMaquila ? undefined : costoEnergiaAuto || undefined,
        tiempoProduccionHoras: tiempoEscalado || undefined,
        costoGastosGenerales: costoGastosGeneralesAuto || undefined,
        costoTransporte: Number(costoTransporte) || undefined,
        // Si se maquilo, la merma del proceso es responsabilidad del maquilador: no se cobra aparte.
        costoMermas:
          !esMaquila && Number(costoMermas) > 0 ? (Number(costoMermas) / 100) * costoTotalEscalado : undefined,
        precioVentaReal: precioVentaReal ? Number(precioVentaReal) : undefined,
        estadoPago,
        fechaPago: estadoPago === 'PAGADO' && fechaPago ? fechaPago : undefined,
      });
      showToast('Orden de produccion guardada.');
      resetCamposAdicionales();
      setHistorialKey((k) => k + 1);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'No se pudo guardar la orden de produccion.', 'error');
    } finally {
      setGuardandoOrden(false);
    }
  }

  return (
    <div className="grid gap-6">
      {ordenesPendientes.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
              {ordenesPendientes.length} lote{ordenesPendientes.length === 1 ? '' : 's'} pendiente
              {ordenesPendientes.length === 1 ? '' : 's'} de cobro
            </h3>
            <span className="text-sm font-bold text-amber-900 dark:text-amber-200">
              {formatCosto(totalPendienteCobro)}
            </span>
          </div>
          <ul className="mt-2 grid gap-1 text-sm text-amber-700 dark:text-amber-400">
            {ordenesPendientes.slice(0, 5).map((orden) => {
              const dias = diasPendiente(orden);
              return (
                <li key={orden.id} className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setFormulationId(orden.formulationId)}
                    className="text-left hover:underline"
                  >
                    {orden.numeroLote} · {nombrePorFormulacionId.get(orden.formulationId) ?? 'formulacion eliminada'}
                  </button>
                  <span className="flex items-center gap-2">
                    <span className={NIVEL_CARTERA_CLASSNAME[nivelCartera(dias)]}>{dias} dias</span>
                    <span className="font-medium">{formatCosto(montoPendienteDeOrden(orden))}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {initial && (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800 dark:border-[#8B5CF6]/30 dark:bg-[#8B5CF6]/10 dark:text-[#a78bfa]">
          Datos cargados desde tu analisis de Costos: revisalos y confirma para guardar el lote.
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/3">
        <label className="flex flex-wrap items-center gap-3 text-sm text-slate-700 dark:text-zinc-300">
          <span className="font-medium">Formulacion</span>
          <select
            className={`min-w-60 flex-1 ${inputClasses}`}
            value={formulationId}
            onChange={(e) => setFormulationId(e.target.value)}
          >
            {formulaciones.map((f) => (
              <option key={f.id} value={f.id} className="text-slate-900">
                {f.nombreProducto}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,320px)_1fr]">
      <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/3">
        <label className="grid gap-1.5 text-sm text-slate-700 dark:text-zinc-300">
          Cantidad a preparar (kg)
          <input
            type="number"
            min="0.001"
            step="0.001"
            className={inputClasses}
            value={cantidadObjetivoKg}
            onChange={(e) => setCantidadObjetivoKg(e.target.value)}
          />
        </label>

        <div className="grid gap-1.5 text-sm text-slate-700 dark:text-zinc-300">
          <span id="tamano-presentacion-label">Tamano de presentacion (opcional)</span>
          <div className="flex gap-2">
            <input
              type="number"
              min="0.001"
              step="0.001"
              placeholder="Ej. 500"
              aria-labelledby="tamano-presentacion-label"
              className={`w-full ${inputClasses}`}
              value={tamanoPresentacion}
              onChange={(e) => setTamanoPresentacion(e.target.value)}
            />
            <select
              aria-label="Unidad de presentacion"
              className={inputClasses}
              value={unidadPresentacion}
              onChange={(e) => setUnidadPresentacion(e.target.value as UnidadPresentacion)}
            >
              {UNIDADES_PRESENTACION.map((unidad) => (
                <option key={unidad} value={unidad} className="text-slate-900">
                  {unidad}
                </option>
              ))}
            </select>
          </div>
          {envasesEstimados !== null && (
            <p className="text-xs text-slate-500 dark:text-zinc-500">
              ≈ {envasesEstimados.toFixed(1)} envase{envasesEstimados === 1 ? '' : 's'} de {tamanoPresentacion}{' '}
              {unidadPresentacion}
            </p>
          )}
        </div>

        <Collapsible
          title="Lote, costos y venta (opcional)"
          defaultOpen={Boolean(
            initial?.costoEmpaque || initial?.costoEtiqueta || initial?.costoTransporte || initial?.costoMermas,
          )}
        >
          <div className="grid gap-3 text-sm text-slate-700 dark:text-zinc-300">
            <label className="grid gap-1">
              Numero de lote
              <input
                type="text"
                placeholder="Se genera automaticamente si lo dejas vacio"
                className={inputClasses}
                value={numeroLote}
                onChange={(e) => setNumeroLote(e.target.value)}
              />
            </label>
            <label className="grid gap-1">
              Fecha de vencimiento
              <input
                type="date"
                className={inputClasses}
                value={fechaVencimiento}
                onChange={(e) => setFechaVencimiento(e.target.value)}
              />
            </label>
            {formulacion?.vidaUtilDias && !fechaVencimiento && (
              <p className="-mt-2 text-xs text-slate-500 dark:text-zinc-500">
                Si la dejas vacia, se calcula sola con la vida util de esta formulacion ({formulacion.vidaUtilDias}{' '}
                dias).
              </p>
            )}

            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-500">
              Costos operativos reales de este lote
            </p>
            <div className="grid gap-2">
              <label className="flex items-center gap-1.5" title="Marca esto si este lote se mando a producir con un tercero (maquilador).">
                <input
                  type="checkbox"
                  checked={esMaquila}
                  onChange={(e) => setEsMaquila(e.target.checked)}
                />
                ¿Se mando a maquilar con un tercero?
              </label>
              {esMaquila && (
                <label className="flex items-center gap-1.5 pl-4" title="Si el maquilador ya te entrega el producto terminado, empacado y etiquetado, ese costo va incluido en lo que te cobro.">
                  <input
                    type="checkbox"
                    checked={maquilaIncluyeEmpaque}
                    onChange={(e) => setMaquilaIncluyeEmpaque(e.target.checked)}
                  />
                  ¿El maquilador entrega el producto ya empacado y etiquetado?
                </label>
              )}
              {esMaquila ? (
                <label className="grid gap-1">
                  Costo de maquila
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    className={inputClasses}
                    value={costoManoObra}
                    onChange={(e) => setCostoManoObra(e.target.value)}
                  />
                </label>
              ) : (
                <label className="grid gap-1 opacity-70" title="Calculada: tiempo estimado de produccion de esta formulacion x tu tarifa/hora de mano de obra (Configuracion).">
                  Mano de obra (automatica)
                  <input type="text" disabled className={inputClasses} value={formatCosto(costoManoObraAuto)} />
                </label>
              )}
              <label
                className="grid gap-1 opacity-70"
                title={
                  esMaquila
                    ? 'No aplica: el maquilador ya asumio su propio gasto de energia/gas al producir el lote.'
                    : 'Calculada: tiempo estimado de produccion de esta formulacion x tu tarifa/hora de energia (Configuracion).'
                }
              >
                Energia/gas (automatica)
                <input
                  type="text"
                  disabled
                  className={inputClasses}
                  value={esMaquila ? 'No aplica (la asume el maquilador)' : formatCosto(costoEnergiaAuto)}
                />
              </label>
              <p className="-mt-1 text-[11px] text-slate-500 dark:text-zinc-500">
                Si lo mandaste a maquilar con un tercero, ingresa lo que te cobro. Si no, la mano de obra y la
                energia se calculan solas a partir del tiempo estimado de produccion de la formulacion (
                {formulacion?.tiempoProduccionHoras
                  ? `${Number(formulacion.tiempoProduccionHoras)} h base`
                  : 'sin definir'}
                ) y las tarifas por hora configuradas en Configuracion. No cuentes aqui el salario fijo de tu
                personal: eso ya se paga por nomina, no por lote.
              </p>
              {!esMaquila && costoManoObraAuto === 0 && costoEnergiaAuto === 0 && (
                <p className="-mt-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                  ⚠ Mano de obra y energia van a quedar en $0 en este lote:{' '}
                  {!formulacion?.tiempoProduccionHoras
                    ? 'a esta formulacion le falta el tiempo estimado de produccion.'
                    : 'tu empresa aun no configuro las tarifas por hora en Configuracion.'}
                </p>
              )}

              <label
                className="grid gap-1 opacity-70"
                title="Prorrateo de gastos generales de la empresa (arriendo, nomina administrativa, etc.), segun cuantos kg produce tu empresa al mes. Aplica siempre, aunque el lote se haya maquilado."
              >
                Gastos generales (automatico)
                <input type="text" disabled className={inputClasses} value={formatCosto(costoGastosGeneralesAuto)} />
              </label>
              {costoGastosGeneralesAuto === 0 && Number(user?.gastoGeneralMensual ?? 0) > 0 && (
                <p className="-mt-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                  ⚠ Aun no hay suficiente historial de produccion (minimo 2 meses completos) para prorratear los
                  gastos generales: se calcula solo, en Configuracion se explica el detalle.
                </p>
              )}

              <label className={`grid gap-1 ${empaqueEtiquetaBloqueados ? 'opacity-50' : ''}`}>
                Empaque (costo por envase)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  disabled={empaqueEtiquetaBloqueados}
                  className={inputClasses}
                  value={empaqueEtiquetaBloqueados ? '' : costoEmpaque}
                  onChange={(e) => setCostoEmpaque(e.target.value)}
                />
              </label>
              <p className="-mt-1 text-[11px] text-slate-500 dark:text-zinc-500">
                {empaqueEtiquetaBloqueados
                  ? 'No aplica: ya esta incluido en el costo de maquila.'
                  : 'Incluye el envase completo (frasco/bolsa/caja con su tapa) y cualquier otro material de empaque de una sola unidad. La etiqueta se cuenta aparte, abajo.'}
              </p>
              {!empaqueEtiquetaBloqueados && Number(costoEmpaque) > 0 && (
                <p className="-mt-1 text-xs text-slate-500 dark:text-zinc-500">
                  {envasesEstimados !== null
                    ? `Total empaque: ${formatCosto(Number(costoEmpaque) * envasesEstimados)} (${envasesEstimados.toFixed(1)} envases)`
                    : 'Ingresa el tamano de presentacion arriba para calcular el total.'}
                </p>
              )}
              <label className={`grid gap-1 ${empaqueEtiquetaBloqueados ? 'opacity-50' : ''}`}>
                Etiqueta (costo por envase)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  disabled={empaqueEtiquetaBloqueados}
                  className={inputClasses}
                  value={empaqueEtiquetaBloqueados ? '' : costoEtiqueta}
                  onChange={(e) => setCostoEtiqueta(e.target.value)}
                />
              </label>
              {!empaqueEtiquetaBloqueados && Number(costoEtiqueta) > 0 && (
                <p className="-mt-1 text-xs text-slate-500 dark:text-zinc-500">
                  {envasesEstimados !== null
                    ? `Total etiqueta: ${formatCosto(Number(costoEtiqueta) * envasesEstimados)} (${envasesEstimados.toFixed(1)} envases)`
                    : 'Ingresa el tamano de presentacion arriba para calcular el total.'}
                </p>
              )}
              <label className="grid gap-1">
                Transporte
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  className={inputClasses}
                  value={costoTransporte}
                  onChange={(e) => setCostoTransporte(e.target.value)}
                />
              </label>
              <label className={`grid gap-1 ${esMaquila ? 'opacity-50' : ''}`}>
                Mermas (%)
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="0"
                  disabled={esMaquila}
                  className={inputClasses}
                  value={esMaquila ? '' : costoMermas}
                  onChange={(e) => setCostoMermas(e.target.value)}
                />
              </label>
              <p className="-mt-1 text-xs text-slate-500 dark:text-zinc-500">
                {esMaquila
                  ? 'No aplica: la merma durante el procesamiento es responsabilidad del maquilador.'
                  : `Perdida o evaporacion de materia prima durante la produccion, como % del costo de ingredientes de este lote${Number(costoMermas) > 0 ? ` (${formatCosto((Number(costoMermas) / 100) * costoTotalEscalado)})` : ''}.`}
              </p>
            </div>

            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-500">
              Venta real
            </p>
            <label className="grid gap-1">
              Precio de venta real cobrado
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Si no lo sabes aun, dejalo vacio"
                className={inputClasses}
                value={precioVentaReal}
                onChange={(e) => setPrecioVentaReal(e.target.value)}
              />
            </label>
            <div className="flex flex-wrap items-end gap-2">
              <label className="grid gap-1">
                Estado de pago
                <select
                  className={inputClasses}
                  value={estadoPago}
                  onChange={(e) => setEstadoPago(e.target.value as EstadoPago)}
                >
                  <option value="PENDIENTE" className="text-slate-900">Pendiente</option>
                  <option value="PAGADO" className="text-slate-900">Pagado</option>
                </select>
              </label>
              {estadoPago === 'PAGADO' && (
                <label className="grid gap-1">
                  Fecha de pago
                  <input
                    type="date"
                    className={inputClasses}
                    value={fechaPago}
                    onChange={(e) => setFechaPago(e.target.value)}
                  />
                </label>
              )}
            </div>
          </div>
        </Collapsible>

        <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 dark:border-white/10">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wide text-slate-600 dark:text-zinc-400">
              Lote base
            </p>
            <p className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-zinc-200">
              {formatKg(cantidadBaseKg)} kg
            </p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wide text-slate-600 dark:text-zinc-400">
              Costo base
            </p>
            <p className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-zinc-200">
              {formatCosto(costoBaseTotal)}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-500">Cantidades</h3>

        {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

        {!error && filas.length === 0 && (
          <p className="mt-3 text-slate-500 dark:text-zinc-500">Ingresa una cantidad objetivo mayor a cero.</p>
        )}

        {filas.length > 0 && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-105 text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-white/10 dark:text-zinc-500">
                  <th className="py-2">Ingrediente</th>
                  <th className="py-2">%</th>
                  <th className="py-2">Gramos</th>
                  <th className="py-2">Kg</th>
                  <th className="py-2">Costo</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((fila) => (
                  <tr key={fila.nombre} className="border-b border-slate-100 dark:border-white/5">
                    <td className="py-2 text-slate-800 dark:text-zinc-200">{fila.nombre}</td>
                    <td className="py-2 text-slate-600 dark:text-zinc-400">{fila.porcentaje}%</td>
                    <td className="py-2 text-slate-600 dark:text-zinc-400">{formatGramos(fila.cantidadGramos)} g</td>
                    <td className="py-2 text-slate-600 dark:text-zinc-400">{formatKg(fila.cantidadKg)} kg</td>
                    <td className="py-2 text-slate-600 dark:text-zinc-400">{formatCosto(fila.costo)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="pt-3 font-semibold text-slate-900 dark:text-white">Total</td>
                  <td></td>
                  <td></td>
                  <td className="pt-3 font-semibold text-slate-900 dark:text-white">
                    {formatKg(Number(cantidadObjetivoKg) || 0)} kg
                  </td>
                  <td className="pt-3 font-semibold text-slate-900 dark:text-white">{formatCosto(costoTotalEscalado)}</td>
                </tr>
              </tfoot>
            </table>

            <button
              type="button"
              onClick={handleGuardarOrden}
              disabled={guardandoOrden}
              className="mt-4 w-fit rounded-full bg-sky-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:opacity-60 dark:bg-[#8B5CF6] dark:hover:bg-[#7c3aed]"
            >
              {guardandoOrden ? 'Guardando...' : 'Guardar orden de produccion'}
            </button>

            <div className="mt-4 border-t border-slate-100 pt-3 dark:border-white/10">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-500">
                Ultimas ordenes de esta formulacion
              </h4>
              <HistorialProduccion
                key={`${formulationId}-${historialKey}`}
                formulationId={formulationId}
                formulacion={formulacion}
              />
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
