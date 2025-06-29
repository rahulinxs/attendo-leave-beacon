import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
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
  EyeOff,
  Building,
  Network,
  FlaskConical
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
  const { currentCompany } = useCompany();
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
    {
      id: 'manage-attendance',
      label: 'Manage Attendance',
      icon: UserCheck,
      roles: ['admin', 'super_admin'],
      requiresPermission: true
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
      id: 'teams',
      label: 'Team Management',
      icon: Network,
      roles: ['admin', 'super_admin', 'reporting_manager'],
      requiresPermission: true
    },
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
      roles: ['admin', 'super_admin', 'reporting_manager'],
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
  ].filter(item => item.id !== 'dummy-attendance');

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
            <div className="flex flex-col">
            <span className="font-bold text-lg">AttendEase</span>
              {currentCompany && (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Building className="w-3 h-3" />
                  {currentCompany.name}
                </span>
              )}
            </div>
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

      <div className="flex">
        {/* Sidebar */}
        <div className={`
          fixed inset-y-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
          ${sidebarPosition === 'right' ? 'right-0' : 'left-0'}
          ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}
          lg:relative lg:translate-x-0 lg:shadow-none
        `}>
          <div className="flex flex-col h-full">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between p-3 border-b">
              <div className="flex items-center space-x-2">
                <CompanyLogo size="md" />
                <div className="flex flex-col">
                  <span className="font-bold text-base">AttendEase</span>
                  {currentCompany && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Building className="w-3 h-3" />
                      {currentCompany.name}
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden"
              >
                <Menu className="w-4 h-4" />
              </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={`
                      w-full flex items-center space-x-2 px-2 py-1.5 rounded-md text-left transition-colors text-sm
                      ${isActive 
                        ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                        : 'text-gray-700 hover:bg-gray-100'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="flex-1">{item.label}</span>
                    {item.requiresPermission && (
                      <Lock className="w-3 h-3 text-gray-400" />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* User Profile Section */}
            <div className="p-3 border-t">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between">
                    <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-3 h-3 text-blue-600" />
                    </div>
                      <div className="text-left">
                        <div className="font-medium text-xs">{user?.name || 'User'}</div>
                        <div className="text-xs text-gray-500">{user?.email}</div>
                      </div>
                    </div>
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2">
                    <div className="font-medium">{user?.name || 'User'}</div>
                    <div className="text-sm text-gray-500">{user?.email}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={getRoleBadgeVariant(user?.role || 'employee')}>
                        {getRoleDisplayName(user?.role || 'employee')}
                      </Badge>
                    </div>
                    {currentCompany && (
                      <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                        <Building className="w-3 h-3" />
                        {currentCompany.name}
                      </div>
                    )}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 lg:ml-0">
          <div className="p-3 lg:p-4">
            {children}
          </div>
        </div>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;
