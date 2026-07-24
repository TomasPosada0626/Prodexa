'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import clsx from 'clsx';
import { useToast } from '@/context/toast-context';
import { ApiError, forgotPassword, resetPassword } from '@/lib/api';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { PasswordRequirements, passwordMeetsRequirements } from '@/components/ui/PasswordRequirements';

const inputClasses =
  'w-full min-w-0 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 outline-none transition-colors focus:border-[#8B5CF6]';

export default function RecuperarContrasenaPage() {
  const { showToast } = useToast();
  const router = useRouter();
  const [fase, setFase] = useState<'solicitar' | 'confirmar'>('solicitar');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const passwordsMatch = confirmPassword.length === 0 || confirmPassword === newPassword;

  async function handleSolicitar(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await forgotPassword({ email });
      setFase('confirmar');
    } catch {
      setError('No se pudo procesar la solicitud. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmar(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!passwordMeetsRequirements(newPassword)) {
      setError('La nueva contrasena no cumple los requisitos minimos de seguridad.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las contrasenas no coinciden.');
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword({ email, code, newPassword });
      showToast('Contrasena actualizada. Inicia sesion con tu nueva contrasena.');
      router.push('/login');
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'No se pudo restablecer la contrasena.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <div>
        <h2 className="font-heading text-2xl font-bold text-white">Recuperar contrasena</h2>
        <p className="mt-1 text-sm text-[#A1A1AA]">
          {fase === 'solicitar'
            ? 'Ingresa tu correo y te enviamos un codigo de recuperacion.'
            : 'Ingresa el codigo que te llego por correo y tu nueva contrasena.'}
        </p>
      </div>

      {fase === 'solicitar' ? (
        <form
          onSubmit={handleSolicitar}
          className="grid gap-4 rounded-2xl border border-white/10 bg-[#0b0a16]/80 p-6 shadow-2xl shadow-black/60 backdrop-blur-xl"
        >
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

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Enviando...' : 'Enviar codigo'}
          </Button>
        </form>
      ) : (
        <form
          onSubmit={handleConfirmar}
          className="grid gap-4 rounded-2xl border border-white/10 bg-[#0b0a16]/80 p-6 shadow-2xl shadow-black/60 backdrop-blur-xl"
        >
          <label className="grid gap-1 text-sm text-zinc-300">
            Correo
            <input
              type="email"
              className={`${inputClasses} cursor-not-allowed opacity-70`}
              value={email}
              disabled
            />
          </label>

          <label className="grid gap-1 text-sm text-zinc-300">
            Codigo de 6 digitos
            <input
              className={`${inputClasses} tracking-widest`}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              inputMode="numeric"
              maxLength={6}
              required
            />
          </label>

          <label className="grid gap-1 text-sm text-zinc-300">
            Nueva contrasena
            <PasswordInput
              className={inputClasses}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>
          <PasswordRequirements password={newPassword} />

          <label className="grid gap-1 text-sm text-zinc-300">
            Repetir nueva contrasena
            <PasswordInput
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
            {submitting ? 'Guardando...' : 'Restablecer contrasena'}
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-zinc-400">
        <Link href="/login" className="font-semibold text-[#8B5CF6] hover:underline">
          Volver a iniciar sesion
        </Link>
      </p>
    </AuthLayout>
  );
}
