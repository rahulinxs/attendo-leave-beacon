import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Book, 
  Users, 
  Calendar, 
  Clock, 
  DollarSign, 
  Calculator, 
  Settings, 
  ChevronRight, 
  ChevronLeft,
  Home,
  FileText,
  Upload,
  Download,
  CheckCircle,
  AlertCircle,
  Info,
  Star,
  Target,
  Shield,
  Building2,
  UserCheck,
  TrendingUp,
  HelpCircle
} from 'lucide-react';

interface UserHandbookProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const UserHandbook: React.FC<UserHandbookProps> = ({ open, setOpen }) => {
  const { user } = useAuth();
  const [currentSection, setCurrentSection] = useState('overview');

  // Define sections with role-based access
  const allSections = [
    { 
      id: 'overview', 
      label: 'Overview', 
      icon: Book, 
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
      label: 'Leave Management', 
      icon: Calendar, 
      roles: ['employee', 'reporting_manager', 'admin', 'super_admin'] 
    },
    { 
      id: 'commission', 
      label: 'Commission', 
      icon: DollarSign, 
      roles: ['admin', 'super_admin'] // Only admin and super admin can access commission
    },
    { 
      id: 'reports', 
      label: 'Reports', 
      icon: FileText, 
      roles: ['reporting_manager', 'admin', 'super_admin'] // Managers and above can access reports
    },
    { 
      id: 'admin', 
      label: 'Admin Features', 
      icon: Shield, 
      roles: ['admin', 'super_admin'] // Only admin and super admin can access admin features
    },
    { 
      id: 'tips', 
      label: 'Tips & Tricks', 
      icon: Star, 
      roles: ['employee', 'reporting_manager', 'admin', 'super_admin'] 
    },
  ];

  // Filter sections based on user role
  const availableSections = allSections.filter(section => 
    user?.role && section.roles.includes(user.role)
  );

  // Set initial section to first available if current section is not accessible
  React.useEffect(() => {
    if (!availableSections.find(s => s.id === currentSection) && availableSections.length > 0) {
      setCurrentSection(availableSections[0].id);
    }
  }, [user?.role, currentSection, availableSections]);

  const renderOverview = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Building2 className="w-6 h-6" />
          Welcome to AttendEdge
        </h3>
        <p className="text-gray-600 mb-4">
          AttendEdge is a comprehensive workforce management system designed to streamline attendance tracking, 
          leave management, and commission calculations for your organization.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            User Roles
          </h4>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• <strong>Employee</strong>: View attendance, request leave</li>
            <li>• <strong>Reporting Manager</strong>: Manage team attendance & leave</li>
            <li>• <strong>Admin</strong>: Full system access & reporting</li>
            <li>• <strong>Super Admin</strong>: Complete control & commission access</li>
          </ul>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <Target className="w-5 h-5 text-green-600" />
            Key Features
          </h4>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• Real-time attendance tracking</li>
            <li>• Automated leave management</li>
            <li>• Commission calculations</li>
            <li>• Advanced reporting & analytics</li>
            <li>• Bulk data import/export</li>
          </ul>
        </div>
      </div>

      <div className="bg-yellow-50 p-4 rounded-lg">
        <h4 className="font-semibold mb-2 flex items-center gap-2">
          <Info className="w-5 h-5 text-yellow-600" />
          Getting Started
        </h4>
        <ol className="text-sm text-gray-700 space-y-2">
          <li>1. <strong>Login</strong> with your credentials</li>
          <li>2. <strong>Dashboard</strong> shows your overview</li>
          <li>3. <strong>Navigate</strong> using the sidebar menu</li>
          <li>4. <strong>Complete</strong> your tasks based on your role</li>
        </ol>
      </div>
    </div>
  );

  const renderAttendance = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Clock className="w-6 h-6" />
          Attendance Management
        </h3>
        <p className="text-gray-600">
          Track daily attendance, manage check-in/check-out times, and monitor attendance patterns.
        </p>
      </div>

      <div className="space-y-4">
        {/* Content for all users */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-semibold mb-2">For Employees</h4>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• <strong>Check In/Out</strong>: Mark daily attendance</li>
            <li>• <strong>View History</strong>: Check your attendance records</li>
            <li>• <strong>Working Hours</strong>: Track daily/weekly hours</li>
            <li>• <strong>Location</strong>: GPS-based check-in (if enabled)</li>
          </ul>
        </div>

        {/* Content for managers and above */}
        {(user?.role === 'reporting_manager' || user?.role === 'admin' || user?.role === 'super_admin') && (
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">For Managers</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• <strong>Team Attendance</strong>: View team member attendance</li>
              <li>• <strong>Manual Marking</strong>: Mark attendance for team members</li>
              <li>• <strong>Approvals</strong>: Approve attendance changes</li>
              <li>• <strong>Bulk Import</strong>: Import attendance from biometric devices</li>
            </ul>
          </div>
        )}

        {/* Content for admin and super admin */}
        {(user?.role === 'admin' || user?.role === 'super_admin') && (
          <div className="bg-purple-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Bulk Import Features</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• <strong>Biometric Import</strong>: Import from biometric devices</li>
              <li>• <strong>Custom Format</strong>: Import from Excel files</li>
              <li>• <strong>Format Support</strong>: DD-MMM-YY dates, HH:MM:SS times</li>
              <li>• <strong>Error Handling</strong>: Detailed error reports</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );

  const renderLeave = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Calendar className="w-6 h-6" />
          Leave Management
        </h3>
        <p className="text-gray-600">
          Manage leave requests, track leave balances, and streamline approval workflows.
        </p>
      </div>

      <div className="space-y-4">
        {/* Content for all users */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-semibold mb-2">Leave Types</h4>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• <strong>Annual Leave</strong>: Paid vacation days</li>
            <li>• <strong>Sick Leave</strong>: Medical leave</li>
            <li>• <strong>Personal Leave</strong>: Personal time off</li>
            <li>• <strong>Maternity/Paternity</strong>: Parental leave</li>
            <li>• <strong>Emergency Leave</strong>: Urgent situations</li>
          </ul>
        </div>

        {/* Content for employees */}
        {user?.role === 'employee' && (
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Request Process</h4>
            <ol className="text-sm text-gray-700 space-y-1">
              <li>1. Select leave type and dates</li>
              <li>2. Add reason/comments</li>
              <li>3. Submit for approval</li>
              <li>4. Track status in real-time</li>
              <li>5. Receive notifications</li>
            </ol>
          </div>
        )}

        {/* Content for managers and above */}
        {(user?.role === 'reporting_manager' || user?.role === 'admin' || user?.role === 'super_admin') && (
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Approval Process</h4>
            <ol className="text-sm text-gray-700 space-y-1">
              <li>1. Review team leave requests</li>
              <li>2. Check team availability</li>
              <li>3. Approve or reject with comments</li>
              <li>4. Track approval history</li>
              <li>5. Manage leave calendars</li>
            </ol>
          </div>
        )}

        {/* Content for admin and super admin */}
        {(user?.role === 'admin' || user?.role === 'super_admin') && (
          <div className="bg-purple-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Balance Management</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• <strong>Available Days</strong>: View current balance</li>
              <li>• <strong>Used Days</strong>: Track consumed leave</li>
              <li>• <strong>Yearly Reset</strong>: Automatic balance updates</li>
              <li>• <strong>Carry Forward</strong>: Policy-based carry over</li>
              <li>• <strong>Leave Policies</strong>: Configure rules</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );

  const renderCommission = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <DollarSign className="w-6 h-6" />
          Commission Calculator
        </h3>
        <p className="text-gray-600">
          Calculate and manage commission payments with advanced tracking and reporting capabilities.
        </p>
      </div>

      <div className="space-y-4">
        <div className="bg-red-50 p-4 rounded-lg">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-600" />
            Access Control
          </h4>
          <p className="text-sm text-gray-700">
            Commission features are restricted to <strong>Admin</strong> and <strong>Super Admin</strong> roles only.
          </p>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-semibold mb-2">Commission Calculator</h4>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• <strong>Smart Auto-fill</strong>: Populate from past records</li>
            <li>• <strong>Date Management</strong>: Smart duration calculations</li>
            <li>• <strong>Team Commissions</strong>: Multi-member commission splits</li>
            <li>• <strong>Hourly Rates</strong>: Detailed hourly calculations</li>
            <li>• <strong>Validation</strong>: Real-time error checking</li>
          </ul>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <h4 className="font-semibold mb-2">Commission Reports</h4>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• <strong>Detailed Tables</strong>: Comprehensive data views</li>
            <li>• <strong>Search & Filter</strong>: Advanced data filtering</li>
            <li>• <strong>Financial Metrics</strong>: Revenue, costs, margins</li>
            <li>• <strong>Export Options</strong>: CSV/Excel exports</li>
            <li>• <strong>Visual Analytics</strong>: Charts and graphs</li>
          </ul>
        </div>
      </div>
    </div>
  );

  const renderReports = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <FileText className="w-6 h-6" />
          Reports & Analytics
        </h3>
        <p className="text-gray-600">
          Generate comprehensive reports and analyze workforce data with powerful analytics tools.
        </p>
      </div>

      <div className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-semibold mb-2">Attendance Reports</h4>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• <strong>Daily Reports</strong>: Day-wise attendance summaries</li>
            <li>• <strong>Monthly Reports</strong>: Monthly attendance patterns</li>
            <li>• <strong>Individual Reports</strong>: Employee-specific data</li>
            <li>• <strong>Team Reports</strong>: Department-wise analytics</li>
          </ul>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <h4 className="font-semibold mb-2">Leave Analytics</h4>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• <strong>Leave Trends</strong>: Pattern analysis</li>
            <li>• <strong>Balance Reports</strong>: Leave balance status</li>
            <li>• <strong>Approval Metrics</strong>: Processing times</li>
            <li>• <strong>Leave Types</strong>: Category-wise breakdown</li>
          </ul>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <h4 className="font-semibold mb-2">Export Features</h4>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• <strong>Excel Export</strong>: Detailed spreadsheet reports</li>
            <li>• <strong>CSV Export</strong>: Data processing formats</li>
            <li>• <strong>PDF Reports</strong>: Printable documents</li>
            <li>• <strong>Scheduled Reports</strong>: Automated delivery</li>
          </ul>
        </div>
      </div>
    </div>
  );

  const renderAdmin = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Shield className="w-6 h-6" />
          Admin Features
        </h3>
        <p className="text-gray-600">
          Advanced administrative features for system management and configuration.
        </p>
      </div>

      <div className="space-y-4">
        <div className="bg-red-50 p-4 rounded-lg">
          <h4 className="font-semibold mb-2">Employee Management</h4>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• <strong>Add/Edit Employees</strong>: Complete employee profiles</li>
            <li>• <strong>Role Assignment</strong>: Define user permissions</li>
            <li>• <strong>Team Structure</strong>: Organizational hierarchy</li>
            <li>• <strong>Bulk Operations</strong>: Mass employee updates</li>
          </ul>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-semibold mb-2">System Settings</h4>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• <strong>Company Profile</strong>: Organization details</li>
            <li>• <strong>Leave Policies</strong>: Configure leave rules</li>
            <li>• <strong>Work Hours</strong>: Define working schedules</li>
            <li>• <strong>Notification Settings</strong>: Email/alert preferences</li>
          </ul>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <h4 className="font-semibold mb-2">Data Management</h4>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• <strong>Import/Export</strong>: Bulk data operations</li>
            <li>• <strong>Backup & Restore</strong>: Data protection</li>
            <li>• <strong>Audit Logs</strong>: Activity tracking</li>
            <li>• <strong>Data Cleanup</strong>: Archive old records</li>
          </ul>
        </div>
      </div>
    </div>
  );

  const renderTips = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Star className="w-6 h-6" />
          Tips & Tricks
        </h3>
        <p className="text-gray-600">
          Pro tips to maximize your productivity with AttendEase.
        </p>
      </div>

      <div className="space-y-4">
        <div className="bg-yellow-50 p-4 rounded-lg">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Best Practices
          </h4>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• <strong>Regular Check-ins</strong>: Mark attendance daily</li>
            <li>• <strong>Plan Leave</strong>: Submit requests in advance</li>
            <li>• <strong>Update Profile</strong>: Keep information current</li>
            <li>• <strong>Use Mobile</strong>: Check-in on-the-go</li>
          </ul>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600" />
            Common Issues
          </h4>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• <strong>Forgot Check-in</strong>: Contact manager for manual marking</li>
            <li>• <strong>Leave Balance</strong>: Check before requesting</li>
            <li>• <strong>Password Reset</strong>: Use forgot password link</li>
            <li>• <strong>Browser Issues</strong>: Clear cache and reload</li>
          </ul>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <h4 className="font-semibold mb-2">Keyboard Shortcuts</h4>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• <strong>Ctrl + /</strong>: Show keyboard shortcuts</li>
            <li>• <strong>Ctrl + K</strong>: Quick search navigation</li>
            <li>• <strong>Esc</strong>: Close dialogs/modals</li>
            <li>• <strong>Tab</strong>: Navigate between fields</li>
          </ul>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (currentSection) {
      case 'overview': return renderOverview();
      case 'attendance': return renderAttendance();
      case 'leave': return renderLeave();
      case 'commission': return renderCommission();
      case 'reports': return renderReports();
      case 'admin': return renderAdmin();
      case 'tips': return renderTips();
      default: return renderOverview();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Book className="w-6 h-6" />
            AttendEdge User Handbook
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-6">
          {/* Sidebar Navigation */}
          <div className="w-64 space-y-2">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-sm text-gray-600">Navigation</h4>
              <Badge variant="outline" className="text-xs">
                {user?.role}
              </Badge>
            </div>
            {availableSections.map((section) => {
              const Icon = section.icon;
              return (
                <Button
                  key={section.id}
                  variant={currentSection === section.id ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setCurrentSection(section.id)}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {section.label}
                </Button>
              );
            })}
          </div>

          {/* Content Area */}
          <div className="flex-1">
            {renderContent()}
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-gray-500">
            Need more help? Contact your system administrator
          </div>
          <Button onClick={() => setOpen(false)}>Close Handbook</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserHandbook;
