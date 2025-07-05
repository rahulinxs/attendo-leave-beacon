import { useState, useCallback } from 'react';
import { supabase } from './supabase';
import { useAuth } from '../contexts/AuthContext';

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  check_in_time: string | null;
  check_out_time: string | null;
  date: string;
  status: string;
  notes: string | null;
  location: any | null;
  company_id: string;
  pending_approval: boolean | null;
  requestor_role: string | null;
  created_at: string;
  updated_at: string;
}

export function useAttendance() {
  const { user } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [today, setToday] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all attendance records for the user
  const fetchAttendance = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', user.id)
        .order('date', { ascending: false });
      if (error) setError(error.message);
      setRecords(data || []);
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch today's attendance record
  const fetchToday = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', user.id)
        .eq('date', todayStr)
        .single();
      if (error && error.code !== 'PGRST116') setError(error.message);
      setToday(data || null);
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Check in
  const checkIn = useCallback(async (location?: any, notes?: string) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const { error } = await supabase
        .from('attendance')
        .upsert({
          employee_id: user.id,
          date: todayStr,
          check_in_time: new Date().toISOString(),
          location: location || null,
          notes: notes || null,
        }, { onConflict: ['employee_id', 'date'] });
      if (error) setError(error.message);
      await fetchToday();
      await fetchAttendance();
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [user, fetchToday, fetchAttendance]);

  // Check out
  const checkOut = useCallback(async (location?: any, notes?: string) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const { error } = await supabase
        .from('attendance')
        .update({
          check_out_time: new Date().toISOString(),
          location: location || null,
          notes: notes || null,
        })
        .eq('employee_id', user.id)
        .eq('date', todayStr);
      if (error) setError(error.message);
      await fetchToday();
      await fetchAttendance();
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [user, fetchToday, fetchAttendance]);

  return {
    records,
    today,
    loading,
    error,
    fetchAttendance,
    fetchToday,
    checkIn,
    checkOut,
  };
} 