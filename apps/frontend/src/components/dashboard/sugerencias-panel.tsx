import Link from 'next/link';
import type { SugerenciaProduccion } from '@/lib/sugerencias';
import { formatCosto } from '@/lib/format';

interface Props {
  sugerencias: SugerenciaProduccion[];
}

/** ¿Que deberia producir esta empresa esta semana? Ranking heuristico (rentabilidad por kg x
 * demanda reciente), no una recomendacion de IA: cada numero se puede verificar en Analisis. */
export function SugerenciasPanel({ sugerencias }: Props) {
  const top = sugerencias.slice(0, 5);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
        ¿Que deberia producir esta semana?
      </h3>
      <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">
        Combina la rentabilidad por kg (a tus tarifas y margen actuales) con la demanda reciente (lotes vendidos en
        las ultimas 8 semanas).
      </p>

      {top.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500 dark:text-zinc-500">
          Aun no hay formulaciones rentables con datos suficientes para sugerir.
        </p>
      ) : (
        <ol className="mt-3 grid gap-2">
          {top.map(({ formulacion, utilidadPorKg, lotesRecientes }, index) => (
            <li
              key={formulacion.id}
              className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 dark:border-white/5 dark:bg-white/3"
            >
              <div className="flex items-center gap-2">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-sky-700 text-[11px] font-bold text-white dark:bg-[#8B5CF6]">
                  {index + 1}
                </span>
                <Link href="/formulaciones" className="font-medium text-slate-800 hover:underline dark:text-zinc-200">
                  {formulacion.nombreProducto}
                </Link>
              </div>
              <div className="text-right text-xs text-slate-500 dark:text-zinc-500">
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                  {formatCosto(utilidadPorKg)}/kg
                </span>
                {lotesRecientes > 0 && (
                  <span className="ml-2">
                    · {lotesRecientes} lote{lotesRecientes === 1 ? '' : 's'} reciente{lotesRecientes === 1 ? '' : 's'}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
