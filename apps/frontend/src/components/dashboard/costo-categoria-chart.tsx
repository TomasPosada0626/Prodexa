'use client';

import { useState } from 'react';

interface CostoCategoriaRow {
  categoria: string;
  costoPromedio: number;
}

interface Props {
  data: CostoCategoriaRow[];
  formatValor: (n: number) => string;
}

const BAR_HEIGHT = 20;
const ROW_GAP = 10;

/**
 * Barras horizontales con el costo promedio de produccion por categoria. Serie
 * unica (el titulo ya dice que se mide), color de marca, valor directo en la
 * punta de cada barra, tooltip al pasar el mouse.
 */
export function CostoCategoriaChart({ data, formatValor }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);

  if (data.length === 0) return null;

  const maxCosto = Math.max(...data.map((d) => d.costoPromedio), 1);
  const rowHeight = BAR_HEIGHT + ROW_GAP;
  const chartHeight = data.length * rowHeight;
  const labelWidth = 130;
  const chartWidth = 460;
  const trackWidth = chartWidth - labelWidth - 60;

  return (
    <div className="[font-variant-numeric:tabular-nums]">
      <svg
        role="img"
        aria-label="Costo promedio por categoria"
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        width="100%"
        height={chartHeight}
        className="overflow-visible"
      >
        {data.map((row, index) => {
          const y = index * rowHeight;
          const barWidth = Math.max((row.costoPromedio / maxCosto) * trackWidth, 2);
          const isHovered = hovered === row.categoria;

          return (
            <g
              key={row.categoria}
              onMouseEnter={() => setHovered(row.categoria)}
              onMouseLeave={() => setHovered(null)}
            >
              <rect x={0} y={y} width={chartWidth} height={BAR_HEIGHT} fill="transparent" className="cursor-default" />
              <text
                x={labelWidth - 8}
                y={y + BAR_HEIGHT / 2}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-slate-600 text-[11px] dark:fill-zinc-400"
              >
                {row.categoria.length > 18 ? `${row.categoria.slice(0, 17)}…` : row.categoria}
              </text>
              <rect x={labelWidth} y={y} width={trackWidth} height={BAR_HEIGHT} rx={4} className="fill-slate-100 dark:fill-white/5" />
              <rect
                x={labelWidth}
                y={y}
                width={barWidth}
                height={BAR_HEIGHT}
                rx={4}
                className="fill-sky-600 transition-opacity dark:fill-[#8B5CF6]"
                opacity={isHovered ? 1 : 0.9}
              />
              <text
                x={labelWidth + barWidth + 8}
                y={y + BAR_HEIGHT / 2}
                dominantBaseline="middle"
                className="fill-slate-800 text-[11px] font-semibold dark:fill-zinc-200"
              >
                {formatValor(row.costoPromedio)}
              </text>
              <title>
                {row.categoria}: {formatValor(row.costoPromedio)} de costo promedio
              </title>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
