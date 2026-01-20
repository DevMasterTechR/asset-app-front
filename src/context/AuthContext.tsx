// src/context/AuthContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi, AuthUser } from '@/api/auth';
import useSessionKeepAlive from '@/hooks/useSessionKeepAlive';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const navigate = useNavigate();

  useEffect(() => {
    // Verificar sesión al cargar la app, pero NO redirigir automáticamente
    const checkSession = async () => {
      try {
        const currentUser = await authApi.verifyAuth();
        if (currentUser) {
          setUser(currentUser);
        }
      } catch (error) {
        console.error('Error verificando sesión:', error);
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  const logout = async () => {
    // Intenta llamar al backend (opcional, solo para limpiar cookies si usas HTTP-only)
    try {
      await authApi.logout();  // si falla con 401, no importa
    } catch (error) {
      console.warn('Logout backend falló (normal si token ya expiró)', error);
    } finally {
      // SIEMPRE limpia el cliente y redirige
      setUser(null);
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('session:keepalive');
      localStorage.setItem('session:logout', String(Date.now()));
      navigate('/auth', { replace: true });
    }
  };

  // Redirigir al login cuando se cierre sesión desde el contexto (auto-logout o logout programático)
  const logoutAndRedirect = async () => {
    await logout();
    try {
      // Mostrar notificación al usuario informando por qué se redirige
      toast({
        title: 'Sesión cerrada',
        description: 'La sesión se ha cerrado por inactividad. Serás redirigido al login.',
        variant: 'destructive',
      });
      // dejar 2 segundos para que el usuario lea el mensaje
      setTimeout(() => {
        try { navigate('/auth'); } catch (e) { }
      }, 2000);
    } catch (e) {
      // ignorar si navigate no está disponible
    }
  };

  // DESACTIVADO: No cerrar sesión automáticamente. El usuario solo puede cerrar sesión manualmente.
  // useSessionKeepAlive(!!user, logoutAndRedirect, { sessionMinutes: 15, warningSeconds: 30 });

  const login = async (username: string, password: string): Promise<AuthUser> => {
    const response = await authApi.login({ username, password });

    // Después del login, siempre obtener datos completos del usuario desde /auth/me
    // (esto asegura que tengamos firstName, lastName, etc.)
    const currentUser = await authApi.verifyAuth();
    if (currentUser) {
      setUser(currentUser);
      return currentUser;
    } else if (response.user) {
      setUser(response.user);
      return response.user;
    }
    throw new Error('No se pudo obtener el usuario después del login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

import React from 'react';

type LayoutContextType = {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (value: boolean) => void;
};

export const LayoutContext = React.createContext<LayoutContextType>({
  sidebarCollapsed: false,
  setSidebarCollapsed: () => { },
});

export function useLayoutContext() {
  const ctx = React.useContext(LayoutContext);
  if (!ctx) throw new Error('useLayoutContext must be used within LayoutContext.Provider');
  return ctx;
}

export default LayoutContext;