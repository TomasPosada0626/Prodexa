import type { ProductionOrder } from './api';

export interface CostCalculationInput {
  costoBaseTotal: number;
  cantidadBaseKg: number;
  cantidadObjetivoKg: number;
  margenPorcentaje: number;
  impuestoPorcentaje?: number;
  descuentoMayoristaPorcentaje?: number;
}

export interface CostCalculationResult {
  costoPorKg: number;
  costoEscalado: number;
  precioVentaSugerido: number;
  precioConImpuesto: number;
  precioMayorista: number;
  utilidadEstimada: number;
}

/**
 * Espejo, en el cliente, del motor de costeo del backend
 * (apps/backend/src/simulation/simulation.service.ts) para vistas de solo
 * lectura (tabla resumen) que no ameritan un round-trip al servidor.
 */
export function calculateCost(input: CostCalculationInput): CostCalculationResult | null {
  if (input.cantidadBaseKg <= 0 || input.margenPorcentaje >= 100 || input.cantidadObjetivoKg <= 0) {
    return null;
  }

  const costoPorKg = input.costoBaseTotal / input.cantidadBaseKg;
  const costoEscalado = costoPorKg * input.cantidadObjetivoKg;

  const precioVentaSugerido = costoEscalado / (1 - input.margenPorcentaje / 100);
  const impuestoPorcentaje = input.impuestoPorcentaje ?? 0;
  const precioConImpuesto = precioVentaSugerido * (1 + impuestoPorcentaje / 100);

  const descuentoMayoristaPorcentaje = input.descuentoMayoristaPorcentaje ?? 0;
  const precioMayorista = precioConImpuesto * (1 - descuentoMayoristaPorcentaje / 100);

  const utilidadEstimada = precioVentaSugerido - costoEscalado;

  return {
    costoPorKg: round(costoPorKg),
    costoEscalado: round(costoEscalado),
    precioVentaSugerido: round(precioVentaSugerido),
    precioConImpuesto: round(precioConImpuesto),
    precioMayorista: round(precioMayorista),
    utilidadEstimada: round(utilidadEstimada),
  };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Costo real total de un lote ya producido: ingredientes (costoEscalado) mas los costos
 * operativos reales que se hayan registrado (empaque, etiqueta, mano de obra/maquila, energia,
 * transporte, mermas). Unica definicion, usada en Preparar, Analisis y Reportes para que
 * las tres coincidan siempre.
 */
export function costoRealTotal(orden: ProductionOrder): number {
  return (
    Number(orden.costoEscalado) +
    Number(orden.costoEmpaque) +
    Number(orden.costoEtiqueta) +
    Number(orden.costoManoObra) +
    Number(orden.costoEnergia) +
    Number(orden.costoGastosGenerales) +
    Number(orden.costoTransporte) +
    Number(orden.costoMermas)
  );
}

/** Usa el precio de venta real cobrado si se conoce; si no, el sugerido como estimado. */
export function ingresoRealDeOrden(orden: ProductionOrder): number {
  return orden.precioVentaReal !== null ? Number(orden.precioVentaReal) : Number(orden.precioVentaSugerido);
}

/**
 * Cuanto se ha cobrado de verdad de este lote (suma de abonos). A diferencia de estadoPago
 * (PENDIENTE/PARCIAL/PAGADO), este numero sirve para sumar "cobrado" entre muchos lotes sin
 * perder los abonos parciales de los que aun estan PARCIAL.
 */
export function montoCobradoDeOrden(orden: ProductionOrder): number {
  return Number(orden.montoCobrado);
}

/** Lo que falta por cobrar de este lote (ingreso real menos lo ya abonado), nunca negativo. */
export function montoPendienteDeOrden(orden: ProductionOrder): number {
  return Math.max(0, ingresoRealDeOrden(orden) - Number(orden.montoCobrado));
}

/**
 * Dias desde que se registro el lote (createdAt), para lotes que aun no estan pagados del todo.
 * No hay una fecha de venta separada en el modelo: createdAt es cuando se produjo/registro el
 * lote, que es el mejor proxy disponible de cuando empezo a correr la cuenta por cobrar.
 * Un lote ya PAGADO no tiene antiguedad de cartera (ya no hay nada pendiente).
 */
export function diasPendiente(orden: ProductionOrder): number {
  if (orden.estadoPago === 'PAGADO') return 0;
  const creada = new Date(orden.createdAt).getTime();
  return Math.max(0, Math.floor((Date.now() - creada) / (24 * 60 * 60 * 1000)));
}

export type NivelCartera = 'normal' | 'atencion' | 'vencida';

/** 0-15 dias: normal. 16-30: atencion. 31+: vencida (urgente). */
export function nivelCartera(dias: number): NivelCartera {
  if (dias > 30) return 'vencida';
  if (dias > 15) return 'atencion';
  return 'normal';
}

export const NIVEL_CARTERA_CLASSNAME: Record<NivelCartera, string> = {
  normal: 'text-slate-600 dark:text-zinc-400',
  atencion: 'text-amber-700 dark:text-amber-400 font-medium',
  vencida: 'text-red-600 dark:text-red-400 font-semibold',
};

/**
 * Un lote RECHAZADO en control de calidad no se vendio: se excluye de utilidad/ingreso en
 * Reportes/Dashboard/Analisis para no inflar la rentabilidad real, aunque se conserva en el
 * historial para trazabilidad. Unico filtro, usado en los 3 lugares para que coincidan siempre.
 */
export function ordenesParaRentabilidad(ordenes: ProductionOrder[]): ProductionOrder[] {
  return ordenes.filter((o) => o.estadoProduccion !== 'RECHAZADO');
}

export interface CapacidadUtilizada {
  kgProducidosMes: number;
  capacidadMensualKg: number;
  utilizacionPorcentaje: number | null;
}

/**
 * Cuanto de la capacidad mensual configurada (Configuracion) se uso en el mes calendario actual,
 * segun los lotes reales ya producidos (excluye RECHAZADO, igual que el resto de rentabilidad).
 * Sin capacidad configurada no hay base para el %, se devuelve null en vez de dividir por 0.
 */
export function capacidadUtilizadaMesActual(ordenes: ProductionOrder[], capacidadMensualKg: number): CapacidadUtilizada {
  const ahora = new Date();
  const kgProducidosMes = ordenesParaRentabilidad(ordenes)
    .filter((o) => {
      const creada = new Date(o.createdAt);
      return creada.getFullYear() === ahora.getFullYear() && creada.getMonth() === ahora.getMonth();
    })
    .reduce((total, o) => total + Number(o.cantidadObjetivoKg), 0);

  return {
    kgProducidosMes,
    capacidadMensualKg,
    utilizacionPorcentaje: capacidadMensualKg > 0 ? (kgProducidosMes / capacidadMensualKg) * 100 : null,
  };
}

export const ESTADO_PRODUCCION_INFO: Record<
  ProductionOrder['estadoProduccion'],
  { label: string; className: string }
> = {
  PLANIFICADO: {
    label: 'Planificado',
    className: 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-zinc-300',
  },
  EN_PROCESO: {
    label: 'En proceso',
    className: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400',
  },
  EN_CALIDAD: {
    label: 'En calidad',
    className: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  },
  TERMINADO: {
    label: 'Terminado',
    className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  },
  RECHAZADO: {
    label: 'Rechazado',
    className: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  },
};
