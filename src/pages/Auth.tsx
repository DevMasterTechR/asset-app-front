import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Laptop, User, Lock, Eye, EyeOff } from 'lucide-react';

const ADMIN_ROLES = ['admin', 'administrador', 'Admin'] as const;
const HR_ROLES = ['recursos humanos', 'human resources', 'rrhh', 'RRHH'] as const;

function normalizeRole(role: string | { name?: string } | null | undefined): string | null {
  if (!role) return null;
  const value = typeof role === 'string' ? role : role.name;
  return value ? value.trim().toLowerCase() : null;
}

function isAdmin(normalizedRole: string | null): boolean {
  return normalizedRole ? ADMIN_ROLES.some(r => r === normalizedRole) : false;
}

function isHR(normalizedRole: string | null): boolean {
  return normalizedRole ? HR_ROLES.some(r => r === normalizedRole) : false;
}

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user, loading } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (loading || !user || location.pathname !== '/auth') return;

    const normalized = normalizeRole(user.role);
    
    if (isAdmin(normalized)) {
      navigate('/dashboard', { replace: true });
    } else if (isHR(normalized)) {
      navigate('/human-resources', { replace: true });
    } else {
      navigate('/user-dashboard', { replace: true });
    }
  }, [user, loading, navigate, location.pathname]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;

    try {
      await login(username, password);
      toast({
        title: '¡Bienvenido!',
        description: 'Has iniciado sesión correctamente.',
      });
      // Redirigir según el rol después del login
      // user se actualiza por el contexto, pero para redirigir inmediato lo obtenemos de useAuth
      const normalized = normalizeRole(user?.role);
      if (isAdmin(normalized)) {
        navigate('/dashboard', { replace: true });
      } else if (isHR(normalized)) {
        navigate('/human-resources', { replace: true });
      } else {
        navigate('/user-dashboard', { replace: true });
      }
    } catch (error: unknown) {
      let message = 'Credenciales incorrectas. Por favor, intenta de nuevo.';

      if (error instanceof Error) {
        message = error.message;
      }

      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md shadow-elegant">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Laptop className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Sistema de Activos TI</CardTitle>
          <CardDescription>Inicia sesión para gestionar tus dispositivos</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuario</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="nombre_usuario"
                  required
                  disabled={isLoading}
                  autoComplete="username"
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  disabled={isLoading}
                  autoComplete="current-password"
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={isLoading}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}