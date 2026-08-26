import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { CommissionProvider } from '@/contexts/CommissionContext';
import Auth from '@/components/Auth';
import Layout from '@/components/Layout';
import ShaderBackground from '@/components/ui/shader-background';
import Dashboard from '@/components/Dashboard';
import EmployeeManagement from '@/components/EmployeeManagement';
import AttendanceManagement from '@/components/AttendanceManagement';
import LeaveManagement, { EmployeeLeaveView } from '@/components/LeaveManagement';
import LeaveRequestManagement from '@/components/LeaveRequestManagement';
import TeamManagement from '@/components/TeamManagement';
import ErrorBoundary from '@/components/ErrorBoundary';
import ReportsAnalytics from '@/components/ReportsAnalytics';
import ReportsAnalytics2 from '@/components/ReportsAnalytics2';
import HolidayManagement from '@/components/HolidayManagement';
import SystemSettings from '@/components/SystemSettings';
import EmployeeAttendance from '@/components/EmployeeAttendance';
import Profile from '@/components/Profile';
import ProfileManagement from '@/components/ProfileManagement';
import CompanyProfile from '@/components/CompanyProfile';
import PerformanceReport from '@/components/PerformanceReport';
import AttendanceSimplifierPage from '@/pages/AttendanceSimplifierPage';
import RecruitmentReport from '@/components/RecruitmentReport';
import { SessionSettings } from '@/components/SessionSettings';
import CommissionDashboard from '@/components/commission/CommissionDashboard';
import BulkPasswordReset from '@/components/BulkPasswordReset';
import CommissionCalculator from '@/components/commission/CommissionCalculator';
import CommissionEngagements from '@/components/commission/CommissionEngagements';
import CommissionSplits from '@/components/commission/CommissionSplits';
import CommissionReports from '@/components/commission/CommissionReports';
import CommissionIndex from '@/components/commission/CommissionIndex';

const Index = () => {
  const { user, isInitializing } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Only block the login form when restoring an existing session.
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show auth page if user is not logged in
  if (!user) {
    return (
      <div className="auth-window">
        <ShaderBackground />
        <div className="relative z-10">
          <Auth />
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onNavigate={setActiveTab} />;
      
      case 'attendance':
        return <EmployeeAttendance />;
      case 'manage-attendance':
        return <AttendanceManagement />;

      case 'attendance-simplifier':
        return <AttendanceSimplifierPage />;
      
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
      
      case 'leave-type-management':
        return <LeaveManagement />;
      
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
        
      case 'profile-management':
        // Only admins and super admins can access profile management
        if (['admin', 'super_admin'].includes(user.role)) {
          return <ProfileManagement />;
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
          return (
            <ErrorBoundary>
              <ReportsAnalytics />
            </ErrorBoundary>
          );
        }
        return (
          <div className="glass-effect rounded-2xl p-8 border text-center">
            <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to access this section</p>
          </div>
        );
      
      case 'reports-2':
        // Admins, super admins, and reporting managers can access reports 2
        if (['admin', 'super_admin', 'reporting_manager'].includes(user.role)) {
          return (
            <ErrorBoundary>
              <ReportsAnalytics2 />
            </ErrorBoundary>
          );
        }
        return (
          <div className="glass-effect rounded-2xl p-8 border text-center">
            <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to access this section</p>
          </div>
        );
      
      case 'performance-report':
        return <PerformanceReport />;
      
      case 'recruitment-report':
        return <RecruitmentReport />;
      
      case 'profile':
        return (
          <Profile employeeId={user.id} />
        );
      
      case 'company-profile':
        return <CompanyProfile />;
      
      case 'settings':
        return <SystemSettings />;
      
      case 'session-settings':
        return <SessionSettings />;
      
      case 'commission-calculator':
        // Only admins and super admins can access commission calculator
        if (['admin', 'super_admin'].includes(user.role)) {
          return <CommissionIndex initialTab="commission-calculator" onNavigate={setActiveTab} />;
        }
        return (
          <div className="glass-effect rounded-2xl p-8 border text-center">
            <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to access this section</p>
          </div>
        );
      
      case 'commission-report':
        // Only admin and super admin can access commission reports
        if (['admin', 'super_admin'].includes(user.role)) {
          return (
            <ErrorBoundary>
              <CommissionReports />
            </ErrorBoundary>
          );
        }
        return (
          <div className="glass-effect rounded-2xl p-8 border text-center">
            <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
            <p className="text-gray-600">Only admins and super admins can access Commission Reports</p>
          </div>
        );
      
      case 'bulk-password-reset':
        // Only super admin can access bulk password reset
        if (['super_admin'].includes(user.role)) {
          return (
            <ErrorBoundary>
              <BulkPasswordReset />
            </ErrorBoundary>
          );
        }
        return (
          <div className="glass-effect rounded-2xl p-8 border text-center">
            <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
            <p className="text-gray-600">Only super admins can access Bulk Password Reset</p>
          </div>
        );
      
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
