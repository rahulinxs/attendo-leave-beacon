import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAttendance } from '@/hooks/useAttendance';
import { useEmployees } from '@/hooks/useEmployees';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, MapPin, User, TrendingUp, Download, CheckCircle, XCircle, CalendarIcon, Circle, HelpCircle, Edit, Crown, Users } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import AttendanceCalendar from './AttendanceCalendar';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Calendar as DatePicker } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';

const AttendanceManagement: React.FC = () => {
  const { user } = useAuth();
  const { todayAttendance, recentAttendance, checkIn, checkOut, isLoading } = useAttendance();
  const { employees, isLoading: isEmployeesLoading, fetchEmployees } = useEmployees();
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [marking, setMarking] = useState<string | null>(null);
  const [todayAttendanceMap, setTodayAttendanceMap] = useState<Record<string, string>>({});
  const [showBackdateModal, setShowBackdateModal] = useState(false);
  const [showStatusChangeModal, setShowStatusChangeModal] = useState(false);
  const [statusChangeForm, setStatusChangeForm] = useState({
    employeeId: '',
    employeeName: '',
    currentStatus: '',
    newStatus: '',
    date: '',
    reason: ''
  });
  const [backdateForm, setBackdateForm] = useState({
    employeeId: '',
    date: '',
    type: 'attendance',
    status: '',
  });
  const [submittingBackdate, setSubmittingBackdate] = useState(false);
  const [submittingStatusChange, setSubmittingStatusChange] = useState(false);
  const [pendingEntries, setPendingEntries] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dateAttendanceMap, setDateAttendanceMap] = useState<Record<string, string>>({});
  const [employeeAttendance, setEmployeeAttendance] = useState<any[]>([]);
  const [employeeTab, setEmployeeTab] = useState('today');
  const [backdateRequest, setBackdateRequest] = useState({ date: '', status: '', reason: '' });
  const [submittingBackdateRequest, setSubmittingBackdateRequest] = useState(false);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.log('Location error:', error);
          setLocation(null);
        }
      );
    }
  };

  const handleCheckIn = async () => {
    getCurrentLocation();
    const success = await checkIn();
    if (success) {
      toast({
        title: "Check-in Successful",
        description: `Checked in at ${format(new Date(), 'HH:mm')}`,
      });
    } else {
      toast({
        title: "Check-in Failed",
        description: "Unable to check in. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleCheckOut = async () => {
    getCurrentLocation();
    const success = await checkOut();
    if (success) {
      toast({
        title: "Check-out Successful",
        description: `Checked out at ${format(new Date(), 'HH:mm')}`,
      });
    } else {
      toast({
        title: "Check-out Failed",
        description: "Unable to check out. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string | undefined) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-green-500 text-white flex items-center gap-1"><CheckCircle className="w-4 h-4 mr-1" /> Present</Badge>;
      case 'absent':
        return <Badge className="bg-red-500 text-white flex items-center gap-1"><XCircle className="w-4 h-4 mr-1" /> Absent</Badge>;
      case 'late':
        return <Badge className="bg-yellow-500 text-white flex items-center gap-1"><Clock className="w-4 h-4 mr-1" /> Late</Badge>;
      case 'half_day':
        return <Badge className="bg-blue-500 text-white flex items-center gap-1"><Circle className="w-4 h-4 mr-1" /> Half Day</Badge>;
      default:
        return <Badge className="bg-gray-400 text-white flex items-center gap-1"><HelpCircle className="w-4 h-4 mr-1" /> Not Marked</Badge>;
    }
  };

  const calculateWorkingHours = (checkIn?: string | null, checkOut?: string | null) => {
    if (!checkIn) return '0h 0m';
    const startTime = new Date(checkIn);
    const endTime = checkOut ? new Date(checkOut) : new Date();
    const diffMs = endTime.getTime() - startTime.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const getWorkingHours = () => {
    if (!todayAttendance?.check_in_time) return '0h 0m';
    const startTime = new Date(todayAttendance.check_in_time);
    const endTime = todayAttendance.check_out_time ? new Date(todayAttendance.check_out_time) : new Date();
    const diffMs = endTime.getTime() - startTime.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const isCheckedIn = todayAttendance?.check_in_time && !todayAttendance?.check_out_time;
  const isCheckedOut = todayAttendance?.check_in_time && todayAttendance?.check_out_time;

  const markAttendanceForEmployee = async (employeeId: string, status: 'present' | 'absent' | 'late' | 'half_day') => {
    setMarking(employeeId + status);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const now = new Date().toISOString();
      let updateObj: any = { status };
      if (status === 'present' || status === 'late' || status === 'half_day') {
        updateObj.check_in_time = now;
      } else {
        updateObj.check_in_time = null;
        updateObj.check_out_time = null;
      }
      const { error } = await supabase
        .from('attendance')
        .upsert({
          employee_id: employeeId,
          date: dateStr,
          ...updateObj,
        });
      if (error) {
        toast({ title: 'Error', description: 'Failed to mark attendance', variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: 'Attendance marked' });
        setDateAttendanceMap((prev) => ({ ...prev, [employeeId]: status }));
      }
    } catch (e) {
      toast({ title: 'Error', description: 'Unexpected error', variant: 'destructive' });
    } finally {
      setMarking(null);
    }
  };

  // Fetch today's attendance for all employees (for admin view)
  useEffect(() => {
    const fetchAllTodayAttendance = async () => {
      if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) return;
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('attendance')
        .select('employee_id, status, date')
        .eq('date', today);
      if (!error && data) {
        const map: Record<string, string> = {};
        data.forEach((rec: any) => {
          map[rec.employee_id] = rec.status;
        });
        setTodayAttendanceMap(map);
      }
    };
    fetchAllTodayAttendance();
  }, [user, employees]);

  // Fetch pending approvals (for admins/super admins)
  useEffect(() => {
    const fetchPending = async () => {
      if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) return;
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('pending_approval', true);
      if (!error && data) setPendingEntries(data);
    };
    fetchPending();
  }, [user, showBackdateModal]);

  // Approve/reject handlers
  const handleApprove = async (id: string) => {
    await supabase.from('attendance').update({ pending_approval: false }).eq('id', id);
    setPendingEntries(pendingEntries.filter(e => e.id !== id));
    toast({ title: 'Entry approved' });
  };
  const handleReject = async (id: string) => {
    await supabase.from('attendance').delete().eq('id', id);
    setPendingEntries(pendingEntries.filter(e => e.id !== id));
    toast({ title: 'Entry rejected' });
  };

  // Handler for backdated entry
  const handleBackdateSubmit = async () => {
    setSubmittingBackdate(true);
    try {
      // For now, just upsert with a pending_approval flag
      if (!backdateForm.employeeId || !backdateForm.date || !backdateForm.status) return;
      if (backdateForm.type === 'attendance') {
        await supabase.from('attendance').upsert({
          employee_id: backdateForm.employeeId,
          date: backdateForm.date,
          status: backdateForm.status,
          pending_approval: true,
        });
      } else {
        // For leave, you may want to insert into a leave_requests table
        // Placeholder: toast({ title: 'Leave request submitted for approval' });
      }
      toast({ title: 'Submitted for approval' });
      setShowBackdateModal(false);
    } finally {
      setSubmittingBackdate(false);
    }
  };

  useEffect(() => {
    // When opening the modal, set employeeId to self for non-admins
    if (showBackdateModal && user && user.role === 'employee') {
      setBackdateForm(f => ({ ...f, employeeId: user.id }));
    }
  }, [showBackdateModal, user]);

  // Fetch attendance for selected date for all employees
  useEffect(() => {
    const fetchAllAttendance = async () => {
      if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) return;
      const dateStr = selectedDate.toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('attendance')
        .select('employee_id, status, date')
        .eq('date', dateStr);
      if (!error && data) {
        const map: Record<string, string> = {};
        data.forEach((rec: any) => {
          map[rec.employee_id] = rec.status;
        });
        setDateAttendanceMap(map);
      }
    };
    fetchAllAttendance();
  }, [user, employees, selectedDate]);

  const handleStatusChange = async () => {
    if (!statusChangeForm.employeeId || !statusChangeForm.newStatus || !statusChangeForm.date) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setSubmittingStatusChange(true);
    try {
      const now = new Date().toISOString();
      let updateObj: any = { 
        status: statusChangeForm.newStatus,
        updated_by: user?.id,
        updated_at: now,
        change_reason: statusChangeForm.reason || 'Status changed by super admin'
      };

      // Handle check-in/check-out times based on new status
      if (statusChangeForm.newStatus === 'present' || statusChangeForm.newStatus === 'late' || statusChangeForm.newStatus === 'half_day') {
        updateObj.check_in_time = now;
        if (statusChangeForm.newStatus === 'present' || statusChangeForm.newStatus === 'late') {
          updateObj.check_out_time = null; // Will be set when they check out
        }
      } else {
        updateObj.check_in_time = null;
        updateObj.check_out_time = null;
      }

      const { error } = await supabase
        .from('attendance')
        .upsert({
          employee_id: statusChangeForm.employeeId,
          date: statusChangeForm.date,
          ...updateObj,
        });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to change status",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: `Status changed from ${statusChangeForm.currentStatus} to ${statusChangeForm.newStatus}`,
        });
        setShowStatusChangeModal(false);
        setStatusChangeForm({
          employeeId: '',
          employeeName: '',
          currentStatus: '',
          newStatus: '',
          date: '',
          reason: ''
        });
        // Refresh attendance data
        const fetchAllAttendance = async () => {
          const dateStr = selectedDate.toISOString().split('T')[0];
          const { data, error } = await supabase
            .from('attendance')
            .select('employee_id, status, date')
            .eq('date', dateStr);
          if (!error && data) {
            const map: Record<string, string> = {};
            data.forEach((rec: any) => {
              map[rec.employee_id] = rec.status;
            });
            setDateAttendanceMap(map);
          }
        };
        fetchAllAttendance();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setSubmittingStatusChange(false);
    }
  };

  const openStatusChangeModal = (employeeId: string, employeeName: string, currentStatus: string, date: string) => {
    setStatusChangeForm({
      employeeId,
      employeeName,
      currentStatus,
      newStatus: '',
      date,
      reason: ''
    });
    setShowStatusChangeModal(true);
  };

  // Fetch last 30 days attendance for employee
  useEffect(() => {
    if (user?.role === 'employee') {
      const fetchEmployeeAttendance = async () => {
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 29);
        const { data, error } = await supabase
          .from('attendance')
          .select('*')
          .eq('employee_id', user.id)
          .gte('date', fromDate.toISOString().split('T')[0])
          .order('date', { ascending: false });
        if (!error && data) setEmployeeAttendance(data);
      };
      fetchEmployeeAttendance();
    }
  }, [user, todayAttendance]);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">
          {user?.role === 'employee' ? 'My Attendance' : 'Attendance Management'}
        </h1>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Employee Tabs */}
      {user?.role === 'employee' && (
        <Tabs value={employeeTab} onValueChange={setEmployeeTab} className="w-full mb-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="backdate">Backdate</TabsTrigger>
          </TabsList>

          {/* Today Tab */}
          <TabsContent value="today">
            {/* Quick Attendance Widget (existing) */}
            <div>
              <h2 className="text-xl font-semibold mb-2">Your Attendance</h2>
              <Card className="border-2 border-blue-200 bg-blue-50">
                <CardHeader className="text-center">
                  <CardTitle className="flex items-center justify-center space-x-2 text-blue-800">
                    <Clock className="w-6 h-6" />
                    <span>Quick Attendance</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Status Display (existing) */}
                  <div className="text-center">
                    {!todayAttendance?.check_in_time ? (
                      <div className="flex flex-col items-center space-y-2">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                          <Clock className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-gray-600">Not checked in today</p>
                      </div>
                    ) : isCheckedIn ? (
                      <div className="flex flex-col items-center space-y-2">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-8 h-8 text-green-600" />
                        </div>
                        <p className="text-green-600 font-semibold">Checked In</p>
                        <p className="text-sm text-gray-600">
                          Since {format(new Date(todayAttendance.check_in_time), 'HH:mm')}
                        </p>
                        <p className="text-sm font-medium">Working: {getWorkingHours()}</p>
                      </div>
                    ) : isCheckedOut ? (
                      <div className="flex flex-col items-center space-y-2">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                          <XCircle className="w-8 h-8 text-blue-600" />
                        </div>
                        <p className="text-blue-600 font-semibold">Day Completed</p>
                        <p className="text-sm text-gray-600">
                          {format(new Date(todayAttendance.check_in_time), 'HH:mm')} - {format(new Date(todayAttendance.check_out_time), 'HH:mm')}
                        </p>
                        <p className="text-sm font-medium">Total: {getWorkingHours()}</p>
                      </div>
                    ) : null}
                  </div>
                  {/* Action Button (existing) */}
                  <div className="text-center">
                    {!todayAttendance?.check_in_time ? (
                      <Button
                        onClick={handleCheckIn}
                        disabled={isLoading}
                        className="w-full gradient-primary text-white"
                        size="lg"
                      >
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Check In
                      </Button>
                    ) : isCheckedIn ? (
                      <Button
                        onClick={handleCheckOut}
                        disabled={isLoading}
                        className="w-full bg-red-600 hover:bg-red-700 text-white"
                        size="lg"
                      >
                        <XCircle className="w-5 h-5 mr-2" />
                        Check Out
                      </Button>
                    ) : (
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-gray-600 text-sm">You have completed your day</p>
                      </div>
                    )}
                  </div>
                  {/* Location Info (existing) */}
                  {location && (
                    <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                      <MapPin className="w-4 h-4" />
                      <span>Location recorded</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Calendar Tab */}
          <TabsContent value="calendar">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5" />
                  Attendance Calendar (Last 30 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AttendanceCalendar attendanceData={employeeAttendance} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Attendance History (Last 30 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-2 text-left">Date</th>
                        <th className="px-4 py-2 text-left">Status</th>
                        <th className="px-4 py-2 text-left">Check In</th>
                        <th className="px-4 py-2 text-left">Check Out</th>
                        <th className="px-4 py-2 text-left">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employeeAttendance.map((rec) => (
                        <tr key={rec.date} className="border-b">
                          <td className="px-4 py-2">{format(new Date(rec.date), 'MMM dd, yyyy')}</td>
                          <td className="px-4 py-2">{getStatusBadge(rec.status)}</td>
                          <td className="px-4 py-2">{rec.check_in_time ? format(new Date(rec.check_in_time), 'HH:mm') : '-'}</td>
                          <td className="px-4 py-2">{rec.check_out_time ? format(new Date(rec.check_out_time), 'HH:mm') : '-'}</td>
                          <td className="px-4 py-2">{rec.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Backdate Tab */}
          <TabsContent value="backdate">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Edit className="w-5 h-5" />
                  Request Backdated Attendance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setSubmittingBackdateRequest(true);
                    try {
                      if (!backdateRequest.date || !backdateRequest.status) {
                        toast({ title: 'Error', description: 'Date and status are required', variant: 'destructive' });
                        return;
                      }
                      await supabase.from('attendance').upsert({
                        employee_id: user.id,
                        date: backdateRequest.date,
                        status: backdateRequest.status,
                        notes: backdateRequest.reason,
                        pending_approval: true,
                      });
                      toast({ title: 'Request Submitted', description: 'Your backdated attendance request has been submitted for approval.' });
                      setBackdateRequest({ date: '', status: '', reason: '' });
                    } finally {
                      setSubmittingBackdateRequest(false);
                    }
                  }}
                  className="space-y-4"
                >
                  <div>
                    <Label>Date</Label>
                    <Input type="date" value={backdateRequest.date} onChange={e => setBackdateRequest(r => ({ ...r, date: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={backdateRequest.status} onValueChange={v => setBackdateRequest(r => ({ ...r, status: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="present">Present</SelectItem>
                        <SelectItem value="absent">Absent</SelectItem>
                        <SelectItem value="late">Late</SelectItem>
                        <SelectItem value="half_day">Half Day</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Reason (optional)</Label>
                    <Input type="text" value={backdateRequest.reason} onChange={e => setBackdateRequest(r => ({ ...r, reason: e.target.value }))} placeholder="Reason for backdated entry" />
                  </div>
                  <Button type="submit" disabled={submittingBackdateRequest || !backdateRequest.date || !backdateRequest.status} className="w-full">
                    {submittingBackdateRequest ? 'Submitting...' : 'Submit Request'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Quick Attendance Widget (for admins/managers, fallback for employees) */}
      {user?.role !== 'employee' && (
        <div>
          <h2 className="text-xl font-semibold mb-2">Your Attendance</h2>
          <Card className="border-2 border-blue-200 bg-blue-50">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center space-x-2 text-blue-800">
                <Clock className="w-6 h-6" />
                <span>Quick Attendance</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Status Display */}
              <div className="text-center">
                {!todayAttendance?.check_in_time ? (
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                      <Clock className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-600">Not checked in today</p>
                  </div>
                ) : isCheckedIn ? (
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <p className="text-green-600 font-semibold">Checked In</p>
                    <p className="text-sm text-gray-600">
                      Since {format(new Date(todayAttendance.check_in_time), 'HH:mm')}
                    </p>
                    <p className="text-sm font-medium">Working: {getWorkingHours()}</p>
                  </div>
                ) : isCheckedOut ? (
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                      <XCircle className="w-8 h-8 text-blue-600" />
                    </div>
                    <p className="text-blue-600 font-semibold">Day Completed</p>
                    <p className="text-sm text-gray-600">
                      {format(new Date(todayAttendance.check_in_time), 'HH:mm')} - {format(new Date(todayAttendance.check_out_time), 'HH:mm')}
                    </p>
                    <p className="text-sm font-medium">Total: {getWorkingHours()}</p>
                  </div>
                ) : null}
              </div>

              {/* Action Button */}
              <div className="text-center">
                {!todayAttendance?.check_in_time ? (
                  <Button
                    onClick={handleCheckIn}
                    disabled={isLoading}
                    className="w-full gradient-primary text-white"
                    size="lg"
                  >
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Check In
                  </Button>
                ) : isCheckedIn ? (
                  <Button
                    onClick={handleCheckOut}
                    disabled={isLoading}
                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                    size="lg"
                  >
                    <XCircle className="w-5 h-5 mr-2" />
                    Check Out
                  </Button>
                ) : (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-gray-600 text-sm">You have completed your day</p>
                  </div>
                )}
              </div>

              {/* Location Info */}
              {location && (
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                  <MapPin className="w-4 h-4" />
                  <span>Location recorded</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Mark Attendance for Employees (admin/super admin) */}
      {user && (user.role === 'admin' || user.role === 'super_admin') && (
        <div>
          <h2 className="text-xl font-semibold mb-2">Mark Attendance for Employees</h2>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Employee Attendance
                </div>
                {user.role === 'super_admin' && (
                  <div className="flex items-center gap-2 text-sm text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
                    <Crown className="w-4 h-4" />
                    Super Admin - Full Control
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex flex-col items-start gap-2">
                <label className="font-medium">Select Date</label>
                <DatePicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={date => date && setSelectedDate(date)}
                  className="border rounded-md"
                />
              </div>

              {/* Super Admin Information */}
              {user.role === 'super_admin' && (
                <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Crown className="w-4 h-4 text-purple-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-purple-800 mb-1">Super Admin Privileges</p>
                      <p className="text-purple-700">
                        You can change any employee's attendance status from any status to any other status. 
                        Use the "Change Status" button for administrative corrections and data management.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left">Name</th>
                      <th className="px-4 py-2 text-left">Role</th>
                      <th className="px-4 py-2 text-left">Status</th>
                      <th className="px-4 py-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map(emp => {
                      const canMark =
                        user.role === 'super_admin' ||
                        (user.role === 'admin' && emp.role !== 'super_admin' && emp.id !== user.id);
                      const status = dateAttendanceMap[emp.id];
                      const dateStr = selectedDate.toISOString().split('T')[0];
                      return (
                        <tr key={emp.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-2 font-medium">{emp.name}</td>
                          <td className="px-4 py-2 capitalize">{emp.role.replace('_', ' ')}</td>
                          <td className="px-4 py-2">{getStatusBadge(status)}</td>
                          <td className="px-4 py-2 space-x-2">
                            {canMark ? (
                              <div className="flex flex-wrap gap-2">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  disabled={marking === emp.id+'present'} 
                                  onClick={() => markAttendanceForEmployee(emp.id, 'present')}
                                >
                                  Present
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  disabled={marking === emp.id+'absent'} 
                                  onClick={() => markAttendanceForEmployee(emp.id, 'absent')}
                                >
                                  Absent
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  disabled={marking === emp.id+'late'} 
                                  onClick={() => markAttendanceForEmployee(emp.id, 'late')}
                                >
                                  Late
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  disabled={marking === emp.id+'half_day'} 
                                  onClick={() => markAttendanceForEmployee(emp.id, 'half_day')}
                                >
                                  Half Day
                                </Button>
                                {/* Super Admin Change Status Button */}
                                {user.role === 'super_admin' && (
                                  <Button 
                                    size="sm" 
                                    variant="secondary"
                                    onClick={() => openStatusChangeModal(emp.id, emp.name, status || 'not_marked', dateStr)}
                                    className="bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-300"
                                  >
                                    <Edit className="w-3 h-3 mr-1" />
                                    Change Status
                                  </Button>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">No permission</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pending approvals for admins/super admins */}
      {user && (user.role === 'admin' || user.role === 'super_admin') && pendingEntries.length > 0 && (
        <Card className="mb-4">
              <CardHeader>
            <CardTitle>Pending Backdated Entries</CardTitle>
              </CardHeader>
              <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left">Employee</th>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingEntries.map(entry => (
                    <tr key={entry.id} className="border-b">
                      <td className="px-4 py-2">{employees.find(e => e.id === entry.employee_id)?.name || entry.employee_id}</td>
                      <td className="px-4 py-2">{entry.date}</td>
                      <td className="px-4 py-2">{getStatusBadge(entry.status)}</td>
                      <td className="px-4 py-2 space-x-2">
                        <Button size="sm" variant="secondary" onClick={() => handleApprove(entry.id)}>Approve</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleReject(entry.id)}>Reject</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
                </div>
              </CardContent>
            </Card>
          )}

      <Dialog open={showBackdateModal} onOpenChange={setShowBackdateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Backdated Attendance/Leave Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Only admins/super_admins can select employee; others default to self */}
            {user && (user.role === 'admin' || user.role === 'super_admin') ? (
              <div>
                <label className="block mb-1 font-medium">Employee</label>
                <Select value={backdateForm.employeeId} onValueChange={v => setBackdateForm(f => ({ ...f, employeeId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div>
              <label className="block mb-1 font-medium">Date</label>
              <Input type="date" value={backdateForm.date} onChange={e => setBackdateForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="block mb-1 font-medium">Type</label>
              <Select value={backdateForm.type} onValueChange={v => setBackdateForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /> </SelectTrigger>
                <SelectContent>
                  <SelectItem value="attendance">Attendance</SelectItem>
                  <SelectItem value="leave">Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block mb-1 font-medium">Status</label>
              <Select value={backdateForm.status} onValueChange={v => setBackdateForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  {backdateForm.type === 'attendance' ? (
                    <>
                      <SelectItem value="present">Present</SelectItem>
                      <SelectItem value="absent">Absent</SelectItem>
                      <SelectItem value="late">Late</SelectItem>
                      <SelectItem value="half_day">Half Day</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="leave">Leave</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleBackdateSubmit} disabled={submittingBackdate || !backdateForm.date || !backdateForm.status || (!backdateForm.employeeId && (user?.role === 'admin' || user?.role === 'super_admin'))} className="w-full">Submit for Approval</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={showStatusChangeModal} onOpenChange={setShowStatusChangeModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-purple-600" />
              Change Employee Status
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Employee Info Display */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{statusChangeForm.employeeName}</p>
                  <p className="text-sm text-gray-600">Employee</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    Current: {statusChangeForm.currentStatus ? statusChangeForm.currentStatus.replace('_', ' ').toUpperCase() : 'Not Marked'}
                  </p>
                  <p className="text-xs text-gray-500">Status</p>
                </div>
              </div>
            </div>

            {/* New Status Selection */}
            <div>
              <Label className="text-sm font-medium">Change Status To</Label>
              <Select 
                value={statusChangeForm.newStatus} 
                onValueChange={v => setStatusChangeForm(f => ({ ...f, newStatus: v }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Present
                    </div>
                  </SelectItem>
                  <SelectItem value="absent">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-600" />
                      Absent
                    </div>
                  </SelectItem>
                  <SelectItem value="late">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-yellow-600" />
                      Late
                    </div>
                  </SelectItem>
                  <SelectItem value="half_day">
                    <div className="flex items-center gap-2">
                      <Circle className="w-4 h-4 text-blue-600" />
                      Half Day
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Selection */}
            <div>
              <Label className="text-sm font-medium">Date</Label>
              <Input 
                type="date" 
                value={statusChangeForm.date} 
                onChange={e => setStatusChangeForm(f => ({ ...f, date: e.target.value }))}
                className="mt-1"
              />
            </div>

            {/* Reason for Change */}
            <div>
              <Label className="text-sm font-medium">Reason for Change (Optional)</Label>
              <Input 
                type="text" 
                value={statusChangeForm.reason} 
                onChange={e => setStatusChangeForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="e.g., Administrative correction, system error, etc."
                className="mt-1"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                onClick={() => setShowStatusChangeModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleStatusChange} 
                disabled={submittingStatusChange || !statusChangeForm.newStatus || !statusChangeForm.date}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                {submittingStatusChange ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Changing...
                  </>
                ) : (
                  <>
                    <Edit className="w-4 h-4 mr-2" />
                    Change Status
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AttendanceManagement;
