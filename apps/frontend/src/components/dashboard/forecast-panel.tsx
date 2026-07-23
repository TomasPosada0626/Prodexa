import type { Proyeccion, ProyeccionMensual } from '@/lib/forecast';
import { formatCosto, formatKg } from '@/lib/format';

const TENDENCIA_INFO: Record<Proyeccion['tendencia'], { label: string; className: string }> = {
  subiendo: { label: '↑ Al alza', className: 'text-emerald-700 dark:text-emerald-400' },
  bajando: { label: '↓ A la baja', className: 'text-red-600 dark:text-red-400' },
  estable: { label: '→ Estable', className: 'text-slate-600 dark:text-zinc-400' },
};

const TENDENCIA_VOLUMEN_INFO: Record<ProyeccionMensual['tendenciaVolumen'], { label: string; className: string }> = {
  creciendo: { label: '↑ Creciendo en volumen', className: 'text-emerald-700 dark:text-emerald-400' },
  cayendo: { label: '↓ Cayendo en volumen', className: 'text-red-600 dark:text-red-400' },
  estable: { label: '→ Volumen estable', className: 'text-slate-600 dark:text-zinc-400' },
};

interface Props {
  proyeccion: Proyeccion | null;
  proyeccionMensual?: ProyeccionMensual | null;
}

/** ¿Cuanto deberia producir/facturar/ganar esta empresa (o este producto) si sigue su propia
 * tendencia? Promedio movil de periodos ya completos, no una estimacion de IA: es planeacion
 * comercial/de produccion, no una alerta de reabastecimiento de materia prima. */
export function ForecastPanel({ proyeccion, proyeccionMensual }: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
        Proyeccion de la proxima semana
      </h3>

      {proyeccion === null ? (
        <p className="mt-3 text-sm text-slate-500 dark:text-zinc-500">
          Registra al menos 2 semanas completas de lotes producidos para ver una proyeccion.
        </p>
      ) : (
        <>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">
            Promedio de las ultimas {proyeccion.semanasBase} semanas completas ·{' '}
            <span className={`font-medium ${TENDENCIA_INFO[proyeccion.tendencia].className}`}>
              {TENDENCIA_INFO[proyeccion.tendencia].label}
            </span>
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-slate-500 dark:text-zinc-500">Kg a producir</p>
              <p className="mt-0.5 text-xl font-bold text-slate-900 dark:text-white">
                {formatKg(proyeccion.kgProyectado)} kg
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-zinc-500">Ingreso esperado</p>
              <p className="mt-0.5 text-xl font-bold text-slate-900 dark:text-white">
                {formatCosto(proyeccion.ingresoProyectado)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-zinc-500">Utilidad esperada</p>
              <p
                className={`mt-0.5 text-xl font-bold ${proyeccion.utilidadProyectada < 0 ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}
              >
                {formatCosto(proyeccion.utilidadProyectada)}
              </p>
            </div>
          </div>
        </>
      )}

      {proyeccionMensual !== undefined && (
        <div className="mt-4 border-t border-slate-100 pt-4 dark:border-white/10">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
            Proyeccion del proximo mes
          </p>
          {proyeccionMensual === null ? (
            <p className="mt-2 text-sm text-slate-500 dark:text-zinc-500">
              Registra al menos 2 meses completos de lotes producidos para ver una proyeccion mensual.
            </p>
          ) : (
            <>
              <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">
                Promedio de los ultimos {proyeccionMensual.mesesBase} meses completos ·{' '}
                <span className={`font-medium ${TENDENCIA_VOLUMEN_INFO[proyeccionMensual.tendenciaVolumen].className}`}>
                  {TENDENCIA_VOLUMEN_INFO[proyeccionMensual.tendenciaVolumen].label}
                </span>
                {proyeccionMensual.variacionVolumenPorcentaje !== null && (
                  <span className="text-slate-400 dark:text-zinc-600">
                    {' '}
                    ({proyeccionMensual.variacionVolumenPorcentaje > 0 ? '+' : ''}
                    {proyeccionMensual.variacionVolumenPorcentaje.toFixed(0)}% vs. meses anteriores)
                  </span>
                )}
              </p>
              <div className="mt-3 grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-slate-500 dark:text-zinc-500">Kg a producir</p>
                  <p className="mt-0.5 text-xl font-bold text-slate-900 dark:text-white">
                    {formatKg(proyeccionMensual.kgProyectado)} kg
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-zinc-500">Facturacion esperada</p>
                  <p className="mt-0.5 text-xl font-bold text-slate-900 dark:text-white">
                    {formatCosto(proyeccionMensual.ingresoProyectado)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-zinc-500">Ganancia esperada</p>
                  <p
                    className={`mt-0.5 text-xl font-bold ${proyeccionMensual.utilidadProyectada < 0 ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}
                  >
                    {formatCosto(proyeccionMensual.utilidadProyectada)}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
