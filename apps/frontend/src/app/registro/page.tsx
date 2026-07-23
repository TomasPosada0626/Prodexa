'use client';

import { Suspense, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import clsx from 'clsx';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import { ApiError } from '@/lib/api';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { PasswordRequirements, passwordMeetsRequirements } from '@/components/ui/PasswordRequirements';

const inputClasses =
  'w-full min-w-0 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 outline-none transition-colors focus:border-[#8B5CF6]';

function RegistroForm() {
  const { register } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const invitationTokenFromUrl = searchParams.get('invite');

  const [modo, setModo] = useState<'empresa' | 'invitacion'>(
    invitationTokenFromUrl ? 'invitacion' : 'empresa',
  );
  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [email, setEmail] = useState('');
  const [nombreEmpresa, setNombreEmpresa] = useState('');
  const [invitationToken, setInvitationToken] = useState(invitationTokenFromUrl ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const passwordsMatch = confirmPassword.length === 0 || confirmPassword === password;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!passwordMeetsRequirements(password)) {
      setError('La contrasena no cumple los requisitos minimos de seguridad.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contrasenas no coinciden.');
      return;
    }
    if (modo === 'empresa' && !nombreEmpresa.trim()) {
      setError('Ingresa el nombre de tu empresa.');
      return;
    }
    if (modo === 'invitacion' && !invitationToken.trim()) {
      setError('Ingresa el codigo de invitacion que te compartieron.');
      return;
    }

    setSubmitting(true);
    try {
      const nombreCompleto = [nombre.trim(), apellidos.trim()].filter(Boolean).join(' ');
      await register(email, password, {
        nombre: nombreCompleto || undefined,
        ...(modo === 'empresa'
          ? { nombreEmpresa: nombreEmpresa.trim() }
          : { invitationToken: invitationToken.trim() }),
      });
      showToast('Cuenta creada correctamente. Inicia sesion para continuar.');
      router.push('/login');
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError('Ya existe una cuenta con este correo.');
      } else if (err instanceof ApiError && err.status === 400) {
        setError(err.message || 'La invitacion no es valida o ya expiro.');
      } else {
        setError('No se pudo crear la cuenta.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <div>
        <h2 className="font-heading text-2xl font-bold text-white">Crear cuenta</h2>
        <p className="mt-1 text-sm text-[#A1A1AA]">
          Crea una empresa nueva o unete a una existente con un codigo de invitacion.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid gap-4 rounded-2xl border border-white/10 bg-[#0b0a16]/80 p-6 shadow-2xl shadow-black/60 backdrop-blur-xl"
      >
        <div className="grid grid-cols-2 gap-1 rounded-lg border border-white/10 bg-white/5 p-1 text-sm">
          <button
            type="button"
            onClick={() => setModo('empresa')}
            className={clsx(
              'rounded-md px-3 py-1.5 font-medium transition-colors',
              modo === 'empresa' ? 'bg-[#8B5CF6] text-white' : 'text-zinc-400 hover:text-white',
            )}
          >
            Crear empresa
          </button>
          <button
            type="button"
            onClick={() => setModo('invitacion')}
            className={clsx(
              'rounded-md px-3 py-1.5 font-medium transition-colors',
              modo === 'invitacion' ? 'bg-[#8B5CF6] text-white' : 'text-zinc-400 hover:text-white',
            )}
          >
            Unirme con codigo
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1 text-sm text-zinc-300">
            Nombre
            <input
              className={inputClasses}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              autoComplete="given-name"
            />
          </label>
          <label className="grid gap-1 text-sm text-zinc-300">
            Apellidos
            <input
              className={inputClasses}
              value={apellidos}
              onChange={(e) => setApellidos(e.target.value)}
              required
              autoComplete="family-name"
            />
          </label>
        </div>

        <label className="grid gap-1 text-sm text-zinc-300">
          Correo
          <input
            type="email"
            className={inputClasses}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>

        {modo === 'empresa' ? (
          <label className="grid gap-1 text-sm text-zinc-300">
            Nombre de tu empresa
            <input
              className={inputClasses}
              value={nombreEmpresa}
              onChange={(e) => setNombreEmpresa(e.target.value)}
              placeholder="Ej. Cosmeticos Andina"
              required
            />
            <span className="text-xs text-zinc-500">
              Quedaras como administrador y podras invitar a tu equipo despues.
            </span>
          </label>
        ) : (
          <label className="grid gap-1 text-sm text-zinc-300">
            Codigo de invitacion
            <input
              className={`${inputClasses} uppercase tracking-widest`}
              value={invitationToken}
              onChange={(e) => setInvitationToken(e.target.value.toUpperCase())}
              placeholder="Ej. AB12CD34"
              maxLength={8}
              required
            />
            <span className="text-xs text-zinc-500">
              Te unes a la empresa y con el rol que definio quien te invito.
            </span>
          </label>
        )}

        <label className="grid gap-1 text-sm text-zinc-300">
          Contrasena
          <input
            type="password"
            className={inputClasses}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </label>
        <PasswordRequirements password={password} />

        <label className="grid gap-1 text-sm text-zinc-300">
          Repetir contrasena
          <input
            type="password"
            className={clsx(inputClasses, !passwordsMatch && 'border-red-500/60 focus:border-red-500')}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
          {confirmPassword.length > 0 && (
            <span className={clsx('text-xs', passwordsMatch ? 'text-emerald-400' : 'text-red-400')}>
              {passwordsMatch ? 'Las contrasenas coinciden' : 'Las contrasenas no coinciden'}
            </span>
          )}
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? 'Creando cuenta...' : 'Registrarse'}
        </Button>
      </form>

      <p className="text-center text-sm text-zinc-400">
        Ya tienes cuenta?{' '}
        <Link href="/login" className="font-semibold text-[#8B5CF6] hover:underline">
          Inicia sesion
        </Link>
      </p>
    </AuthLayout>
  );
}

export default function RegistroPage() {
  return (
    <Suspense fallback={null}>
      <RegistroForm />
    </Suspense>
  );
}
