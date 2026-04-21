import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { calculateProfileCompletion } from '@/utils/profileCompletion';

interface ProfileCompletionData {
  employeeId: string;
  percentage: number;
  completedSections: string[];
  missingSections: string[];
  totalFields: number;
  completedFields: number;
}

export const useProfileCompletion = (employeeIds: string[]) => {
  const [completionData, setCompletionData] = useState<Record<string, ProfileCompletionData>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (employeeIds.length === 0) return;

    const fetchProfileCompletion = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data: profiles, error: profileError } = await supabase
          .from('employee_profiles')
          .select('*')
          .in('employee_id', employeeIds);

        if (profileError) throw profileError;

        const { data: documents, error: docError } = await supabase
          .from('employee_documents')
          .select('*')
          .in('employee_id', employeeIds);

        if (docError) throw docError;

        const completionResults: Record<string, ProfileCompletionData> = {};

        employeeIds.forEach(employeeId => {
          const profile = profiles?.find(p => p.employee_id === employeeId) || {};
          const employeeDocuments = documents?.filter(d => d.employee_id === employeeId) || [];

          const profileData = {
            ...profile,
            documents: employeeDocuments
          };

          const completion = calculateProfileCompletion(profileData);
          completionResults[employeeId] = {
            employeeId,
            ...completion
          };
        });

        setCompletionData(completionResults);
      } catch (err: any) {
        console.error('Error fetching profile completion:', err);
        setError(err.message || 'Failed to fetch profile completion data');
      } finally {
        setLoading(false);
      }
    };

    fetchProfileCompletion();
  }, [employeeIds]);

  return { completionData, loading, error };
};
