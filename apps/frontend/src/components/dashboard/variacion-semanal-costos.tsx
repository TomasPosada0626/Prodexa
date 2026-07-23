'use client';

import { useEffect, useState } from 'react';
import { Formulation, getFormulationVersions } from '@/lib/api';
import { calculateCost } from '@/lib/costing';
import { formatCosto } from '@/lib/format';
import { Skeleton } from '@/components/ui/Skeleton';
import { TendenciaChart } from '@/components/analisis/tendencia-chart';

interface Props {
  formulaciones: Formulation[];
}

const SEMANAS_A_MOSTRAR = 8;

/** Lunes de la semana ISO a la que pertenece una fecha, como clave de agrupacion (YYYY-MM-DD). */
function inicioDeSemana(fecha: Date): string {
  const dia = fecha.getDay();
  const diff = (dia === 0 ? -6 : 1) - dia; // retrocede hasta el lunes
  const lunes = new Date(fecha);
  lunes.setDate(fecha.getDate() + diff);
  lunes.setHours(0, 0, 0, 0);
  return lunes.toISOString().slice(0, 10);
}

function costoDeSnapshot(snapshot: {
  ingredientes: Array<{ precioTotal: string }>;
  cantidadBaseKg: string;
  margenPorcentaje: string;
  impuestoPorcentaje: string;
}): number | null {
  const costoBaseTotal = snapshot.ingredientes.reduce((total, i) => total + Number(i.precioTotal), 0);
  const cantidadBaseKg = Number(snapshot.cantidadBaseKg);
  const resultado = calculateCost({
    costoBaseTotal,
    cantidadBaseKg,
    cantidadObjetivoKg: cantidadBaseKg,
    margenPorcentaje: Number(snapshot.margenPorcentaje),
    impuestoPorcentaje: Number(snapshot.impuestoPorcentaje),
  });
  return resultado?.costoEscalado ?? null;
}

/**
 * Agrega el costo de produccion de TODAS las formulaciones (historico via
 * FormulationVersion + estado actual) en promedios semanales, para ver como se
 * mueve el costo general del negocio semana a semana, no solo por formulacion
 * (eso ya lo cubre Analisis).
 */
export function VariacionSemanalCostos({ formulaciones }: Props) {
  const [puntos, setPuntos] = useState<Array<{ fecha: string; valor: number }> | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all(
      formulaciones.map(async (formulacion) => {
        const versiones = await getFormulationVersions(formulacion.id).catch(() => []);
        const puntosFormulacion: Array<{ semana: string; costo: number }> = [];

        for (const version of versiones) {
          const costo = costoDeSnapshot(version.snapshot);
          if (costo !== null) {
            puntosFormulacion.push({ semana: inicioDeSemana(new Date(version.createdAt)), costo });
          }
        }

        const costoActual = costoDeSnapshot({
          ingredientes: formulacion.ingredientes,
          cantidadBaseKg: formulacion.cantidadBaseKg,
          margenPorcentaje: formulacion.margenPorcentaje,
          impuestoPorcentaje: formulacion.impuestoPorcentaje,
        });
        if (costoActual !== null) {
          puntosFormulacion.push({ semana: inicioDeSemana(new Date()), costo: costoActual });
        }

        return puntosFormulacion;
      }),
    )
      .then((porFormulacion) => {
        if (cancelled) return;

        const porSemana = new Map<string, number[]>();
        for (const puntos of porFormulacion) {
          for (const { semana, costo } of puntos) {
            const lista = porSemana.get(semana) ?? [];
            lista.push(costo);
            porSemana.set(semana, lista);
          }
        }

        const semanasOrdenadas = Array.from(porSemana.keys()).sort();
        const ultimasSemanas = semanasOrdenadas.slice(-SEMANAS_A_MOSTRAR);

        setPuntos(
          ultimasSemanas.map((semana) => {
            const costos = porSemana.get(semana) ?? [];
            const promedio = costos.reduce((total, c) => total + c, 0) / costos.length;
            return {
              fecha: new Date(semana).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }),
              valor: promedio,
            };
          }),
        );
      })
      .catch(() => {
        if (!cancelled) setPuntos([]);
      });

    return () => {
      cancelled = true;
    };
  }, [formulaciones]);

  if (puntos === null) {
    return <Skeleton className="h-40" />;
  }

  if (puntos.length < 2) {
    return (
      <p className="text-sm text-slate-500 dark:text-zinc-500">
        Aun no hay suficiente historial de ediciones para ver la variacion semanal del costo.
      </p>
    );
  }

  return <TendenciaChart data={puntos} ariaLabel="Variacion semanal del costo promedio" formatValor={formatCosto} />;
}
