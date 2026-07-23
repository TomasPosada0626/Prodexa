'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError, Formulation, getFormulations } from './api';

interface UseFormulationsResult {
  formulaciones: Formulation[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useFormulations(): UseFormulationsResult {
  const [formulaciones, setFormulaciones] = useState<Formulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  // No pone loading en true: un refetch tras guardar algo (ej. el margen en Costos) debe
  // actualizar los datos en silencio, sin desmontar los componentes que consumen
  // `formulaciones` (eso les borraria su estado local, como un resultado ya calculado).
  const refetch = useCallback(() => {
    setError(null);
    setVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    getFormulations()
      .then((data) => {
        if (!cancelled) setFormulaciones(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err.message
            : 'No se pudo conectar con el backend. Verifica que la API este corriendo.',
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [version]);

  return { formulaciones, loading, error, refetch };
}
