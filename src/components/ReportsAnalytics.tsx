import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Download, Users, Clock, TrendingUp, FileSpreadsheet, FileDown, CalendarIcon } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import * as XLSX from 'xlsx';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface DatabaseAttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  status: string;
  check_in_time: string | null;
  check_out_time: string | null;
  profiles: {
    name: string;
    team_id: string | null;
  } | null;
}

interface DatabaseLeaveRequest {
  id: string;
  employee_id: string | null;
  leave_type_id: string | null;
  start_date: string;
  end_date: string;
  total_days: number;
  status: string | null;
  reason: string | null;
  admin_comments: string | null;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  leave_types?: {
    id: string;
    name: string;
  };
  profiles?: {
    name: string;
    team_id: string | null;
  };
}

interface DatabaseProfile {
  id: string;
  name: string;
  email: string;
  team_id: string | null;
  role: string;
  position: string;
}

interface RawData {
  attendance: DatabaseAttendanceRecord[];
  leaves: DatabaseLeaveRequest[];
  employees: DatabaseProfile[];
}

interface AttendanceStats {
  present: number;
  absent: number;
  late: number;
  total: number;
}

interface LeaveStats {
  annual: number;
  sick: number;
  unpaid: number;
  other: number;
  total: number;
}

interface DepartmentStats {
  team_id: string | null;
  attendance_rate: number;
  leave_rate: number;
}

interface DailyAttendanceRecord {
  employeeId: string;
  date: string;
  employeeName: string;
  team_id: string | null;
  status: string;
  checkIn: string | null;
  checkOut: string | null;
  leaveType?: string;
}

interface EmployeeDetail {
  id: string;
  name: string;
  email: string;
  team_id: string | null;
  position: string;
  attendanceHistory: {
    date: string;
    status: string;
    checkIn?: string;
    checkOut?: string;
    leaveType?: string;
  }[];
}

const ReportsAnalytics = () => {
  const { currentCompany } = useCompany();
  console.log('[DEBUG] ReportsAnalytics render, currentCompany:', currentCompany);
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('attendance');
  const [timeRange, setTimeRange] = useState('month');
  const [team, setTeam] = useState('all');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null);
  const [leaveStats, setLeaveStats] = useState<LeaveStats | null>(null);
  const [departmentStats, setDepartmentStats] = useState<DepartmentStats[]>([]);
  const [rawData, setRawData] = useState<RawData>({ attendance: [], leaves: [], employees: [] });
  const [dailyAttendance, setDailyAttendance] = useState<DailyAttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'absent' | 'late' | 'leave'>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeDetail | null>(null);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [leaveTypeFilter, setLeaveTypeFilter] = useState<string>('all');
  const [leaveTypes, setLeaveTypes] = useState<{ id: string; name: string }[]>([]);
  const [leaveDateRange, setLeaveDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [leaveSearch, setLeaveSearch] = useState('');
  const [lateMarkTime, setLateMarkTime] = useState('09:30');
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);

  const filteredEmployees = team === 'all'
    ? rawData.employees
    : rawData.employees.filter(emp => emp.team_id === team);

  console.log('[DEBUG] Selected team:', team);
  console.log('[DEBUG] rawData.employees:', rawData.employees, rawData.employees.length);
  console.log('[DEBUG] Available team IDs:', teams.map(t => t.id));

  useEffect(() => {
    if (!currentCompany || !currentCompany.id) return;
    fetchData();
    fetchDailyAttendance();
    const fetchLateMarkTime = async () => {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'late_mark_time')
          .single();
        if (!error && data?.value) {
          setLateMarkTime(data.value);
        }
      } catch (error) {
        console.log('Using default late mark time: 09:30');
      }
    };
    fetchLateMarkTime();
  }, [activeTab, timeRange, team, selectedDate, currentCompany]);

  useEffect(() => {
    const fetchLeaveTypes = async () => {
      try {
        const { data, error } = await supabase
          .from('leave_types')
          .select('*')
          .eq('company_id', currentCompany?.id);

        if (!error && data) {
          setLeaveTypes(data);
        }
      } catch (error) {
        console.error('Error fetching leave types:', error);
      }
    };
    fetchLeaveTypes();
  }, [currentCompany]);

  useEffect(() => {
    if (!currentCompany) return;
    const fetchTeams = async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .eq('company_id', currentCompany.id)
        .eq('is_active', true)
        .order('name');
      if (!error && data) setTeams(data);
    };
    fetchTeams();
  }, [currentCompany]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      await Promise.all([
        fetchAttendanceStats(),
        fetchLeaveStats(),
        fetchDepartmentStats(),
        fetchRawData()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch report data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRawData = async () => {
    console.log('[DEBUG] fetchRawData called', currentCompany);
    if (!currentCompany || !currentCompany.id) {
      console.log('[DEBUG] fetchRawData: currentCompany not set', currentCompany);
      return;
    }
    
    try {
      const dateRange = getDateRange(timeRange);
      
      // Fetch attendance with proper join
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select(`
          *,
          profiles!employee_id(name, team_id, role)
        `)
        .eq('company_id', currentCompany.id)
        .gte('date', dateRange.start)
        .lte('date', dateRange.end);

      if (attendanceError) {
        console.error('Error fetching attendance:', attendanceError);
        throw attendanceError;
      }

      // Fetch leaves with proper join
      const { data: leavesData, error: leavesError } = await supabase
        .from('leave_requests')
        .select(`
          *,
          leave_types!leave_type_id(id, name),
          profiles!employee_id(name, team_id, role)
        `)
        .eq('company_id', currentCompany.id)
        .gte('start_date', dateRange.start)
        .lte('end_date', dateRange.end);

      if (leavesError) {
        console.error('Error fetching leaves:', leavesError);
        throw leavesError;
      }

      // Fetch employees
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('id, name, email, team_id, position, role')
        .eq('company_id', currentCompany.id)
        .eq('is_active', true)
        .order('name');

      console.log('[DEBUG] fetchRawData: employeesData', employeesData, employeesError);

      if (employeesError) {
        console.error('Error fetching employees:', employeesError);
        throw employeesError;
      }

      // Filter by team if needed
      const filteredData: RawData = {
        attendance: (attendanceData || []).filter(record => 
          team === 'all' || record.profiles?.team_id === team
        ),
        leaves: (leavesData || []).filter(record =>
          team === 'all' || record.profiles?.team_id === team
        ),
        employees: (employeesData || []).filter(employee =>
          team === 'all' || employee.team_id === team
        )
      };

      setRawData(filteredData);
      console.log('[DEBUG] fetchRawData: setRawData', filteredData);
    } catch (error) {
      console.error('Error in fetchRawData:', error);
      toast({
        title: "Error",
        description: "Failed to fetch report data",
        variant: "destructive"
      });
    }
  };

  const fetchAttendanceStats = async () => {
    if (!currentCompany) return;
    
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          *,
          profiles!employee_id(team_id, role)
        `)
        .eq('company_id', currentCompany.id)
        .eq('date', selectedDate.toISOString().split('T')[0]);

      if (error) {
        console.error('Error fetching attendance stats:', error);
        throw error;
      }

      // Filter by team first
      const filteredData = (data || []).filter(record => 
        team === 'all' || record.profiles?.team_id === team
      );

      const stats = {
        present: filteredData.filter(r => r.status === 'present' || r.status === 'late').length,
        absent: filteredData.filter(r => r.status === 'absent').length,
        late: 0, // Late is now counted as present, so this is always 0
        total: filteredData.length
      };

      setAttendanceStats(stats);
    } catch (error) {
      console.error('Error in fetchAttendanceStats:', error);
      toast({
        title: "Error",
        description: "Failed to fetch attendance statistics",
        variant: "destructive"
      });
    }
  };

  const fetchLeaveStats = async () => {
    if (!currentCompany) return;
    
    try {
      const { data, error } = await supabase
        .from('leave_requests')
        .select(`
          *,
          leave_types!leave_type_id(id, name),
          profiles!employee_id(team_id, role)
        `)
        .eq('company_id', currentCompany.id)
        .eq('start_date', selectedDate.toISOString().split('T')[0]);

      if (error) {
        console.error('Error fetching leave stats:', error);
        throw error;
      }

      // Filter by team first
      const filteredData = (data || []).filter(record => 
        team === 'all' || record.profiles?.team_id === team
      );

      const stats = {
        annual: filteredData.filter(r => r.leave_types?.name === 'Annual Leave' && r.status === 'approved').length,
        sick: filteredData.filter(r => r.leave_types?.name === 'Sick Leave' && r.status === 'approved').length,
        unpaid: filteredData.filter(r => r.leave_types?.name === 'Personal Leave' && r.status === 'approved').length,
        other: filteredData.filter(r => 
          !['Annual Leave', 'Sick Leave', 'Personal Leave'].includes(r.leave_types?.name || '') && 
          r.status === 'approved'
        ).length,
        total: filteredData.filter(r => r.status === 'approved').length
      };

      setLeaveStats(stats);
    } catch (error) {
      console.error('Error in fetchLeaveStats:', error);
      toast({
        title: "Error",
        description: "Failed to fetch leave statistics",
        variant: "destructive"
      });
    }
  };

  const fetchDepartmentStats = async () => {
    if (!currentCompany) return;
    
    try {
      // Get unique teams and all employees
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('id, team_id')
        .eq('company_id', currentCompany.id)
        .not('team_id', 'is', null);
      if (employeesError) throw employeesError;
      const teams = [...new Set(employeesData.map(d => d.team_id))];

      // Fetch all attendance and leave records for the company and date
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('date', selectedDate.toISOString().split('T')[0]);
      if (attendanceError) throw attendanceError;

      const { data: leaveData, error: leaveError } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('start_date', selectedDate.toISOString().split('T')[0]);
      if (leaveError) throw leaveError;

      const stats: DepartmentStats[] = [];
      for (const team of teams) {
        // Employees in this team
        const teamEmployees = employeesData.filter(emp => emp.team_id === team);
        const teamEmployeeIds = teamEmployees.map(emp => emp.id);
        // Attendance for this team
        const teamAttendance = (attendanceData || []).filter(record =>
          teamEmployeeIds.includes(record.employee_id)
        );
        // Leaves for this team
        const teamLeaves = (leaveData || []).filter(record =>
          teamEmployeeIds.includes(record.employee_id)
        );
        // Debug logs for fetched data
        console.log(`[DEBUG][Teams] Team: ${team}`);
        console.log('[DEBUG][Teams] teamAttendance:', teamAttendance);
        console.log('[DEBUG][Teams] teamLeaves:', teamLeaves);
        const totalDays = teamAttendance.length;
        const presentDays = teamAttendance.filter(a => a.status === 'present' || a.status === 'late').length;
        const approvedLeaves = teamLeaves.filter(l => l.status === 'approved').length;
        const stat = {
          team_id: team,
          attendance_rate: totalDays ? (presentDays / totalDays) * 100 : 0,
          leave_rate: totalDays ? (approvedLeaves / totalDays) * 100 : 0
        };
        console.log('[DEBUG][Teams] computed stat:', stat);
        stats.push(stat);
      }
      setDepartmentStats(stats);
      console.log('[DEBUG] setDepartmentStats:', stats);
    } catch (error) {
      console.error('Error in fetchDepartmentStats:', error);
      toast({
        title: "Error",
        description: "Failed to fetch department statistics",
        variant: "destructive"
      });
    }
  };

  const fetchDailyAttendance = async () => {
    if (!currentCompany || !currentCompany.id || !user || !user.id) return;
    setIsLoading(true);

    try {
      // Fetch all employees for the company and selected team
      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('id, name, email, team_id, position, role')
        .eq('company_id', currentCompany.id)
        .eq('is_active', true)
        .order('name');

      if (employeesError) {
        console.error('Error fetching employees:', employeesError);
        return;
      }
      if (!employees) {
        console.error('No employees found');
        return;
      }

      // Filter by team if selected
      const localFilteredEmployees = team === 'all' 
        ? employees 
        : employees.filter(emp => emp.team_id === team);

      // Fetch attendance records for the selected date (no join)
      const { data: attendanceRecords } = await supabase
        .from('attendance')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('date', selectedDate.toISOString().split('T')[0]);

      console.log('[DEBUG] Attendance records fetched:', attendanceRecords, attendanceRecords ? attendanceRecords.length : 0);

      // Fetch leave requests for the selected date
      const { data: leaveRequests } = await supabase
        .from('leave_requests')
        .select('*, leave_types(*), profiles(*)')
        .lte('start_date', selectedDate.toISOString().split('T')[0])
        .gte('end_date', selectedDate.toISOString().split('T')[0])
        .eq('status', 'approved');

      // Parse lateMarkTime (HH:mm)
      const [lateHour, lateMinute] = lateMarkTime.split(':').map(Number);

      // Map over all employees, show status based on attendance/leave
      const records: DailyAttendanceRecord[] = localFilteredEmployees.map(employee => {
        const attendance = attendanceRecords?.find(record => record.employee_id === employee.id);
        const leave = leaveRequests?.find(request => request.employee_id === employee.id);

        let status: 'present' | 'absent' | 'late' | 'leave' = 'absent';
        if (leave) {
          status = 'leave';
        } else if (attendance && attendance.check_in_time) {
          const checkIn = new Date(attendance.check_in_time);
          if (
            checkIn.getHours() < lateHour ||
            (checkIn.getHours() === lateHour && checkIn.getMinutes() <= lateMinute)
          ) {
            status = 'present';
          } else {
            status = 'late';
          }
        }

        return {
          employeeId: employee.id,
          employeeName: employee.name,
          team_id: employee.team_id,
          status,
          leaveType: leave?.leave_types?.name,
          checkIn: attendance?.check_in_time,
          checkOut: attendance?.check_out_time,
          date: selectedDate.toISOString().split('T')[0]
        };
      });

      // Calculate stats
      const stats: AttendanceStats = {
        present: records.filter(r => r.status === 'present' || r.status === 'late').length,
        absent: records.filter(r => r.status === 'absent').length,
        late: records.filter(r => r.status === 'late').length,
        total: records.length,
      };

      setDailyAttendance(records);
      setAttendanceStats(stats);

      console.log('[DEBUG] Employees fetched:', employees, employees?.length);
      console.log('[DEBUG] Filtered employees for team', team, ':', localFilteredEmployees, localFilteredEmployees.length);
      console.log('[DEBUG] Final attendance records for table:', records, records.length);
    } catch (error) {
      console.error('Error fetching attendance data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDateRange = (range: string) => {
    const now = new Date();
    const start = new Date();

    switch (range) {
      case 'week':
        start.setDate(now.getDate() - 7);
        break;
      case 'month':
        start.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(now.getFullYear() - 1);
        break;
      default:
        start.setMonth(now.getMonth() - 1);
    }

    return {
      start: start.toISOString().split('T')[0],
      end: now.toISOString().split('T')[0]
    };
  };

  const handleExport = (format: 'xlsx' | 'csv') => {
    try {
      let data: any[] = [];
      let filename = '';

      switch (activeTab) {
        case 'attendance':
          if (activeTab === 'attendance') {
            data = dailyAttendance.map(record => ({
              Date: record.date,
              'Employee Name': record.employeeName,
              Team: record.team_id,
              Status: record.status,
              'Leave Type': record.leaveType || '',
              'Check In': record.checkIn ? new Date(record.checkIn).toLocaleTimeString() : '',
              'Check Out': record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : ''
            }));
            filename = `daily_attendance_report_${timeRange}`;
          }
          break;

        case 'leave':
          data = filteredLeaves.map(record => ({
            'Employee Name': record.profiles?.name,
            Team: record.profiles?.team_id,
            'Leave Type': record.leave_types?.name,
            'Start Date': record.start_date,
            'End Date': record.end_date,
            'Total Days': record.total_days,
            Status: record.status,
            Reason: record.reason
          }));
          filename = `leave_report_${timeRange}`;
          break;

        case 'teams':
          data = departmentStats.map(stat => ({
            Team: stat.team_id,
            'Attendance Rate (%)': stat.attendance_rate.toFixed(2),
            'Leave Rate (%)': stat.leave_rate.toFixed(2)
          }));
          filename = `team_report_${timeRange}`;
          break;
      }

      if (format === 'xlsx') {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Report');
        XLSX.writeFile(wb, `${filename}.xlsx`);
      } else {
        // CSV Export
        const csvContent = [
          Object.keys(data[0]).join(','), // Header
          ...data.map(row => Object.values(row).join(',')) // Data rows
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      toast({
        title: "Success",
        description: `Report exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: "Error",
        description: "Failed to export report",
        variant: "destructive"
      });
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  const filteredAttendance = dailyAttendance.filter(record => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'present') return record.status === 'present' || record.status === 'late';
    if (statusFilter === 'late') return record.status === 'late';
    return record.status === statusFilter;
  });

  const handleStatusCardClick = (status: 'present' | 'absent' | 'late' | 'all') => {
    setStatusFilter(status === statusFilter ? 'all' : status);
  };

  const handleEmployeeClick = async (employeeId: string) => {
    setIsLoading(true);
    try {
      // Fetch employee details
      const { data: employee } = await supabase
        .from('employees')
        .select('id, name, email, team_id, position, role')
        .eq('id', employeeId)
        .single();

      if (!employee) {
        console.error('Employee not found');
        return;
      }

      // Fetch last 30 days attendance records
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: attendanceHistory } = await supabase
        .from('attendance')
        .select('date, check_in_time, check_out_time, status')
        .eq('company_id', currentCompany.id)
        .eq('employee_id', employeeId)
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: false });

      // Fetch leave records
      const { data: leaveHistory } = await supabase
        .from('leave_requests')
        .select('*, leave_types(*)')
        .eq('company_id', currentCompany.id)
        .eq('employee_id', employeeId)
        .gte('start_date', thirtyDaysAgo.toISOString().split('T')[0])
        .eq('status', 'approved');

      const employeeDetail: EmployeeDetail = {
        ...employee,
        attendanceHistory: (attendanceHistory || []).map(record => ({
          date: record.date,
          status: record.status,
          checkIn: record.check_in_time,
          checkOut: record.check_out_time,
        }))
      };

      // Add leave records to attendance history
      if (leaveHistory) {
        leaveHistory.forEach(leave => {
          const startDate = new Date(leave.start_date);
          const endDate = new Date(leave.end_date);
          for (let d = startDate; d <= endDate; d.setDate(d.getDate() + 1)) {
            employeeDetail.attendanceHistory.push({
              date: d.toISOString().split('T')[0],
              status: 'leave',
              leaveType: leave.leave_types?.name
            });
          }
        });
      }

      // Sort attendance history by date
      employeeDetail.attendanceHistory.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setSelectedEmployee(employeeDetail);
      setShowEmployeeModal(true);
    } catch (error) {
      console.error('Error fetching employee details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLeaves = rawData.leaves.filter(record => {
    let match = true;
    if (leaveTypeFilter !== 'all') match = match && record.leave_types?.id === leaveTypeFilter;
    if (leaveDateRange.start) match = match && record.start_date >= leaveDateRange.start;
    if (leaveDateRange.end) match = match && record.end_date <= leaveDateRange.end;
    if (leaveSearch) match = match && record.profiles?.name?.toLowerCase().includes(leaveSearch.toLowerCase());
    return match;
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Reports & Analytics</h2>
        <div className="flex items-center gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="min-w-[240px] justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(selectedDate, 'PPP')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Select value={team} onValueChange={setTeam}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Team" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              {teams.map(team => (
                <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="attendance">
            <Clock className="w-4 h-4 mr-2" />
            Attendance
          </TabsTrigger>
          <TabsTrigger value="leave">
            <CalendarIcon className="w-4 h-4 mr-2" />
            Leave
          </TabsTrigger>
          <TabsTrigger value="teams">
            <Users className="w-4 h-4 mr-2" />
            Teams
          </TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {attendanceStats && (
                <>
                  <div className="grid grid-cols-4 gap-4">
                    <Card 
                      className={`cursor-pointer transition-all hover:bg-gray-50 ${
                        statusFilter === 'present' ? 'ring-2 ring-green-500' : ''
                      }`}
                      onClick={() => handleStatusCardClick('present')}
                    >
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Present</CardTitle>
                        <Users className="h-4 w-4 text-green-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{attendanceStats.present}</div>
                        <p className="text-xs text-muted-foreground">
                          {((attendanceStats.present / attendanceStats.total) * 100).toFixed(1)}% of total
                        </p>
                      </CardContent>
                    </Card>

                    <Card 
                      className={`cursor-pointer transition-all hover:bg-gray-50 ${
                        statusFilter === 'late' ? 'ring-2 ring-yellow-500' : ''
                      }`}
                      onClick={() => handleStatusCardClick('late')}
                    >
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Late</CardTitle>
                        <Clock className="h-4 w-4 text-yellow-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{attendanceStats.late}</div>
                        <p className="text-xs text-muted-foreground">
                          {((attendanceStats.late / attendanceStats.total) * 100).toFixed(1)}% of total
                        </p>
                      </CardContent>
                    </Card>

                    <Card 
                      className={`cursor-pointer transition-all hover:bg-gray-50 ${
                        statusFilter === 'absent' ? 'ring-2 ring-red-500' : ''
                      }`}
                      onClick={() => handleStatusCardClick('absent')}
                    >
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Absent</CardTitle>
                        <Users className="h-4 w-4 text-red-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{attendanceStats.absent}</div>
                        <p className="text-xs text-muted-foreground">
                          {((attendanceStats.absent / attendanceStats.total) * 100).toFixed(1)}% of total
                        </p>
                      </CardContent>
                    </Card>

                    <Card 
                      className={`cursor-pointer transition-all hover:bg-gray-50 ${
                        statusFilter === 'all' ? 'ring-2 ring-blue-500' : ''
                      }`}
                      onClick={() => handleStatusCardClick('all')}
                    >
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total</CardTitle>
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{attendanceStats.total}</div>
                        <p className="text-xs text-muted-foreground">
                          Total employees tracked
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Attendance Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'Present', value: attendanceStats.present - attendanceStats.late },
                                { name: 'Late', value: attendanceStats.late },
                                { name: 'Absent', value: attendanceStats.absent }
                              ]}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {COLORS.slice(0, 3).map((color, index) => (
                                <Cell key={`cell-${index}`} fill={color} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Users className="w-5 h-5" />
                      <span>
                        {statusFilter === 'all' 
                          ? 'Daily Attendance Report'
                          : `${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Employees`
                        }
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExport('xlsx')}
                      >
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Export XLSX
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExport('csv')}
                      >
                        <FileDown className="w-4 h-4 mr-2" />
                        Export CSV
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex justify-center items-center h-32">
                      <p>Loading...</p>
                    </div>
                  ) : (
                    <>
                      {filteredEmployees.length === 0 && (
                        <div className="text-red-500 font-bold">[DEBUG] No employees found for this team.</div>
                      )}
                      <div className="rounded-md border">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leave Type</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check In</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check Out</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {filteredAttendance.map((record, index) => (
                              <tr key={record.employeeId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td 
                                  className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 hover:text-blue-800 cursor-pointer"
                                  onClick={() => handleEmployeeClick(record.employeeId)}
                                >
                                  {record.employeeName}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {teams.find(t => t.id === record.team_id)?.name || 'Unassigned'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  <Badge variant={
                                    record.status === 'present' ? 'default' :
                                    record.status === 'late' ? 'secondary' :
                                    record.status === 'leave' ? 'secondary' :
                                    'destructive'
                                  }>
                                    {record.status}
                                  </Badge>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {record.leaveType || '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {record.checkIn ? new Date(record.checkIn).toLocaleTimeString() : '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="leave" className="space-y-6">
          <div className="flex flex-wrap gap-4 mb-4 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Leave Type</label>
              <Select value={leaveTypeFilter} onValueChange={setLeaveTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {leaveTypes.map(type => (
                    <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
              <Input type="date" value={leaveDateRange.start} onChange={e => setLeaveDateRange(r => ({ ...r, start: e.target.value }))} className="w-[140px]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
              <Input type="date" value={leaveDateRange.end} onChange={e => setLeaveDateRange(r => ({ ...r, end: e.target.value }))} className="w-[140px]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Employee</label>
              <Input type="text" placeholder="Search name" value={leaveSearch} onChange={e => setLeaveSearch(e.target.value)} className="w-[180px]" />
            </div>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleExport('xlsx')}>
                <FileSpreadsheet className="w-4 h-4 mr-2" /> Export XLSX
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
                <FileDown className="w-4 h-4 mr-2" /> Export CSV
              </Button>
            </div>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {leaveStats && (
                <>
                  <div className="grid grid-cols-5 gap-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Annual Leave</CardTitle>
                        <CalendarIcon className="h-4 w-4 text-blue-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{leaveStats.annual}</div>
                        <p className="text-xs text-muted-foreground">
                          {((leaveStats.annual / leaveStats.total) * 100).toFixed(1)}% of total
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Sick Leave</CardTitle>
                        <CalendarIcon className="h-4 w-4 text-red-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{leaveStats.sick}</div>
                        <p className="text-xs text-muted-foreground">
                          {((leaveStats.sick / leaveStats.total) * 100).toFixed(1)}% of total
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Unpaid Leave</CardTitle>
                        <CalendarIcon className="h-4 w-4 text-yellow-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{leaveStats.unpaid}</div>
                        <p className="text-xs text-muted-foreground">
                          {((leaveStats.unpaid / leaveStats.total) * 100).toFixed(1)}% of total
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Other Leave</CardTitle>
                        <CalendarIcon className="h-4 w-4 text-purple-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{leaveStats.other}</div>
                        <p className="text-xs text-muted-foreground">
                          {((leaveStats.other / leaveStats.total) * 100).toFixed(1)}% of total
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{leaveStats.total}</div>
                        <p className="text-xs text-muted-foreground">Total approved leaves</p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Leave Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'Annual', value: leaveStats.annual },
                                { name: 'Sick', value: leaveStats.sick },
                                { name: 'Unpaid', value: leaveStats.unpaid },
                                { name: 'Other', value: leaveStats.other }
                              ]}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {COLORS.map((color, index) => (
                                <Cell key={`cell-${index}`} fill={color} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* Leave Data Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <CalendarIcon className="w-5 h-5" />
                      <span>Leave Requests ({filteredLeaves.length})</span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {filteredLeaves.length > 0 ? (
                    <div className="rounded-md border">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leave Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Days</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredLeaves.map((record, index) => (
                            <tr key={record.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {record.profiles?.name || 'Unknown'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {teams.find(t => t.id === record.profiles?.team_id)?.name || 'Unassigned'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {record.leave_types?.name || 'Unknown'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {format(new Date(record.start_date), 'MMM dd, yyyy')}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {format(new Date(record.end_date), 'MMM dd, yyyy')}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {record.total_days} day{record.total_days > 1 ? 's' : ''}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <Badge variant={
                                  record.status === 'approved' ? 'default' :
                                  record.status === 'pending' ? 'secondary' :
                                  'destructive'
                                }>
                                  {record.status}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                                {record.reason || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <CalendarIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No leave requests found with the current filters</p>
                      <p className="text-sm mt-2">Try adjusting your filter criteria</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="teams" className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {departmentStats.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Team Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={departmentStats.map(stat => ({
                            ...stat,
                            teamName: teams.find(t => t.id === stat.team_id)?.name || 'Unassigned',
                          }))}
                          margin={{
                            top: 20,
                            right: 30,
                            left: 20,
                            bottom: 5,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="teamName" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="attendance_rate" name="Attendance Rate (%)" fill="#8884d8" />
                          <Bar dataKey="leave_rate" name="Leave Rate (%)" fill="#82ca9d" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No team performance data found for the selected date.</p>
                  <p className="text-sm mt-2">Try adjusting your date or ensure teams have attendance/leave data.</p>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showEmployeeModal} onOpenChange={setShowEmployeeModal}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Employee Details</DialogTitle>
          </DialogHeader>
          {selectedEmployee && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Name</h3>
                  <p className="mt-1">{selectedEmployee.name}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Email</h3>
                  <p className="mt-1">{selectedEmployee.email}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Team</h3>
                  <p className="mt-1">{teams.find(t => t.id === selectedEmployee.team_id)?.name || 'Unassigned'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Position</h3>
                  <p className="mt-1">{selectedEmployee.position}</p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-4">Attendance History (Last 30 Days)</h3>
                <div className="rounded-md border">
                  <div className="max-h-[400px] overflow-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Check In</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Check Out</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Leave Type</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedEmployee.attendanceHistory.map((record, index) => (
                          <tr key={record.date} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {format(new Date(record.date), 'PPP')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <Badge variant={
                                record.status === 'present' ? 'default' :
                                record.status === 'late' ? 'secondary' :
                                record.status === 'leave' ? 'secondary' :
                                'destructive'
                              }>
                                {record.status}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {record.checkIn ? new Date(record.checkIn).toLocaleTimeString() : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {record.leaveType || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReportsAnalytics; 