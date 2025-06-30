import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAttendance } from '@/hooks/useAttendance';
import { useLeave } from '@/hooks/useLeave';
import { useCompany } from '@/contexts/CompanyContext';
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
import { useTheme } from '@/contexts/ThemeContext';
import { THEME_OPTIONS } from '@/contexts/ThemeContext';

interface DashboardProps {
  onNavigate?: (tab: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { todayAttendance, recentAttendance, checkIn, checkOut, isLoading: attendanceLoading } = useAttendance();
  const { leaveRequests, leaveBalances, pendingRequests, approveLeaveRequest, rejectLeaveRequest, isLoading: leaveLoading } = useLeave('employee');
  const { currentCompany } = useCompany();
  const { theme } = useTheme();
  const themeClass = THEME_OPTIONS.find(t => t.key === theme)?.className || '';
  
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

  const totalLeaveBalance = (leaveBalances || []).reduce((total, balance) => total + (balance.allocated_days - balance.used_days), 0);
  const pendingLeaveRequests = (leaveRequests || []).filter(req => req.status === 'pending').length;

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
    <div className="min-h-screen w-full flex flex-col items-stretch justify-start" style={{ background: '#fff' }}>
      <div className={`max-w-7xl mx-auto mb-8 p-6 md:p-10 rounded-3xl shadow-xl space-y-4 ${themeClass}`} style={{ background: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}>
        {/* Welcome Header as Card */}
        <Card className={`${themeClass} card-theme rounded-2xl shadow p-4 mb-4`}>
          <CardContent className="p-0">
            {/* Welcome Header content START */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="text-lg font-bold mb-1">Welcome back, {user?.name}{currentCompany ? ` (${currentCompany.name})` : ''}</div>
                <div className="text-2xl font-bold text-primary mb-1">{currentTime}</div>
                <div className="text-muted-foreground mb-1">{currentDate}</div>
                <div className="text-purple-600 font-medium">{user?.position}</div>
              </div>
              <div className="flex flex-col md:flex-row gap-2 md:items-center">
                <button className="bg-primary text-primary-foreground px-6 py-2 rounded hover:bg-primary/80" onClick={handleCheckInOut}>{todayAttendance?.check_in_time && !todayAttendance?.check_out_time ? 'Check Out' : 'Check In'}</button>
                <button className="bg-background border border-border px-6 py-2 rounded hover:bg-accent" onClick={() => onNavigate?.('leave')}>Request Leave</button>
                <button className="bg-background border border-border px-6 py-2 rounded hover:bg-accent" onClick={handleResetPassword}>Reset Password</button>
              </div>
            </div>
            {/* Welcome Header content END */}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className={`${themeClass} card-theme card-hover border-0 shadow-lg`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Today's Status</p>
                  <div className="flex items-center mt-1">
                    <StatusIcon className={`w-5 h-5 mr-2 text-primary`} />
                    <span className="font-bold text-foreground">{attendanceStatus.status}</span>
                  </div>
                  {todayAttendance?.check_in_time && (
                    <p className="text-sm text-muted-foreground mt-1">
                      at {new Date(todayAttendance.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`${themeClass} card-theme card-hover border-0 shadow-lg`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Working Hours</p>
                  <div className="flex items-center mt-1">
                    <Clock className="w-5 h-5 text-primary mr-2" />
                    <span className="font-bold text-foreground">
                      {todayAttendance?.check_in_time && todayAttendance?.check_out_time 
                        ? `${Math.round((new Date(todayAttendance.check_out_time).getTime() - new Date(todayAttendance.check_in_time).getTime()) / (1000 * 60 * 60) * 10) / 10}h`
                        : todayAttendance?.check_in_time 
                        ? `${Math.round((new Date().getTime() - new Date(todayAttendance.check_in_time).getTime()) / (1000 * 60 * 60) * 10) / 10}h`
                        : '0h'
                      }
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Today</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`${themeClass} card-theme card-hover border-0 shadow-lg`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Leave Balance</p>
                  <div className="flex items-center mt-1">
                    <Calendar className="w-5 h-5 text-primary mr-2" />
                    <span className="font-bold text-foreground">{totalLeaveBalance} days</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Remaining</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`${themeClass} card-theme card-hover border-0 shadow-lg`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Requests</p>
                  <div className="flex items-center mt-1">
                    <AlertCircle className="w-5 h-5 text-primary mr-2" />
                    <span className="font-bold text-foreground">{pendingLeaveRequests}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Leave request(s)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className={`${themeClass} card-theme border-0 shadow-lg`}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-lg">
                <Clock className="w-5 h-5 mr-2 text-primary" />
                Recent Attendance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {((recentAttendance || []).slice(0, 4)).map((record, index) => (
                <div key={record.id} className="flex items-center justify-between p-2 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      record.status === 'present' ? 'bg-green-500' : 
                      record.status === 'holiday' ? 'bg-blue-500' : 'bg-red-500'
                    }`} />
                    <span className="font-medium">
                      {index === 0 ? 'Today' : new Date(record.date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
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

          <Card className={`${themeClass} card-theme border-0 shadow-lg`}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-lg">
                <Calendar className="w-5 h-5 mr-2 text-primary" />
                Leave Requests
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {((leaveRequests || []).slice(0, 3)).map((request) => (
                <div key={request.id} className="flex items-center justify-between p-2 rounded-lg">
                  <div>
                    <p className="font-medium">
                      {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
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
        {(['reporting_manager', 'admin', 'super_admin'].includes(user?.role || '') && ((pendingRequests || []).length > 0)) && (
          <Card className={`${themeClass} card-theme border-0 shadow-lg`}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-lg">
                <AlertCircle className="w-5 h-5 mr-2 text-primary" />
                Team Leave Requests Pending Approval
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {((pendingRequests || []).slice(0, 3)).map((request) => (
                <div key={request.id} className="flex items-center justify-between p-2 rounded-lg">
                  <div>
                    <p className="font-medium">{request.employees.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {request.leave_types.name} • {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()} • {request.total_days} day(s)
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">{request.reason}</p>
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
              {((pendingRequests || []).length > 3) && (
                <div className="text-center">
                  <Button variant="outline" onClick={() => onNavigate?.('leave-management')}>
                    View All Pending Requests ({(pendingRequests || []).length})
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quick Access for Admins/Managers */}
        {(['admin', 'super_admin'].includes(user?.role || '') && (
          <Card className={`${themeClass} card-theme border-0 shadow-lg`}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-lg">
                <Users className="w-5 h-5 mr-2 text-primary" />
                Quick Admin Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
