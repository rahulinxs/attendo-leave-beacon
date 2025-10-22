import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { LeaveRequest, LeaveType } from '../types';

type LeaveFilters = {
  employeeId?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  leaveTypeId?: string;
};

export const useLeave = (filters: LeaveFilters = {}) => {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeaveRequests = useCallback(async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('leave_requests')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.employeeId) {
        query = query.eq('employee_id', filters.employeeId);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.startDate) {
        query = query.gte('start_date', filters.startDate.toISOString());
      }

      if (filters.endDate) {
        query = query.lte('end_date', filters.endDate.toISOString());
      }

      if (filters.leaveTypeId) {
        query = query.eq('leave_type_id', filters.leaveTypeId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      
      setLeaveRequests(data || []);
    } catch (err) {
      console.error('Error fetching leave requests:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch leave requests');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters]);

  const fetchLeaveTypes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('leave_types')
        .select('*')
        .order('name');

      if (error) throw error;
      
      setLeaveTypes(data || []);
    } catch (err) {
      console.error('Error fetching leave types:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch leave types');
    }
  }, []);

  const refresh = useCallback(() => {
    setRefreshing(true);
    fetchLeaveRequests();
  }, [fetchLeaveRequests]);

  useEffect(() => {
    fetchLeaveRequests();
    fetchLeaveTypes();
  }, [fetchLeaveRequests, fetchLeaveTypes]);

  const requestLeave = async (leaveData: Omit<LeaveRequest, 'id' | 'status' | 'created_at' | 'updated_at'>) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('leave_requests')
        .insert([
          {
            ...leaveData,
            status: 'pending',
          },
        ])
        .select()
        .single();

      if (error) throw error;
      
      setLeaveRequests(prev => [data, ...prev]);
      return { success: true, data };
    } catch (err) {
      console.error('Error requesting leave:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to request leave' 
      };
    } finally {
      setLoading(false);
    }
  };

  const updateLeaveStatus = async (leaveId: string, status: LeaveRequest['status'], approvedById?: string) => {
    try {
      const updates: Partial<LeaveRequest> = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'approved' && approvedById) {
        updates.approved_by = approvedById;
        updates.approved_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('leave_requests')
        .update(updates)
        .eq('id', leaveId)
        .select()
        .single();

      if (error) throw error;
      
      setLeaveRequests(prev => 
        prev.map(request => 
          request.id === leaveId ? { ...request, ...data } : request
        )
      );
      
      return { success: true, data };
    } catch (err) {
      console.error('Error updating leave status:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to update leave status' 
      };
    }
  };

  const cancelLeave = async (leaveId: string) => {
    try {
      const { data, error } = await supabase
        .from('leave_requests')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', leaveId)
        .select()
        .single();

      if (error) throw error;
      
      setLeaveRequests(prev => 
        prev.map(request => 
          request.id === leaveId ? { ...request, ...data } : request
        )
      );
      
      return { success: true, data };
    } catch (err) {
      console.error('Error cancelling leave:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to cancel leave' 
      };
    }
  };

  const getRemainingLeaveDays = useCallback(
    (employeeId: string, leaveTypeId: string, year: number = new Date().getFullYear()) => {
      const leaveType = leaveTypes.find(lt => lt.id === leaveTypeId);
      if (!leaveType) return 0;

      const leaveDaysUsed = leaveRequests
        .filter(
          request =>
            request.employee_id === employeeId &&
            request.leave_type_id === leaveTypeId &&
            new Date(request.start_date).getFullYear() === year &&
            ['approved', 'pending'].includes(request.status)
        )
        .reduce((total, request) => {
          const start = new Date(request.start_date);
          const end = new Date(request.end_date);
          const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          return total + days;
        }, 0);

      return Math.max(0, leaveType.default_days - leaveDaysUsed);
    },
    [leaveRequests, leaveTypes]
  );

  return {
    leaveRequests,
    leaveTypes,
    loading,
    error,
    refreshing,
    refresh,
    requestLeave,
    updateLeaveStatus,
    cancelLeave,
    getRemainingLeaveDays,
  };
};
