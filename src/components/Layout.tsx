import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Calendar, 
  Clock, 
  LogOut, 
  Menu, 
  Settings, 
  User,
  Users,
  ChevronDown,
  CalendarDays,
  UserCheck,
  BarChart3,
  Shield,
  Crown,
  UserCog,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import CompanyLogo from './CompanyLogo';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  roles: string[];
  requiresPermission?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
  const { user, logout } = useAuth();
  const { sidebarPosition } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Enhanced navigation items with role-based access control
  const navigationItems: NavigationItem[] = [
    // Core features - available to all users
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Building2,
      roles: ['employee', 'reporting_manager', 'admin', 'super_admin']
    },
    {
      id: 'attendance',
      label: 'Attendance',
      icon: Clock,
      roles: ['employee', 'reporting_manager', 'admin', 'super_admin']
    },
    {
      id: 'leave',
      label: 'Leave Requests',
      icon: Calendar,
      roles: ['employee', 'reporting_manager', 'admin', 'super_admin']
    },
    {
      id: 'holidays',
      label: 'Holidays',
      icon: CalendarDays,
      roles: ['employee', 'reporting_manager', 'admin', 'super_admin']
    },
    
    // Management features - for managers and above
    {
      id: 'leave-management',
      label: 'Manage Leave Requests',
      icon: UserCheck,
      roles: ['reporting_manager', 'admin', 'super_admin'],
      requiresPermission: true
    },
    
    // Admin features - for admins and super admins
    {
      id: 'employees',
      label: 'Employee Management',
      icon: Users,
      roles: ['admin', 'super_admin'],
      requiresPermission: true
    },
    {
      id: 'reports',
      label: 'Reports & Analytics',
      icon: BarChart3,
      roles: ['admin', 'super_admin'],
      requiresPermission: true
    },
    
    // User profile - available to all
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      roles: ['employee', 'reporting_manager', 'admin', 'super_admin']
    },
    // System Settings - available to all, just before Profile
    {
      id: 'settings',
      label: 'System Settings',
      icon: Settings,
      roles: ['employee', 'reporting_manager', 'admin', 'super_admin'],
      requiresPermission: true
    }
  ];

  // Filter navigation items based on user role and enforce order for leave/leave-management
  const getFilteredNavigationItems = () => {
    if (!user) return [];
    // Always keep the first 4 tabs in order, then conditionally add the 5th
    const baseTabs = navigationItems.slice(0, 4).filter(item => item.roles.includes(user.role || 'employee'));
    const manageLeaveTab = navigationItems[4];
    const restTabs = navigationItems.slice(5).filter(item => item.roles.includes(user.role || 'employee'));
    let result = [...baseTabs];
    if (manageLeaveTab.roles.includes(user.role || 'employee')) {
      result.push(manageLeaveTab);
    }
    result = [...result, ...restTabs];
    return result;
  };

  const navItems = getFilteredNavigationItems();

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'admin': return 'Admin';
      case 'reporting_manager': return 'Manager';
      case 'employee': return 'Employee';
      default: return role;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin': return 'default';
      case 'admin': return 'secondary';
      case 'reporting_manager': return 'outline';
      case 'employee': return 'secondary';
      default: return 'secondary';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin': return Crown;
      case 'admin': return Shield;
      case 'reporting_manager': return UserCog;
      case 'employee': return User;
      default: return User;
    }
  };

  const handleLogout = async () => {
    await logout();
    // Wait for user to become null (max 1s)
    for (let i = 0; i < 10; i++) {
      if (!user) break;
      await new Promise(res => setTimeout(res, 100));
    }
    // Explicitly clear Supabase auth keys
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-')) localStorage.removeItem(key);
    });
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white shadow-sm border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <CompanyLogo size="md" />
            <span className="font-bold text-lg">AttendEase</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={sidebarPosition === 'right' ? 'order-first' : 'order-last'}
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className={`flex ${sidebarPosition === 'right' ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Sidebar */}
        <div className={`
          fixed lg:static inset-y-0 z-50 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out
          ${sidebarPosition === 'right' ? 'right-0' : 'left-0'}
          ${sidebarOpen ? 'translate-x-0' : sidebarPosition === 'right' ? 'translate-x-full lg:translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="hidden lg:flex items-center p-6 border-b">
              <CompanyLogo size="lg" showText={true} />
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const hasPermission = !item.requiresPermission || 
                  (user && ['reporting_manager', 'admin', 'super_admin'].includes(user.role || 'employee'));
                
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (hasPermission) {
                        onTabChange(item.id);
                        setSidebarOpen(false);
                      }
                    }}
                    disabled={!hasPermission}
                    className={`
                      w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all duration-200 relative
                      ${isActive 
                        ? 'gradient-primary text-white shadow-lg' 
                        : hasPermission
                          ? 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                          : 'text-gray-400 cursor-not-allowed bg-gray-50'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <div className="flex-1 text-left">
                      <span className="font-medium">{item.label}</span>
                    </div>
                    {!hasPermission && (
                      <Lock className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* User Profile */}
            <div className="p-4 border-t">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start space-x-3 h-auto p-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      {(() => {
                        const RoleIcon = getRoleIcon(user?.role || 'employee');
                        return <RoleIcon className="w-4 h-4 text-blue-600" />;
                      })()}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-sm">{user?.name}</p>
                      <div className="flex items-center space-x-2">
                        <p className="text-xs text-gray-500">{getRoleDisplayName(user?.role || 'employee')}</p>
                        <Badge variant={getRoleBadgeVariant(user?.role || 'employee')} className="text-xs">
                          {user?.role || 'employee'}
                        </Badge>
                      </div>
                    </div>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuItem onClick={() => onTabChange('profile')}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onTabChange('settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    System Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div 
            className={`fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden ${sidebarPosition === 'right' ? 'right-0' : 'left-0'}`}
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 lg:ml-0 lg:mr-0 h-screen overflow-y-auto">
          <main className="p-4 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Layout;
