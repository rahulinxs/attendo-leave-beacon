export type DurationType = 'full_day' | 'half_day';
export type LeaveSession = 'first_half' | 'second_half';

export type LeaveDurationFields = {
  total_days?: number | null;
  duration_type?: string | null;
  session?: string | null;
};

export const calculateFullLeaveDays = (start: string, end: string) => {
  if (!start || !end) return 0;
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return diffDays > 0 ? diffDays : 0;
};

export const resolveLeaveTotalDays = (
  durationType: DurationType,
  startDate: string,
  endDate: string
) => (durationType === 'half_day' ? 0.5 : calculateFullLeaveDays(startDate, endDate));

export const formatLeaveDays = (days?: number | null) => {
  const value = Number(days || 0);
  if (value === 0.5) return '0.5 day';
  if (value === 1) return '1 day';
  return `${value} days`;
};

export const formatLeaveSession = (session?: string | null) => {
  if (session === 'first_half') return 'First half';
  if (session === 'second_half') return 'Second half';
  return '';
};

export const formatLeaveDuration = (request: LeaveDurationFields) => {
  const daysLabel = formatLeaveDays(request.total_days);
  if (request.duration_type === 'half_day') {
    const sessionLabel = formatLeaveSession(request.session);
    return sessionLabel ? `${daysLabel} (${sessionLabel})` : daysLabel;
  }
  return daysLabel;
};

export const datesOverlap = (startA: string, endA: string, startB: string, endB: string) =>
  startA <= endB && startB <= endA;

export const leaveDurationsConflict = (
  existing: LeaveDurationFields & { start_date: string; end_date: string; status?: string | null },
  incoming: LeaveDurationFields & { start_date: string; end_date: string }
) => {
  if (existing.status === 'rejected') return false;
  if (!datesOverlap(existing.start_date, existing.end_date, incoming.start_date, incoming.end_date)) {
    return false;
  }

  const existingIsHalf = existing.duration_type === 'half_day';
  const incomingIsHalf = incoming.duration_type === 'half_day';

  if (!existingIsHalf || !incomingIsHalf) return true;
  if (!existing.session || !incoming.session) return true;
  return existing.session === incoming.session;
};
