'use client';

import { useState } from 'react';

interface CostoVsPrecioRow {
  id: string;
  nombre: string;
  costo: number;
  precioVenta: number;
}

interface Props {
  data: CostoVsPrecioRow[];
  formatValor: (n: number) => string;
}

const BAR_HEIGHT = 9;
const BAR_GAP = 3;
const ROW_HEIGHT = BAR_HEIGHT * 2 + BAR_GAP + 14;

/**
 * Barras horizontales agrupadas (costo vs precio de venta) por formulacion: dos series de
 * color fijo (costo=ambar, precio=esmeralda, coherente con el resto de la app), leyenda
 * porque son 2 series, valor directo y tooltip por barra.
 */
export function CostoVsPrecioChart({ data, formatValor }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);

  if (data.length === 0) return null;

  const maxValor = Math.max(...data.map((d) => Math.max(d.costo, d.precioVenta)), 1);
  const chartHeight = data.length * ROW_HEIGHT;
  const labelWidth = 130;
  const chartWidth = 480;
  const trackWidth = chartWidth - labelWidth - 70;

  return (
    <div className="[font-variant-numeric:tabular-nums]">
      <div className="mb-2 flex items-center gap-4 text-xs text-slate-600 dark:text-zinc-400">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" aria-hidden />
          Costo de produccion
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-600" aria-hidden />
          Precio de venta
        </span>
      </div>
      <svg
        role="img"
        aria-label="Costo de produccion comparado con precio de venta, por formulacion"
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        width="100%"
        height={chartHeight}
        className="overflow-visible"
      >
        {data.map((row, index) => {
          const yBase = index * ROW_HEIGHT;
          const costoWidth = Math.max((row.costo / maxValor) * trackWidth, 2);
          const precioWidth = Math.max((row.precioVenta / maxValor) * trackWidth, 2);
          const isHovered = hovered === row.id;

          return (
            <g
              key={row.id}
              onMouseEnter={() => setHovered(row.id)}
              onMouseLeave={() => setHovered(null)}
            >
              <rect x={0} y={yBase} width={chartWidth} height={ROW_HEIGHT - 4} fill="transparent" />
              <text
                x={labelWidth - 8}
                y={yBase + ROW_HEIGHT / 2 - 6}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-slate-600 text-[11px] dark:fill-zinc-400"
              >
                {row.nombre.length > 16 ? `${row.nombre.slice(0, 15)}…` : row.nombre}
              </text>

              <rect
                x={labelWidth}
                y={yBase}
                width={costoWidth}
                height={BAR_HEIGHT}
                rx={3}
                className="fill-amber-500 transition-opacity"
                opacity={isHovered ? 1 : 0.9}
              />
              <text
                x={labelWidth + costoWidth + 6}
                y={yBase + BAR_HEIGHT / 2}
                dominantBaseline="middle"
                className="fill-slate-700 text-[10px] font-medium dark:fill-zinc-300"
              >
                {formatValor(row.costo)}
              </text>

              <rect
                x={labelWidth}
                y={yBase + BAR_HEIGHT + BAR_GAP}
                width={precioWidth}
                height={BAR_HEIGHT}
                rx={3}
                className="fill-emerald-600 transition-opacity"
                opacity={isHovered ? 1 : 0.9}
              />
              <text
                x={labelWidth + precioWidth + 6}
                y={yBase + BAR_HEIGHT + BAR_GAP + BAR_HEIGHT / 2}
                dominantBaseline="middle"
                className="fill-slate-700 text-[10px] font-medium dark:fill-zinc-300"
              >
                {formatValor(row.precioVenta)}
              </text>

              <title>
                {row.nombre}: costo {formatValor(row.costo)}, precio de venta {formatValor(row.precioVenta)}
              </title>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
