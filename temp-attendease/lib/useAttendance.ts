import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { Attendance } from '../types';

type AttendanceFilters = {
  employeeId?: string;
  startDate?: Date;
  endDate?: Date;
  status?: string;
};

export const useAttendance = (filters: AttendanceFilters = {}) => {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAttendance = useCallback(async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('attendance')
        .select('*')
        .order('check_in', { ascending: false });

      // Apply filters
      if (filters.employeeId) {
        query = query.eq('employee_id', filters.employeeId);
      }

      if (filters.startDate) {
        const startOfDay = new Date(filters.startDate);
        startOfDay.setHours(0, 0, 0, 0);
        query = query.gte('check_in', startOfDay.toISOString());
      }

      if (filters.endDate) {
        const endOfDay = new Date(filters.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte('check_in', endOfDay.toISOString());
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      
      setAttendance(data || []);
    } catch (err) {
      console.error('Error fetching attendance:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch attendance');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    fetchAttendance();
  }, [fetchAttendance]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const checkIn = async (employeeId: string, notes?: string) => {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .insert([
          {
            employee_id: employeeId,
            check_in: new Date().toISOString(),
            status: 'present',
            notes,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      
      setAttendance(prev => [data, ...prev]);
      return { success: true, data };
    } catch (err) {
      console.error('Error checking in:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to check in' 
      };
    }
  };

  const checkOut = async (attendanceId: string, notes?: string) => {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .update({
          check_out: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          notes: notes ? notes : undefined,
        })
        .eq('id', attendanceId)
        .select()
        .single();

      if (error) throw error;
      
      setAttendance(prev => 
        prev.map(record => 
          record.id === attendanceId ? { ...record, ...data } : record
        )
      );
      
      return { success: true, data };
    } catch (err) {
      console.error('Error checking out:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to check out' 
      };
    }
  };

  const updateAttendance = async (id: string, updates: Partial<Attendance>) => {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setAttendance(prev => 
        prev.map(record => 
          record.id === id ? { ...record, ...data } : record
        )
      );
      
      return { success: true, data };
    } catch (err) {
      console.error('Error updating attendance:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to update attendance' 
      };
    }
  };

  const deleteAttendance = async (id: string) => {
    try {
      const { error } = await supabase
        .from('attendance')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setAttendance(prev => prev.filter(record => record.id !== id));
      return { success: true };
    } catch (err) {
      console.error('Error deleting attendance:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to delete attendance' 
      };
    }
  };

  const getTodaysAttendance = useCallback((employeeId: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return attendance.find(record => {
      const checkInDate = new Date(record.check_in);
      return (
        record.employee_id === employeeId && 
        checkInDate >= today &&
        checkInDate < new Date(today.getTime() + 24 * 60 * 60 * 1000)
      );
    });
  }, [attendance]);

  return {
    attendance,
    loading,
    error,
    refreshing,
    refresh,
    checkIn,
    checkOut,
    updateAttendance,
    deleteAttendance,
    getTodaysAttendance,
  };
};
