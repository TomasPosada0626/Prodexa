import type { CapacidadUtilizada } from '@/lib/costing';
import { formatKg } from '@/lib/format';

/** Debajo del 40% sobra capacidad instalada (gastos generales prorateados sobre pocos kg,
 * subiendo el costo real por kg); por encima del 100% se esta produciendo mas de lo planeado. */
function nivelDeUso(porcentaje: number): { className: string; mensaje: string } {
  if (porcentaje > 100) {
    return {
      className: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
      mensaje: 'Por encima de la capacidad configurada en Configuracion.',
    };
  }
  if (porcentaje < 40) {
    return {
      className: 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-zinc-300',
      mensaje: 'Capacidad ociosa: los gastos generales se reparten entre pocos kg, subiendo el costo real por kg.',
    };
  }
  return {
    className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
    mensaje: 'Uso saludable de la capacidad instalada.',
  };
}

interface Props {
  capacidad: CapacidadUtilizada;
}

export function CapacidadPanel({ capacidad }: Props) {
  const { kgProducidosMes, capacidadMensualKg, utilizacionPorcentaje } = capacidad;

  if (utilizacionPorcentaje === null) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
          Capacidad utilizada (mes actual)
        </h3>
        <p className="mt-3 text-sm text-slate-500 dark:text-zinc-500">
          Configura tu capacidad de produccion mensual (kg) en Configuracion para ver este indicador.
        </p>
      </div>
    );
  }

  const { className, mensaje } = nivelDeUso(utilizacionPorcentaje);
  const anchoBarra = Math.min(100, utilizacionPorcentaje);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
          Capacidad utilizada (mes actual)
        </h3>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${className}`}>
          {utilizacionPorcentaje.toFixed(0)}%
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
        {formatKg(kgProducidosMes)} kg <span className="text-sm font-normal text-slate-500 dark:text-zinc-500">de {formatKg(capacidadMensualKg)} kg</span>
      </p>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
        <div
          className={`h-full rounded-full ${utilizacionPorcentaje > 100 ? 'bg-amber-500' : 'bg-emerald-500'}`}
          style={{ width: `${anchoBarra}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-slate-500 dark:text-zinc-500">{mensaje}</p>
    </div>
  );
}
