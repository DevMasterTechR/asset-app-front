import { ReactNode, useState, useEffect } from 'react';
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
      {/* Logo */}
      <div className="p-6 border-b">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="font-bold text-lg">Activos TI</h2>
            <p className="text-xs text-muted-foreground">Sistema de Gestión</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-b bg-muted/30">
        <p className="text-sm font-medium">
          {user?.firstName && user?.lastName 
            ? `${user.firstName} ${user.lastName}` 
            : user?.username || 'Usuario'}
        </p>
        <p className="text-xs text-muted-foreground">@{user?.username}</p>
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
              <span className="font-medium">{item.title}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t">
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={handleLogout}
        >
          <LogOut className="mr-3 h-5 w-5" />
          Cerrar Sesión
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col border-r bg-card">
        <NavContent />
      </aside>

      {/* Mobile Menu */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-4 border-b bg-card">
          <h1 className="font-bold text-lg">Activos TI</h1>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
        </div>
        <SheetContent side="left" className="p-0 w-64">
          <NavContent />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
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
  );
}