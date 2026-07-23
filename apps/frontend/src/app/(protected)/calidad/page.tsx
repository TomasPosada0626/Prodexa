'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Formulation, RegistroSanitarioEstadoManual, ApiError, updateFormulation } from '@/lib/api';
import { calcularEstadoRegistro, ESTADO_REGISTRO_INFO, type EstadoRegistroSanitario } from '@/lib/calidad';
import { useFormulations } from '@/lib/use-formulations';
import { useToast } from '@/context/toast-context';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EstadoRegistroChart } from '@/components/calidad/estado-registro-chart';
import { ControlCalidadLotes } from '@/components/calidad/control-calidad-lotes';

const ESTADO_INFO = ESTADO_REGISTRO_INFO;
const calcularEstado = calcularEstadoRegistro;

const ESTADO_MANUAL_OPTIONS: Array<{ value: RegistroSanitarioEstadoManual | ''; label: string }> = [
  { value: '', label: 'Automatico (segun fecha)' },
  { value: 'EN_TRAMITE', label: 'En tramite de renovacion' },
  { value: 'SUSPENDIDO', label: 'Suspendido' },
];

const selectClasses =
  'rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200';

interface FilaProps {
  formulacion: Formulation;
  onUpdated: () => void;
  onSolicitarBorrarRegistro: (formulacion: Formulation) => void;
}

/** Keyed por formulacion.id en el padre para que el estado de guardado se reinicie solo al refrescar la lista. */
function CalidadFila({ formulacion, onUpdated, onSolicitarBorrarRegistro }: FilaProps) {
  const { showToast } = useToast();
  const [guardando, setGuardando] = useState(false);
  const { estado, diasRestantes } = calcularEstado(formulacion);

  const tieneRegistro = Boolean(
    formulacion.registroSanitario || formulacion.registroSanitarioVencimiento || formulacion.registroSanitarioEstado,
  );

  async function handleFechaChange(value: string) {
    setGuardando(true);
    try {
      await updateFormulation(formulacion.id, { registroSanitarioVencimiento: value || undefined });
      onUpdated();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'No se pudo actualizar la fecha.', 'error');
    } finally {
      setGuardando(false);
    }
  }

  async function handleEstadoManualChange(value: string) {
    setGuardando(true);
    try {
      await updateFormulation(formulacion.id, {
        registroSanitarioEstado: value ? (value as RegistroSanitarioEstadoManual) : null,
      });
      onUpdated();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'No se pudo actualizar el estado.', 'error');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <tr className="border-b border-slate-100 dark:border-white/5">
      <td className="py-2 font-medium text-slate-800 dark:text-zinc-200">
        <Link href="/formulaciones" className="hover:underline">
          {formulacion.nombreProducto}
        </Link>
      </td>
      <td className="py-2 text-slate-600 dark:text-zinc-400">{formulacion.registroSanitario ?? '—'}</td>
      <td className="py-2">
        <input
          type="date"
          aria-label={`Vencimiento del registro sanitario de ${formulacion.nombreProducto}`}
          disabled={guardando}
          defaultValue={formulacion.registroSanitarioVencimiento?.slice(0, 10) ?? ''}
          onBlur={(e) => handleFechaChange(e.target.value)}
          className={`${selectClasses} disabled:opacity-60`}
        />
        {diasRestantes !== null && diasRestantes >= 0 && (estado === 'por-vencer' || estado === 'vigente') && (
          <span className="ml-1 text-xs text-slate-600 dark:text-zinc-400">
            ({diasRestantes} dia{diasRestantes === 1 ? '' : 's'})
          </span>
        )}
      </td>
      <td className="py-2">
        <select
          aria-label={`Estado manual del registro sanitario de ${formulacion.nombreProducto}`}
          disabled={guardando}
          defaultValue={formulacion.registroSanitarioEstado ?? ''}
          onChange={(e) => handleEstadoManualChange(e.target.value)}
          className={`${selectClasses} disabled:opacity-60`}
        >
          {ESTADO_MANUAL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} className="text-slate-900">
              {opt.label}
            </option>
          ))}
        </select>
      </td>
      <td className="py-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ESTADO_INFO[estado].className}`}>
          {ESTADO_INFO[estado].label}
        </span>
      </td>
      <td className="py-2">
        <button
          type="button"
          onClick={() => onSolicitarBorrarRegistro(formulacion)}
          disabled={guardando || !tieneRegistro}
          className="rounded-full border border-red-200 px-2 py-0.5 text-xs text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
        >
          Borrar registro
        </button>
      </td>
    </tr>
  );
}

export default function CalidadPage() {
  const { showToast } = useToast();
  const { formulaciones, loading, error, refetch } = useFormulations();
  const [formulacionABorrarRegistro, setFormulacionABorrarRegistro] = useState<Formulation | null>(null);
  const [borrandoRegistro, setBorrandoRegistro] = useState(false);

  async function handleConfirmarBorrarRegistro() {
    if (!formulacionABorrarRegistro) return;
    setBorrandoRegistro(true);
    try {
      await updateFormulation(formulacionABorrarRegistro.id, {
        registroSanitario: null,
        registroSanitarioVencimiento: null,
        registroSanitarioEstado: null,
      });
      setFormulacionABorrarRegistro(null);
      showToast('Registro sanitario borrado.');
      refetch();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'No se pudo borrar el registro.', 'error');
    } finally {
      setBorrandoRegistro(false);
    }
  }

  const filas = useMemo(
    () =>
      formulaciones
        .map((formulacion) => ({ formulacion, ...calcularEstado(formulacion) }))
        .sort((a, b) => ESTADO_INFO[a.estado].orden - ESTADO_INFO[b.estado].orden),
    [formulaciones],
  );

  const alertas = filas.filter((f) => ['vencido', 'por-vencer', 'suspendido', 'en-tramite'].includes(f.estado)).length;
  const cumplen = filas.filter((f) => f.estado === 'vigente').length;
  const tasaCumplimiento = filas.length ? Math.round((cumplen / filas.length) * 100) : 0;
  const porVencer = filas.filter((f) => f.estado === 'por-vencer');

  const conteosPorEstado = filas.reduce<Partial<Record<EstadoRegistroSanitario, number>>>((acc, fila) => {
    acc[fila.estado] = (acc[fila.estado] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <section className="grid gap-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Calidad</h2>
        <p className="mt-1 text-slate-600 dark:text-zinc-400">
          Control de calidad de los lotes producidos y estado del registro sanitario de cada formulacion.
        </p>
      </div>

      {loading && (
        <div className="grid gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-64" />
        </div>
      )}

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </p>
      )}

      {!loading && !error && formulaciones.length === 0 && (
        <EmptyState
          title="Crea tu primera formulacion"
          description="Cuando registres formulaciones con su registro sanitario, aqui podras monitorear su vigencia."
          actionLabel="Ir a Formulaciones"
          actionHref="/formulaciones"
        />
      )}

      {!loading && !error && formulaciones.length > 0 && (
        <>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Control de calidad por lote</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
              Lotes producidos que estan en revision (&quot;En calidad&quot;): apruebalos para marcarlos Terminado o
              rechazalos con un motivo. Un lote rechazado queda en el historial pero no cuenta como venta.
            </p>
          </div>
          <ControlCalidadLotes formulaciones={formulaciones} />

          <div className="border-t border-slate-200 pt-6 dark:border-white/10">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Registro sanitario</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
              Estado del registro sanitario de cada formulacion. Edita la fecha de vencimiento y el estado
              directamente en la tabla.
            </p>
          </div>

          {porVencer.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                {porVencer.length} registro{porVencer.length === 1 ? '' : 's'} sanitario
                {porVencer.length === 1 ? '' : 's'} a menos de 4 meses de vencer — inicia el tramite de renovacion
              </p>
              <ul className="mt-2 grid gap-1 text-sm text-amber-700 dark:text-amber-400">
                {porVencer.map(({ formulacion, diasRestantes }) => (
                  <li key={formulacion.id}>
                    {formulacion.nombreProducto} — vence en {diasRestantes} dia{diasRestantes === 1 ? '' : 's'}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/3 dark:shadow-none">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
                Formulaciones
              </p>
              <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">{filas.length}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/3 dark:shadow-none">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
                Tasa de cumplimiento
              </p>
              <p className="mt-1 text-3xl font-bold text-emerald-700 dark:text-emerald-400">{tasaCumplimiento}%</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/3 dark:shadow-none">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
                Requieren atencion
              </p>
              <p className="mt-1 text-3xl font-bold text-amber-700 dark:text-amber-400">{alertas}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
              Distribucion por estado
            </h3>
            <div className="mt-4">
              <EstadoRegistroChart conteos={conteosPorEstado} />
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/3">
            <table className="w-full min-w-170 text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-white/10 dark:text-zinc-500">
                  <th className="py-2">Formulacion</th>
                  <th className="py-2">Registro sanitario</th>
                  <th className="py-2">Vencimiento</th>
                  <th className="py-2">Estado manual</th>
                  <th className="py-2">Estado</th>
                  <th className="py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filas.map(({ formulacion }) => (
                  <CalidadFila
                    key={formulacion.id}
                    formulacion={formulacion}
                    onUpdated={refetch}
                    onSolicitarBorrarRegistro={setFormulacionABorrarRegistro}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <ConfirmDialog
        open={formulacionABorrarRegistro !== null}
        title="Borrar registro sanitario"
        description={
          formulacionABorrarRegistro
            ? `Se borrara el numero de registro, la fecha de vencimiento y el estado manual de "${formulacionABorrarRegistro.nombreProducto}". La formulacion no se elimina, solo queda sin registro sanitario.`
            : ''
        }
        confirmLabel="Borrar"
        danger
        loading={borrandoRegistro}
        onConfirm={() => void handleConfirmarBorrarRegistro()}
        onCancel={() => setFormulacionABorrarRegistro(null)}
      />
    </section>
  );
}
