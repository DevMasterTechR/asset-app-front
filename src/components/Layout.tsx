import { ReactNode, useState, useEffect } from 'react';
import LayoutContext from '@/context/LayoutContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
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
  ShieldCheck,
  FileText,
  ChevronDown,
  PowerOff,
  Boxes,
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

interface NavCategory {
  label: string;
  items: NavItem[];
}

const navCategories: NavCategory[] = [
  {
    label: 'Principal',
    items: [
      { title: 'Dashboard', href: '/', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Inventario',
    items: [
      { title: 'Dispositivos', href: '/devices', icon: Laptop },
      { title: 'Personas', href: '/people', icon: Users },
      { title: 'Consumibles', href: '/consumables', icon: Package },
      { title: 'Seguridad', href: '/security', icon: ShieldCheck },
    ],
  },
  {
    label: 'Operaciones',
    items: [
      { title: 'Asignaciones', href: '/assignments', icon: ClipboardList },
      { title: 'Préstamos', href: '/loans', icon: Boxes },
      { title: 'Solicitudes', href: '/admin/requests', icon: FileText },
    ],
  },
  {
    label: 'Administración',
    items: [
      { title: 'Catálogos', href: '/catalogs', icon: FolderTree },
      { title: 'Credenciales', href: '/credentials', icon: Key },
    ],
  },
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [showCreator, setShowCreator] = useState(false);
  const [keySequence, setKeySequence] = useState<string[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      const v = localStorage.getItem('sidebar:collapsed');
      return v === 'true';
    } catch (e) {
      return false;
    }
  });

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('nav:expanded');
      if (saved) {
        return new Set(JSON.parse(saved));
      }
    } catch (e) { }
    return new Set();
  });

  const toggleCategory = (categoryLabel: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryLabel)) {
        next.delete(categoryLabel);
      } else {
        next.add(categoryLabel);
      }
      try {
        localStorage.setItem('nav:expanded', JSON.stringify([...next]));
      } catch (e) { }
      return next;
    });
  };

  // Auto-expand category containing current route
  useEffect(() => {
    const currentPath = location.pathname;
    for (const category of navCategories) {
      const hasActiveItem = category.items.some(item => item.href === currentPath);
      if (hasActiveItem && !expandedCategories.has(category.label)) {
        setExpandedCategories(prev => {
          const next = new Set(prev);
          next.add(category.label);
          try {
            localStorage.setItem('nav:expanded', JSON.stringify([...next]));
          } catch (e) { }
          return next;
        });
      }
    }
  }, [location.pathname]);

  // Persist sidebar collapsed state
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

  // Easter egg: secuencia de teclas "creator"
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      setKeySequence(prev => {
        const newSeq = [...prev, e.key.toLowerCase()].slice(-7);
        if (newSeq.join('') === 'creator') {
          setShowCreator(true);
          return [];
        }
        return newSeq;
      });
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
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
      try { localStorage.setItem('session:keepalive', String(Date.now())); localStorage.removeItem('session:warning'); } catch (e) { }
      toast({ title: 'Sesión extendida', description: 'Se ha mantenido la sesión activa.' });
    } catch (e) {
      toast({ title: 'Error', description: 'No se pudo extender la sesión', variant: 'destructive' });
    }
  };

  const getUserInitials = () => {
    const firstName = user?.firstName?.trim() || '';
    const lastName = user?.lastName?.trim() || '';
    const username = user?.username?.trim() || '';

    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }

    if (firstName) {
      const words = firstName.split(/\s+/);
      if (words.length > 1) {
        return words.slice(0, 2).map(w => w[0]).join('').toUpperCase();
      }
      return firstName[0].toUpperCase();
    }

    if (lastName) {
      const words = lastName.split(/\s+/);
      if (words.length > 1) {
        return words.slice(0, 2).map(w => w[0]).join('').toUpperCase();
      }
      return lastName[0].toUpperCase();
    }

    if (username) {
      return username[0].toUpperCase();
    }

    return 'U';
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
              {getUserInitials()}
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navCategories.map((category) => {
          const isExpanded = expandedCategories.has(category.label);
          const isSingleItem = category.items.length === 1;

          // Principal category (Dashboard) - always expanded, no collapsing
          if (category.label === 'Principal') {
            return (
              <div key={category.label}>
                {category.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;

                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                        }`}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      {!sidebarCollapsed && <span className="font-medium">{item.title}</span>}
                    </Link>
                  );
                })}
              </div>
            );
          }

          // Other categories - collapsible
          return (
            <div key={category.label}>
              <button
                onClick={() => !sidebarCollapsed && toggleCategory(category.label)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${sidebarCollapsed
                    ? 'justify-center hover:bg-muted'
                    : 'justify-between hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                disabled={sidebarCollapsed}
                title={sidebarCollapsed ? category.label : ''}
              >
                {!sidebarCollapsed && (
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {category.label}
                  </p>
                )}
                {sidebarCollapsed ? (
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/50" />
                ) : (
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 flex-shrink-0 ${isExpanded ? 'rotate-180' : ''
                      }`}
                  />
                )}
              </button>

              {isExpanded && !sidebarCollapsed && (
                <div className="space-y-1 mt-1">
                  {category.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.href;

                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg ml-2 transition-colors ${isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                          }`}
                      >
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        <span className="text-sm font-medium">{item.title}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Logout Button - mobile inside nav */}
      <div className="p-4 border-t md:hidden">
        <Button
          variant="destructive"
          className="w-full justify-start gap-2 font-medium"
          onClick={handleLogout}
        >
          <PowerOff className="h-4 w-4" />
          Cerrar Sesión
        </Button>
      </div>

      {/* Desktop: positioned logout inside sidebar */}
      <div className="hidden md:block p-4 border-t">
        <Button
          variant="destructive"
          className={`w-full gap-2 font-medium ${sidebarCollapsed ? 'px-2' : 'justify-start'}`}
          onClick={handleLogout}
        >
          <PowerOff className="h-4 w-4 flex-shrink-0" />
          {!sidebarCollapsed && <span>Cerrar Sesión</span>}
        </Button>
      </div>
    </div>
  );

  return (
    <LayoutContext.Provider value={{ sidebarCollapsed, setSidebarCollapsed }}>
      <div className="min-h-screen bg-background flex">
        {/* Desktop Sidebar */}
        <aside
          className={`hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 border-r bg-card transition-[width] duration-200 ease-linear ${sidebarCollapsed ? 'md:w-20' : 'md:w-64'
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
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <SheetDescription className="sr-only">Mobile navigation menu with links to different sections</SheetDescription>
            <NavContent />
          </SheetContent>
        </Sheet>

        {/* Main Content */}
        <main className={`flex-1 overflow-auto transition-all duration-200 ease-linear px-6 md:pl-0 ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'
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

        {/* Easter Egg: The Creator */}
        {showCreator && (
          <div
            className="fixed inset-0 z-[9999] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex items-center justify-center p-6 overflow-hidden"
            onClick={() => setShowCreator(false)}
          >
            <style>{`
            @keyframes fall {
              0% { transform: translateY(-20vh) rotate(0deg); opacity: 0; }
              10% { opacity: 1; }
              100% { transform: translateY(110vh) rotate(360deg); opacity: 0; }
            }
            .confetti-piece {
              position: absolute;
              top: -10px;
              border-radius: 9999px;
              opacity: 0;
            }
            .glow {
              box-shadow: 0 0 25px rgba(255,255,255,0.12), 0 0 60px rgba(99,102,241,0.18);
            }
            .pulse {
              animation: pulse 2.4s ease-in-out infinite;
            }
            @keyframes pulse {
              0%, 100% { transform: scale(1); opacity: 0.9; }
              50% { transform: scale(1.03); opacity: 1; }
            }
          `}</style>

            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {Array.from({ length: 80 }).map((_, i) => {
                const colors = ["#f97316", "#6366f1", "#10b981", "#facc15", "#ec4899", "#0ea5e9"];
                const left = Math.random() * 100;
                const delay = Math.random() * 2;
                const duration = 3 + Math.random() * 2;
                const size = 6 + Math.random() * 8;
                const rotate = Math.random() * 360;
                const color = colors[i % colors.length];
                return (
                  <span
                    key={i}
                    className="confetti-piece"
                    style={{
                      left: `${left}%`,
                      width: `${size}px`,
                      height: `${size * 3}px`,
                      background: color,
                      animation: `fall ${duration}s linear ${delay}s infinite`,
                      transform: `rotate(${rotate}deg)`,
                    }}
                  />
                );
              })}
            </div>

            <div className="relative z-10 max-w-xl text-center space-y-4">
              <div className="inline-flex px-4 py-2 rounded-full border border-white/20 bg-white/5 text-xs uppercase tracking-[0.28em] text-gray-200">
                The Creator
              </div>
              <h1 className="text-3xl sm:text-5xl font-bold leading-tight glow">
                Creado por <span className="text-indigo-400">Bryan Quispe</span>
                <span className="block text-lg sm:text-2xl text-gray-300 mt-2">(Bryan406)</span>
              </h1>
              <p className="text-sm sm:text-base text-gray-300 max-w-lg mx-auto pulse">
                Si llegaste hasta aquí, encontraste la pista oculta. Sigue creando, rompiendo y reconstruyendo.
              </p>
              <p className="text-xs text-gray-500 mt-4">
                (Haz clic en cualquier lugar para cerrar)
              </p>
            </div>
          </div>
        )}

      </div>
    </LayoutContext.Provider>
  );
}