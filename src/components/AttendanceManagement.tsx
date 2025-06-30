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
import * as XLSX from 'xlsx';
import { useCompany } from '@/contexts/CompanyContext';
import { useTheme } from '@/contexts/ThemeContext';
import { THEME_OPTIONS } from '@/contexts/ThemeContext';

const AttendanceManagement: React.FC = () => {
  const { user } = useAuth();
  const { todayAttendance, recentAttendance, checkIn, checkOut, isLoading } = useAttendance();
  const { employees, isLoading: isEmployeesLoading, fetchEmployees } = useEmployees();
  const { currentCompany } = useCompany();
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
  const { theme } = useTheme();
  const themeClass = THEME_OPTIONS.find(t => t.key === theme)?.className || '';

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
        return <Badge className="bg-primary text-primary flex items-center gap-1"><CheckCircle className="w-4 h-4 mr-1" /> Present</Badge>;
      case 'absent':
        return <Badge className="bg-destructive text-destructive flex items-center gap-1"><XCircle className="w-4 h-4 mr-1" /> Absent</Badge>;
      case 'late':
        return <Badge className="bg-warning text-warning flex items-center gap-1"><Clock className="w-4 h-4 mr-1" /> Late</Badge>;
      case 'half_day':
        return <Badge className="bg-secondary text-secondary flex items-center gap-1"><Circle className="w-4 h-4 mr-1" /> Half Day</Badge>;
      default:
        return <Badge className="bg-muted text-muted flex items-center gap-1"><HelpCircle className="w-4 h-4 mr-1" /> Not Marked</Badge>;
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
    if (!currentCompany) return;
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
          company_id: currentCompany.id,
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
      if (!user || (user.role !== 'admin' && user.role !== 'super_admin') || !currentCompany) return;
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('attendance')
        .select('employee_id, status, date')
        .eq('date', today)
        .eq('company_id', currentCompany.id);
      if (!error && data) {
        const map: Record<string, string> = {};
        data.forEach((rec: any) => {
          map[rec.employee_id] = rec.status;
        });
        setTodayAttendanceMap(map);
      }
    };
    fetchAllTodayAttendance();
  }, [user, employees, currentCompany]);

  // Fetch pending approvals (for admins/super admins)
  useEffect(() => {
    const fetchPending = async () => {
      if (!user || (user.role !== 'admin' && user.role !== 'super_admin') || !currentCompany) return;
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('pending_approval', true)
        .eq('company_id', currentCompany.id);
      if (!error && data) setPendingEntries(data);
    };
    fetchPending();
  }, [user, showBackdateModal, currentCompany]);

  // Helper to determine if the current user can approve a request
  const canApproveRequest = (requestorRole) => {
    if (!user) return false;
    if (requestorRole === 'super_admin') return false; // auto-approved
    if (['admin', 'reporting_manager', 'employee'].includes(requestorRole)) {
      if (user.role === 'super_admin') return true;
      if (requestorRole === 'employee' && (user.role === 'admin' || user.role === 'reporting_manager')) return true;
    }
    return false;
  };

  // Auto-approve if requestor is super_admin
  useEffect(() => {
    if (pendingEntries && pendingEntries.length > 0 && user?.role === 'super_admin') {
      pendingEntries.forEach(async (entry) => {
        if (entry.requestor_role === 'super_admin' && entry.pending_approval) {
          await supabase.from('attendance').update({ pending_approval: false }).eq('id', entry.id);
        }
      });
    }
  }, [pendingEntries, user]);

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
      if (!backdateForm.employeeId || !backdateForm.date || !backdateForm.status || !currentCompany) return;
      if (backdateForm.type === 'attendance') {
        await supabase.from('attendance').upsert({
          employee_id: backdateForm.employeeId,
          company_id: currentCompany.id,
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
      if (!user || (user.role !== 'admin' && user.role !== 'super_admin') || !currentCompany) return;
      const dateStr = selectedDate.toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('attendance')
        .select('employee_id, status, date')
        .eq('date', dateStr)
        .eq('company_id', currentCompany.id);
      if (!error && data) {
        const map: Record<string, string> = {};
        data.forEach((rec: any) => {
          map[rec.employee_id] = rec.status;
        });
        setDateAttendanceMap(map);
      }
    };
    fetchAllAttendance();
  }, [user, employees, selectedDate, currentCompany]);

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
    if (user?.role === 'employee' && currentCompany) {
      const fetchEmployeeAttendance = async () => {
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 29);
        const { data, error } = await supabase
          .from('attendance')
          .select('*')
          .eq('employee_id', user.id)
          .eq('company_id', currentCompany.id)
          .gte('date', fromDate.toISOString().split('T')[0])
          .order('date', { ascending: false });
        if (!error && data) setEmployeeAttendance(data);
      };
      fetchEmployeeAttendance();
    }
  }, [user, todayAttendance, currentCompany]);

  const exportAttendanceReport = async () => {
    try {
      const { data: attendanceData, error } = await supabase
        .from('attendance')
        .select(`*, employees ( name, email, department, position )`)
        .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .eq('company_id', currentCompany.id)
        .order('date', { ascending: false });

      if (error) {
        toast({
          title: "Export Failed",
          description: "Failed to fetch attendance data",
          variant: "destructive"
        });
        return;
      }

      const exportData = attendanceData.map(record => ({
        'Date': record.date,
        'Employee Name': record.employees?.name || 'Unknown',
        'Email': record.employees?.email || 'Unknown',
        'Department': record.employees?.department || 'Unknown',
        'Position': record.employees?.position || 'Unknown',
        'Status': record.status,
        'Check In': record.check_in_time ? format(new Date(record.check_in_time), 'HH:mm') : '-',
        'Check Out': record.check_out_time ? format(new Date(record.check_out_time), 'HH:mm') : '-',
        'Working Hours': record.check_in_time && record.check_out_time 
          ? calculateWorkingHours(record.check_in_time, record.check_out_time) 
          : '-',
        'Notes': record.notes || '-'
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'AttendanceReport');
      XLSX.writeFile(wb, `attendance_report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);

      toast({
        title: "Export Successful",
        description: "Attendance report has been downloaded",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "An error occurred while exporting the report",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-8">
      {(!user || (user.role !== 'admin' && user.role !== 'super_admin')) ? (
        <div className="p-8 text-center text-gray-500">
          Attendance management is only available to admins and super admins.
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Attendance Management</h1>
            <Button variant="outline" onClick={exportAttendanceReport}>
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

          {/* Pending Approvals Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Pending Approvals</h2>
            {pendingEntries.length === 0 ? (
              <div className="text-gray-500">No pending approvals.</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200 mb-4">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left">Employee</th>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingEntries.map((entry) => {
                    const employee = employees.find(e => e.id === entry.employee_id);
                    const canApprove = canApproveRequest(entry.requestor_role);
                    return (
                      <tr key={entry.id} className="border-b bg-gray-50 hover:bg-gray-100 transition-colors">
                        <td className="px-4 py-2 font-medium text-gray-900">{employee ? employee.name : <span className="italic text-gray-400">Unknown</span>}</td>
                        <td className="px-4 py-2 text-gray-700">{entry.date}</td>
                        <td className="px-4 py-2">{getStatusBadge(entry.status)}</td>
                        <td className="px-4 py-2 flex gap-2">
                          <div className="relative group">
                            <Button
                              size="sm"
                              onClick={() => handleApprove(entry.id)}
                              className="bg-green-600 hover:bg-green-700 text-white shadow rounded-md border border-green-700 focus:ring-2 focus:ring-green-400 focus:outline-none transition"
                              disabled={!canApprove}
                            >
                              Approve
                            </Button>
                            {!canApprove && (
                              <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 w-max px-2 py-1 text-xs bg-gray-800 text-white rounded shadow opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
                                You do not have permission to approve this request
                              </span>
                            )}
                          </div>
                          <div className="relative group">
                            <Button
                              size="sm"
                              onClick={() => handleReject(entry.id)}
                              className="bg-red-600 hover:bg-red-700 text-white shadow rounded-md border border-red-700 focus:ring-2 focus:ring-red-400 focus:outline-none transition"
                              disabled={!canApprove}
                            >
                              Reject
                            </Button>
                            {!canApprove && (
                              <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 w-max px-2 py-1 text-xs bg-gray-800 text-white rounded shadow opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
                                You do not have permission to reject this request
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Employee Attendance List Section */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <h2 className="text-xl font-semibold">Employee Attendance</h2>
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Date:</span>
                <DatePicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => setSelectedDate(date as Date)}
                  className="rounded border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-400"
                  max={new Date()}
                />
              </div>
            </div>
            <table className="min-w-full divide-y divide-gray-200 mb-4">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left">Employee</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Mark</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id} className="border-b">
                    <td className="px-4 py-2">{emp.name}</td>
                    <td className="px-4 py-2">{getStatusBadge(dateAttendanceMap[emp.id])}</td>
                    <td className="px-4 py-2 flex gap-2">
                      <Button
                        size="sm"
                        className={`bg-green-600 hover:bg-green-700 text-white rounded shadow focus:ring-2 focus:ring-green-400 ${dateAttendanceMap[emp.id]==='present' ? 'ring-2 ring-green-500' : ''}`}
                        onClick={() => markAttendanceForEmployee(emp.id, 'present')}
                      >
                        Present
                      </Button>
                      <Button
                        size="sm"
                        className={`bg-red-600 hover:bg-red-700 text-white rounded shadow focus:ring-2 focus:ring-red-400 ${dateAttendanceMap[emp.id]==='absent' ? 'ring-2 ring-red-500' : ''}`}
                        onClick={() => markAttendanceForEmployee(emp.id, 'absent')}
                      >
                        Absent
                      </Button>
                      <Button
                        size="sm"
                        className={`bg-yellow-500 hover:bg-yellow-600 text-white rounded shadow focus:ring-2 focus:ring-yellow-300 ${dateAttendanceMap[emp.id]==='late' ? 'ring-2 ring-yellow-500' : ''}`}
                        onClick={() => markAttendanceForEmployee(emp.id, 'late')}
                      >
                        Late
                      </Button>
                      <Button
                        size="sm"
                        className={`bg-blue-600 hover:bg-blue-700 text-white rounded shadow focus:ring-2 focus:ring-blue-400 ${dateAttendanceMap[emp.id]==='half_day' ? 'ring-2 ring-blue-500' : ''}`}
                        onClick={() => markAttendanceForEmployee(emp.id, 'half_day')}
                      >
                        Half Day
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Status Change Modal and Backdate Modal can be added here if needed */}
                  </>
                )}
    </div>
  );
};

export default AttendanceManagement;
