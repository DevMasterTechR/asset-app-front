// src/components/PrivateRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

interface PrivateRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function PrivateRoute({ children, allowedRoles }: PrivateRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return <p className="text-center mt-10">Cargando sesión...</p>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const userRole = typeof user.role === 'string' ? user.role : user.role?.name;
  const allowed = (allowedRoles ?? []).map((r) => r.toLowerCase());
  const isAllowed = allowed.length === 0 || (userRole && allowed.includes(userRole.toLowerCase()));

  if (!isAllowed) {
    // Redirige al login mostrando una ruta segura; evita montar el contenido protegido
    return <Navigate to="/auth" replace state={{ reason: 'forbidden' }} />;
  }

  return <>{children}</>;
}
