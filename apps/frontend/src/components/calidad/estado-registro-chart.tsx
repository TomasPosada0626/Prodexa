'use client';

import type { EstadoRegistroSanitario } from '@/lib/calidad';
import { ESTADO_REGISTRO_INFO } from '@/lib/calidad';

interface Props {
  conteos: Partial<Record<EstadoRegistroSanitario, number>>;
}

const BAR_HEIGHT = 18;
const ROW_GAP = 8;

// Mismo color por estado que usan los pills de la tabla de Calidad (ESTADO_REGISTRO_INFO),
// para que el chart y la tabla nunca se contradigan visualmente.
const FILL_POR_ESTADO: Record<EstadoRegistroSanitario, string> = {
  suspendido: 'fill-red-500 dark:fill-red-400',
  vencido: 'fill-red-500 dark:fill-red-400',
  'por-vencer': 'fill-amber-500 dark:fill-amber-400',
  'en-tramite': 'fill-amber-500 dark:fill-amber-400',
  'sin-fecha': 'fill-slate-400 dark:fill-zinc-500',
  'sin-registro': 'fill-slate-400 dark:fill-zinc-500',
  vigente: 'fill-emerald-600 dark:fill-emerald-400',
};

/** Distribucion de formulaciones por estado de cumplimiento del registro sanitario. */
export function EstadoRegistroChart({ conteos }: Props) {
  const filas = (Object.keys(ESTADO_REGISTRO_INFO) as EstadoRegistroSanitario[])
    .map((estado) => ({ estado, cantidad: conteos[estado] ?? 0, ...ESTADO_REGISTRO_INFO[estado] }))
    .filter((fila) => fila.cantidad > 0)
    .sort((a, b) => a.orden - b.orden);

  if (filas.length === 0) return null;

  const maxCantidad = Math.max(...filas.map((f) => f.cantidad), 1);
  const rowHeight = BAR_HEIGHT + ROW_GAP;
  const chartHeight = filas.length * rowHeight;
  const labelWidth = 170;
  const chartWidth = 460;
  const trackWidth = chartWidth - labelWidth - 40;

  return (
    <div className="[font-variant-numeric:tabular-nums]">
      <svg
        role="img"
        aria-label="Distribucion de formulaciones por estado de registro sanitario"
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        width="100%"
        height={chartHeight}
        className="overflow-visible"
      >
        {filas.map((fila, index) => {
          const y = index * rowHeight;
          const barWidth = Math.max((fila.cantidad / maxCantidad) * trackWidth, 2);

          return (
            <g key={fila.estado}>
              <text
                x={labelWidth - 8}
                y={y + BAR_HEIGHT / 2}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-slate-600 text-[11px] dark:fill-zinc-400"
              >
                {fila.label}
              </text>
              <rect x={labelWidth} y={y} width={trackWidth} height={BAR_HEIGHT} rx={4} className="fill-slate-100 dark:fill-white/5" />
              <rect x={labelWidth} y={y} width={barWidth} height={BAR_HEIGHT} rx={4} className={FILL_POR_ESTADO[fila.estado]}>
                <title>
                  {fila.label}: {fila.cantidad}
                </title>
              </rect>
              <text
                x={labelWidth + barWidth + 8}
                y={y + BAR_HEIGHT / 2}
                dominantBaseline="middle"
                className="fill-slate-800 text-[11px] font-semibold dark:fill-zinc-200"
              >
                {fila.cantidad}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
