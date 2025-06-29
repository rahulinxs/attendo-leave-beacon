import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';

interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  approved_at?: string;
  updated_at?: string;
  leave_types: {
    name: string;
  };
  employees: {
    name: string;
    department: string;
    reporting_manager_id?: string;
  };
}

interface LeaveBalance {
  leave_type_id: string;
  allocated_days: number;
  used_days: number;
  leave_types: {
    name: string;
  };
}

export const useLeave = (mode: 'employee' | 'manager' = 'employee') => {
  const { user } = useAuth();
  const { currentCompany } = useCompany();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [pendingRequests, setPendingRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLeaveRequests = async () => {
    if (!user || !currentCompany) return;

    try {
      let query = supabase
        .from('leave_requests')
        .select(`
          id,
          employee_id,
          leave_type_id,
          start_date,
          end_date,
          total_days,
          reason,
          status,
          approved_by,
          approved_at,
          updated_at,
          created_at,
          leave_types (
            name
          )
        `)
        .eq('company_id', currentCompany.id)
        .order('created_at', { ascending: false });

      if (mode === 'employee') {
        query = query.eq('employee_id', user.id);
      } else if (mode === 'manager') {
        if (user.role === 'employee') {
          query = query.eq('employee_id', user.id);
        } else if (user.role === 'reporting_manager') {
          // Fetch employees who report to this manager
          const { data: teamMembers, error: teamError } = await supabase
            .from('employees')
            .select('id')
            .eq('company_id', currentCompany.id)
            .eq('reporting_manager_id', user.id)
            .eq('is_active', true);
          const teamIds = teamMembers ? teamMembers.map(e => e.id) : [];
          // Show requests for self and team
          query = query.in('employee_id', [user.id, ...teamIds]);
        }
        // Admins and super_admins see all requests (already filtered by company_id)
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching leave requests:', error);
        return;
      }

      // Get employee data separately to avoid complex joins
      const employeeIds = [...new Set((data as any[])?.map(req => req.employee_id) || [])];
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('id, name, department, reporting_manager_id')
        .in('id', employeeIds);

      if (employeeError) {
        console.error('Error fetching employee data:', employeeError);
        return;
      }

      const employeeMap = new Map();
      (employeeData as any[])?.forEach(emp => {
        employeeMap.set(emp.id, emp);
      });

      // Format the data and combine with employee data
      const formattedData = (data as any[])
        ?.filter(req => req.leave_types)
        ?.map(req => ({
          ...req,
          status: req.status as 'pending' | 'approved' | 'rejected',
          leave_types: req.leave_types as { name: string },
          employees: {
            name: employeeMap.get(req.employee_id)?.name || 'Unknown',
            department: employeeMap.get(req.employee_id)?.department || 'N/A',
            reporting_manager_id: employeeMap.get(req.employee_id)?.reporting_manager_id || null
          }
        })) || [];
      
      setLeaveRequests(formattedData);

      // Set pending requests based on role and mode
      if (mode === 'manager') {
        if (user.role === 'reporting_manager') {
          setPendingRequests(formattedData.filter(req => req.status === 'pending' && req.employee_id !== user.id));
        } else if (user.role === 'admin' || user.role === 'super_admin') {
          setPendingRequests(formattedData.filter(req => req.status === 'pending' && req.employee_id !== user.id));
        }
      } else {
        setPendingRequests([]);
      }
    } catch (error) {
      console.error('Error fetching leave requests:', error);
    }
  };

  const fetchLeaveBalances = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('leave_balances')
        .select(`
          leave_type_id,
          allocated_days,
          used_days,
          leave_types (
            name
          )
        `)
        .eq('employee_id', user.id)
        .eq('year', new Date().getFullYear());

      if (error) {
        console.error('Error fetching leave balances:', error);
        return;
      }

      // Filter and format the data
      const formattedData = (data as any[])
        ?.filter(balance => balance.leave_types)
        ?.map(balance => ({
          ...balance,
          leave_types: balance.leave_types as { name: string }
        })) || [];

      setLeaveBalances(formattedData);
    } catch (error) {
      console.error('Error fetching leave balances:', error);
    }
  };

  const submitLeaveRequest = async (
    leaveTypeId: string,
    startDate: string,
    endDate: string,
    reason: string
  ) => {
    if (!user || !currentCompany) return false;

    setIsLoading(true);
    try {
      // Calculate total days
      const start = new Date(startDate);
      const end = new Date(endDate);
      const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      // Auto-approve for super_admin
      const status = user.role === 'super_admin' ? 'approved' : 'pending';
      const approvedBy = user.role === 'super_admin' ? user.id : null;
      const approvedAt = user.role === 'super_admin' ? new Date().toISOString() : null;

      const { error } = await supabase
        .from('leave_requests')
        .insert({
          employee_id: user.id,
          company_id: currentCompany.id,
          leave_type_id: leaveTypeId,
          start_date: startDate,
          end_date: endDate,
          total_days: totalDays,
          reason,
          status,
          approved_by: approvedBy,
          approved_at: approvedAt
        });

      if (error) {
        console.error('Submit leave request error:', error);
        return false;
      }
      
      await fetchLeaveRequests();
      return true;
    } catch (error) {
      console.error('Error submitting leave request:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const approveLeaveRequest = async (requestId: string) => {
    if (!user || !['reporting_manager', 'admin', 'super_admin'].includes(user.role)) return false;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('leave_requests')
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) {
        console.error('Approve leave request error:', error);
        return false;
      }
      
      await fetchLeaveRequests();
      return true;
    } catch (error) {
      console.error('Error approving leave request:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const rejectLeaveRequest = async (requestId: string) => {
    if (!user || !['reporting_manager', 'admin', 'super_admin'].includes(user.role)) return false;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('leave_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      if (error) {
        console.error('Reject leave request error:', error);
        return false;
      }
      
      await fetchLeaveRequests();
      return true;
    } catch (error) {
      console.error('Error rejecting leave request:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchLeaveRequests();
      // All users should have leave balances
      fetchLeaveBalances();
    }
  }, [user]);

  return {
    leaveRequests,
    leaveBalances,
    pendingRequests,
    isLoading,
    submitLeaveRequest,
    approveLeaveRequest,
    rejectLeaveRequest,
    fetchLeaveRequests,
    fetchLeaveBalances
  };
};
