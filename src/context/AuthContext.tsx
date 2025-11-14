// src/context/AuthContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi, AuthUser } from '@/api/auth';
import useSessionKeepAlive from '@/hooks/useSessionKeepAlive';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    //Verificar sesión al cargar la app
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
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Error en logout:', error);
    } finally {
      setUser(null);
    }
  };

  const navigate = useNavigate();

  // Redirigir al login cuando se cierre sesión desde el contexto (auto-logout o logout programático)
  const logoutAndRedirect = async () => {
    await logout();
    try {
      navigate('/auth');
    } catch (e) {
      // ignorar si navigate no está disponible
    }
  };

  // Mantener la sesión viva en el servidor y mostrar advertencia previa
  // Para pruebas rápidas usamos 1 minuto; cambiar a 15 en producción
  useSessionKeepAlive(!!user, logoutAndRedirect, { sessionMinutes: 15, warningSeconds: 30 });

  const login = async (username: string, password: string) => {
    const response = await authApi.login({ username, password });
    
    // Si el login es exitoso y el backend devuelve el usuario
    if (response.user) {
      setUser(response.user);
    } else {
      // Si el backend solo devuelve { message }, necesitamos obtener el usuario
      const currentUser = await authApi.verifyAuth();
      if (currentUser) {
        setUser(currentUser);
      }
    }
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