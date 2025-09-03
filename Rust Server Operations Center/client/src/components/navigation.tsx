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
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Title */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                Rust Server Operations Center
              </h1>
              <p className="text-xs text-gray-500">BattleMetrics Integration</p>
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
                      flex items-center space-x-2 text-sm h-9 px-3 rounded-md
                      ${isActive 
                        ? 'bg-blue-500 text-white hover:bg-blue-600' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
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
                <div className="w-px h-6 bg-gray-300 mx-2" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="flex items-center space-x-2 text-sm h-9 px-3 rounded-md text-gray-600 hover:text-white hover:bg-red-500"
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