import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Auth from '@/components/Auth';
import Layout from '@/components/Layout';
import Dashboard from '@/components/Dashboard';
import EmployeeManagement from '@/components/EmployeeManagement';
import AttendanceManagement from '@/components/AttendanceManagement';
import LeaveManagement, { EmployeeLeaveView } from '@/components/LeaveManagement';
import LeaveRequestManagement from '@/components/LeaveRequestManagement';
import TeamManagement from '@/components/TeamManagement';
import ReportsAnalytics from '@/components/ReportsAnalytics';
import HolidayManagement from '@/components/HolidayManagement';
import SystemSettings from '@/components/SystemSettings';
import EmployeeAttendance from '@/components/EmployeeAttendance';
import Profile from '@/components/Profile';

const Index = () => {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show auth page if user is not logged in
  if (!user) {
    return <Auth />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onNavigate={setActiveTab} />;
      
      case 'attendance':
        return <EmployeeAttendance />;
      case 'manage-attendance':
        return <AttendanceManagement />;
      
      case 'leave':
        return <EmployeeLeaveView />;
      
      case 'leave-management':
        // Available to reporting managers, admins, and super admins
        if (['reporting_manager', 'admin', 'super_admin'].includes(user.role)) {
          return <LeaveRequestManagement />;
        }
        return (
          <div className="glass-effect rounded-2xl p-8 border text-center">
            <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to access this section</p>
          </div>
        );
      
      case 'holidays':
        return <HolidayManagement />;
      
      case 'employees':
        // Only admins and super admins can access employee management
        if (['admin', 'super_admin'].includes(user.role)) {
          return <EmployeeManagement />;
        }
        return (
          <div className="glass-effect rounded-2xl p-8 border text-center">
            <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to access this section</p>
          </div>
        );
      
      case 'teams':
        // Admins, super admins, and reporting managers can access team management
        if (['admin', 'super_admin', 'reporting_manager'].includes(user.role)) {
          return <TeamManagement />;
        }
        return (
          <div className="glass-effect rounded-2xl p-8 border text-center">
            <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to access this section</p>
          </div>
        );
      
      case 'reports':
        // Admins, super admins, and reporting managers can access reports
        if (['admin', 'super_admin', 'reporting_manager'].includes(user.role)) {
          return <ReportsAnalytics />;
        }
        return (
          <div className="glass-effect rounded-2xl p-8 border text-center">
            <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to access this section</p>
          </div>
        );
      
      case 'profile':
        return (
          <Profile employeeId={user.id} />
        );
      
      case 'settings':
        return <SystemSettings />;
      
      default:
        return <Dashboard onNavigate={setActiveTab} />;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </Layout>
  );
};

export default Index;
