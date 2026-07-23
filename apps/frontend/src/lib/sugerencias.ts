import type { Formulation, ProductionOrder } from './api';
import { calculateCost, ordenesParaRentabilidad } from './costing';

export interface SugerenciaProduccion {
  formulacion: Formulation;
  utilidadPorKg: number;
  lotesRecientes: number;
  score: number;
}

const SEMANAS_DEMANDA_RECIENTE = 8;

/**
 * Heuristica determinista (no IA) para "que deberia producir esta semana": combina rentabilidad
 * por kg (a las tarifas/margen configurados hoy) con demanda reciente (cuantos lotes de esa
 * formulacion se han producido y vendido en las ultimas semanas). Sin inventario, la mejor senal
 * de demanda disponible es la frecuencia de produccion real, no un nivel de stock.
 */
export function sugerenciasProduccion(formulaciones: Formulation[], ordenes: ProductionOrder[]): SugerenciaProduccion[] {
  const corte = Date.now() - SEMANAS_DEMANDA_RECIENTE * 7 * 24 * 60 * 60 * 1000;
  const rentables = ordenesParaRentabilidad(ordenes);

  return formulaciones
    .map((formulacion) => {
      const costoBaseTotal = formulacion.ingredientes.reduce((total, i) => total + Number(i.precioTotal), 0);
      const cantidadBaseKg = Number(formulacion.cantidadBaseKg);
      const resultado = calculateCost({
        costoBaseTotal,
        cantidadBaseKg,
        cantidadObjetivoKg: cantidadBaseKg,
        margenPorcentaje: Number(formulacion.margenPorcentaje),
        impuestoPorcentaje: Number(formulacion.impuestoPorcentaje),
      });
      const utilidadPorKg = resultado && cantidadBaseKg > 0 ? resultado.utilidadEstimada / cantidadBaseKg : 0;
      const lotesRecientes = rentables.filter(
        (o) => o.formulationId === formulacion.id && new Date(o.createdAt).getTime() >= corte,
      ).length;
      return {
        formulacion,
        utilidadPorKg,
        lotesRecientes,
        score: utilidadPorKg * (1 + lotesRecientes),
      };
    })
    .filter((s) => s.utilidadPorKg > 0)
    .sort((a, b) => b.score - a.score);
}
