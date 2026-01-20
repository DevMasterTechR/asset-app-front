import { ReactNode, useState, useEffect } from 'react';
import LayoutContext from '@/context/LayoutContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import {
  PackageSearch,
  FileText,
  LogOut,
  Menu,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';

import { useToast } from '@/hooks/use-toast';
import { authApi } from '@/api/auth';

interface LayoutProps {
  children: ReactNode;
}

// Nav items simplificado solo para usuarios
interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

const userNavItems: NavItem[] = [
  { title: 'Mis Asignaciones', href: '/user-dashboard', icon: PackageSearch },
  { title: 'Solicitudes', href: '/user-requests', icon: FileText },
];

export default function UserLayout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      const v = localStorage.getItem('sidebar:collapsed');
      return v === 'true';
    } catch (e) {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('sidebar:collapsed', sidebarCollapsed ? 'true' : 'false');
    } catch (e) { }
  }, [sidebarCollapsed]);

  const [isMobileView, setIsMobileView] = useState(() => {
    try {
      return window.innerWidth < 768;
    } catch (e) {
      return false;
    }
  });

  useEffect(() => {
    const onResize = () => setIsMobileView(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const [sessionCountdown, setSessionCountdown] = useState<number | null>(null);

  const handleLogout = async () => {
    try {
      await logout();
      try { localStorage.setItem('session:logout', String(Date.now())); } catch (e) { }
      toast({
        title: 'Sesión cerrada',
        description: 'Has cerrado sesión correctamente.',
      });
      navigate('/');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo cerrar la sesión.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent;
      const remaining = custom?.detail?.remaining;
      if (remaining === null) {
        setSessionCountdown(null);
      } else if (typeof remaining === 'number') {
        setSessionCountdown(remaining);
      }
    };

    window.addEventListener('session-countdown', handler as EventListener);
    return () => window.removeEventListener('session-countdown', handler as EventListener);
  }, []);

  const handleStayConnected = async () => {
    try {
      await authApi.keepAlive();
      setSessionCountdown(null);
      try { localStorage.setItem('session:keepalive', String(Date.now())); localStorage.removeItem('session:warning'); } catch (e) { }
      toast({ title: 'Sesión extendida', description: 'Se ha mantenido la sesión activa.' });
    } catch (e) {
      toast({ title: 'Error', description: 'No se pudo extender la sesión', variant: 'destructive' });
    }
  };

  const getUserInitials = () => {
    const firstName = user?.firstName?.trim() || '';
    const lastName = user?.lastName?.trim() || '';
    if (firstName && lastName) {
      return (firstName[0] + lastName[0]).toUpperCase();
    } else if (firstName) {
      return firstName[0].toUpperCase();
    } else if (lastName) {
      return lastName[0].toUpperCase();
    }
    return (user?.username || 'U')[0].toUpperCase();
  };

  return (
    <LayoutContext.Provider value={{ sidebarCollapsed, setSidebarCollapsed }}>
      <div className="flex h-screen bg-background">
        {/* Sidebar Desktop */}
        {!isMobileView && (
          <aside
            className={`${sidebarCollapsed ? 'w-20' : 'w-64'
              } border-r bg-card transition-all duration-300 flex flex-col overflow-hidden`}
          >
            {/* Header - Logo with collapse button */}
            <div className="border-b">
              {!sidebarCollapsed ? (
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <img
                      src="/images/techlogo.png"
                      alt="Activos TI"
                      className="h-8 w-8 object-contain flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <h2 className="font-bold text-sm leading-tight truncate">Activos TI</h2>
                      <p className="text-xs text-muted-foreground truncate">Sistema de Gestión</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="flex-shrink-0 h-8 w-8 p-0"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="p-4 flex flex-col items-center gap-2">
                  <img
                    src="/images/techlogo.png"
                    alt="Activos TI"
                    className="h-8 w-8 object-contain flex-shrink-0"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="flex-shrink-0 h-8 w-8 p-0"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* User Profile - Below header */}
            {!sidebarCollapsed ? (
              <div className="p-4 border-b">
                <p className="text-sm font-semibold truncate text-left">
                  {user?.firstName} {user?.lastName}
                </p>
              </div>
            ) : (
              <div className="p-4 border-b flex items-center justify-center">
                <div className="font-bold">
                  {getUserInitials()}
                </div>

              </div>
            )}

            {/* Nav Items */}
            <nav className="flex-1 px-2 py-4 space-y-2 overflow-y-auto">
              {userNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent text-foreground'
                      }`}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {!sidebarCollapsed && <span className="text-sm font-medium">{item.title}</span>}
                  </Link>
                );
              })}
            </nav>

            {/* Logout Button */}
            <div className="border-t p-4">
              <Button
                variant="destructive"
                size="sm"
                className="w-full gap-2 justify-center"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 flex-shrink-0" />
                {!sidebarCollapsed && 'Cerrar Sesión'}
              </Button>
            </div>
          </aside>
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          {/* Mobile Header */}
          {isMobileView && (
            <header className="sticky top-0 z-40 border-b bg-card">
              <div className="flex items-center justify-between p-4">
                <h1 className="font-semibold">Panel de Usuario</h1>
                <Sheet open={isOpen} onOpenChange={setIsOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left">
                    <SheetTitle>Menú</SheetTitle>
                    <SheetDescription>Navegación del usuario</SheetDescription>
                    <nav className="flex flex-col gap-2 mt-4">
                      {userNavItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.href;
                        return (
                          <Link
                            key={item.href}
                            to={item.href}
                            onClick={() => setIsOpen(false)}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isActive
                                ? 'bg-primary text-primary-foreground'
                                : 'hover:bg-accent'
                              }`}
                          >
                            <Icon className="h-5 w-5" />
                            <span>{item.title}</span>
                          </Link>
                        );
                      })}
                      <Button
                        variant="destructive"
                        className="w-full justify-start gap-2 mt-4"
                        onClick={() => {
                          handleLogout();
                          setIsOpen(false);
                        }}
                      >
                        <LogOut className="h-4 w-4" />
                        Cerrar Sesión
                      </Button>
                    </nav>
                  </SheetContent>
                </Sheet>
              </div>
            </header>
          )}

          {/* Content */}
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </LayoutContext.Provider>
  );
}
