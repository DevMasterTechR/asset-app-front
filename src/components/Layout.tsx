import { ReactNode, useState, useEffect } from 'react';
import LayoutContext from '@/context/LayoutContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  LayoutDashboard,
  Laptop,
  Users,
  ClipboardList,
  FolderTree,
  Package,
  LogOut,
  Menu,
  Building2,
  ArrowLeft,
  ArrowRight,
  Key,
} from 'lucide-react';

import { useToast } from '@/hooks/use-toast';
import { authApi } from '@/api/auth';

interface LayoutProps {
  children: ReactNode;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

const navItems: NavItem[] = [
  { title: 'Dashboard', href: '/', icon: LayoutDashboard },
  { title: 'Dispositivos', href: '/devices', icon: Laptop },
  { title: 'Personas', href: '/people', icon: Users },
  { title: 'Asignaciones', href: '/assignments', icon: ClipboardList },
  { title: 'Catálogos', href: '/catalogs', icon: FolderTree },
  { title: 'Consumibles', href: '/consumables', icon: Package },
  { title: 'Credenciales', href: '/credentials', icon: Key },
];

export default function Layout({ children }: LayoutProps) {
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

  // Persist sidebar collapsed state
  useEffect(() => {
    try {
      localStorage.setItem('sidebar:collapsed', sidebarCollapsed ? 'true' : 'false');
    } catch (e) {}
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
      try { localStorage.setItem('session:logout', String(Date.now())); } catch (e) {}
      toast({
        title: 'Sesión cerrada',
        description: 'Has cerrado sesión correctamente.',
      });
      navigate('/auth');
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
      // remaining can be number or null
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
      try { localStorage.setItem('session:keepalive', String(Date.now())); localStorage.removeItem('session:warning'); } catch (e) {}
      toast({ title: 'Sesión extendida', description: 'Se ha mantenido la sesión activa.' });
    } catch (e) {
      toast({ title: 'Error', description: 'No se pudo extender la sesión', variant: 'destructive' });
    }
  };

  const NavContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo + collapse button */}
      <div className="p-6 border-b">
        <div className="flex items-center gap-3">
          <img 
            src="/images/techlogo.png" 
            alt="Activos TI" 
            className="h-8 w-8 object-contain flex-shrink-0"
          />
          {!sidebarCollapsed && (
            <div>
              <h2 className="font-bold text-lg">Activos TI</h2>
              <p className="text-xs text-muted-foreground">Sistema de Gestión</p>
            </div>
          )}
          {/* collapse button on the right when expanded */}
          {!sidebarCollapsed && (
            <div className="ml-auto hidden md:block">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarCollapsed((s) => !s)}
                aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>

        {/* when collapsed, show the collapse button centered under the logo */}
        {sidebarCollapsed && (
          <div className="mt-3 flex justify-center hidden md:flex">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed(false)}
              aria-label="Expand sidebar"
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>

      {/* User Info */}
      <div className="p-4 border-b bg-muted/30">
        {!sidebarCollapsed ? (
          <>
            <p className="text-sm font-medium">
              {user?.firstName && user?.lastName 
                ? `${user.firstName} ${user.lastName}` 
                : user?.firstName || user?.lastName || user?.username || 'Usuario'}
            </p>
          </>
        ) : (
          <div className="text-center">
            <p className="text-sm font-medium">
              {user?.firstName?.slice(0, 1).toUpperCase() || user?.lastName?.slice(0, 1).toUpperCase() || user?.username?.slice(0, 1).toUpperCase() || 'U'}
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-5 w-5" />
              {!sidebarCollapsed && <span className="font-medium">{item.title}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Logout Button - mobile inside nav */}
      <div className="p-4 border-t md:hidden">
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={handleLogout}
        >
          <LogOut className="mr-3 h-5 w-5" />
          Cerrar Sesión
        </Button>
      </div>

      {/* Desktop: positioned logout inside sidebar (absolute at bottom) */}
      <div className="hidden md:block">
        <div className="absolute bottom-16 left-0">
          <button
            onClick={handleLogout}
            className="group flex items-center gap-2 p-2 rounded-md hover:bg-muted transition-colors"
            aria-label="Cerrar sesión"
          >
            <LogOut className="h-5 w-5 text-destructive" />
            <span className="ml-1 text-sm text-destructive opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">Cerrar sesión</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <LayoutContext.Provider value={{ sidebarCollapsed, setSidebarCollapsed }}>
      <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 border-r bg-card transition-[width] duration-200 ease-linear ${
          sidebarCollapsed ? 'md:w-20' : 'md:w-64'
        }`}
      >
        <NavContent />
      </aside>

      {/* Mobile Menu */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-4 border-b bg-card">
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <h1 className="font-bold text-lg flex-1 text-center">Activos TI</h1>
          <div className="w-10" />
        </div>
        <SheetContent side="left" className="p-0 w-64">
          <NavContent />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main className={`flex-1 overflow-auto transition-all duration-200 ease-linear px-6 md:pl-0 ${
        sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'
      }`}>
          {/* desktop toggle moved into sidebar header */}
        <div className="md:hidden h-16" /> {/* Spacer for mobile header */}
        {/* Session countdown badge */}
        {sessionCountdown !== null && sessionCountdown > 0 && (
          <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-destructive/10 border border-destructive rounded-md p-2">
            <span className="text-sm font-medium">Sesión expira en {sessionCountdown}s</span>
            <Button size="sm" onClick={handleStayConnected}>Permanecer conectado</Button>
          </div>
        )}
        {children}
      </main>
      
      </div>
    </LayoutContext.Provider>
  );
}