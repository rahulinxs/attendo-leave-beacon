import React, { createContext, useContext, useEffect, useState } from 'react';
import { useUserProfile } from '../lib/useUserProfile';
import { supabase } from '../lib/supabase';

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

interface CompanyContextType {
  company: Company | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const CompanyProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profileData } = useUserProfile();
  const companyId = profileData?.profile?.company_id;

  const fetchCompany = async () => {
    if (!companyId) {
      setCompany(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (fetchError) throw fetchError;
      
      setCompany(data);
    } catch (err) {
      console.error('Error fetching company:', err);
      setError(err instanceof Error ? err.message : 'Failed to load company');
      setCompany(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompany();
  }, [companyId]);

  return (
    <CompanyContext.Provider value={{ company, loading, error, refresh: fetchCompany }}>
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = (): CompanyContextType => {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};
