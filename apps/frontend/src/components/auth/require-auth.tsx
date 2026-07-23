'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="grid min-h-[40vh] place-items-center text-sm text-slate-500">Cargando sesion...</div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
