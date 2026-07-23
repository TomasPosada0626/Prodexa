'use client';

import { useEffect, useMemo, useState } from 'react';
import { ApiError, AuditLogEntry, getAuditLog } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/shared/empty-state';

const EVENTO_INFO: Record<string, { label: string; className: string }> = {
  LOGIN_SUCCESS: {
    label: 'Inicio de sesion',
    className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  },
  LOGIN_FAILED: {
    label: 'Inicio de sesion fallido',
    className: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  },
  LOGOUT: {
    label: 'Cierre de sesion',
    className: 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-zinc-300',
  },
  REGISTER: {
    label: 'Registro de usuario',
    className: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400',
  },
  CHANGE_PASSWORD: {
    label: 'Cambio de contrasena',
    className: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  },
  PRODUCTION_ORDER_DELETED: {
    label: 'Lote anulado',
    className: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  },
  PAGO_DELETED: {
    label: 'Abono borrado',
    className: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  },
  MEMBER_ROLE_CHANGED: {
    label: 'Cambio de rol',
    className: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400',
  },
  MEMBER_REMOVED: {
    label: 'Miembro removido',
    className: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  },
  INGREDIENT_PRICE_UPDATED: {
    label: 'Precio de ingrediente',
    className: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400',
  },
  FORMULATION_UPDATED: {
    label: 'Formulacion editada',
    className: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400',
  },
  ORGANIZATION_SETTINGS_UPDATED: {
    label: 'Tarifas de la empresa',
    className: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400',
  },
};

function infoDeEvento(evento: string) {
  return (
    EVENTO_INFO[evento] ?? {
      label: evento,
      className: 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-zinc-300',
    }
  );
}

/** Texto corto y legible del detalle de cada evento, a partir de su metadata — la forma de
 * metadata varia segun el evento (ver donde se llama auditService.log en el backend). */
function detalleDeEvento(evento: string, metadata: Record<string, unknown> | null): string {
  if (!metadata) return '—';
  const texto = (valor: unknown) => (typeof valor === 'string' || typeof valor === 'number' ? String(valor) : '');

  switch (evento) {
    case 'MEMBER_ROLE_CHANGED':
      return `${texto(metadata.memberEmail)}: ${texto(metadata.rolAnterior)} → ${texto(metadata.rolNuevo)}`;
    case 'MEMBER_REMOVED':
      return `${texto(metadata.memberNombre) || texto(metadata.memberEmail)}`;
    case 'INGREDIENT_PRICE_UPDATED':
      return `${texto(metadata.ingredienteNombre)}: ${texto(metadata.precioAnterior)} → ${texto(metadata.precioNuevo)} (${texto(metadata.proveedor)})`;
    case 'FORMULATION_UPDATED': {
      const campos = Array.isArray(metadata.campos) ? (metadata.campos as unknown[]).map(texto).join(', ') : '';
      return `${texto(metadata.nombreProducto)}${campos ? ` — ${campos}` : ''}`;
    }
    case 'ORGANIZATION_SETTINGS_UPDATED': {
      const campos = Array.isArray(metadata.campos) ? (metadata.campos as unknown[]).map(texto).join(', ') : '';
      return campos || '—';
    }
    case 'PRODUCTION_ORDER_DELETED':
      return `Lote ${texto(metadata.numeroLote)} (costo ${texto(metadata.costoEscalado)}, ingreso ${texto(metadata.ingresoReal)})`;
    case 'PAGO_DELETED':
      return `Abono de ${texto(metadata.monto)}`;
    default:
      return '—';
  }
}

const selectClasses =
  'rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200';

export default function AuditoriaPage() {
  const { user } = useAuth();
  const [eventos, setEventos] = useState<AuditLogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filtroEvento, setFiltroEvento] = useState<string>('todos');
  const [ahora] = useState(() => Date.now());

  useEffect(() => {
    if (user && user.rol !== 'ADMIN') return;
    let cancelled = false;
    getAuditLog()
      .then((data) => {
        if (!cancelled) setEventos(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'No se pudo cargar la bitacora.');
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const tiposDeEvento = useMemo(
    () => Array.from(new Set((eventos ?? []).map((e) => e.evento))).sort(),
    [eventos],
  );

  const eventosFiltrados = (eventos ?? []).filter((e) => filtroEvento === 'todos' || e.evento === filtroEvento);

  const loginsFallidos24h = (eventos ?? []).filter(
    (e) => e.evento === 'LOGIN_FAILED' && ahora - new Date(e.createdAt).getTime() <= 24 * 60 * 60 * 1000,
  ).length;

  if (user && user.rol !== 'ADMIN') {
    return (
      <section className="grid gap-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Auditoria</h2>
        </div>
        <p className="rounded-xl border border-slate-200 bg-white p-4 text-slate-600 dark:border-white/10 dark:bg-white/3 dark:text-zinc-400">
          Esta seccion es solo para administradores de la empresa.
        </p>
      </section>
    );
  }

  const loading = eventos === null && !error;

  return (
    <section className="grid gap-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Auditoria</h2>
        <p className="mt-1 text-slate-600 dark:text-zinc-400">
          Bitacora de seguridad y de negocio: inicios de sesion, cambios de precios, formulaciones, roles del equipo
          y tarifas de la empresa — quien hizo que y cuando.
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

      {!loading && !error && (eventos?.length ?? 0) === 0 && (
        <EmptyState
          title="Aun no hay eventos registrados"
          description="Los inicios de sesion, registros y cambios de contrasena de tu empresa apareceran aqui."
        />
      )}

      {!loading && !error && (eventos?.length ?? 0) > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/3 dark:shadow-none">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
                Eventos registrados
              </p>
              <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">{eventos?.length}</p>
            </div>
            <div
              className={
                loginsFallidos24h > 0
                  ? 'rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm dark:border-red-500/30 dark:bg-red-500/10'
                  : 'rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/3 dark:shadow-none'
              }
            >
              <p
                className={
                  loginsFallidos24h > 0
                    ? 'text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-400'
                    : 'text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400'
                }
              >
                Inicios de sesion fallidos (24h)
              </p>
              <p
                className={`mt-1 text-3xl font-bold ${loginsFallidos24h > 0 ? 'text-red-800 dark:text-red-300' : 'text-slate-900 dark:text-white'}`}
              >
                {loginsFallidos24h}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
                Eventos recientes
              </h3>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-zinc-300">
                Filtrar por evento
                <select
                  className={selectClasses}
                  value={filtroEvento}
                  onChange={(e) => setFiltroEvento(e.target.value)}
                >
                  <option value="todos" className="text-slate-900">
                    Todos
                  </option>
                  {tiposDeEvento.map((evento) => (
                    <option key={evento} value={evento} className="text-slate-900">
                      {infoDeEvento(evento).label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <table className="mt-3 w-full min-w-160 text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-white/10 dark:text-zinc-500">
                  <th className="py-2">Fecha</th>
                  <th className="py-2">Usuario</th>
                  <th className="py-2">Evento</th>
                  <th className="py-2">Detalle</th>
                  <th className="py-2">IP</th>
                </tr>
              </thead>
              <tbody>
                {eventosFiltrados.map((evento) => (
                  <tr key={evento.id} className="border-b border-slate-100 dark:border-white/5">
                    <td className="py-2 whitespace-nowrap text-slate-600 dark:text-zinc-400">
                      {new Date(evento.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2 text-slate-800 dark:text-zinc-200">
                      {evento.usuario ? (evento.usuario.nombre ?? evento.usuario.email) : '—'}
                    </td>
                    <td className="py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap ${infoDeEvento(evento.evento).className}`}
                      >
                        {infoDeEvento(evento.evento).label}
                      </span>
                    </td>
                    <td className="py-2 text-slate-600 dark:text-zinc-400">
                      {detalleDeEvento(evento.evento, evento.metadata)}
                    </td>
                    <td className="py-2 font-mono text-xs text-slate-600 dark:text-zinc-400">{evento.ip ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
