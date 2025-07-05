import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export interface Employee {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  position: string;
  department: string;
  status: string;
  joining_date: string;
  company_id?: string;
  team_id?: string;
}

export const useEmployees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getEmployees = async (): Promise<Employee[]> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('employees')
        .select('*')
        .order('first_name', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      setEmployees(data || []);
      return data || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch employees';
      setError(errorMessage);
      console.error('Error fetching employees:', err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const getEmployee = async (id: string): Promise<Employee | null> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('employees')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch employee';
      setError(errorMessage);
      console.error('Error fetching employee:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const createEmployee = async (employeeData: Omit<Employee, 'id'>): Promise<Employee | null> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: createError } = await supabase
        .from('employees')
        .insert([employeeData])
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      // Refresh the employees list
      await getEmployees();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create employee';
      setError(errorMessage);
      console.error('Error creating employee:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateEmployee = async (id: string, updates: Partial<Employee>): Promise<Employee | null> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: updateError } = await supabase
        .from('employees')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      // Refresh the employees list
      await getEmployees();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update employee';
      setError(errorMessage);
      console.error('Error updating employee:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteEmployee = async (id: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const { error: deleteError } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw deleteError;
      }

      // Refresh the employees list
      await getEmployees();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete employee';
      setError(errorMessage);
      console.error('Error deleting employee:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const searchEmployees = async (query: string): Promise<Employee[]> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: searchError } = await supabase
        .from('employees')
        .select('*')
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
        .order('first_name', { ascending: true });

      if (searchError) {
        throw searchError;
      }

      return data || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search employees';
      setError(errorMessage);
      console.error('Error searching employees:', err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  return {
    employees,
    loading,
    error,
    getEmployees,
    getEmployee,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    searchEmployees,
  };
}; 