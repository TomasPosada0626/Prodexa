'use client';

import { useState } from 'react';

interface RankingRow {
  id: string;
  nombre: string;
  valor: number;
}

interface Props {
  data: RankingRow[];
  idSeleccionado: string;
  formatValor: (n: number) => string;
}

const BAR_HEIGHT = 20;
const ROW_GAP = 10;

/**
 * Ranking de todas las formulaciones por una metrica (ej. utilidad), con la
 * seleccionada resaltada en color de marca y el resto en un tono recesivo — la
 * identidad aqui es "cual es la mia", no una categoria, asi que no necesita leyenda.
 */
export function RankingChart({ data, idSeleccionado, formatValor }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);

  if (data.length === 0) return null;

  const ordenado = [...data].sort((a, b) => b.valor - a.valor);
  const maxValor = Math.max(...ordenado.map((d) => d.valor), 1);
  const minValor = Math.min(...ordenado.map((d) => d.valor), 0);
  const axisMax = Math.max(maxValor, Math.abs(minValor));
  const rowHeight = BAR_HEIGHT + ROW_GAP;
  const chartHeight = ordenado.length * rowHeight;
  const labelWidth = 130;
  const chartWidth = 460;
  const trackWidth = chartWidth - labelWidth - 60;

  return (
    <div className="[font-variant-numeric:tabular-nums]">
      <svg
        role="img"
        aria-label="Ranking de formulaciones"
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        width="100%"
        height={chartHeight}
        className="overflow-visible"
      >
        {ordenado.map((row, index) => {
          const y = index * rowHeight;
          const barWidth = Math.max((Math.abs(row.valor) / axisMax) * trackWidth, 2);
          const esSeleccionada = row.id === idSeleccionado;
          const isHovered = hovered === row.id;

          return (
            <g key={row.id} onMouseEnter={() => setHovered(row.id)} onMouseLeave={() => setHovered(null)}>
              <rect x={0} y={y} width={chartWidth} height={BAR_HEIGHT} fill="transparent" className="cursor-default" />
              <text
                x={labelWidth - 8}
                y={y + BAR_HEIGHT / 2}
                textAnchor="end"
                dominantBaseline="middle"
                className={
                  esSeleccionada
                    ? 'fill-slate-900 text-[11px] font-semibold dark:fill-white'
                    : 'fill-slate-500 text-[11px] dark:fill-zinc-500'
                }
              >
                {row.nombre.length > 18 ? `${row.nombre.slice(0, 17)}…` : row.nombre}
              </text>
              <rect x={labelWidth} y={y} width={trackWidth} height={BAR_HEIGHT} rx={4} className="fill-slate-100 dark:fill-white/5" />
              <rect
                x={labelWidth}
                y={y}
                width={barWidth}
                height={BAR_HEIGHT}
                rx={4}
                className={
                  esSeleccionada
                    ? 'fill-sky-600 dark:fill-[#8B5CF6]'
                    : 'fill-slate-300 transition-opacity dark:fill-white/15'
                }
                opacity={isHovered ? 1 : esSeleccionada ? 1 : 0.8}
              />
              <text
                x={labelWidth + barWidth + 8}
                y={y + BAR_HEIGHT / 2}
                dominantBaseline="middle"
                className={
                  esSeleccionada
                    ? 'fill-slate-900 text-[11px] font-semibold dark:fill-white'
                    : 'fill-slate-500 text-[11px] dark:fill-zinc-500'
                }
              >
                {formatValor(row.valor)}
              </text>
              <title>
                {row.nombre}: {formatValor(row.valor)}
              </title>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
