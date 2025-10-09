import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, AuthUser } from '@/api/auth';
import { useInactivityLogout } from '@/hooks/useInactivityLogout';
import { toast } from '@/hooks/use-toast';

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
    // Verificar sesión al cargar la app
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

  // Sistema de cierre automático por inactividad (5 minutos)
  useInactivityLogout({
    inactivityTime: 5 * 60 * 1000, // 5 minutos
    warningTime: 60 * 1000, // Advertencia 1 minuto antes
    enabled: !!user, // Solo activo cuando hay usuario autenticado
    onWarning: () => {
      toast({
        title: '⚠️ Sesión por expirar',
        description: 'Tu sesión se cerrará en 1 minuto por inactividad.',
        duration: 10000,
      });
    },
    onInactive: async () => {
      toast({
        title: '🔒 Sesión cerrada',
        description: 'Tu sesión se cerró por inactividad.',
        variant: 'destructive',
      });
      await logout();
    },
  });

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
