import { supabase } from '@/integrations/supabase/client';
import {
  leaveDurationsConflict,
  type DurationType,
  type LeaveSession,
} from '@/utils/leaveDuration';

export async function hasConflictingLeave(params: {
  employeeId: string;
  companyId: string;
  startDate: string;
  endDate: string;
  durationType: DurationType;
  session?: LeaveSession | null;
  excludeId?: string;
}) {
  const { employeeId, companyId, startDate, endDate, durationType, session, excludeId } = params;

  const { data, error } = await supabase
    .from('leave_requests')
    .select('id, start_date, end_date, total_days, status, duration_type, session')
    .eq('employee_id', employeeId)
    .eq('company_id', companyId)
    .in('status', ['pending', 'approved'])
    .lte('start_date', endDate)
    .gte('end_date', startDate);

  if (error) {
    throw error;
  }

  return (data || []).some((row) => {
    if (excludeId && row.id === excludeId) return false;
    return leaveDurationsConflict(row, {
      start_date: startDate,
      end_date: endDate,
      duration_type: durationType,
      session: session || null,
    });
  });
}
