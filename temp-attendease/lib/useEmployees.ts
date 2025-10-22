import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { Employee } from '../types';

export const useEmployees = (companyId: string) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('employees')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      
      setEmployees(data || []);
    } catch (err) {
      console.error('Error fetching employees:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (companyId) {
      fetchEmployees();
    }
  }, [companyId, fetchEmployees]);

  const addEmployee = async (employeeData: Omit<Employee, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error: insertError } = await supabase
        .from('employees')
        .insert([employeeData])
        .select();

      if (insertError) throw insertError;
      
      if (data?.[0]) {
        setEmployees(prev => [data[0], ...prev]);
      }
      
      return { success: true, data: data?.[0] };
    } catch (err) {
      console.error('Error adding employee:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to add employee' 
      };
    }
  };

  const updateEmployee = async (id: string, updates: Partial<Employee>) => {
    try {
      const { data, error: updateError } = await supabase
        .from('employees')
        .update(updates)
        .eq('id', id)
        .select();

      if (updateError) throw updateError;
      
      if (data?.[0]) {
        setEmployees(prev => 
          prev.map(emp => emp.id === id ? { ...emp, ...data[0] } : emp)
        );
      }
      
      return { success: true, data: data?.[0] };
    } catch (err) {
      console.error('Error updating employee:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to update employee' 
      };
    }
  };

  const deleteEmployee = async (id: string) => {
    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setEmployees(prev => prev.filter(emp => emp.id !== id));
      return { success: true };
    } catch (err) {
      console.error('Error deleting employee:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to delete employee' 
      };
    }
  };

  return {
    employees,
    loading,
    error,
    refresh: fetchEmployees,
    addEmployee,
    updateEmployee,
    deleteEmployee,
  };
};
