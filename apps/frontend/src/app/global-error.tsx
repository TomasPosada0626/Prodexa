'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body className="grid min-h-screen place-items-center bg-[#050816] px-6 text-center text-white">
        <div className="grid gap-4">
          <h1 className="text-xl font-bold">Algo salio mal</h1>
          <p className="text-sm text-zinc-400">
            El error ya quedo registrado. Intenta de nuevo.
          </p>
          <button
            type="button"
            onClick={reset}
            className="justify-self-center rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-semibold text-white"
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
