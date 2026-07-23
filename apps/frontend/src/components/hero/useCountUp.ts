'use client';

import { useEffect, useState } from 'react';

interface ParsedValue {
  prefix: string;
  suffix: string;
  target: number;
  decimals: number;
}

/** Splits "$46.10" / "38%" / "12" into the parts a count-up animation needs. */
function parseValue(raw: string): ParsedValue {
  const match = raw.match(/^([^\d]*)([\d.]+)([^\d]*)$/);
  if (!match) {
    return { prefix: '', suffix: raw, target: 0, decimals: 0 };
  }
  const [, prefix, number, suffix] = match;
  const decimals = number.includes('.') ? number.split('.')[1].length : 0;
  return { prefix, suffix, target: Number.parseFloat(number), decimals };
}

/**
 * Animates a formatted metric ("$46.10", "38%", "12") from zero up to its
 * target once on mount, easing out over `duration`ms. Respects
 * prefers-reduced-motion by snapping straight to the final value.
 */
export function useCountUp(raw: string, duration = 900): string {
  const { prefix, suffix, target, decimals } = parseValue(raw);
  const [display, setDisplay] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? target : 0,
  );

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // El estado inicial ya quedo en `target` (ver useState lazy initializer arriba).
      return;
    }

    let frame: number;
    const start = performance.now();

    function tick(now: number) {
      const elapsed = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - elapsed) ** 3;
      setDisplay(target * eased);
      if (elapsed < 1) {
        frame = requestAnimationFrame(tick);
      }
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return `${prefix}${display.toFixed(decimals)}${suffix}`;
}
