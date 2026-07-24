'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { ApiError, Session, changePassword, getSessions, revokeSession } from '@/lib/api';
import { useToast } from '@/context/toast-context';
import { PasswordRequirements, passwordMeetsRequirements } from '@/components/ui/PasswordRequirements';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Equipo } from '@/components/organizations/equipo';

const inputClasses =
  'rounded-lg border border-slate-300 px-3 py-2 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-zinc-500';

function PerfilForm() {
  const { user, updateProfile } = useAuth();
  const { showToast } = useToast();
  const [nombre, setNombre] = useState(user?.nombre ?? '');
  const [margenPorDefecto, setMargenPorDefecto] = useState(
    user ? String(Number(user.margenPorDefecto)) : '30',
  );
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await updateProfile({
        nombre: nombre.trim(),
        margenPorDefecto: Number(margenPorDefecto),
      });
      showToast('Perfil actualizado.');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'No se pudo actualizar el perfil.', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/3"
    >
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
        Perfil y preferencias
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm text-slate-700 dark:text-zinc-300">
          Nombre completo
          <input
            className={inputClasses}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </label>
        <label className="grid gap-1 text-sm text-slate-700 dark:text-zinc-300">
          Correo
          <input
            className={`${inputClasses} cursor-not-allowed opacity-70`}
            value={user?.email ?? ''}
            disabled
            readOnly
          />
        </label>
        <label className="grid gap-1 text-sm text-slate-700 dark:text-zinc-300">
          Margen (%) por defecto en formulaciones nuevas
          <input
            type="number"
            min="0"
            max="99.99"
            step="0.01"
            className={inputClasses}
            value={margenPorDefecto}
            onChange={(e) => setMargenPorDefecto(e.target.value)}
          />
        </label>
      </div>
      <p className="-mt-2 text-xs text-slate-500 dark:text-zinc-500">
        El IVA es una tasa legal fija (19%) y no es configurable por cuenta. El margen por defecto solo aplica a
        formulaciones que crees despues de guardarlo; las existentes no cambian.
      </p>
      <button
        type="submit"
        disabled={saving}
        className="w-fit rounded-full bg-sky-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:opacity-60 dark:bg-[#8B5CF6] dark:hover:bg-[#7c3aed]"
      >
        {saving ? 'Guardando...' : 'Guardar perfil'}
      </button>
    </form>
  );
}

/** Solo digitos (sin decimales): estos valores son pesos/kg enteros, no requieren centavos. */
function soloDigitos(value: string): string {
  return value.replace(/[^\d]/g, '');
}

/** "7500" -> "7,500", para mostrar el separador de miles mientras se escribe. */
function formatearMiles(digitos: string): string {
  return digitos ? Number(digitos).toLocaleString('en-US') : '';
}

interface CampoMilesProps {
  label: string;
  value: string;
  onChange: (digitos: string) => void;
  disabled: boolean;
}

/** Input de texto (no number) para poder mostrar "7,500" mientras se escribe: un input
 * type="number" nativo no permite separador de miles en vivo. */
function CampoMiles({ label, value, onChange, disabled }: CampoMilesProps) {
  return (
    <label className="grid gap-1 text-sm text-slate-700 dark:text-zinc-300">
      {label}
      <input
        type="text"
        inputMode="numeric"
        disabled={disabled}
        className={`${inputClasses} ${disabled ? 'cursor-not-allowed opacity-70' : ''}`}
        value={formatearMiles(value)}
        onChange={(e) => onChange(soloDigitos(e.target.value))}
      />
    </label>
  );
}

/**
 * Las tarifas por hora son de la EMPRESA (no de cada usuario): asi el mismo producto cuesta lo
 * mismo sin importar quien de la organizacion registre el lote. Solo ADMIN/COORDINADOR pueden
 * editarlas; un MIEMBRO solo las ve, de solo lectura.
 */
function TarifasOrganizacionForm() {
  const { user, updateOrganizationSettings } = useAuth();
  const { showToast } = useToast();
  const puedeEditar = user?.rol === 'ADMIN' || user?.rol === 'COORDINADOR';
  const [tarifaManoObraHora, setTarifaManoObraHora] = useState(
    user ? String(Math.round(Number(user.tarifaManoObraHora))) : '0',
  );
  const [tarifaEnergiaHora, setTarifaEnergiaHora] = useState(
    user ? String(Math.round(Number(user.tarifaEnergiaHora))) : '0',
  );
  const [gastoGeneralMensual, setGastoGeneralMensual] = useState(
    user ? String(Math.round(Number(user.gastoGeneralMensual))) : '0',
  );
  const [saving, setSaving] = useState(false);

  // La capacidad ya no se escribe a mano: el backend la calcula sola con el historial real de
  // produccion (promedio de los ultimos meses ya completos), asi nunca queda desactualizada.
  const capacidadCalculada = Number(user?.capacidadProduccionMensualKg ?? 0);
  const mesesBase = user?.capacidadMesesBase ?? 0;
  const tarifaGastoGeneralPorKg = capacidadCalculada > 0 ? Number(gastoGeneralMensual) / capacidadCalculada : 0;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await updateOrganizationSettings({
        tarifaManoObraHora: Number(tarifaManoObraHora),
        tarifaEnergiaHora: Number(tarifaEnergiaHora),
        gastoGeneralMensual: Number(gastoGeneralMensual),
      });
      showToast('Tarifas de la empresa actualizadas.');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'No se pudieron actualizar las tarifas.', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/3"
    >
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
        Tarifas de produccion de la empresa
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <CampoMiles
          label="Tarifa/hora mano de obra"
          value={tarifaManoObraHora}
          onChange={setTarifaManoObraHora}
          disabled={!puedeEditar}
        />
        <CampoMiles
          label="Tarifa/hora energia"
          value={tarifaEnergiaHora}
          onChange={setTarifaEnergiaHora}
          disabled={!puedeEditar}
        />
      </div>
      {Number(tarifaManoObraHora) === 0 && Number(tarifaEnergiaHora) === 0 && (
        <p className="-mt-2 text-xs font-medium text-amber-700 dark:text-amber-400">
          ⚠ Mientras esten en $0, todos los lotes de Produccion calcularan mano de obra y energia en $0 (no se
          cobraran), sin importar el tiempo estimado de cada formulacion.
        </p>
      )}
      <p className="-mt-2 text-xs text-slate-500 dark:text-zinc-500">
        Se usan en Produccion para calcular automaticamente la mano de obra propia y la energia de cada lote,
        multiplicadas por el tiempo estimado de produccion de cada formulacion. Son de toda la empresa (no de tu
        usuario), para que el mismo producto cueste lo mismo sin importar quien registre el lote
        {!puedeEditar && ' — solo un administrador o coordinador puede cambiarlas'}.
      </p>

      <h3 className="mt-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
        Gastos generales de la empresa
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <CampoMiles
          label="Gasto general mensual"
          value={gastoGeneralMensual}
          onChange={setGastoGeneralMensual}
          disabled={!puedeEditar}
        />
        <div className="grid gap-1 text-sm text-slate-700 dark:text-zinc-300">
          Capacidad de produccion mensual (calculada)
          <p
            className={`${inputClasses} flex items-center opacity-70`}
            title="Promedio de kg producidos en los ultimos meses ya completos. Se recalcula solo con cada lote nuevo."
          >
            {mesesBase > 0 ? `${Math.round(capacidadCalculada).toLocaleString('en-US')} kg/mes` : 'Aun sin calcular'}
          </p>
        </div>
      </div>
      {mesesBase > 0 ? (
        <p className="-mt-2 text-xs text-slate-500 dark:text-zinc-500">
          Calculada con el promedio de tus ultimos {mesesBase} mes{mesesBase === 1 ? '' : 'es'} completo
          {mesesBase === 1 ? '' : 's'} de produccion real — ya no se escribe a mano, se ajusta sola cuando produces
          mas o menos.
        </p>
      ) : (
        <p className="-mt-2 text-xs font-medium text-amber-700 dark:text-amber-400">
          ⚠ Aun no hay suficiente historial de produccion para calcular esto (necesitas al menos 2 meses completos
          de lotes registrados). Mientras tanto, el gasto general no se prorratea y queda en $0 por kg.
        </p>
      )}
      <p className="-mt-2 text-xs text-slate-500 dark:text-zinc-500">
        Arriendo, nomina administrativa, software, contabilidad, etc. — gastos que existen sin importar cuanto se
        produzca. Se reparten entre tus lotes segun cuantos kg produces al mes
        {tarifaGastoGeneralPorKg > 0 && ` (hoy equivale a $${Math.round(tarifaGastoGeneralPorKg).toLocaleString('en-US')} por kg)`}, y se
        suman al costo real de cada lote en Preparar.
      </p>
      {puedeEditar && (
        <button
          type="submit"
          disabled={saving}
          className="w-fit rounded-full bg-sky-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:opacity-60 dark:bg-[#8B5CF6] dark:hover:bg-[#7c3aed]"
        >
          {saving ? 'Guardando...' : 'Guardar tarifas'}
        </button>
      )}
    </form>
  );
}

function CambiarContrasenaForm() {
  const { showToast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!passwordMeetsRequirements(newPassword)) {
      setError('La nueva contrasena no cumple los requisitos.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las contrasenas nuevas no coinciden.');
      return;
    }

    setSaving(true);
    try {
      await changePassword({ currentPassword, newPassword });
      showToast('Contrasena actualizada.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cambiar la contrasena.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/3"
    >
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
        Cambiar contrasena
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm text-slate-700 dark:text-zinc-300 sm:col-span-2">
          Contrasena actual
          <PasswordInput
            className={inputClasses}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </label>
        <label className="grid gap-1 text-sm text-slate-700 dark:text-zinc-300">
          Nueva contrasena
          <PasswordInput
            className={inputClasses}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
        </label>
        <label className="grid gap-1 text-sm text-slate-700 dark:text-zinc-300">
          Repetir nueva contrasena
          <PasswordInput
            className={inputClasses}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </label>
      </div>

      {newPassword && <PasswordRequirements password={newPassword} />}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="w-fit rounded-full bg-sky-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:opacity-60 dark:bg-[#8B5CF6] dark:hover:bg-[#7c3aed]"
      >
        {saving ? 'Guardando...' : 'Cambiar contrasena'}
      </button>
    </form>
  );
}

/** Los dispositivos/navegadores donde tu cuenta tiene una sesion iniciada (refresh token vigente).
 * Cerrar una sesion aca revoca ese refresh token: en su proximo intento de renovacion silenciosa
 * quedara desconectada, sin tener que saber ni cambiar la contrasena. */
function SesionesActivasForm() {
  const { showToast } = useToast();
  const [sesiones, setSesiones] = useState<Session[] | null>(null);
  const [revocando, setRevocando] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSessions()
      .then((data) => {
        if (!cancelled) setSesiones(data);
      })
      .catch(() => {
        if (!cancelled) setSesiones([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleRevoke(id: string) {
    setRevocando(id);
    try {
      await revokeSession(id);
      setSesiones((prev) => prev?.filter((s) => s.id !== id) ?? null);
      showToast('Sesion cerrada.');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'No se pudo cerrar la sesion.', 'error');
    } finally {
      setRevocando(null);
    }
  }

  return (
    <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
        Sesiones activas
      </h3>
      <p className="-mt-2 text-xs text-slate-500 dark:text-zinc-500">
        Cierra las sesiones que no reconozcas — cada una es un dispositivo o navegador donde tu cuenta sigue con la
        sesion iniciada.
      </p>

      {sesiones === null && <p className="text-sm text-slate-500 dark:text-zinc-500">Cargando...</p>}

      {sesiones !== null && sesiones.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-zinc-500">No hay sesiones activas.</p>
      )}

      {sesiones !== null && sesiones.length > 0 && (
        <ul className="grid gap-2">
          {sesiones.map((sesion) => (
            <li
              key={sesion.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm dark:border-white/5 dark:bg-white/3"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-medium text-slate-800 dark:text-zinc-200">
                  {sesion.ip ?? 'IP desconocida'}
                  {sesion.actual && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                      Esta sesion
                    </span>
                  )}
                </p>
                <p
                  className="max-w-xs truncate text-xs text-slate-500 dark:text-zinc-500"
                  title={sesion.userAgent ?? undefined}
                >
                  {sesion.userAgent ?? 'Dispositivo desconocido'}
                </p>
                <p className="text-xs text-slate-500 dark:text-zinc-500">
                  Iniciada el {new Date(sesion.createdAt).toLocaleString()} · expira el{' '}
                  {new Date(sesion.expiresAt).toLocaleDateString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleRevoke(sesion.id)}
                disabled={revocando === sesion.id}
                className="rounded-full border border-red-300 px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
              >
                {revocando === sesion.id ? 'Cerrando...' : 'Cerrar sesion'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ConfiguracionPage() {
  return (
    <section className="grid gap-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Configuracion</h2>
        <p className="mt-1 text-slate-600 dark:text-zinc-400">Administra tu perfil y la seguridad de tu cuenta.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PerfilForm />
        <CambiarContrasenaForm />
        <SesionesActivasForm />
        <TarifasOrganizacionForm />
      </div>

      <Equipo />
    </section>
  );
}
