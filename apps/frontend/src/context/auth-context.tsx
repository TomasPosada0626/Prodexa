'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  AuthUser,
  UpdateOrganizationSettingsInput,
  UpdateProfileInput,
  getMe,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
  updateOrganizationSettings as updateOrganizationSettingsRequest,
  updateProfile as updateProfileRequest,
} from '@/lib/api';

interface RegisterOptions {
  nombre?: string;
  nombreEmpresa?: string;
  invitationToken?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, options?: RegisterOptions) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (input: UpdateProfileInput) => Promise<void>;
  updateOrganizationSettings: (input: UpdateOrganizationSettingsInput) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const authUser = await loginRequest({ email, password });
    setUser(authUser);
  }, []);

  // No llama a setUser: el registro solo crea la cuenta, no inicia sesion.
  // El usuario debe iniciar sesion explicitamente despues.
  const register = useCallback(async (email: string, password: string, options?: RegisterOptions) => {
    await registerRequest({ email, password, ...options });
  }, []);

  const logout = useCallback(async () => {
    await logoutRequest();
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (input: UpdateProfileInput) => {
    const authUser = await updateProfileRequest(input);
    setUser(authUser);
  }, []);

  // Las tarifas son de la organizacion, no del usuario: el endpoint solo devuelve esos dos
  // campos, asi que se combinan con el resto del usuario ya cargado en el contexto.
  const updateOrganizationSettings = useCallback(async (input: UpdateOrganizationSettingsInput) => {
    const settings = await updateOrganizationSettingsRequest(input);
    setUser((prev) => (prev ? { ...prev, ...settings } : prev));
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, updateProfile, updateOrganizationSettings }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}
