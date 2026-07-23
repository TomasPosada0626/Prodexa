'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { ApiError } from '@/lib/api';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';

const inputClasses =
  'w-full min-w-0 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 outline-none transition-colors focus:border-[#8B5CF6]';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401 ? 'Correo o contrasena incorrectos.' : 'No se pudo iniciar sesion.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <div>
        <h2 className="font-heading text-2xl font-bold text-white">Iniciar sesion</h2>
        <p className="mt-1 text-sm text-[#A1A1AA]">Entra a tu cuenta para gestionar tus formulaciones.</p>
      </div>

      <form
        onSubmit={handleSubmit}
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
        <label className="grid gap-1 text-sm text-zinc-300">
          Contrasena
          <input
            type="password"
            className={inputClasses}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? 'Ingresando...' : 'Iniciar sesion'}
        </Button>
      </form>

      <p className="text-center text-sm text-zinc-400">
        No tienes cuenta?{' '}
        <Link href="/registro" className="font-semibold text-[#8B5CF6] hover:underline">
          Registrate
        </Link>
      </p>
    </AuthLayout>
  );
}
