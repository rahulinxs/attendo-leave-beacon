import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: 'present' | 'absent' | 'holiday' | 'late';
  notes?: string;
}

export const useAttendance = () => {
  const { user } = useAuth();
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTodayAttendance = async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', user.id)
        .eq('date', today)
        .maybeSingle();

      if (error) {
        console.error('Error fetching today attendance:', error);
        return;
      }

      if (data) {
        setTodayAttendance({
          ...data,
          status: data.status as 'present' | 'absent' | 'holiday' | 'late'
        });
      } else {
        setTodayAttendance(null);
      }
    } catch (error) {
      console.error('Error fetching today attendance:', error);
    }
  };

  const fetchRecentAttendance = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', user.id)
        .order('date', { ascending: false })
        .limit(30);

      if (error) {
        console.error('Error fetching recent attendance:', error);
        return;
      }
      
      const formattedData = data?.map(record => ({
        ...record,
        status: record.status as 'present' | 'absent' | 'holiday' | 'late'
      })) || [];
      
      setRecentAttendance(formattedData);
    } catch (error) {
      console.error('Error fetching recent attendance:', error);
    }
  };

  const checkIn = async (customTime?: Date) => {
    if (!user) return false;

    setIsLoading(true);
    try {
      const timestamp = customTime || new Date();
      const today = timestamp.toISOString().split('T')[0];
      const timeString = timestamp.toISOString();

      const { error } = await supabase
        .from('attendance')
        .upsert({
          employee_id: user.id,
          date: today,
          check_in_time: timeString,
          status: 'present'
        });

      if (error) {
        console.error('Check-in error:', error);
        return false;
      }
      
      await fetchTodayAttendance();
      return true;
    } catch (error) {
      console.error('Error checking in:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const checkOut = async (customTime?: Date) => {
    if (!user || !todayAttendance) return false;

    setIsLoading(true);
    try {
      const timestamp = customTime || new Date();
      const timeString = timestamp.toISOString();

      const { error } = await supabase
        .from('attendance')
        .update({ check_out_time: timeString })
        .eq('id', todayAttendance.id);

      if (error) {
        console.error('Check-out error:', error);
        return false;
      }
      
      await fetchTodayAttendance();
      return true;
    } catch (error) {
      console.error('Error checking out:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTodayAttendance();
      fetchRecentAttendance();
    }
  }, [user]);

  return {
    todayAttendance,
    recentAttendance,
    isLoading,
    checkIn,
    checkOut,
    fetchTodayAttendance,
    fetchRecentAttendance
  };
};
