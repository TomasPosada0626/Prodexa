'use client';

import { useRef } from 'react';
import clsx from 'clsx';
import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';
import { ArrowUpRight, TrendingUp } from 'lucide-react';
import { useCountUp } from './useCountUp';

interface Kpi {
  label: string;
  value: string;
  delta?: string;
  accent?: boolean;
}

interface RankedFormulation {
  name: string;
  profit: number;
  /** Bar fill, 0-100 — relative to the most profitable formulation. */
  share: number;
}

const KPIS: Kpi[] = [
  { label: 'Formulaciones', value: '12', delta: '+3 este mes' },
  { label: 'Margen prom.', value: '38%', delta: '+2.1%' },
  { label: 'Utilidad/kg', value: '$46.10', delta: '+$4.80', accent: true },
];

const TOP_FORMULATIONS: RankedFormulation[] = [
  { name: 'Sero facial', profit: 7.25, share: 95 },
  { name: 'Salsa Negra', profit: 6.7, share: 88 },
  { name: 'Crema hidratante', profit: 3.7, share: 52 },
];

const TILT_RANGE_DEG = 8;

function KpiTile({ kpi }: { kpi: Kpi }) {
  const animatedValue = useCountUp(kpi.value);
  return (
    <div className="rounded-xl border border-white/10 bg-white/3 p-3">
      <p className="font-mono text-[10px] uppercase tracking-wide text-zinc-500">{kpi.label}</p>
      <p className={clsx('mt-1 font-mono text-lg font-bold', kpi.accent ? 'text-emerald-400' : 'text-white')}>
        {animatedValue}
      </p>
      {kpi.delta && (
        <p className="mt-0.5 flex items-center gap-0.5 text-[10px] font-medium text-emerald-400/80">
          <TrendingUp className="h-2.5 w-2.5" aria-hidden />
          {kpi.delta}
        </p>
      )}
    </div>
  );
}

/**
 * The hero's centerpiece: a real product preview (the Costos dashboard),
 * not an abstract logo mark — shows what the user actually gets. Tilts
 * gently toward the cursor and shows a looping "live" toast; both respect
 * prefers-reduced-motion via useReducedMotion.
 */
export function HeroShowcase() {
  const prefersReducedMotion = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);

  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springRotateX = useSpring(rotateX, { stiffness: 150, damping: 18 });
  const springRotateY = useSpring(rotateY, { stiffness: 150, damping: 18 });

  function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    if (prefersReducedMotion || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    rotateY.set(px * TILT_RANGE_DEG);
    rotateX.set(-py * TILT_RANGE_DEG);
  }

  function handleMouseLeave() {
    rotateX.set(0);
    rotateY.set(0);
  }

  return (
    <div className="relative mx-auto w-full max-w-md [font-variant-numeric:tabular-nums] perspective-distant">
      {/* Dual-tone ambient glow — ties the card into the nebula backdrop instead of floating flat on top of it. */}
      <div aria-hidden className="absolute -inset-10 -z-10">
        <div className="absolute left-1/2 top-0 h-64 w-64 -translate-x-2/3 rounded-full bg-[#8B5CF6]/30 blur-[100px]" />
        <div className="absolute bottom-0 right-1/2 h-64 w-64 translate-x-1/2 rounded-full bg-[#00B8FF]/20 blur-[100px]" />
      </div>

      {/* Back card: a soft, blurred peek of a second screen, for depth. */}
      <div
        aria-hidden
        className="absolute -right-6 -top-6 w-full rotate-3 rounded-2xl border border-white/10 bg-white/3 p-5 backdrop-blur-sm"
      >
        <div className="h-3 w-24 rounded-full bg-white/10" />
        <div className="mt-4 space-y-2">
          <div className="h-2.5 w-full rounded-full bg-white/5" />
          <div className="h-2.5 w-4/5 rounded-full bg-white/5" />
        </div>
      </div>

      {/* Front card: the real Costos y rentabilidad panel, wrapped in a brand-gradient ring for coherence with the CTAs elsewhere on the page. */}
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ rotateX: springRotateX, rotateY: springRotateY, transformStyle: 'preserve-3d' }}
        className="relative rounded-2xl bg-(image:--brand-gradient) p-px shadow-[0_30px_70px_-20px_rgba(139,92,246,0.45)]"
      >
        <div className="relative overflow-hidden rounded-2xl bg-[#0b0a16] p-5">
          {/* Faint schematic grid — reads as a real screen surface, not a flat rectangle. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.04] bg-[linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] bg-size-[24px_24px]"
          />
          {/* Top glass sheen. */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/40 to-transparent" />

          <div className="relative flex items-center justify-between">
            <span className="font-heading text-sm font-semibold text-white">Costos y rentabilidad</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-[#00B8FF]">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00B8FF] opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#00B8FF]" />
              </span>
              En vivo
            </span>
          </div>

          <div className="relative mt-5 grid grid-cols-3 gap-2">
            {KPIS.map((kpi) => (
              <KpiTile key={kpi.label} kpi={kpi} />
            ))}
          </div>

          <div className="relative mt-5 space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-wide text-zinc-500">Top rentabilidad</p>
            {TOP_FORMULATIONS.map((item, index) => (
              <div key={item.name} className="flex items-center gap-2.5">
                <span
                  className={clsx(
                    'flex h-4 w-4 shrink-0 items-center justify-center rounded-full font-mono text-[9px] font-semibold',
                    index === 0 && 'bg-amber-400/20 text-amber-300',
                    index === 1 && 'bg-zinc-300/20 text-zinc-200',
                    index === 2 && 'bg-orange-700/20 text-orange-300',
                  )}
                >
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="truncate text-zinc-300">{item.name}</span>
                    <span className="font-mono font-semibold text-emerald-400">${item.profit.toFixed(2)}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-(image:--brand-gradient) shadow-[0_0_8px_0_rgba(139,92,246,0.6)]"
                      style={{ width: `${item.share}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="relative mt-5 flex items-center justify-between rounded-xl border border-white/10 bg-white/3 px-3 py-2.5">
            <span className="text-xs text-zinc-400">Analiza cualquier lote al instante</span>
            <ArrowUpRight className="h-4 w-4 text-[#8B5CF6]" aria-hidden />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
