import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export interface LeaveRequest {
  id: string;
  employee_id: string;
  employee_name?: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
  days_requested: number;
  submitted_at: string;
  approved_by?: string;
  approved_at?: string;
  company_id?: string;
}

export interface LeaveType {
  id: string;
  name: string;
  description: string;
  default_days: number;
  company_id?: string;
}

export const useLeave = () => {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getLeaveRequests = async (filters?: {
    status?: string;
    employee_id?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<LeaveRequest[]> => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('leave_requests')
        .select(`
          *,
          employees!inner(
            first_name,
            last_name,
            email
          )
        `)
        .order('submitted_at', { ascending: false });

      // Apply filters
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.employee_id) {
        query = query.eq('employee_id', filters.employee_id);
      }
      if (filters?.start_date) {
        query = query.gte('start_date', filters.start_date);
      }
      if (filters?.end_date) {
        query = query.lte('end_date', filters.end_date);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      // Transform data to include employee name
      const transformedData = data?.map(item => ({
        ...item,
        employee_name: `${item.employees?.first_name} ${item.employees?.last_name}`.trim(),
      })) || [];

      setLeaveRequests(transformedData);
      return transformedData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch leave requests';
      setError(errorMessage);
      console.error('Error fetching leave requests:', err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const getLeaveRequest = async (id: string): Promise<LeaveRequest | null> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('leave_requests')
        .select(`
          *,
          employees!inner(
            first_name,
            last_name,
            email
          )
        `)
        .eq('id', id)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      return {
        ...data,
        employee_name: `${data.employees?.first_name} ${data.employees?.last_name}`.trim(),
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch leave request';
      setError(errorMessage);
      console.error('Error fetching leave request:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const createLeaveRequest = async (leaveData: Omit<LeaveRequest, 'id' | 'submitted_at'>): Promise<LeaveRequest | null> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: createError } = await supabase
        .from('leave_requests')
        .insert([{
          ...leaveData,
          submitted_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      // Refresh the leave requests list
      await getLeaveRequests();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create leave request';
      setError(errorMessage);
      console.error('Error creating leave request:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateLeaveRequest = async (id: string, updates: Partial<LeaveRequest>): Promise<LeaveRequest | null> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: updateError } = await supabase
        .from('leave_requests')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      // Refresh the leave requests list
      await getLeaveRequests();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update leave request';
      setError(errorMessage);
      console.error('Error updating leave request:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteLeaveRequest = async (id: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const { error: deleteError } = await supabase
        .from('leave_requests')
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw deleteError;
      }

      // Refresh the leave requests list
      await getLeaveRequests();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete leave request';
      setError(errorMessage);
      console.error('Error deleting leave request:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const approveLeaveRequest = async (id: string, approvedBy: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('leave_requests')
        .update({
          status: 'approved',
          approved_by: approvedBy,
          approved_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) {
        throw updateError;
      }

      // Refresh the leave requests list
      await getLeaveRequests();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to approve leave request';
      setError(errorMessage);
      console.error('Error approving leave request:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const rejectLeaveRequest = async (id: string, approvedBy: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('leave_requests')
        .update({
          status: 'rejected',
          approved_by: approvedBy,
          approved_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) {
        throw updateError;
      }

      // Refresh the leave requests list
      await getLeaveRequests();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reject leave request';
      setError(errorMessage);
      console.error('Error rejecting leave request:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getLeaveTypes = async (): Promise<LeaveType[]> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('leave_types')
        .select('*')
        .order('name', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      setLeaveTypes(data || []);
      return data || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch leave types';
      setError(errorMessage);
      console.error('Error fetching leave types:', err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const calculateLeaveDays = (startDate: string, endDate: string): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1; // Include both start and end dates
  };

  return {
    leaveRequests,
    leaveTypes,
    loading,
    error,
    getLeaveRequests,
    getLeaveRequest,
    createLeaveRequest,
    updateLeaveRequest,
    deleteLeaveRequest,
    approveLeaveRequest,
    rejectLeaveRequest,
    getLeaveTypes,
    calculateLeaveDays,
  };
}; 