import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useTheme } from '@/contexts/ThemeContext';
import { THEME_OPTIONS } from '@/contexts/ThemeContext';
import { toast } from '@/hooks/use-toast';
import { formatLeaveDuration } from '@/utils/leaveDuration';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

import {
  CalendarDays,
  Users,
  Clock3,
  TrendingUp,
  UserCheck,
  UserX,
  TimerReset,
  Plane,
  Download,
  Building2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Activity,
  BarChart3,
  CalendarRange,
  Search,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area
} from 'recharts';

import * as XLSX from 'xlsx';

type DateFilter =
  | 'day'
  | 'week'
  | 'month'
  | 'quarter'
  | 'halfyear'
  | 'year';

interface Employee {
  id: string;
  name: string;
  email: string;
  position: string;
  role: string;
  team_id: string | null;
}

interface Team {
  id: string;
  name: string;
}

interface Attendance {
  id: string;
  employee_id: string;
  company_id: string;
  date: string;
  status: string;
  check_in_time: string | null;
  check_out_time: string | null;
}

interface LeaveType {
  id: string;
  name: string;
}

interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type_id: string | null;
  start_date: string;
  end_date: string;
  total_days: number;
  duration_type?: string | null;
  session?: string | null;
  status: string | null;
  reason: string | null;
}

const COLORS = {
  present: '#16a34a',
  absent: '#dc2626',
  late: '#f59e0b',
  leave: '#3b82f6',
  pending: '#f59e0b',
  approved: '#16a34a',
  rejected: '#dc2626'
};

const ReportsAnalytics2 = () => {
  const { currentCompany } = useCompany();

  const [activeTab, setActiveTab] = useState('attendance');

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Tab-specific loading states
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [teamLoading, setTeamLoading] = useState(false);
  const { theme } = useTheme();
  const themeClass = THEME_OPTIONS.find(t => t.key === theme)?.className || '';

  // Attendance Filters
  const [attendanceRange, setAttendanceRange] = useState<DateFilter>('day');
  const [attendanceTeam, setAttendanceTeam] = useState<string>('all');
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [attendancePage, setAttendancePage] = useState(1);
  const [attendancePageSize, setAttendancePageSize] = useState(10);

  // Leave Filters
  const [leaveRange, setLeaveRange] = useState<DateFilter>('month');
  const [leaveTeam, setLeaveTeam] = useState<string>('all');
  const [leaveStatus, setLeaveStatus] = useState<string>('all');
  const [leaveSearch, setLeaveSearch] = useState('');
  const [leavePage, setLeavePage] = useState(1);
  const [leavePageSize, setLeavePageSize] = useState(10);

  // Team Filters
  const [teamRange, setTeamRange] = useState<DateFilter>('month');
  const [teamPage, setTeamPage] = useState(1);
  const [teamPageSize, setTeamPageSize] = useState(10);

  const getDateRange = (range: DateFilter) => {
    const end = new Date();
    const start = new Date();

    switch (range) {
      case 'day':
        break;

      case 'week':
        start.setDate(end.getDate() - 7);
        break;

      case 'month':
        start.setMonth(end.getMonth() - 1);
        break;

      case 'quarter':
        start.setMonth(end.getMonth() - 3);
        break;

      case 'halfyear':
        start.setMonth(end.getMonth() - 6);
        break;

      case 'year':
        start.setFullYear(end.getFullYear() - 1);
        break;
    }

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  };

  // Base data fetching (employees, teams, leave types - shared across tabs)
  const fetchBaseData = useCallback(async () => {
    if (!currentCompany?.id) return;

    try {
      const [employeeRes, teamsRes, leaveTypesRes] = await Promise.all([
        supabase
          .from('employees')
          .select('*')
          .eq('company_id', currentCompany.id)
          .eq('is_active', true)
          .order('name'),

        supabase
          .from('teams')
          .select('id, name')
          .eq('company_id', currentCompany.id)
          .eq('is_active', true)
          .order('name'),

        supabase
          .from('leave_types')
          .select('id, name')
          .eq('company_id', currentCompany.id)
      ]);

      if (employeeRes.error || teamsRes.error || leaveTypesRes.error) {
        throw new Error('Failed to fetch base data');
      }

      setEmployees(employeeRes.data || []);
      setTeams(teamsRes.data || []);
      setLeaveTypes(leaveTypesRes.data || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load base data');
      toast({
        title: 'Error',
        description: err.message || 'Failed to load base data',
        variant: 'destructive'
      });
    }
  }, [currentCompany]);

  // Tab-specific data fetching
  const fetchAttendanceData = useCallback(async () => {
    if (!currentCompany?.id) return;

    try {
      setAttendanceLoading(true);
      setError(null);

      const attendanceDates = getDateRange(attendanceRange);
      const today = new Date().toISOString().split('T')[0];

      const [attendanceRes] = await Promise.all([
        supabase
          .from('attendance')
          .select('*')
          .eq('company_id', currentCompany.id)
          .gte('date', attendanceDates.start)
          .lte('date', today)
      ]);

      if (attendanceRes.error) {
        throw new Error('Failed to fetch attendance data');
      }

      setAttendance(attendanceRes.data || []);
      setAttendancePage(1);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load attendance data');
      toast({
        title: 'Error',
        description: err.message || 'Failed to load attendance data',
        variant: 'destructive'
      });
    } finally {
      setAttendanceLoading(false);
    }
  }, [currentCompany, attendanceRange]);

  const fetchLeaveData = useCallback(async () => {
    if (!currentCompany?.id) return;

    try {
      setLeaveLoading(true);
      setError(null);

      const leaveDates = getDateRange(leaveRange);

      const [leaveRes] = await Promise.all([
        supabase
          .from('leave_requests')
          .select('*')
          .eq('company_id', currentCompany.id)
          .gte('start_date', leaveDates.start)
          .lte('start_date', new Date().toISOString().split('T')[0])
      ]);

      if (leaveRes.error) {
        throw new Error('Failed to fetch leave data');
      }

      setLeaveRequests(leaveRes.data || []);
      setLeavePage(1);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load leave data');
      toast({
        title: 'Error',
        description: err.message || 'Failed to load leave data',
        variant: 'destructive'
      });
    } finally {
      setLeaveLoading(false);
    }
  }, [currentCompany, leaveRange]);

  const fetchTeamData = useCallback(async () => {
    if (!currentCompany?.id) return;

    try {
      setTeamLoading(true);
      setError(null);

      const teamDates = getDateRange(teamRange);
      const today = new Date().toISOString().split('T')[0];

      const [attendanceRes, leaveRes] = await Promise.all([
        supabase
          .from('attendance')
          .select('*')
          .eq('company_id', currentCompany.id)
          .gte('date', teamDates.start)
          .lte('date', today),

        supabase
          .from('leave_requests')
          .select('*')
          .eq('company_id', currentCompany.id)
          .gte('start_date', teamDates.start)
          .lte('start_date', today)
      ]);

      if (attendanceRes.error || leaveRes.error) {
        throw new Error('Failed to fetch team data');
      }

      setAttendance(attendanceRes.data || []);
      setLeaveRequests(leaveRes.data || []);
      setTeamPage(1);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load team data');
      toast({
        title: 'Error',
        description: err.message || 'Failed to load team data',
        variant: 'destructive'
      });
    } finally {
      setTeamLoading(false);
    }
  }, [currentCompany, teamRange]);

  // Main data fetch function - calls appropriate tab-specific function
  const fetchData = useCallback(async () => {
    // Always fetch base data first
    await fetchBaseData();

    // Then fetch tab-specific data
    switch (activeTab) {
      case 'attendance':
        await fetchAttendanceData();
        break;
      case 'leave':
        await fetchLeaveData();
        break;
      case 'teams':
        await fetchTeamData();
        break;
    }
  }, [activeTab, fetchBaseData, fetchAttendanceData, fetchLeaveData, fetchTeamData]);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Tab-specific filter changes
  useEffect(() => {
    if (activeTab === 'attendance' && employees.length > 0) {
      fetchAttendanceData();
    }
  }, [attendanceRange, attendanceTeam, attendanceSearch, activeTab, fetchAttendanceData]);

  useEffect(() => {
    if (activeTab === 'leave' && employees.length > 0) {
      fetchLeaveData();
    }
  }, [leaveRange, leaveTeam, leaveStatus, leaveSearch, activeTab, fetchLeaveData]);

  useEffect(() => {
    if (activeTab === 'teams' && employees.length > 0) {
      fetchTeamData();
    }
  }, [teamRange, activeTab, fetchTeamData]);

  // Pagination handlers
  const handleAttendancePageChange = (newPage: number) => {
    setAttendancePage(Math.max(1, newPage));
  };

  const handleLeavePageChange = (newPage: number) => {
    setLeavePage(Math.max(1, newPage));
  };

  const handleTeamPageChange = (newPage: number) => {
    setTeamPage(Math.max(1, newPage));
  };

  const handleAttendancePageSizeChange = (newPageSize: string) => {
    setAttendancePageSize(Number(newPageSize));
    setAttendancePage(1);
  };

  const handleLeavePageSizeChange = (newPageSize: string) => {
    setLeavePageSize(Number(newPageSize));
    setLeavePage(1);
  };

  const handleTeamPageSizeChange = (newPageSize: string) => {
    setTeamPageSize(Number(newPageSize));
    setTeamPage(1);
  };

  // Attendance Analysis

  const attendanceFilteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      if (
        attendanceTeam !== 'all' &&
        emp.team_id !== attendanceTeam
      ) {
        return false;
      }

      if (
        attendanceSearch &&
        !emp.name
          .toLowerCase()
          .includes(attendanceSearch.toLowerCase())
      ) {
        return false;
      }

      return true;
    });
  }, [employees, attendanceTeam, attendanceSearch]);

  const attendanceEmployeeIds =
    attendanceFilteredEmployees.map(e => e.id);

  const attendanceDates = getDateRange(attendanceRange);

  const attendanceRecords = useMemo(() => {
    // Get existing attendance records and determine late status
    const existingRecords = attendance.filter(record => {
      return (
        attendanceEmployeeIds.includes(record.employee_id) &&
        record.date >= attendanceDates.start &&
        record.date <= attendanceDates.end
      );
    }).map(record => {
      // Determine if employee is late based on check-in time after 9:20 AM
      if (record.check_in_time && record.status === 'present') {
        const checkInTime = new Date(record.check_in_time);
        const checkInHour = checkInTime.getHours();
        const checkInMinute = checkInTime.getMinutes();
        
        // Mark as late if check-in is after 9:20 AM (9:20 = 9 hours, 20 minutes)
        if (checkInHour > 9 || (checkInHour === 9 && checkInMinute > 20)) {
          return { ...record, status: 'late' };
        }
      }
      return record;
    });

    // Generate attendance records for employees who haven't marked attendance
    const allDates = [];
    const startDate = new Date(attendanceDates.start);
    const endDate = new Date(attendanceDates.end);
    
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      allDates.push(date.toISOString().split('T')[0]);
    }

    const additionalRecords = [];
    
    attendanceFilteredEmployees.forEach(employee => {
      allDates.forEach(date => {
        const hasExistingRecord = existingRecords.some(
          record => record.employee_id === employee.id && record.date === date
        );
        
        if (!hasExistingRecord) {
          // Check if employee has approved leave for this date
          const hasLeave = leaveRequests.some(leave => 
            leave.employee_id === employee.id &&
            leave.status === 'approved' &&
            leave.start_date <= date &&
            leave.end_date >= date
          );
          
          additionalRecords.push({
            id: `absent-${employee.id}-${date}`,
            employee_id: employee.id,
            company_id: currentCompany?.id || '',
            date,
            status: hasLeave ? 'leave' : 'absent',
            check_in_time: null,
            check_out_time: null
          });
        }
      });
    });

    return [...existingRecords, ...additionalRecords];
  }, [attendance, attendanceEmployeeIds, attendanceDates, attendanceFilteredEmployees, leaveRequests, currentCompany]);

  // Pagination calculations
  const attendanceTotalPages = Math.ceil(attendanceRecords.length / attendancePageSize);
  const paginatedAttendanceRecords = useMemo(() => {
    const startIndex = (attendancePage - 1) * attendancePageSize;
    const endIndex = startIndex + attendancePageSize;
    return attendanceRecords.slice(startIndex, endIndex);
  }, [attendanceRecords, attendancePage, attendancePageSize]);

  const attendanceStats = useMemo(() => {
    const totalEmployees =
      attendanceFilteredEmployees.length;

    const totalWorkingRecords =
      attendanceRecords.length;

    const present = attendanceRecords.filter(
      r => r.status === 'present' || r.status === 'half_day' || r.status === 'work_from_home'
    ).length;

    const late = attendanceRecords.filter(
      r => r.status === 'late'
    ).length;

    const absent = attendanceRecords.filter(
      r => r.status === 'absent'
    ).length;

    const onLeave = attendanceRecords.filter(
      r => r.status === 'leave'
    ).length;

    const approvedLeaves = leaveRequests.filter(
      l =>
        l.status === 'approved' &&
        attendanceEmployeeIds.includes(
          l.employee_id
        )
    ).length;

    const attendanceRate =
      totalWorkingRecords > 0
        ? Math.min(
            100,
            Number(
              (
                (present / totalWorkingRecords) *
                100
              ).toFixed(1)
            )
          )
        : 0;

    const absenceRate =
      totalWorkingRecords > 0
        ? Math.min(
            100,
            Number(
              (
                (absent / totalWorkingRecords) *
                100
              ).toFixed(1)
            )
          )
        : 0;

    return {
      totalEmployees,
      totalWorkingRecords,
      present,
      late,
      absent,
      onLeave,
      approvedLeaves,
      attendanceRate,
      absenceRate
    };
  }, [
    attendanceRecords,
    attendanceFilteredEmployees,
    leaveRequests
  ]);

  // Leave Analysis

  const leaveDates = getDateRange(leaveRange);

  const filteredLeaves = useMemo(() => {
    return leaveRequests.filter(leave => {
      const employee = employees.find(
        e => e.id === leave.employee_id
      );

      if (!employee) return false;

      if (
        leaveTeam !== 'all' &&
        employee.team_id !== leaveTeam
      ) {
        return false;
      }

      if (
        leaveStatus !== 'all' &&
        leave.status !== leaveStatus
      ) {
        return false;
      }

      if (
        leave.start_date < leaveDates.start ||
        leave.start_date > leaveDates.end
      ) {
        return false;
      }

      if (
        leaveSearch &&
        !employee.name
          .toLowerCase()
          .includes(leaveSearch.toLowerCase())
      ) {
        return false;
      }

      return true;
    });
  }, [
    leaveRequests,
    leaveTeam,
    leaveStatus,
    leaveDates,
    employees,
    leaveSearch
  ]);

  // Leave pagination calculations
  const leaveTotalPages = Math.ceil(filteredLeaves.length / leavePageSize);
  const paginatedLeaveRequests = useMemo(() => {
    const startIndex = (leavePage - 1) * leavePageSize;
    const endIndex = startIndex + leavePageSize;
    return filteredLeaves.slice(startIndex, endIndex);
  }, [filteredLeaves, leavePage, leavePageSize]);

  const leaveStats = useMemo(() => {
    const total = filteredLeaves.length;

    const approved = filteredLeaves.filter(
      l => l.status === 'approved'
    ).length;

    const pending = filteredLeaves.filter(
      l => l.status === 'pending'
    ).length;

    const rejected = filteredLeaves.filter(
      l => l.status === 'rejected'
    ).length;

    const totalDays = filteredLeaves.reduce(
      (sum, leave) => sum + (leave.total_days || 0),
      0
    );

    const avgDuration =
      total > 0
        ? Number((totalDays / total).toFixed(1))
        : 0;

    return {
      total,
      approved,
      pending,
      rejected,
      totalDays,
      avgDuration
    };
  }, [filteredLeaves]);

  // Team Analytics

  const teamDates = getDateRange(teamRange);

  const teamAnalytics = useMemo(() => {
    return teams.map(team => {
      const teamEmployees = employees.filter(
        e => e.team_id === team.id
      );

      const employeeIds =
        teamEmployees.map(e => e.id);

      const teamAttendance = attendance.filter(
        a =>
          employeeIds.includes(a.employee_id) &&
          a.date >= teamDates.start &&
          a.date <= teamDates.end
      );

      const present = teamAttendance.filter(
        a =>
          a.status === 'present' ||
          a.status === 'late' ||
          a.status === 'half_day' ||
          a.status === 'work_from_home'
      ).length;

      const absent = teamAttendance.filter(
        a => a.status === 'absent'
      ).length;

      const totalRecords =
        teamAttendance.length;

      const attendanceRate =
        totalRecords > 0
          ? Math.min(
              100,
              Number(
                (
                  (present / totalRecords) *
                  100
                ).toFixed(1)
              )
            )
          : 0;

      const leaveCount = leaveRequests.filter(
        l =>
          employeeIds.includes(l.employee_id) &&
          l.start_date >= teamDates.start &&
          l.start_date <= teamDates.end
      ).length;

      return {
        team: team.name,
        employees: teamEmployees.length,
        attendanceRate,
        absent,
        leaveCount
      };
    });
  }, [
    teams,
    employees,
    attendance,
    leaveRequests,
    teamDates
  ]);

  // Team pagination calculations
  const teamTotalPages = Math.ceil(teamAnalytics.length / teamPageSize);
  const paginatedTeamAnalytics = useMemo(() => {
    const startIndex = (teamPage - 1) * teamPageSize;
    const endIndex = startIndex + teamPageSize;
    return teamAnalytics.slice(startIndex, endIndex);
  }, [teamAnalytics, teamPage, teamPageSize]);

  const exportAttendance = () => {
    const data = attendanceRecords.map(record => {
      const employee = employees.find(
        e => e.id === record.employee_id
      );

      return {
        Employee: employee?.name,
        Date: record.date,
        Status: record.status,
        CheckIn: record.check_in_time,
        CheckOut: record.check_out_time
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      wb,
      ws,
      'Attendance'
    );

    XLSX.writeFile(
      wb,
      'attendance_analytics.xlsx'
    );
  };

  const exportLeaves = () => {
    const data = filteredLeaves.map(leave => {
      const employee = employees.find(
        e => e.id === leave.employee_id
      );

      return {
        Employee: employee?.name,
        StartDate: leave.start_date,
        EndDate: leave.end_date,
        Days: leave.total_days,
        Status: leave.status,
        Reason: leave.reason
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      wb,
      ws,
      'Leaves'
    );

    XLSX.writeFile(wb, 'leave_analytics.xlsx');
  };

  const exportTeams = () => {
    const ws = XLSX.utils.json_to_sheet(
      teamAnalytics
    );

    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      wb,
      ws,
      'Teams'
    );

    XLSX.writeFile(wb, 'team_analytics.xlsx');
  };

  // Skeleton components
  const StatsSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="border-0 shadow-lg bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                <div className="h-8 bg-gray-200 rounded w-12 animate-pulse"></div>
              </div>
              <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const TableSkeleton = () => (
    <div className="space-y-4">
      <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              {[...Array(5)].map((_, i) => (
                <th key={i} className="text-left p-3">
                  <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(10)].map((_, i) => (
              <tr key={i} className="border-b">
                {[...Array(5)].map((_, j) => (
                  <td key={j} className="p-3">
                    <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (loading && employees.length === 0) {
    return (
      <div className="flex justify-center items-center h-[500px]">
        <div className="text-muted-foreground text-lg">
          Loading analytics...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-[500px]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-red-800">Error Loading Data</h3>
            <p className="text-red-600 mt-1">{error}</p>
          </div>
          <Button 
            onClick={fetchData} 
            className="mt-4"
            variant="outline"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 p-3 rounded-2xl">
          <BarChart3 className="h-7 w-7 text-primary" />
        </div>

        <div>
          <h1 className="text-3xl font-bold">
            Reports & Analytics
          </h1>

          <p className="text-muted-foreground">
            Advanced workforce intelligence &
            trends
          </p>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid grid-cols-3 w-full h-14">
          <TabsTrigger value="attendance">
            Attendance
          </TabsTrigger>

          <TabsTrigger value="leave">
            Leave
          </TabsTrigger>

          <TabsTrigger value="teams">
            Teams
          </TabsTrigger>
        </TabsList>

        {/* ATTENDANCE */}

        <TabsContent
          value="attendance"
          className="space-y-6"
        >
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>
                Attendance Overview
              </CardTitle>
            </CardHeader>

            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4">
                <Select
                  value={attendanceRange}
                  onValueChange={(v: DateFilter) =>
                    setAttendanceRange(v)
                  }
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="day">
                      Today
                    </SelectItem>

                    <SelectItem value="week">
                      This Week
                    </SelectItem>

                    <SelectItem value="month">
                      This Month
                    </SelectItem>

                    <SelectItem value="quarter">
                      Quarter
                    </SelectItem>

                    <SelectItem value="halfyear">
                      Half Year
                    </SelectItem>

                    <SelectItem value="year">
                      Year
                    </SelectItem>
                  </SelectContent>
                </Select>

                {teams.length > 0 && (
                  <Select
                    value={attendanceTeam}
                    onValueChange={setAttendanceTeam}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="all">
                        All Teams
                      </SelectItem>

                      {teams.map(team => (
                        <SelectItem
                          key={team.id}
                          value={team.id}
                        >
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <Input
                  placeholder="Search employees..."
                  value={attendanceSearch}
                  onChange={e =>
                    setAttendanceSearch(
                      e.target.value
                    )
                  }
                  className="w-[250px]"
                />
              </div>
            </CardContent>
          </Card>

          {attendanceLoading ? (
            <StatsSkeleton />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5">
              <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Attendance Rate
                      </p>

                      <h2 className="text-3xl font-bold text-green-700">
                        {attendanceStats.attendanceRate}%
                      </h2>
                    </div>

                    <TrendingUp className="h-10 w-10 text-green-700" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-red-100">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Absence Rate
                      </p>

                      <h2 className="text-3xl font-bold text-red-700">
                        {attendanceStats.absenceRate}%
                      </h2>
                    </div>

                    <TrendingUp className="h-10 w-10 text-red-700" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-amber-100">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Late Marks
                      </p>

                      <h2 className="text-3xl font-bold text-amber-700">
                        {attendanceStats.late}
                      </h2>
                    </div>

                    <Clock3 className="h-10 w-10 text-amber-700" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-50 to-indigo-100">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Employees
                      </p>

                      <h2 className="text-3xl font-bold text-indigo-700">
                        {attendanceStats.totalEmployees}
                      </h2>
                    </div>

                    <Users className="h-10 w-10 text-indigo-700" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        On Leave
                      </p>

                      <h2 className="text-3xl font-bold text-blue-700">
                        {attendanceStats.onLeave}
                      </h2>
                    </div>

                    <Plane className="h-10 w-10 text-blue-700" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>
                  Attendance Distribution
                </CardTitle>
              </CardHeader>

              <CardContent className="h-[350px]">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <PieChart>
                    <Pie
                      data={[
                        {
                          name: 'Present',
                          value:
                            attendanceStats.present
                        },
                        {
                          name: 'Absent',
                          value:
                            attendanceStats.absent
                        },
                        {
                          name: 'Late',
                          value: attendanceStats.late
                        },
                        {
                          name: 'On Leave',
                          value: attendanceStats.onLeave
                        }
                      ]}
                      dataKey="value"
                      outerRadius={120}
                      label
                    >
                      <Cell fill={COLORS.present} />
                      <Cell fill={COLORS.absent} />
                      <Cell fill={COLORS.late} />
                      <Cell fill={COLORS.leave} />
                    </Pie>

                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>
                  Team Attendance Trend
                </CardTitle>
              </CardHeader>

              <CardContent className="h-[350px]">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <BarChart data={teamAnalytics}>
                    <CartesianGrid strokeDasharray="3 3" />

                    <XAxis dataKey="team" />

                    <YAxis domain={[0, 100]} />

                    <Tooltip />

                    <Bar
                      dataKey="attendanceRate"
                      radius={[8, 8, 0, 0]}
                      fill="#3b82f6"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Attendance Records */}

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  Attendance Records
                </CardTitle>
                <Button
                  onClick={() => exportAttendance('xlsx')}
                  className="mt-4"
                  variant="outline"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export Excel
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              {attendanceLoading ? (
                <TableSkeleton />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="text-left p-3">
                          Employee
                        </th>
                        <th className="text-left p-3">
                          Date
                        </th>
                        <th className="text-left p-3">
                          Status
                        </th>
                        <th className="text-left p-3">
                          Check In
                        </th>
                        <th className="text-left p-3">
                          Check Out
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {paginatedAttendanceRecords.map(record => {
                        const employee =
                          employees.find(
                            e =>
                              e.id ===
                              record.employee_id
                          );

                        return (
                          <tr
                            key={record.id}
                            className="border-b hover:bg-muted/30"
                          >
                            <td className="p-3 font-medium">
                              {employee?.name}
                            </td>

                            <td className="p-3">
                              {record.date}
                            </td>

                            <td className="p-3">
                              <Badge
                                className={
                                  record.status === 'present'
                                    ? 'bg-green-100 text-green-700'
                                    : record.status === 'late'
                                    ? 'bg-amber-100 text-amber-700'
                                    : record.status === 'leave'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-red-100 text-red-700'
                                }
                              >
                                {record.status === 'leave' ? 'On Leave' : record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                              </Badge>
                            </td>

                            <td className="p-3">
                              {record.check_in_time
                                ? new Date(
                                    record.check_in_time
                                  ).toLocaleTimeString()
                                : '-'}
                            </td>

                            <td className="p-3">
                              {record.check_out_time
                                ? new Date(
                                    record.check_out_time
                                  ).toLocaleTimeString()
                                : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Attendance Pagination */}
                  {attendanceTotalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <div className="text-sm text-muted-foreground">
                        Page {attendancePage} of {attendanceTotalPages} - Showing {paginatedAttendanceRecords.length} of {attendanceRecords.length} records
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Rows per page:</span>
                          <Select value={attendancePageSize.toString()} onValueChange={handleAttendancePageSizeChange}>
                            <SelectTrigger className="w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="5">5</SelectItem>
                              <SelectItem value="10">10</SelectItem>
                              <SelectItem value="20">20</SelectItem>
                              <SelectItem value="50">50</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="gradient"
                            size="sm"
                            onClick={() => handleAttendancePageChange(attendancePage - 1)}
                            disabled={attendancePage === 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="gradient"
                            size="sm"
                            onClick={() => handleAttendancePageChange(attendancePage + 1)}
                            disabled={attendancePage === attendanceTotalPages}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* LEAVE */}

        <TabsContent
          value="leave"
          className="space-y-6"
        >
          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4">
                <Select
                  value={leaveRange}
                  onValueChange={(v: DateFilter) =>
                    setLeaveRange(v)
                  }
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="day">
                      Today
                    </SelectItem>
                    <SelectItem value="week">
                      Weekly
                    </SelectItem>
                    <SelectItem value="month">
                      Monthly
                    </SelectItem>
                    <SelectItem value="quarter">
                      Quarterly
                    </SelectItem>
                    <SelectItem value="halfyear">
                      Half Yearly
                    </SelectItem>
                    <SelectItem value="year">
                      Yearly
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={leaveTeam}
                  onValueChange={setLeaveTeam}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="all">
                      All Teams
                    </SelectItem>

                    {teams.map(team => (
                      <SelectItem
                        key={team.id}
                        value={team.id}
                      >
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={leaveStatus}
                  onValueChange={setLeaveStatus}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="all">
                      All Status
                    </SelectItem>

                    <SelectItem value="approved">
                      Approved
                    </SelectItem>

                    <SelectItem value="pending">
                      Pending
                    </SelectItem>

                    <SelectItem value="rejected">
                      Rejected
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  placeholder="Search employee..."
                  value={leaveSearch}
                  onChange={e =>
                    setLeaveSearch(
                      e.target.value
                    )
                  }
                  className="w-[240px]"
                />

                <Button
                  className="ml-auto"
                  onClick={exportLeaves}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-0 shadow-lg">
              <CardContent className="pt-6">
                <div className="flex justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Total Leaves
                    </p>

                    <h2 className="text-3xl font-bold text-blue-700">
                      {leaveStats.total}
                    </h2>
                  </div>

                  <Plane className="h-9 w-9 text-blue-700" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-0 shadow-lg">
              <CardContent className="pt-6">
                <div className="flex justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Approved
                    </p>

                    <h2 className="text-3xl font-bold text-green-700">
                      {leaveStats.approved}
                    </h2>
                  </div>

                  <CheckCircle2 className="h-9 w-9 text-green-700" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-0 shadow-lg">
              <CardContent className="pt-6">
                <div className="flex justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Pending
                    </p>

                    <h2 className="text-3xl font-bold text-amber-700">
                      {leaveStats.pending}
                    </h2>
                  </div>

                  <AlertTriangle className="h-9 w-9 text-amber-700" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-50 to-red-100 border-0 shadow-lg">
              <CardContent className="pt-6">
                <div className="flex justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Rejected
                    </p>

                    <h2 className="text-3xl font-bold text-red-700">
                      {leaveStats.rejected}
                    </h2>
                  </div>

                  <XCircle className="h-9 w-9 text-red-700" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>
                Leave Requests
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-left p-3">
                        Employee
                      </th>

                      <th className="text-left p-3">
                        Duration
                      </th>

                      <th className="text-left p-3">
                        Days
                      </th>

                      <th className="text-left p-3">
                        Status
                      </th>

                      <th className="text-left p-3">
                        Reason
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedLeaveRequests.map(leave => {
                      const employee =
                        employees.find(
                          e =>
                            e.id ===
                            leave.employee_id
                        );

                      return (
                        <tr
                          key={leave.id}
                          className="border-b hover:bg-muted/30"
                        >
                          <td className="p-3 font-medium">
                            {employee?.name}
                          </td>

                          <td className="p-3">
                            {leave.start_date} →{' '}
                            {leave.end_date}
                          </td>

                          <td className="p-3">
                            {formatLeaveDuration(leave)}
                          </td>

                          <td className="p-3">
                            <Badge
                              className={
                                leave.status ===
                                'approved'
                                  ? 'bg-green-100 text-green-700'
                                  : leave.status ===
                                    'pending'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-red-100 text-red-700'
                              }
                            >
                              {leave.status}
                            </Badge>
                          </td>

                          <td className="p-3">
                            {leave.reason}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Leave Pagination */}
                {leaveTotalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Page {leavePage} of {leaveTotalPages} - Showing {paginatedLeaveRequests.length} of {filteredLeaves.length} requests
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Rows per page:</span>
                        <Select value={leavePageSize.toString()} onValueChange={handleLeavePageSizeChange}>
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">5</SelectItem>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="20">20</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="gradient"
                          size="sm"
                          onClick={() => handleLeavePageChange(leavePage - 1)}
                          disabled={leavePage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="gradient"
                          size="sm"
                          onClick={() => handleLeavePageChange(leavePage + 1)}
                          disabled={leavePage === leaveTotalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TEAM */}

        <TabsContent
          value="teams"
          className="space-y-6"
        >
          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4">
                <Select
                  value={teamRange}
                  onValueChange={(v: DateFilter) =>
                    setTeamRange(v)
                  }
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="day">
                      Today
                    </SelectItem>

                    <SelectItem value="week">
                      Weekly
                    </SelectItem>

                    <SelectItem value="month">
                      Monthly
                    </SelectItem>

                    <SelectItem value="quarter">
                      Quarterly
                    </SelectItem>

                    <SelectItem value="halfyear">
                      Half Yearly
                    </SelectItem>

                    <SelectItem value="year">
                      Yearly
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  className="ml-auto"
                  onClick={exportTeams}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>
                Department Performance
              </CardTitle>
            </CardHeader>

            <CardContent className="h-[450px]">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <AreaChart data={teamAnalytics}>
                  <defs>
                    <linearGradient
                      id="colorAttendance"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#3b82f6"
                        stopOpacity={0.8}
                      />

                      <stop
                        offset="95%"
                        stopColor="#3b82f6"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" />

                  <XAxis dataKey="team" />

                  <YAxis domain={[0, 100]} />

                  <Tooltip />

                  <Area
                    type="monotone"
                    dataKey="attendanceRate"
                    stroke="#3b82f6"
                    fillOpacity={1}
                    fill="url(#colorAttendance)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>
                Team Analytics Table
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-left p-3">
                        Team
                      </th>

                      <th className="text-left p-3">
                        Employees
                      </th>

                      <th className="text-left p-3">
                        Attendance %
                      </th>

                      <th className="text-left p-3">
                        Absent Records
                      </th>

                      <th className="text-left p-3">
                        Leave Requests
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedTeamAnalytics.map(team => (
                      <tr
                        key={team.team}
                        className="border-b hover:bg-muted/30"
                      >
                        <td className="p-3 font-medium">
                          {team.team}
                        </td>

                        <td className="p-3">
                          {team.employees}
                        </td>

                        <td className="p-3">
                          <Badge className="bg-blue-100 text-blue-700">
                            {team.attendanceRate}%
                          </Badge>
                        </td>

                        <td className="p-3">
                          {team.absent}
                        </td>

                        <td className="p-3">
                          {team.leaveCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Team Pagination */}
                {teamTotalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Page {teamPage} of {teamTotalPages} - Showing {paginatedTeamAnalytics.length} of {teamAnalytics.length} teams
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Rows per page:</span>
                        <Select value={teamPageSize.toString()} onValueChange={handleTeamPageSizeChange}>
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">5</SelectItem>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="20">20</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="gradient"
                          size="sm"
                          onClick={() => handleTeamPageChange(teamPage - 1)}
                          disabled={teamPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="gradient"
                          size="sm"
                          onClick={() => handleTeamPageChange(teamPage + 1)}
                          disabled={teamPage === teamTotalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsAnalytics2;