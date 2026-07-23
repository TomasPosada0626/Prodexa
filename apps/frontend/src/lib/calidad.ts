import type { Formulation } from './api';

// 4 meses de anticipacion: suficiente margen para iniciar el tramite de renovacion antes del vencimiento real.
export const DIAS_ALERTA_VENCIMIENTO = 120;

export type EstadoRegistroSanitario =
  | 'vencido'
  | 'por-vencer'
  | 'vigente'
  | 'sin-fecha'
  | 'sin-registro'
  | 'en-tramite'
  | 'suspendido';

export const ESTADO_REGISTRO_INFO: Record<
  EstadoRegistroSanitario,
  { label: string; className: string; orden: number }
> = {
  suspendido: {
    label: 'Suspendido',
    className: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
    orden: 0,
  },
  vencido: {
    label: 'Registro vencido',
    className: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
    orden: 1,
  },
  'por-vencer': {
    label: 'Por vencer',
    className: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
    orden: 2,
  },
  'en-tramite': {
    label: 'En tramite de renovacion',
    className: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
    orden: 3,
  },
  'sin-fecha': {
    label: 'Sin fecha de vencimiento',
    className: 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-zinc-400',
    orden: 4,
  },
  'sin-registro': {
    label: 'Sin registro sanitario',
    className: 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-zinc-400',
    orden: 5,
  },
  vigente: {
    label: 'Vigente',
    className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
    orden: 6,
  },
};

/** Calcula el estado de cumplimiento del registro sanitario de una formulacion, usado en Calidad y en las alertas de Inicio. */
export function calcularEstadoRegistro(
  formulacion: Formulation,
): { estado: EstadoRegistroSanitario; diasRestantes: number | null } {
  if (formulacion.registroSanitarioEstado === 'SUSPENDIDO') return { estado: 'suspendido', diasRestantes: null };
  if (formulacion.registroSanitarioEstado === 'EN_TRAMITE') return { estado: 'en-tramite', diasRestantes: null };

  if (!formulacion.registroSanitario) {
    return { estado: 'sin-registro', diasRestantes: null };
  }
  if (!formulacion.registroSanitarioVencimiento) {
    return { estado: 'sin-fecha', diasRestantes: null };
  }

  const vencimiento = new Date(formulacion.registroSanitarioVencimiento).getTime();
  const diasRestantes = Math.ceil((vencimiento - Date.now()) / (24 * 60 * 60 * 1000));

  if (diasRestantes < 0) return { estado: 'vencido', diasRestantes };
  if (diasRestantes <= DIAS_ALERTA_VENCIMIENTO) return { estado: 'por-vencer', diasRestantes };
  return { estado: 'vigente', diasRestantes };
}
