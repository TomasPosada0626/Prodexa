'use client';

interface TendenciaPoint {
  fecha: string;
  valor: number;
}

interface Props {
  data: TendenciaPoint[];
  ariaLabel: string;
  formatValor: (n: number) => string;
}

const WIDTH = 460;
const HEIGHT = 160;
const PAD_TOP = 16;
const PAD_BOTTOM = 24;
const PAD_LEFT = 8;
const PAD_RIGHT = 56;

/**
 * Linea de tendencia de una sola serie (sin leyenda: el titulo de la seccion ya dice
 * que se mide). Area al 10% de opacidad, linea de 2px, punto final con anillo y
 * etiqueta directa, gridlines recesivas, tooltip nativo al pasar el mouse por punto.
 */
export function TendenciaChart({ data, ariaLabel, formatValor }: Props) {
  if (data.length === 0) return null;

  const valores = data.map((d) => d.valor);
  const max = Math.max(...valores, 0);
  const min = Math.min(...valores, 0);
  const rango = max - min || 1;
  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;

  function x(index: number): number {
    return data.length === 1
      ? PAD_LEFT + plotWidth / 2
      : PAD_LEFT + (index / (data.length - 1)) * plotWidth;
  }

  function y(valor: number): number {
    return PAD_TOP + plotHeight - ((valor - min) / rango) * plotHeight;
  }

  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(d.valor)}`).join(' ');
  const areaPath = `${linePath} L ${x(data.length - 1)} ${PAD_TOP + plotHeight} L ${x(0)} ${PAD_TOP + plotHeight} Z`;
  const ultimo = data[data.length - 1];

  return (
    <div className="[font-variant-numeric:tabular-nums]">
      <svg
        role="img"
        aria-label={ariaLabel}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width="100%"
        height={HEIGHT}
        className="overflow-visible"
      >
        <line
          x1={PAD_LEFT}
          y1={PAD_TOP + plotHeight}
          x2={PAD_LEFT + plotWidth}
          y2={PAD_TOP + plotHeight}
          className="stroke-slate-200 dark:stroke-white/10"
          strokeWidth={1}
        />
        <path d={areaPath} className="fill-sky-600/10 dark:fill-[#8B5CF6]/10" />
        <path
          d={linePath}
          fill="none"
          className="stroke-sky-600 dark:stroke-[#8B5CF6]"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(d.valor)} r={9} fill="transparent" className="cursor-default">
              <title>
                {d.fecha}: {formatValor(d.valor)}
              </title>
            </circle>
            {i === data.length - 1 && (
              <circle
                cx={x(i)}
                cy={y(d.valor)}
                r={4}
                className="fill-sky-600 stroke-white dark:fill-[#8B5CF6] dark:stroke-[#0b0a16]"
                strokeWidth={2}
              />
            )}
          </g>
        ))}
        <text
          x={x(data.length - 1) + 10}
          y={y(ultimo.valor)}
          dominantBaseline="middle"
          className="fill-slate-800 text-[11px] font-semibold dark:fill-zinc-200"
        >
          {formatValor(ultimo.valor)}
        </text>
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-slate-600 dark:text-zinc-400">
        <span>{data[0].fecha}</span>
        {data.length > 1 && <span>{ultimo.fecha}</span>}
      </div>
    </div>
  );
}
