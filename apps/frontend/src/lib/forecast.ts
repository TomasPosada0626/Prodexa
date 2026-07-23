import type { ProductionOrder } from './api';
import { costoRealTotal, ingresoRealDeOrden, ordenesParaRentabilidad } from './costing';

/** Lunes de la semana ISO a la que pertenece una fecha, como clave de agrupacion (YYYY-MM-DD). */
function inicioDeSemana(fecha: Date): string {
  const dia = fecha.getDay();
  const diff = (dia === 0 ? -6 : 1) - dia;
  const lunes = new Date(fecha);
  lunes.setDate(fecha.getDate() + diff);
  lunes.setHours(0, 0, 0, 0);
  return lunes.toISOString().slice(0, 10);
}

export interface PuntoSemanal {
  semana: string;
  kg: number;
  ingreso: number;
  utilidad: number;
}

/** Serie semanal de produccion real (kg/ingreso/utilidad), mas antigua primero. Excluye
 * RECHAZADO igual que el resto de rentabilidad: no se vendio, no debe alimentar la proyeccion. */
export function serieSemanal(ordenes: ProductionOrder[]): PuntoSemanal[] {
  const porSemana = new Map<string, PuntoSemanal>();
  ordenesParaRentabilidad(ordenes).forEach((orden) => {
    const clave = inicioDeSemana(new Date(orden.createdAt));
    const punto = porSemana.get(clave) ?? { semana: clave, kg: 0, ingreso: 0, utilidad: 0 };
    punto.kg += Number(orden.cantidadObjetivoKg);
    punto.ingreso += ingresoRealDeOrden(orden);
    punto.utilidad += ingresoRealDeOrden(orden) - costoRealTotal(orden);
    porSemana.set(clave, punto);
  });
  return Array.from(porSemana.values()).sort((a, b) => a.semana.localeCompare(b.semana));
}

export interface Proyeccion {
  kgProyectado: number;
  ingresoProyectado: number;
  utilidadProyectada: number;
  semanasBase: number;
  tendencia: 'subiendo' | 'bajando' | 'estable';
}

const MAX_SEMANAS_BASE = 6;

/**
 * Proyeccion simple (promedio movil) de la proxima semana, a partir de hasta las ultimas
 * MAX_SEMANAS_BASE semanas ya completas (se excluye la semana actual, que esta en curso y
 * subestimaria el promedio). No es IA: es una heuristica determinista, facil de verificar.
 * Null si no hay al menos 2 semanas completas para promediar.
 */
export function proyeccionProximaSemana(serie: PuntoSemanal[]): Proyeccion | null {
  const semanaActual = inicioDeSemana(new Date());
  const completas = serie.filter((p) => p.semana !== semanaActual);
  const base = completas.slice(-MAX_SEMANAS_BASE);
  if (base.length < 2) return null;

  const kgProyectado = base.reduce((total, p) => total + p.kg, 0) / base.length;
  const ingresoProyectado = base.reduce((total, p) => total + p.ingreso, 0) / base.length;
  const utilidadProyectada = base.reduce((total, p) => total + p.utilidad, 0) / base.length;

  const mitad = Math.floor(base.length / 2);
  const promedioPrimeraMitad = base.slice(0, mitad).reduce((t, p) => t + p.utilidad, 0) / mitad;
  const promedioSegundaMitad = base.slice(mitad).reduce((t, p) => t + p.utilidad, 0) / (base.length - mitad);
  const delta = promedioPrimeraMitad === 0 ? 0 : (promedioSegundaMitad - promedioPrimeraMitad) / Math.abs(promedioPrimeraMitad);
  const tendencia: Proyeccion['tendencia'] = delta > 0.1 ? 'subiendo' : delta < -0.1 ? 'bajando' : 'estable';

  return { kgProyectado, ingresoProyectado, utilidadProyectada, semanasBase: base.length, tendencia };
}

/** Mes calendario al que pertenece una fecha, como clave de agrupacion (YYYY-MM). */
function claveMes(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
}

export interface PuntoMensual {
  mes: string;
  kg: number;
  ingreso: number;
  utilidad: number;
}

/** Serie mensual de produccion real (kg/ingreso/utilidad), mas antigua primero. Misma logica
 * que serieSemanal pero agrupada por mes calendario: sirve para planeacion comercial (cuanto
 * vas a producir/facturar/ganar el proximo mes), no para reabastecer materia prima. */
export function serieMensual(ordenes: ProductionOrder[]): PuntoMensual[] {
  const porMes = new Map<string, PuntoMensual>();
  ordenesParaRentabilidad(ordenes).forEach((orden) => {
    const clave = claveMes(new Date(orden.createdAt));
    const punto = porMes.get(clave) ?? { mes: clave, kg: 0, ingreso: 0, utilidad: 0 };
    punto.kg += Number(orden.cantidadObjetivoKg);
    punto.ingreso += ingresoRealDeOrden(orden);
    punto.utilidad += ingresoRealDeOrden(orden) - costoRealTotal(orden);
    porMes.set(clave, punto);
  });
  return Array.from(porMes.values()).sort((a, b) => a.mes.localeCompare(b.mes));
}

export interface ProyeccionMensual {
  kgProyectado: number;
  ingresoProyectado: number;
  utilidadProyectada: number;
  mesesBase: number;
  /** % de variacion del ultimo mes completo vs el promedio de los meses base anteriores.
   * Es la senal de "esta creciendo o cayendo en volumen" que pide el negocio por producto. */
  variacionVolumenPorcentaje: number | null;
  tendenciaVolumen: 'creciendo' | 'cayendo' | 'estable';
}

const MAX_MESES_BASE = 4;

/**
 * Proyeccion simple (promedio movil) del proximo mes calendario, a partir de hasta los ultimos
 * MAX_MESES_BASE meses ya completos (excluye el mes en curso). Es planeacion comercial/de
 * produccion (cuanto vas a producir/facturar/ganar si sigues la tendencia), no de reabastecimiento
 * de materia prima. Null si no hay al menos 2 meses completos para promediar.
 */
export function proyeccionProximoMes(serie: PuntoMensual[]): ProyeccionMensual | null {
  const mesActual = claveMes(new Date());
  const completos = serie.filter((p) => p.mes !== mesActual);
  const base = completos.slice(-MAX_MESES_BASE);
  if (base.length < 2) return null;

  const kgProyectado = base.reduce((total, p) => total + p.kg, 0) / base.length;
  const ingresoProyectado = base.reduce((total, p) => total + p.ingreso, 0) / base.length;
  const utilidadProyectada = base.reduce((total, p) => total + p.utilidad, 0) / base.length;

  const ultimo = base[base.length - 1];
  const anteriores = base.slice(0, -1);
  const promedioAnteriores = anteriores.reduce((total, p) => total + p.kg, 0) / anteriores.length;
  const variacionVolumenPorcentaje =
    promedioAnteriores > 0 ? ((ultimo.kg - promedioAnteriores) / promedioAnteriores) * 100 : null;
  const tendenciaVolumen: ProyeccionMensual['tendenciaVolumen'] =
    variacionVolumenPorcentaje === null
      ? 'estable'
      : variacionVolumenPorcentaje > 10
        ? 'creciendo'
        : variacionVolumenPorcentaje < -10
          ? 'cayendo'
          : 'estable';

  return {
    kgProyectado,
    ingresoProyectado,
    utilidadProyectada,
    mesesBase: base.length,
    variacionVolumenPorcentaje,
    tendenciaVolumen,
  };
}
