import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string | null;
  position: string | null;
  hire_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useEmployees = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchEmployees = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching employees:', error);
        return;
      }

      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const removeEmployee = async (employeeId: string) => {
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return false;
    }

    setIsLoading(true);
    try {
      // Mark employee as inactive instead of deleting
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: false })
        .eq('id', employeeId);

      if (error) {
        console.error('Error removing employee:', error);
        return false;
      }

      await fetchEmployees(); // Refresh the list
      return true;
    } catch (error) {
      console.error('Error removing employee:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'super_admin')) {
      fetchEmployees();
    }
  }, [user]);

  return {
    employees,
    isLoading,
    fetchEmployees,
    removeEmployee
  };
};
