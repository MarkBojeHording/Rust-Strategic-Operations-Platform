import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { 
  Home, 
  Activity, 
  Server, 
  Map, 
  LogOut, 
  User 
} from 'lucide-react';

export function Navigation() {
  const [location] = useLocation();
  const { isAuthenticated } = useAuth();

  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  // Don't show navigation on landing page unless authenticated
  if (location === '/landing' && !isAuthenticated) {
    return null;
  }

  const navItems = [
    {
      href: '/landing',
      label: 'Home',
      icon: Home,
      description: 'Landing Page'
    },
    {
      href: '/dashboard',
      label: 'Dashboard', 
      icon: Activity,
      description: 'Server Dashboard'
    },
    {
      href: '/servers',
      label: 'Servers',
      icon: Server,
      description: 'Server Management'
    },
    {
      href: '/map-viewer',
      label: 'Maps',
      icon: Map,
      description: 'Map Viewer'
    }
  ];

  const isActiveRoute = (href: string) => {
    if (href === '/dashboard' && (location === '/' || location === '/dashboard')) {
      return true;
    }
    return location === href;
  };

  return (
    <nav className="bg-surface border-b border-gray-700 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Title */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">
                Rust Server Operations Center
              </h1>
              <p className="text-xs text-gray-400">BattleMetrics Integration</p>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = isActiveRoute(item.href);
              
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? 'default' : 'ghost'}
                    size="sm"
                    className={`
                      flex items-center space-x-2 text-sm h-9 px-3
                      ${isActive 
                        ? 'bg-blue-600 text-white hover:bg-blue-700' 
                        : 'text-gray-300 hover:text-white hover:bg-gray-700'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden md:inline">{item.label}</span>
                  </Button>
                </Link>
              );
            })}

            {/* Logout Button */}
            {isAuthenticated && (
              <>
                <div className="w-px h-6 bg-gray-600 mx-2" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="flex items-center space-x-2 text-sm h-9 px-3 text-gray-300 hover:text-white hover:bg-red-600"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden md:inline">Logout</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}