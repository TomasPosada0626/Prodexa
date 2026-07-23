'use client';

import { useState } from 'react';

interface MargenChartRow {
  id: string;
  nombre: string;
  margen: number;
}

interface Props {
  data: MargenChartRow[];
}

const BAR_HEIGHT = 20;
const ROW_GAP = 10;

/**
 * Barras horizontales comparando el margen (%) de cada formulacion. Serie unica
 * (sin leyenda: el titulo de la seccion ya dice que se mide), color de marca,
 * valor directo en la punta de cada barra, y tooltip al pasar el mouse.
 */
export function MargenChart({ data }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);

  if (data.length === 0) return null;

  const maxMargen = Math.max(...data.map((d) => d.margen), 1);
  // Redondea el techo del eje a un multiplo de 10 por encima del maximo, para que las barras usen bien el espacio.
  const axisMax = Math.max(10, Math.ceil(maxMargen / 10) * 10);
  const rowHeight = BAR_HEIGHT + ROW_GAP;
  const chartHeight = data.length * rowHeight;
  const labelWidth = 120;
  const chartWidth = 460;
  const trackWidth = chartWidth - labelWidth - 50;

  return (
    <div className="[font-variant-numeric:tabular-nums]">
      <svg
        role="img"
        aria-label="Margen porcentual por formulacion"
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        width="100%"
        height={chartHeight}
        className="overflow-visible"
      >
        {data.map((row, index) => {
          const y = index * rowHeight;
          const barWidth = Math.max((row.margen / axisMax) * trackWidth, 2);
          const isHovered = hovered === row.id;

          return (
            <g
              key={row.id}
              onMouseEnter={() => setHovered(row.id)}
              onMouseLeave={() => setHovered(null)}
            >
              <rect
                x={0}
                y={y}
                width={chartWidth}
                height={BAR_HEIGHT}
                fill="transparent"
                className="cursor-default"
              />
              <text
                x={labelWidth - 8}
                y={y + BAR_HEIGHT / 2}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-slate-600 text-[11px] dark:fill-zinc-400"
              >
                {row.nombre.length > 16 ? `${row.nombre.slice(0, 15)}…` : row.nombre}
              </text>
              <rect
                x={labelWidth}
                y={y}
                width={trackWidth}
                height={BAR_HEIGHT}
                rx={4}
                className="fill-slate-100 dark:fill-white/5"
              />
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
                {row.margen.toFixed(0)}%
              </text>
              <title>
                {row.nombre}: {row.margen.toFixed(1)}% de margen
              </title>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
