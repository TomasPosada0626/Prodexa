'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  ApiError,
  Invitation,
  Member,
  RolOrganizacion,
  createInvitation,
  getMembers,
  getPendingInvitations,
  removeMember,
  revokeInvitation,
  updateMemberRole,
} from '@/lib/api';

const ROLES: { value: RolOrganizacion; label: string }[] = [
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'COORDINADOR', label: 'Coordinador' },
  { value: 'MIEMBRO', label: 'Miembro' },
];

const selectClasses =
  'rounded-lg border border-slate-300 px-2 py-1 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white';

function rolLabel(rol: RolOrganizacion): string {
  return ROLES.find((r) => r.value === rol)?.label ?? rol;
}

function MiembroRow({
  miembro,
  puedeGestionar,
  esUnoMismo,
  onChanged,
}: {
  miembro: Member;
  puedeGestionar: boolean;
  esUnoMismo: boolean;
  onChanged: () => void;
}) {
  const { showToast } = useToast();
  const [savingRol, setSavingRol] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [removing, setRemoving] = useState(false);

  async function handleRolChange(nuevoRol: RolOrganizacion) {
    if (nuevoRol === miembro.rol) return;
    setSavingRol(true);
    try {
      await updateMemberRole(miembro.id, nuevoRol);
      showToast(`Rol de ${miembro.nombre ?? miembro.email} actualizado.`);
      onChanged();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'No se pudo cambiar el rol.', 'error');
    } finally {
      setSavingRol(false);
    }
  }

  async function handleRemove() {
    setRemoving(true);
    try {
      await removeMember(miembro.id);
      showToast(`${miembro.nombre ?? miembro.email} fue removido del equipo.`);
      setConfirmOpen(false);
      onChanged();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'No se pudo remover al miembro.', 'error');
    } finally {
      setRemoving(false);
    }
  }

  return (
    <tr className="border-b border-slate-100 dark:border-white/5">
      <td className="py-2 pr-2 text-slate-800 dark:text-zinc-200">{miembro.nombre ?? '(sin nombre)'}</td>
      <td className="py-2 pr-2 text-slate-600 dark:text-zinc-400">{miembro.email}</td>
      <td className="py-2 pr-2">
        {puedeGestionar && !esUnoMismo ? (
          <select
            className={selectClasses}
            value={miembro.rol}
            disabled={savingRol}
            onChange={(e) => handleRolChange(e.target.value as RolOrganizacion)}
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value} className="text-black">
                {r.label}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-slate-600 dark:text-zinc-400">{rolLabel(miembro.rol)}</span>
        )}
      </td>
      <td className="py-2 text-right">
        {puedeGestionar && !esUnoMismo && (
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="rounded-full border border-red-200 px-2 py-0.5 text-xs text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
          >
            Remover
          </button>
        )}
        {esUnoMismo && <span className="text-xs text-slate-400 dark:text-zinc-500">Tu cuenta</span>}
      </td>

      <ConfirmDialog
        open={confirmOpen}
        title="Remover del equipo"
        description={`${miembro.nombre ?? miembro.email} perdera acceso a la empresa. Sus formulaciones y ordenes de produccion se conservan.`}
        confirmLabel="Remover"
        danger
        loading={removing}
        onConfirm={handleRemove}
        onCancel={() => setConfirmOpen(false)}
      />
    </tr>
  );
}

function InvitarForm({ onCreated }: { onCreated: () => void }) {
  const { showToast } = useToast();
  const [rol, setRol] = useState<RolOrganizacion>('MIEMBRO');
  const [creating, setCreating] = useState(false);
  const [ultimoLink, setUltimoLink] = useState<string | null>(null);
  const [ultimoToken, setUltimoToken] = useState<string | null>(null);

  async function handleCrear() {
    setCreating(true);
    try {
      const invitacion = await createInvitation(rol);
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const link = `${origin}/registro?invite=${invitacion.token}`;
      setUltimoLink(link);
      setUltimoToken(invitacion.token);
      showToast('Invitacion generada.');
      onCreated();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'No se pudo generar la invitacion.', 'error');
    } finally {
      setCreating(false);
    }
  }

  async function copiarAlPortapapeles(texto: string, mensaje: string) {
    try {
      await navigator.clipboard.writeText(texto);
      showToast(mensaje);
    } catch {
      showToast('No se pudo copiar.', 'error');
    }
  }

  return (
    <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-zinc-300">
          Rol para la persona invitada
          <select className={selectClasses} value={rol} onChange={(e) => setRol(e.target.value as RolOrganizacion)}>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value} className="text-black">
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={handleCrear}
          disabled={creating}
          className="rounded-full bg-sky-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-60 dark:bg-[#8B5CF6] dark:hover:bg-[#7c3aed]"
        >
          {creating ? 'Generando...' : 'Generar invitacion'}
        </button>
      </div>
      {ultimoLink && ultimoToken && (
        <div className="grid gap-2">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-zinc-400">
            <span>Codigo para escribir a mano:</span>
            <code className="rounded bg-white px-2 py-1 text-sm font-bold tracking-widest dark:bg-black/30">
              {ultimoToken}
            </code>
            <button
              type="button"
              onClick={() => copiarAlPortapapeles(ultimoToken, 'Codigo copiado al portapapeles.')}
              className="rounded-full border border-slate-300 px-2 py-0.5 hover:bg-white dark:border-white/10 dark:hover:bg-white/5"
            >
              Copiar codigo
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-zinc-400">
            <span>O comparte el link directo:</span>
            <code className="break-all rounded bg-white px-2 py-1 dark:bg-black/30">{ultimoLink}</code>
            <button
              type="button"
              onClick={() => copiarAlPortapapeles(ultimoLink, 'Link copiado al portapapeles.')}
              className="rounded-full border border-slate-300 px-2 py-0.5 hover:bg-white dark:border-white/10 dark:hover:bg-white/5"
            >
              Copiar link
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function InvitacionesPendientes({
  invitaciones,
  onChanged,
}: {
  invitaciones: Invitation[];
  onChanged: () => void;
}) {
  const { showToast } = useToast();
  const [revokingId, setRevokingId] = useState<string | null>(null);

  async function handleRevoke(id: string) {
    setRevokingId(id);
    try {
      await revokeInvitation(id);
      showToast('Invitacion revocada.');
      onChanged();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'No se pudo revocar la invitacion.', 'error');
    } finally {
      setRevokingId(null);
    }
  }

  if (invitaciones.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-zinc-500">No hay invitaciones vigentes.</p>;
  }

  return (
    <ul className="grid gap-1.5 text-sm">
      {invitaciones.map((inv) => (
        <li
          key={inv.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-1.5 dark:border-white/10"
        >
          <span className="text-slate-700 dark:text-zinc-300">
            Rol: {rolLabel(inv.rol)} · expira {new Date(inv.expiresAt).toLocaleDateString()}
          </span>
          <button
            type="button"
            onClick={() => handleRevoke(inv.id)}
            disabled={revokingId === inv.id}
            className="rounded-full border border-red-200 px-2 py-0.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
          >
            Revocar
          </button>
        </li>
      ))}
    </ul>
  );
}

export function Equipo() {
  const { user } = useAuth();
  const [miembros, setMiembros] = useState<Member[] | null>(null);
  const [invitaciones, setInvitaciones] = useState<Invitation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const puedeGestionar = user?.rol === 'ADMIN' || user?.rol === 'COORDINADOR';
  const cargar = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;

    Promise.all([getMembers(), puedeGestionar ? getPendingInvitations() : Promise.resolve([])])
      .then(([miembrosData, invitacionesData]) => {
        if (cancelled) return;
        setMiembros(miembrosData);
        setInvitaciones(invitacionesData);
      })
      .catch(() => {
        if (!cancelled) setError('No se pudo cargar el equipo.');
      });

    return () => {
      cancelled = true;
    };
  }, [puedeGestionar, version]);

  return (
    <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/3">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
          Mi equipo · {user?.organizationNombre}
        </h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">
          Administradores y coordinadores pueden crear y editar formulaciones. Los miembros solo pueden verlas.
        </p>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {!error && miembros === null && (
        <div className="grid gap-2">
          <Skeleton className="h-8" />
          <Skeleton className="h-8" />
        </div>
      )}

      {miembros && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-100 text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-white/10 dark:text-zinc-500">
                <th className="py-1.5 pr-2 font-medium">Nombre</th>
                <th className="py-1.5 pr-2 font-medium">Correo</th>
                <th className="py-1.5 pr-2 font-medium">Rol</th>
                <th className="py-1.5 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {miembros.map((miembro) => (
                <MiembroRow
                  key={miembro.id}
                  miembro={miembro}
                  puedeGestionar={puedeGestionar}
                  esUnoMismo={miembro.id === user?.id}
                  onChanged={cargar}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {puedeGestionar && (
        <div className="grid gap-3 border-t border-slate-200 pt-4 dark:border-white/10">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-zinc-300">Invitar a alguien</h4>
          <InvitarForm onCreated={cargar} />
          <InvitacionesPendientes invitaciones={invitaciones} onChanged={cargar} />
        </div>
      )}
    </div>
  );
}
