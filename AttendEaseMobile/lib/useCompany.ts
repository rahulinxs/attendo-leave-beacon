import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';

export interface Company {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo_url?: string;
  created_at?: string;
  updated_at?: string;
}

export function useCompany(companyId?: string) {
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCompany = useCallback(async (id: string) => {
    if (!id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      
      setCompany(data);
    } catch (err: any) {
      console.error('Error fetching company:', err);
      setError(err.message || 'Failed to load company details');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (companyId) {
      fetchCompany(companyId);
    }
  }, [companyId, fetchCompany]);

  return { company, loading, error, fetchCompany };
}
