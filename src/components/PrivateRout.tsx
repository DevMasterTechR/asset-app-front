// src/components/PrivateRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <p className="text-center mt-10">Cargando sesión...</p>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
