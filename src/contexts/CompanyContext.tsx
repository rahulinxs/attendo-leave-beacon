import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface Company {
  id: string;
  name: string;
  domain: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface CompanyContextType {
  currentCompany: Company | null;
  companies: Company[];
  loading: boolean;
  setCurrentCompany: (company: Company | null) => void;
  refreshCompanies: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};

interface CompanyProviderProps {
  children: ReactNode;
}

export const CompanyProvider: React.FC<CompanyProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [currentCompany, setCurrentCompanyState] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  const setCurrentCompany = (company: Company | null) => {
    setCurrentCompanyState(company);
    if (company) {
      localStorage.setItem('selectedCompany', JSON.stringify(company));
    } else {
      localStorage.removeItem('selectedCompany');
    }
    console.log('[CompanyContext] Set current company:', company);
  };

  const fetchCompanies = async (): Promise<Company[]> => {
    if (!user) {
      setCompanies([]);
      return [];
    }
    try {
      // Get the user's company ID from the profile
      const { data: userProfile } = await supabase
        .from('employees')
        .select('company_id')
        .eq('id', user.id)
        .single();

      // Type assertion to allow access to company_id
      const companyId = (userProfile as { company_id?: string })?.company_id;

      if (!companyId) {
        console.error('[CompanyContext] Error fetching company_id from profile: No company_id found');
        return [];
      }

      // Now fetch the company details using the company_id string
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (companyError || !company) {
        console.error('[CompanyContext] Error fetching company:', companyError);
        return [];
      }

      setCompanies([company]);
      return [company];
    } catch (error) {
      console.error('[CompanyContext] Error in fetchCompanies:', error);
      return [];
    }
  };

  const refreshCompanies = async () => {
    await fetchCompanies();
  };

  useEffect(() => {
    const initializeCompany = async () => {
      if (!user) {
        setCompanies([]);
        setCurrentCompany(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      const allCompanies = await fetchCompanies();

      const determineCompany = async (): Promise<Company | null> => {
        // Priority 1: Check localStorage
        const storedCompanyRaw = localStorage.getItem('selectedCompany');
        if (storedCompanyRaw) {
          try {
            const storedCompany = JSON.parse(storedCompanyRaw);
            if (allCompanies.some(c => c.id === storedCompany.id)) {
              console.log('[CompanyContext] Using company from localStorage:', storedCompany);
              return storedCompany;
            }
          } catch (e) {
            console.error('Failed to parse stored company', e);
            localStorage.removeItem('selectedCompany');
          }
        }

        // Priority 2: Check user's company using helper function
        try {
          // Get the company ID using the SQL function
          const { data: userProfile } = await supabase
            .from('employees')
            .select('company_id')
            .eq('id', user.id)
            .single();

          const companyId = (userProfile as { company_id?: string })?.company_id;

          if (!companyId) {
            console.error('[CompanyContext] Error getting company ID: No company_id found');
            return null;
          }

          // Now fetch the company details
          const { data: company, error: companyError } = await supabase
            .from('companies')
            .select('*')
            .eq('id', companyId)
            .single();

          if (companyError || !company) {
            console.error('[CompanyContext] Error getting company details:', companyError);
            return null;
          }

          console.log('[CompanyContext] Using company from user profile:', company);
          return company;
        } catch (error) {
          console.error('[CompanyContext] Error fetching user company:', error);
          return null;
        }

        // Priority 3: Fallback to the first company
        if (allCompanies.length > 0) {
          console.log('[CompanyContext] Using fallback company:', allCompanies[0]);
          return allCompanies[0];
        }

        return null;
      };

      const companyToSet = await determineCompany();
      setCurrentCompany(companyToSet);

      setLoading(false);
    };

    initializeCompany();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const value: CompanyContextType = {
    currentCompany,
    companies,
    loading,
    setCurrentCompany,
    refreshCompanies,
  };

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
};