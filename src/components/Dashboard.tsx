import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAttendance } from '@/hooks/useAttendance';
import { useLeave } from '@/hooks/useLeave';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Clock, 
  Calendar, 
  Users, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  TrendingUp,
  MapPin,
  Key,
  ShieldCheck
} from 'lucide-react';

interface DashboardProps {
  onNavigate?: (tab: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { todayAttendance, recentAttendance, checkIn, checkOut, isLoading: attendanceLoading } = useAttendance();
  const { leaveRequests, leaveBalances, pendingRequests, approveLeaveRequest, rejectLeaveRequest, isLoading: leaveLoading } = useLeave();
  
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleCheckInOut = async () => {
    if (todayAttendance?.check_in_time && !todayAttendance?.check_out_time) {
      const success = await checkOut();
      if (success) {
        toast({
          title: "Checked Out",
          description: "You have successfully checked out for today",
        });
      }
    } else {
      const success = await checkIn();
      if (success) {
        toast({
          title: "Checked In",
          description: "You have successfully checked in for today",
        });
      }
    }
  };

  const handleResetPassword = async () => {
    if (!user?.email) return;
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/`,
      });
      
      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Password Reset Email Sent",
          description: "Check your email for password reset instructions",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send password reset email",
        variant: "destructive"
      });
    }
  };

  const handleApproveLeave = async (requestId: string) => {
    const success = await approveLeaveRequest(requestId);
    if (success) {
      toast({
        title: "Leave Approved",
        description: "Leave request has been approved successfully",
      });
    }
  };

  const handleRejectLeave = async (requestId: string) => {
    const success = await rejectLeaveRequest(requestId);
    if (success) {
      toast({
        title: "Leave Rejected",
        description: "Leave request has been rejected",
      });
    }
  };

  const getAttendanceStatus = () => {
    if (!todayAttendance) return { status: 'Not Checked In', color: 'text-gray-500', icon: XCircle };
    if (todayAttendance.check_in_time && !todayAttendance.check_out_time) {
      return { status: 'Checked In', color: 'text-green-500', icon: CheckCircle };
    }
    if (todayAttendance.check_in_time && todayAttendance.check_out_time) {
      return { status: 'Checked Out', color: 'text-blue-500', icon: Clock };
    }
    return { status: 'Not Checked In', color: 'text-gray-500', icon: XCircle };
  };

  const totalLeaveBalance = leaveBalances.reduce((total, balance) => total + (balance.allocated_days - balance.used_days), 0);
  const pendingLeaveRequests = leaveRequests.filter(req => req.status === 'pending').length;

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'admin': return 'Admin';
      case 'reporting_manager': return 'Manager';
      case 'employee': return 'Employee';
      default: return role;
    }
  };

  const attendanceStatus = getAttendanceStatus();
  const StatusIcon = attendanceStatus.icon;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="glass-effect rounded-2xl p-6 border">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex-1">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4">
              Welcome back, {user?.name}! 👋
            </h1>
            
            {/* Digital Clock Display - Improved Alignment */}
            <div className="flex items-center space-x-4 mb-4">
              <div className="flex items-center justify-center w-16 h-16 bg-blue-50 rounded-full border-2 border-blue-200">
                <Clock className="w-8 h-8 text-blue-600 animate-pulse" />
              </div>
              <div className="flex flex-col">
                <span className="text-3xl lg:text-4xl font-mono font-bold text-blue-800 tracking-wider leading-none">
                  {currentTime}
                </span>
                <p className="text-gray-600 text-sm mt-1">{currentDate}</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <ShieldCheck className="w-4 h-4 text-blue-500 mr-2" />
              <span className="text-sm font-medium text-blue-600">{getRoleDisplayName(user?.role || 'employee')}</span>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              className="gradient-primary text-white border-0"
              onClick={handleCheckInOut}
              disabled={attendanceLoading}
            >
              <Clock className="w-4 h-4 mr-2" />
              {todayAttendance?.check_in_time && !todayAttendance?.check_out_time ? 'Check Out' : 'Check In'}
            </Button>
            <Button variant="outline" onClick={() => onNavigate?.('leave')}>
              <Calendar className="w-4 h-4 mr-2" />
              Request Leave
            </Button>
            <Button variant="outline" onClick={handleResetPassword}>
              <Key className="w-4 h-4 mr-2" />
              Reset Password
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-hover border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Today's Status</p>
                <div className="flex items-center mt-2">
                  <StatusIcon className={`w-5 h-5 mr-2 ${attendanceStatus.color}`} />
                  <span className="text-lg font-bold text-gray-900">{attendanceStatus.status}</span>
                </div>
                {todayAttendance?.check_in_time && (
                  <p className="text-sm text-gray-500 mt-1">
                    at {new Date(todayAttendance.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Working Hours</p>
                <div className="flex items-center mt-2">
                  <Clock className="w-5 h-5 text-blue-500 mr-2" />
                  <span className="text-lg font-bold text-gray-900">
                    {todayAttendance?.check_in_time && todayAttendance?.check_out_time 
                      ? `${Math.round((new Date(todayAttendance.check_out_time).getTime() - new Date(todayAttendance.check_in_time).getTime()) / (1000 * 60 * 60) * 10) / 10}h`
                      : todayAttendance?.check_in_time 
                      ? `${Math.round((new Date().getTime() - new Date(todayAttendance.check_in_time).getTime()) / (1000 * 60 * 60) * 10) / 10}h`
                      : '0h'
                    }
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">Today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Leave Balance</p>
                <div className="flex items-center mt-2">
                  <Calendar className="w-5 h-5 text-purple-500 mr-2" />
                  <span className="text-lg font-bold text-gray-900">{totalLeaveBalance} days</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">Remaining</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Requests</p>
                <div className="flex items-center mt-2">
                  <AlertCircle className="w-5 h-5 text-orange-500 mr-2" />
                  <span className="text-lg font-bold text-gray-900">{pendingLeaveRequests}</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">Leave request(s)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="w-5 h-5 mr-2 text-blue-600" />
              Recent Attendance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentAttendance.slice(0, 4).map((record, index) => (
              <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    record.status === 'present' ? 'bg-green-500' : 
                    record.status === 'holiday' ? 'bg-blue-500' : 'bg-red-500'
                  }`} />
                  <span className="font-medium">
                    {index === 0 ? 'Today' : new Date(record.date).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-right text-sm text-gray-600">
                  <p>
                    {record.check_in_time 
                      ? new Date(record.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '-'
                    } - {record.check_out_time 
                      ? new Date(record.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : index === 0 && record.check_in_time ? 'Active' : '-'
                    }
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-purple-600" />
              Leave Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {leaveRequests.slice(0, 3).map((request) => (
              <div key={request.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">
                    {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-600">
                    {request.leave_types.name} • {request.total_days} day(s)
                  </p>
                </div>
                <Badge variant={
                  request.status === 'approved' ? 'default' : 
                  request.status === 'pending' ? 'secondary' : 'destructive'
                }>
                  {request.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Admin/Manager Specific Section - Pending Leave Requests */}
      {['reporting_manager', 'admin', 'super_admin'].includes(user?.role || '') && pendingRequests.length > 0 && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 text-orange-600" />
              Team Leave Requests Pending Approval
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingRequests.slice(0, 3).map((request) => (
              <div key={request.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{request.employees.name}</p>
                  <p className="text-sm text-gray-600">
                    {request.leave_types.name} • {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()} • {request.total_days} day(s)
                  </p>
                  <p className="text-sm text-gray-500 mt-1">{request.reason}</p>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    className="gradient-primary text-white border-0"
                    onClick={() => handleApproveLeave(request.id)}
                    disabled={leaveLoading}
                  >
                    Approve
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleRejectLeave(request.id)}
                    disabled={leaveLoading}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
            {pendingRequests.length > 3 && (
              <div className="text-center">
                <Button variant="outline" onClick={() => onNavigate?.('leave-management')}>
                  View All Pending Requests ({pendingRequests.length})
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Access for Admins/Managers */}
      {['admin', 'super_admin'].includes(user?.role || '') && (
        <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2 text-blue-600" />
              Quick Admin Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                variant="outline" 
                className="justify-start"
                onClick={() => onNavigate?.('employees')}
              >
                <Users className="w-4 h-4 mr-2" />
                Manage Employees
              </Button>
              <Button 
                variant="outline" 
                className="justify-start"
                onClick={() => onNavigate?.('leave-management')}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Leave Management
              </Button>
              <Button 
                variant="outline" 
                className="justify-start"
                onClick={() => onNavigate?.('reports')}
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                View Reports
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
