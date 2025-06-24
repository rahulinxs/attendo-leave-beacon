import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Auth from '@/components/Auth';
import Layout from '@/components/Layout';
import Dashboard from '@/components/Dashboard';
import EmployeeManagement from '@/components/EmployeeManagement';
import AttendanceManagement from '@/components/AttendanceManagement';
import LeaveManagement, { EmployeeLeaveView } from '@/components/LeaveManagement';
import LeaveRequestManagement from '@/components/LeaveRequestManagement';
import ReportsAnalytics from '@/components/ReportsAnalytics';
import HolidayManagement from '@/components/HolidayManagement';
import SystemSettings from '@/components/SystemSettings';

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
      
      case 'reports':
        // Only admins and super admins can access reports
        if (['admin', 'super_admin'].includes(user.role)) {
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
          <div className="glass-effect rounded-2xl p-8 border text-center">
            <h2 className="text-2xl font-bold mb-4">Profile Settings</h2>
            <div className="max-w-md mx-auto text-left">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <p className="mt-1 text-sm text-gray-900">{user.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-sm text-gray-900">{user.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <p className="mt-1 text-sm text-gray-900 capitalize">{user.role.replace('_', ' ')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Department</label>
                  <p className="mt-1 text-sm text-gray-900">{user.department || 'Not assigned'}</p>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-6">Profile editing feature coming soon...</p>
          </div>
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
