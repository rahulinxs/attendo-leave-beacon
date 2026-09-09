import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  DEFAULT_EMPLOYEE_PROFILE_VISIBILITY,
  EMPLOYEE_PROFILE_FIELDS,
  type EmployeeProfileFieldKey,
} from '@/utils/employeeProfileFields';

export function useEmployeeProfileFieldVisibility(employeeId: string) {
  const [visibility, setVisibility] = useState(DEFAULT_EMPLOYEE_PROFILE_VISIBILITY);
  const [loading, setLoading] = useState(false);

  const fetchVisibility = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('employee_profile_field_settings')
      .select('field_key, is_enabled')
      .eq('employee_id', employeeId);

    if (!error) {
      const next = { ...DEFAULT_EMPLOYEE_PROFILE_VISIBILITY };
      for (const row of data || []) {
        if (row.field_key in next) {
          next[row.field_key as EmployeeProfileFieldKey] = row.is_enabled;
        }
      }
      setVisibility(next);
    }
    setLoading(false);
  }, [employeeId]);

  useEffect(() => {
    fetchVisibility();
  }, [fetchVisibility]);

  const isVisible = (key: EmployeeProfileFieldKey) => visibility[key] !== false;

  const saveVisibility = async (next: Record<EmployeeProfileFieldKey, boolean>, updatedBy: string) => {
    const rows = EMPLOYEE_PROFILE_FIELDS.map((field) => ({
      employee_id: employeeId,
      field_key: field.key,
      is_enabled: next[field.key],
      updated_by: updatedBy,
    }));
    const { error } = await supabase
      .from('employee_profile_field_settings')
      .upsert(rows, { onConflict: 'employee_id,field_key' });
    if (!error) setVisibility(next);
    return error;
  };

  return { visibility, isVisible, loading, fetchVisibility, saveVisibility };
}
