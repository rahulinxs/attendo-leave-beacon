import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Download, Users, Clock, TrendingUp, FileSpreadsheet, FileDown, CalendarIcon, CheckCircle, AlertTriangle, XCircle, Columns3 } from 'lucide-react';
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
import { parseDateLocal } from '@/utils/dateUtils';
import { formatLeaveDuration } from '@/utils/leaveDuration';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  duration_type?: string | null;
  session?: string | null;
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
  employees?: {
    name: string;
    team_id: string | null;
    email?: string;
    position?: string;
    role?: string;
  } | null;
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
  // By type
  annual: number;
  sick: number;
  unpaid: number;
  other: number;
  total: number;
  
  // By status
  pending: number;
  approved: number;
  rejected: number;
  
  // Averages
  avgDuration: number;
  
  // Common reasons
  commonReasons: { reason: string; count: number }[];
  
  // Team distribution
  teamDistribution: { team: string; count: number }[];
  
  // Monthly trends
  monthlyTrends: { month: string; count: number }[];
  
  // Top employees
  topEmployees: { name: string; days: number }[];

  // Derived from the currently filtered leave records
  durationByType: { name: string; days: number }[];
  teamApprovalRates: { name: string; approved: number; pending: number; rejected: number }[];
}

interface DepartmentStats {
  team_id: string | null;
  team_size: number;
  recorded: number;
  present: number;
  late: number;
  absent: number;
  on_leave: number;
  approved_leaves: number;
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

type LeaveTableColumn = 'employee' | 'team' | 'leaveType' | 'dates' | 'duration' | 'status' | 'reason';

const LEAVE_TABLE_COLUMNS: Array<{ key: LeaveTableColumn; label: string }> = [
  { key: 'employee', label: 'Employee' },
  { key: 'team', label: 'Team' },
  { key: 'leaveType', label: 'Leave Type' },
  { key: 'dates', label: 'Dates' },
  { key: 'duration', label: 'Total Days' },
  { key: 'status', label: 'Status' },
  { key: 'reason', label: 'Reason' },
];

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
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('attendance');
  const [timeRange, setTimeRange] = useState('month');
  const [team, setTeam] = useState('all');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null);
  const [leaveStats, setLeaveStats] = useState<LeaveStats | null>(null);
  const [activeLeaveTab, setActiveLeaveTab] = useState('overview');
  const [departmentStats, setDepartmentStats] = useState<DepartmentStats[]>([]);
  const [rawData, setRawData] = useState<RawData>({ attendance: [], leaves: [], employees: [] });
  const [dailyAttendance, setDailyAttendance] = useState<DailyAttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'absent' | 'late' | 'leave'>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeDetail | null>(null);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [leaveTypeFilter, setLeaveTypeFilter] = useState<string>('all');
  const [leaveStatusFilter, setLeaveStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [visibleLeaveColumns, setVisibleLeaveColumns] = useState<Record<LeaveTableColumn, boolean>>({
    employee: true,
    team: false,
    leaveType: true,
    dates: true,
    duration: true,
    status: true,
    reason: false,
  });
  const [leaveTypes, setLeaveTypes] = useState<{ id: string; name: string }[]>([]);
  const [leaveDateRange, setLeaveDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [leaveSearch, setLeaveSearch] = useState('');
  const [lateMarkTime, setLateMarkTime] = useState('09:30');
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);

  const filteredEmployees = team === 'all'
    ? rawData.employees
    : rawData.employees.filter(emp => emp.team_id === team);

  useEffect(() => {
    if (!currentCompany || !currentCompany.id) return;
    fetchData();
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
  }, [timeRange, team, selectedDate, currentCompany]);

  useEffect(() => {
    if (activeTab === 'attendance' && currentCompany?.id) {
      fetchDailyAttendance();
    }
  }, [activeTab, currentCompany?.id, selectedDate, team]);

  useEffect(() => {
    const fetchLeaveTypes = async () => {
      try {
        const { data, error } = await supabase
          .from('leave_types')
          // Keep the report payload limited to fields used by charts, tables, and exports.
          .select('id, name')
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
    if (!currentCompany || !currentCompany.id) {
      return;
    }
    
    try {
      const dateRange = getDateRange(timeRange);
      
      // Fetch attendance data
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('id, employee_id, date, status, check_in_time, check_out_time')
        .eq('company_id', currentCompany.id)
        .gte('date', dateRange.start)
        .lte('date', dateRange.end);

      // Fetch employee data separately for manual join
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('id, name, team_id, role, email, position')
        .eq('company_id', currentCompany.id)
        .eq('is_active', true);

      if (employeeError) throw employeeError;

      // Manual join: attach employee info to attendance records
      const attendanceWithEmployees = attendanceData?.map(record => ({
        ...record,
        employees: employeeData?.find(emp => emp.id === record.employee_id) || null
      })) || [];

      if (attendanceError) {
        console.error('Error fetching attendance:', attendanceError);
        throw attendanceError;
      }

      // Fetch leave requests data
      const { data: leavesData, error: leavesError } = await supabase
        .from('leave_requests')
        .select('id, employee_id, leave_type_id, start_date, end_date, total_days, duration_type, session, status, reason, admin_comments, approved_at, approved_by, created_at, updated_at')
        .eq('company_id', currentCompany.id)
        // Include leaves that overlap the selected period, including multi-day leaves that started earlier.
        .lte('start_date', dateRange.end)
        .gte('end_date', dateRange.start);

      // Fetch leave types
      const { data: leaveTypesData, error: leaveTypesError } = await supabase
        .from('leave_types')
        .select('id, name')
        .eq('company_id', currentCompany.id);

      // Manual join: attach employee and leave type info to leave records
      const leavesWithEmployees = leavesData?.map(record => ({
        ...record,
        employees: employeeData?.find(emp => emp.id === record.employee_id) || null,
        leave_types: leaveTypesData?.find(type => type.id === record.leave_type_id) || null
      })) || [];

      if (leavesError) {
        console.error('Error fetching leaves:', leavesError);
        throw leavesError;
      }

      // Filter by team if needed
      const filteredData: RawData = {
        attendance: (attendanceWithEmployees || []).filter(record => 
          team === 'all' || record.employees?.team_id === team
        ),
        leaves: (leavesWithEmployees || []).filter(record =>
          team === 'all' || record.employees?.team_id === team
        ),
        employees: (employeeData || []).filter(employee =>
          team === 'all' || employee.team_id === team
        )
      };

      setRawData(filteredData);
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
      // Fetch attendance data for selected date
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
          .select('id, employee_id, date, status, check_in_time, check_out_time')
        .eq('company_id', currentCompany.id)
        .eq('date', selectedDate.toISOString().split('T')[0]);

      // Fetch employee data for manual join
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('id, team_id, role')
        .eq('company_id', currentCompany.id)
        .eq('is_active', true);

      // Manual join: attach employee info to attendance records
      const data = attendanceData?.map(record => ({
        ...record,
        employees: employeeData?.find(emp => emp.id === record.employee_id) || null
      })) || [];

      if (attendanceError) {
        console.error('Error fetching attendance stats:', attendanceError);
        throw attendanceError;
      }

      // Filter by team first
      const filteredData = (data || []).filter(record => 
        team === 'all' || record.employees?.team_id === team
      );

      const stats = {
        present: filteredData.filter(r => r.status === 'present' || r.status === 'late' || r.status === 'half_day' || r.status === 'work_from_home').length,
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

  const processLeaveData = (data: DatabaseLeaveRequest[]): LeaveStats => {
    const stats: LeaveStats = {
      annual: 0,
      sick: 0,
      unpaid: 0,
      other: 0,
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      avgDuration: 0,
      commonReasons: [],
      teamDistribution: [],
      monthlyTrends: [],
      topEmployees: [],
      durationByType: [],
      teamApprovalRates: []
    };

    // Counters for different metrics
    const typeCounts = {
      annual: 0,
      sick: 0,
      unpaid: 0,
      other: 0
    };

    const statusCounts = {
      pending: 0,
      approved: 0,
      rejected: 0
    };

    const reasonCounts: Record<string, number> = {};
    const teamCounts: Record<string, number> = {};
    const monthlyCounts: Record<string, number> = {};
    const employeeLeaveDays: Record<string, number> = {};
    const durationByType: Record<string, number> = {};
    const teamApprovalCounts: Record<string, { approved: number; pending: number; rejected: number }> = {};
    let totalDuration = 0;
    let totalLeaves = 0;

    data.forEach(leave => {
      if (!leave.leave_types) return;
      
      const type = leave.leave_types.name.toLowerCase();
      const status = leave.status?.toLowerCase() || 'pending';
      const month = leave.start_date ? new Date(leave.start_date).toLocaleString('default', { month: 'short' }) : '';
      const employeeName = leave.employees?.name || 'Unknown';
      const teamName = teams.find(t => t.id === (leave.employees?.team_id || ''))?.name || 'Unassigned';
      durationByType[leave.leave_types.name] = (durationByType[leave.leave_types.name] || 0) + Number(leave.total_days || 0);
      if (!teamApprovalCounts[teamName]) teamApprovalCounts[teamName] = { approved: 0, pending: 0, rejected: 0 };
      
      // Count by type
      if (type.includes('annual')) {
        typeCounts.annual += leave.total_days;
      } else if (type.includes('sick')) {
        typeCounts.sick += leave.total_days;
      } else if (type.includes('unpaid')) {
        typeCounts.unpaid += leave.total_days;
      } else {
        typeCounts.other += leave.total_days;
      }
      
      // Count by status
      if (status === 'approved') {
        statusCounts.approved++;
        teamApprovalCounts[teamName].approved++;
      } else if (status === 'rejected') {
        statusCounts.rejected++;
        teamApprovalCounts[teamName].rejected++;
      } else {
        statusCounts.pending++;
        teamApprovalCounts[teamName].pending++;
      }
      
      // Track reasons
      if (leave.reason) {
        reasonCounts[leave.reason] = (reasonCounts[leave.reason] || 0) + 1;
      }
      
      // Track by team
      teamCounts[teamName] = (teamCounts[teamName] || 0) + 1;
      
      // Track by month
      if (month) {
        monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;
      }
      
      // Track by employee
      if (employeeName) {
        employeeLeaveDays[employeeName] = (employeeLeaveDays[employeeName] || 0) + leave.total_days;
      }
      
      totalDuration += leave.total_days;
      totalLeaves++;
    });
    
    // Calculate averages
    stats.avgDuration = totalLeaves > 0 ? Math.round((totalDuration / totalLeaves) * 10) / 10 : 0;
    
    // Set type counts
    stats.annual = typeCounts.annual;
    stats.sick = typeCounts.sick;
    stats.unpaid = typeCounts.unpaid;
    stats.other = typeCounts.other;
    stats.total = stats.annual + stats.sick + stats.unpaid + stats.other;
    
    // Set status counts
    stats.pending = statusCounts.pending;
    stats.approved = statusCounts.approved;
    stats.rejected = statusCounts.rejected;
    
    // Get top 5 reasons
    stats.commonReasons = Object.entries(reasonCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([reason, count]) => ({ reason, count }));
    
    // Get team distribution
    stats.teamDistribution = Object.entries(teamCounts)
      .map(([team, count]) => ({ team, count }))
      .sort((a, b) => b.count - a.count);
    
    // Get monthly trends (last 6 months)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    stats.monthlyTrends = Array.from({ length: 6 }, (_, i) => {
      const monthIndex = (currentMonth - 5 + i + 12) % 12;
      const year = currentYear - (currentMonth - 5 + i < 0 ? 1 : 0);
      const monthKey = months[monthIndex];
      return {
        month: monthKey,
        count: monthlyCounts[monthKey] || 0
      };
    });
    
    // Get top 5 employees by leave days
    stats.topEmployees = Object.entries(employeeLeaveDays)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, days]) => ({ name, days }));

    stats.durationByType = Object.entries(durationByType)
      .sort((a, b) => b[1] - a[1])
      .map(([name, days]) => ({ name, days }));
    stats.teamApprovalRates = Object.entries(teamApprovalCounts)
      .map(([name, counts]) => ({ name, ...counts }))
      .sort((a, b) => (b.approved + b.pending + b.rejected) - (a.approved + a.pending + a.rejected));

    return stats;
  };

  const fetchDepartmentStats = async () => {
    if (!currentCompany) return;
    
    try {
      // Get unique teams and all employees
      let employeeQuery = supabase
        .from('employees')
        .select('id, team_id')
        .eq('company_id', currentCompany.id)
        .not('team_id', 'is', null);
      if (team !== 'all') employeeQuery = employeeQuery.eq('team_id', team);
      const { data: employeesData, error: employeesError } = await employeeQuery;
      if (employeesError) throw employeesError;
      const teams = [...new Set(employeesData.map(d => d.team_id))];
      const teamsToMeasure = team === 'all' ? teams : teams.filter(teamId => teamId === team);

      // Fetch all attendance and leave records for the company and date
      const { data: attendanceData, error: attendanceError } = await supabase
          .from('attendance')
        .select('employee_id, status, date')
          .eq('company_id', currentCompany.id)
        .eq('date', selectedDate.toISOString().split('T')[0]);
      if (attendanceError) throw attendanceError;

      const { data: leaveData, error: leaveError } = await supabase
          .from('leave_requests')
        .select('employee_id, status, start_date, end_date')
          .eq('company_id', currentCompany.id)
        .lte('start_date', selectedDate.toISOString().split('T')[0])
        .gte('end_date', selectedDate.toISOString().split('T')[0]);
      if (leaveError) throw leaveError;

      const stats: DepartmentStats[] = [];
      for (const team of teamsToMeasure) {
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
        const teamSize = teamEmployees.length;
        const recorded = teamAttendance.length;
        const presentDays = teamAttendance.filter(a => a.status === 'present' || a.status === 'late' || a.status === 'half_day' || a.status === 'work_from_home').length;
        const lateDays = teamAttendance.filter(a => a.status === 'late').length;
        const absentDays = teamEmployees.filter(employee => {
          const attendance = teamAttendance.find(record => record.employee_id === employee.id);
          const approvedLeave = teamLeaves.some(leave => leave.employee_id === employee.id && leave.status === 'approved');
          return !attendance && !approvedLeave;
        }).length;
        const approvedLeaveIds = new Set(teamLeaves.filter(leave => leave.status === 'approved').map(leave => leave.employee_id));
        const approvedLeaves = approvedLeaveIds.size;
        const stat = {
          team_id: team,
          team_size: teamSize,
          recorded,
          present: presentDays,
          late: lateDays,
          absent: absentDays,
          on_leave: approvedLeaves,
          approved_leaves: approvedLeaves,
          attendance_rate: teamSize ? (presentDays / teamSize) * 100 : 0,
          leave_rate: teamSize ? (approvedLeaves / teamSize) * 100 : 0
        };
        stats.push(stat);
      }
      setDepartmentStats(stats);
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
      let employeeQuery = supabase
        .from('employees')
        .select('id, name, email, team_id, position, role')
        .eq('company_id', currentCompany.id)
        .eq('is_active', true)
        .order('name');

      if (team !== 'all') employeeQuery = employeeQuery.eq('team_id', team);
      const { data: employees, error: employeesError } = await employeeQuery;

      if (employeesError) {
        console.error('Error fetching employees:', employeesError);
        return;
      }
      if (!employees) {
        console.error('No employees found');
        return;
      }

      // Filter by team if selected
      const localFilteredEmployees = employees;

      // Fetch attendance records for the selected date (no join)
      const { data: attendanceRecords } = await supabase
        .from('attendance')
        .select('employee_id, check_in_time, check_out_time, status, date')
        .eq('company_id', currentCompany.id)
        .eq('date', selectedDate.toISOString().split('T')[0]);


      // Fetch leave requests for the selected date
      const { data: leaveRequests } = await supabase
        .from('leave_requests')
        .select('employee_id, start_date, end_date, leave_types(name)')
        .eq('company_id', currentCompany.id)
        .lte('start_date', selectedDate.toISOString().split('T')[0])
        .gte('end_date', selectedDate.toISOString().split('T')[0])
        .eq('status', 'approved');

      // Parse lateMarkTime (HH:mm)
      const [lateHour, lateMinute] = lateMarkTime.split(':').map(Number);

      // Map over all employees, show status based on attendance/leave
      const records: DailyAttendanceRecord[] = localFilteredEmployees.map(employee => {
        const attendance = attendanceRecords?.find(record => record.employee_id === employee.id);
        const leave = leaveRequests?.find(request => request.employee_id === employee.id);

        let status: string = 'absent';
        if (leave) {
          status = 'leave';
        } else if (attendance?.status === 'work_from_home') {
          status = 'work_from_home';
        } else if (attendance?.status === 'half_day') {
          status = 'half_day';
        } else if (attendance?.status === 'holiday') {
          status = 'holiday';
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
        present: records.filter(r => r.status === 'present' || r.status === 'late' || r.status === 'half_day' || r.status === 'work_from_home').length,
        absent: records.filter(r => r.status === 'absent').length,
        late: records.filter(r => r.status === 'late').length,
        total: records.length,
      };

      setDailyAttendance(records);
      setAttendanceStats(stats);

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
            'Employee Name': record.employees?.name,
            Team: record.employees?.team_id,
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
    if (statusFilter === 'present') return record.status === 'present' || record.status === 'late' || record.status === 'half_day' || record.status === 'work_from_home';
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
        .select('start_date, end_date, leave_types(name)')
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

  const filteredLeaves = useMemo(() => {
    if (!rawData.leaves) return [];
    
    return rawData.leaves.filter(leave => {
      // Filter by leave type
      if (leaveTypeFilter !== 'all' && leave.leave_type_id !== leaveTypeFilter) return false;
      
      // Filter by date range
      if (leaveDateRange.start && parseDateLocal(leave.start_date) < new Date(leaveDateRange.start)) return false;
      if (leaveDateRange.end && parseDateLocal(leave.end_date) > new Date(leaveDateRange.end)) return false;

      if (leaveStatusFilter !== 'all' && leave.status !== leaveStatusFilter) return false;
      
      // Filter by search term
      if (leaveSearch && !leave.employees?.name?.toLowerCase().includes(leaveSearch.toLowerCase())) return false;
      
      return true;
    });
  }, [rawData.leaves, leaveTypeFilter, leaveDateRange, leaveSearch, leaveStatusFilter]);

  useEffect(() => {
    setLeaveStats(processLeaveData(filteredLeaves));
  }, [filteredLeaves, teams]);

  const teamPerformanceRows = useMemo(() => departmentStats.map(stat => ({
    ...stat,
    teamName: teams.find(item => item.id === stat.team_id)?.name || 'Unassigned',
  })), [departmentStats, teams]);

  const teamPerformanceSummary = useMemo(() => ({
    teams: teamPerformanceRows.length,
    averageAttendance: teamPerformanceRows.length
      ? teamPerformanceRows.reduce((sum, row) => sum + row.attendance_rate, 0) / teamPerformanceRows.length
      : 0,
    totalOnLeave: teamPerformanceRows.reduce((sum, row) => sum + row.on_leave, 0),
    teamsNeedingAttention: teamPerformanceRows.filter(row => row.attendance_rate < 80 || row.leave_rate > 25).length,
  }), [teamPerformanceRows]);


  const employees = useMemo(() => [
    { id: '1', name: 'John Doe', email: 'john@example.com', team_id: '1', role: 'employee', position: 'Software Engineer' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', team_id: '1', role: 'employee', position: 'Frontend Developer' },
    { id: '3', name: 'Mike Johnson', email: 'mike@example.com', team_id: '2', role: 'employee', position: 'Marketing Manager' },
    { id: '4', name: 'Sarah Williams', email: 'sarah@example.com', team_id: '3', role: 'employee', position: 'Sales Executive' },
    { id: '5', name: 'David Brown', email: 'david@example.com', team_id: '4', role: 'hr', position: 'HR Manager' },
    { id: '6', name: 'Emily Davis', email: 'emily@example.com', team_id: '5', role: 'employee', position: 'Operations Manager' }
  ], []);

  return (
    <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden p-4 sm:p-6">
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold">Reports & Analytics</h2>
          <p className="text-sm text-muted-foreground">Operational daily attendance, leave visibility, team snapshots, and employee drill-downs.</p>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal sm:min-w-[240px] sm:w-auto"
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
        <TabsList className="flex w-full max-w-full flex-wrap justify-start gap-1">
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
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
                        variant="gradient"
                        size="sm"
                        onClick={() => handleExport('xlsx')}
                      >
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Export XLSX
                      </Button>
                      <Button
                        variant="gradient"
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
                        <div className="text-muted-foreground">No employees found for this team.</div>
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
                                  record.status === 'present' || record.status === 'work_from_home' ? 'default' :
                                  record.status === 'late' || record.status === 'half_day' ? 'secondary' :
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

        <TabsContent value="leave" className="min-w-0 space-y-6">
          <div className="min-w-0 space-y-4">
            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Leave Type</label>
                <Select value={leaveTypeFilter} onValueChange={setLeaveTypeFilter}>
                  <SelectTrigger className="w-full">
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
                <Input 
                  type="date" 
                  value={leaveDateRange.start} 
                  onChange={e => setLeaveDateRange(r => ({ ...r, start: e.target.value }))} 
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                <Input
                  type="date"
                  value={leaveDateRange.end}
                  onChange={e => setLeaveDateRange(r => ({ ...r, end: e.target.value }))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <Select value={leaveStatusFilter} onValueChange={value => setLeaveStatusFilter(value as typeof leaveStatusFilter)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Employee</label>
                <Input type="text" placeholder="Search name" value={leaveSearch} onChange={e => setLeaveSearch(e.target.value)} className="w-full" />
              </div>
              <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-3 xl:col-span-1">
                <Button variant="gradient" size="sm" className="flex-1" onClick={() => handleExport('xlsx')}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" /> Export XLSX
                </Button>
                <Button variant="gradient" size="sm" className="flex-1" onClick={() => handleExport('csv')}>
                  <FileDown className="w-4 h-4 mr-2" /> Export CSV
                </Button>
              </div>
            </div>
            
            {/* Leave Analytics Tabs */}
            <Tabs 
              value={activeLeaveTab} 
              onValueChange={setActiveLeaveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 gap-1 md:grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="trends">Trends</TabsTrigger>
                <TabsTrigger value="teams">Team Analysis</TabsTrigger>
                <TabsTrigger value="details">Detailed View</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {leaveStats && (
                <>
                  {/* Overview Tab */}
                  {activeLeaveTab === 'overview' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card>
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Leave Days</CardTitle>
                            <CalendarIcon className="h-4 w-4 text-blue-500" />
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">{leaveStats.total}</div>
                            <p className="text-xs text-muted-foreground">
                              {leaveStats.avgDuration} days average per request
                            </p>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Approved</CardTitle>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">{leaveStats.approved}</div>
                            <p className="text-xs text-muted-foreground">
                              {((leaveStats.approved / (leaveStats.approved + leaveStats.pending + leaveStats.rejected)) * 100).toFixed(1)}% approval rate
                            </p>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Pending</CardTitle>
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">{leaveStats.pending}</div>
                            <p className="text-xs text-muted-foreground">
                              Awaiting approval
                            </p>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
                            <XCircle className="h-4 w-4 text-red-500" />
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">{leaveStats.rejected}</div>
                            <p className="text-xs text-muted-foreground">
                              {leaveStats.rejected > 0 ? 
                                `${((leaveStats.rejected / (leaveStats.approved + leaveStats.pending + leaveStats.rejected)) * 100).toFixed(1)}% of total` : 
                                'No rejections'}
                            </p>
                          </CardContent>
                        </Card>
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Card className="min-w-0 max-w-full overflow-hidden lg:col-span-2">
                          <CardHeader className="min-w-0">
                            <CardTitle>Leave Distribution by Type</CardTitle>
                          </CardHeader>
                          <CardContent className="min-w-0 overflow-hidden">
                            <div className="h-[260px] min-w-0 max-w-full overflow-hidden sm:h-[300px]">
                              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                <BarChart
                                  data={[
                                    { name: 'Annual', value: leaveStats.annual },
                                    { name: 'Sick', value: leaveStats.sick },
                                    { name: 'Unpaid', value: leaveStats.unpaid },
                                    { name: 'Other', value: leaveStats.other }
                                  ]}
                                  layout="vertical"
                                >
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis type="number" />
                                  <YAxis dataKey="name" type="category" />
                                  <Tooltip />
                                  <Bar dataKey="value" fill="#8884d8">
                                    {[0, 1, 2, 3].map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card className="min-w-0 max-w-full overflow-hidden">
                          <CardHeader className="min-w-0">
                            <CardTitle>Leave Status</CardTitle>
                          </CardHeader>
                          <CardContent className="min-w-0 overflow-hidden">
                            <div className="h-[260px] min-w-0 max-w-full overflow-hidden sm:h-[300px]">
                              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                <PieChart>
                                  <Pie
                                    data={[
                                      { name: 'Approved', value: leaveStats.approved },
                                      { name: 'Pending', value: leaveStats.pending },
                                      { name: 'Rejected', value: leaveStats.rejected }
                                    ]}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                  >
                                    <Cell fill="#4CAF50" />
                                    <Cell fill="#FFC107" />
                                    <Cell fill="#F44336" />
                                  </Pie>
                                  <Tooltip />
                                  <Legend />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                          <CardHeader>
                            <CardTitle>Top Leave Takers</CardTitle>
                            <p className="text-sm text-muted-foreground">Employees with most leave days</p>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              {leaveStats.topEmployees.length > 0 ? (
                                leaveStats.topEmployees.map((emp, index) => (
                                  <div key={emp.name} className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                        <span className="text-sm font-medium">{emp.name.split(' ').map(n => n[0]).join('')}</span>
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium">{emp.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {emp.days} day{emp.days !== 1 ? 's' : ''}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="w-1/2">
                                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div 
                                          className="h-full bg-blue-500" 
                                          style={{ 
                                            width: `${(emp.days / (leaveStats.topEmployees[0]?.days || 1)) * 100}%` 
                                          }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">No leave data available</p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardHeader>
                            <CardTitle>Common Leave Reasons</CardTitle>
                            <p className="text-sm text-muted-foreground">Most frequent leave reasons</p>
                          </CardHeader>
                          <CardContent>
                            {leaveStats.commonReasons.length > 0 ? (
                              <div className="space-y-3">
                                {leaveStats.commonReasons.map((reason, index) => (
                                  <div key={index} className="flex items-center justify-between">
                                    <p className="text-sm font-medium">{reason.reason}</p>
                                    <Badge variant="outline">{reason.count} {reason.count === 1 ? 'time' : 'times'}</Badge>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground text-center py-4">No reason data available</p>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  )}
                  
                  {/* Trends Tab */}
                  {activeLeaveTab === 'trends' && (
                    <div className="space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Monthly Leave Trends</CardTitle>
                          <p className="text-sm text-muted-foreground">Leave requests over the past 6 months</p>
                        </CardHeader>
                        <CardContent>
                          <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={leaveStats.monthlyTrends}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="count" fill="#8884d8" name="Leave Requests" />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                          <CardHeader>
                            <CardTitle>Leave Type Trends</CardTitle>
                            <p className="text-sm text-muted-foreground">Breakdown by leave type</p>
                          </CardHeader>
                          <CardContent>
                            <div className="h-[300px]">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                  data={[
                                    { name: 'Annual', count: leaveStats.annual },
                                    { name: 'Sick', count: leaveStats.sick },
                                    { name: 'Unpaid', count: leaveStats.unpaid },
                                    { name: 'Other', count: leaveStats.other }
                                  ]}
                                >
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="name" />
                                  <YAxis />
                                  <Tooltip />
                                  <Bar dataKey="count" fill="#8884d8" name="Leave Days" />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardHeader>
                            <CardTitle>Leave Duration</CardTitle>
                            <p className="text-sm text-muted-foreground">Average leave duration by type</p>
                          </CardHeader>
                          <CardContent>
                            <div className="h-[300px]">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                  data={leaveStats.durationByType}
                                >
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="name" />
                                  <YAxis />
                                  <Tooltip />
                                  <Bar dataKey="days" fill="#4CAF50" name="Average Days" />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  )}
                  
                  {/* Team Analysis Tab */}
                  {activeLeaveTab === 'teams' && (
                    <div className="space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Team-wise Leave Distribution</CardTitle>
                          <p className="text-sm text-muted-foreground">Leave days by team</p>
                        </CardHeader>
                        <CardContent>
                          <div className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                layout="vertical"
                                data={leaveStats.teamDistribution}
                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis dataKey="team" type="category" width={150} />
                                <Tooltip />
                                <Bar dataKey="count" fill="#8884d8" name="Leave Days" />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                          <CardHeader>
                            <CardTitle>Team Leave Balance</CardTitle>
                            <p className="text-sm text-muted-foreground">Remaining leave days by team</p>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              {teams.map((team) => {
                                const teamLeaves = leaveStats.teamDistribution.find(t => t.team === team.name)?.count || 0;
                                const teamSize = employees.filter(e => e.team_id === team.id).length || 1;
                                const avgLeaves = teamSize > 0 ? (teamLeaves / teamSize).toFixed(1) : 0;
                                
                                return (
                                  <div key={team.id} className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                      <span className="font-medium">{team.name}</span>
                                      <span>{avgLeaves} days/employee</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                                      <div 
                                        className="bg-blue-600 h-2.5 rounded-full" 
                                        style={{ 
                                          width: `${Math.min(100, (teamLeaves / (teamSize * 20)) * 100)}%` 
                                        }}
                                      />
                                    </div>
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                      <span>{teamLeaves} days total</span>
                                      <span>{teamSize} members</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardHeader>
                            <CardTitle>Leave Approval Rate by Team</CardTitle>
                            <p className="text-sm text-muted-foreground">Approval statistics across teams</p>
                          </CardHeader>
                          <CardContent>
                            <div className="h-[300px]">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                  data={[
                                    ...leaveStats.teamApprovalRates,
                                  ]}
                                >
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="name" />
                                  <YAxis />
                                  <Tooltip />
                                  <Legend />
                                  <Bar dataKey="approved" stackId="a" fill="#4CAF50" name="Approved" />
                                  <Bar dataKey="pending" stackId="a" fill="#FFC107" name="Pending" />
                                  <Bar dataKey="rejected" stackId="a" fill="#F44336" name="Rejected" />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  )}
                  
                  {/* Detailed View Tab */}
                  {activeLeaveTab === 'details' && (
                    <div className="space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Leave Requests</CardTitle>
                          <p className="text-sm text-muted-foreground">Detailed view of all leave requests</p>
                        </CardHeader>
                        <CardContent>
                          <div className="max-w-full overflow-x-auto rounded-md border">
                            <table className="min-w-[760px] divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leave Type</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {filteredLeaves.map((leave) => (
                                  <tr key={leave.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm font-medium text-gray-900">
                                        {leave.employees?.name || 'Unknown'}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {teams.find(t => t.id === leave.employees?.team_id)?.name || 'Unassigned'}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <Badge variant="outline">
                                        {leave.leave_types?.name || 'N/A'}
                                      </Badge>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm text-gray-900">
                                        {new Date(leave.start_date).toLocaleDateString()}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        to {new Date(leave.end_date).toLocaleDateString()}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {formatLeaveDuration(leave)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <Badge 
                                        variant={
                                          leave.status === 'approved' ? 'default' :
                                          leave.status === 'pending' ? 'secondary' :
                                          'destructive'
                                        }
                                      >
                                        {leave.status || 'pending'}
                                      </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                                      {leave.reason || 'No reason provided'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          
                          <div className="mt-4 flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">
                              Showing <span className="font-medium">{Math.min(10, filteredLeaves.length)}</span> of{' '}
                              <span className="font-medium">{filteredLeaves.length}</span> requests
                            </p>
                            <div className="space-x-2">
                              <Button variant="outline" size="sm" disabled={true}>
                                Previous
                              </Button>
                              <Button variant="outline" size="sm" disabled={true}>
                                Next
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                          <CardHeader>
                            <CardTitle>Highest Leave Usage</CardTitle>
                            <p className="text-sm text-muted-foreground">Leave days in the selected report period</p>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              {leaveStats.topEmployees.slice(0, 5).map((employee) => {
                                return (
                                  <div key={employee.name} className="space-y-2">
                                    <div className="flex justify-between">
                                      <div>
                                        <p className="text-sm font-medium">{employee.name}</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-sm font-medium">{employee.days} days</p>
                                        <p className="text-xs text-muted-foreground">in selected period</p>
                                      </div>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                      <div 
                                        className="bg-blue-600 h-2 rounded-full" 
                                        style={{ 
                                          width: `${(employee.days / (leaveStats.topEmployees[0]?.days || 1)) * 100}%`
                                        }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardHeader>
                            <CardTitle>Upcoming & Ongoing Leave</CardTitle>
                            <p className="text-sm text-muted-foreground">Requests overlapping the selected period</p>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {filteredLeaves.slice(0, 6).map(leave => (
                                <div key={leave.id} className="flex items-center justify-between rounded-md border p-3">
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium">{leave.employees?.name || 'Unknown employee'}</p>
                                    <p className="text-xs text-muted-foreground">{leave.leave_types?.name || 'Leave'} · {format(parseDateLocal(leave.start_date), 'MMM d')} - {format(parseDateLocal(leave.end_date), 'MMM d')}</p>
                                  </div>
                                  <Badge variant={leave.status === 'approved' ? 'default' : leave.status === 'rejected' ? 'destructive' : 'secondary'}>{leave.status || 'pending'}</Badge>
                                </div>
                              ))}
                              {filteredLeaves.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No leaves match the current filters.</p>}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  )}
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" aria-label="Choose visible leave columns">
                          <Columns3 className="mr-2 h-4 w-4" />
                          Columns
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {LEAVE_TABLE_COLUMNS.map(column => (
                          <DropdownMenuCheckboxItem
                            key={column.key}
                            checked={visibleLeaveColumns[column.key]}
                            onCheckedChange={checked => setVisibleLeaveColumns(current => ({ ...current, [column.key]: checked === true }))}
                          >
                            {column.label}
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {filteredLeaves.length > 0 ? (
                    <div className="max-w-full overflow-x-auto rounded-md border">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            {visibleLeaveColumns.employee && <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Employee</th>}
                            {visibleLeaveColumns.team && <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Team</th>}
                            {visibleLeaveColumns.leaveType && <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Leave Type</th>}
                            {visibleLeaveColumns.dates && <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Dates</th>}
                            {visibleLeaveColumns.duration && <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Total Days</th>}
                            {visibleLeaveColumns.status && <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>}
                            {visibleLeaveColumns.reason && <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Reason</th>}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredLeaves.map((record, index) => (
                            <tr key={record.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              {visibleLeaveColumns.employee && <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {record.employees?.name || 'Unknown'}
                              </td>}
                              {visibleLeaveColumns.team && <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                {teams.find(t => t.id === record.employees?.team_id)?.name || 'Unassigned'}
                              </td>}
                              {visibleLeaveColumns.leaveType && <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                {record.leave_types?.name || 'Unknown'}
                              </td>}
                              {visibleLeaveColumns.dates && <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                {format(parseDateLocal(record.start_date), 'MMM dd, yyyy')} - {format(parseDateLocal(record.end_date), 'MMM dd, yyyy')}
                              </td>}
                              {visibleLeaveColumns.duration && <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatLeaveDuration(record)}
                              </td>}
                              {visibleLeaveColumns.status && <td className="px-4 py-4 whitespace-nowrap text-sm">
                                <Badge variant={
                                  record.status === 'approved' ? 'default' :
                                  record.status === 'pending' ? 'secondary' :
                                  'destructive'
                                }>
                                  {record.status}
                                </Badge>
                              </td>}
                              {visibleLeaveColumns.reason && <td className="max-w-xs truncate px-4 py-4 text-sm text-gray-900">
                                {record.reason || '-'}
                              </td>}
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
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Teams in view</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{teamPerformanceSummary.teams}</div><p className="text-xs text-muted-foreground">Selected date</p></CardContent></Card>
                    <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Average attendance</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{teamPerformanceSummary.averageAttendance.toFixed(1)}%</div><p className="text-xs text-muted-foreground">Present, including late</p></CardContent></Card>
                    <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">On approved leave</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{teamPerformanceSummary.totalOnLeave}</div><p className="text-xs text-muted-foreground">Across teams in view</p></CardContent></Card>
                    <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Needs attention</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-amber-600">{teamPerformanceSummary.teamsNeedingAttention}</div><p className="text-xs text-muted-foreground">Below 80% attendance or above 25% leave</p></CardContent></Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Team Performance</CardTitle>
                      <p className="text-sm text-muted-foreground">Headcount-based attendance and approved leave for {format(selectedDate, 'PPP')}.</p>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[360px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={teamPerformanceRows} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="teamName" />
                            <YAxis domain={[0, 100]} unit="%" />
                            <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                            <Legend />
                            <Bar dataKey="attendance_rate" name="Attendance" fill="#2563eb" />
                            <Bar dataKey="leave_rate" name="Approved leave" fill="#16a34a" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Team Detail</CardTitle>
                      <p className="text-sm text-muted-foreground">Use the counts to understand what drives each team’s rate.</p>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto rounded-md border">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50"><tr>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Team</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">People</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Present</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Late</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Absent</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">On leave</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Attendance</th>
                          </tr></thead>
                          <tbody className="divide-y divide-gray-200 bg-white">{teamPerformanceRows.map(row => (
                            <tr key={row.team_id || 'unassigned'}>
                              <td className="whitespace-nowrap px-4 py-3 text-sm font-medium">{row.teamName}</td>
                              <td className="px-4 py-3 text-sm">{row.team_size}</td>
                              <td className="px-4 py-3 text-sm text-green-700">{row.present}</td>
                              <td className="px-4 py-3 text-sm text-amber-700">{row.late}</td>
                              <td className="px-4 py-3 text-sm text-red-700">{row.absent}</td>
                              <td className="px-4 py-3 text-sm text-blue-700">{row.on_leave}</td>
                              <td className="min-w-[170px] px-4 py-3 text-sm"><div className="flex items-center gap-2"><div className="h-2 flex-1 rounded-full bg-gray-200"><div className={`h-2 rounded-full ${row.attendance_rate < 80 ? 'bg-amber-500' : 'bg-blue-600'}`} style={{ width: `${Math.min(100, row.attendance_rate)}%` }} /></div><span className="w-12 text-right">{row.attendance_rate.toFixed(1)}%</span></div></td>
                            </tr>
                          ))}</tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
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