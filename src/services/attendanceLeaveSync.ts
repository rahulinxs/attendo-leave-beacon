import { supabase } from '@/integrations/supabase/client';
import type { DurationType, LeaveSession } from '@/utils/leaveDuration';

export const ATTENDANCE_LEAVE_REASON_PREFIX = '[Attendance Management]';
export const ATTENDANCE_LEAVE_REASON = `${ATTENDANCE_LEAVE_REASON_PREFIX} Marked as leave via Manage Attendance`;
export const ATTENDANCE_HALF_DAY_LEAVE_REASON = `${ATTENDANCE_LEAVE_REASON_PREFIX} Marked as half day via Manage Attendance`;

const PREFERRED_LEAVE_TYPE_NAMES = [
  'Emergency Leave',
  'Personal Leave',
  'Unplanned Leave',
  'Absent',
  'Annual Leave',
];

export type AttendanceLeaveSyncResult = {
  ok: boolean;
  action: 'created' | 'approved_existing' | 'skipped_existing' | 'cancelled' | 'none';
  message?: string;
  error?: string;
};

type LeaveRequestRow = {
  id: string;
  employee_id: string | null;
  start_date: string;
  end_date: string;
  total_days: number;
  status: string | null;
  reason: string | null;
  duration_type?: string | null;
  session?: string | null;
};

const leaveTypeCache = new Map<string, string>();

const isAutoSyncedLeave = (request: LeaveRequestRow, date: string) =>
  request.start_date === date &&
  request.end_date === date &&
  (request.reason?.startsWith(ATTENDANCE_LEAVE_REASON_PREFIX) ?? false);

const rowDurationType = (row: LeaveRequestRow): DurationType =>
  row.duration_type === 'half_day' ? 'half_day' : 'full_day';

const dateWithinRange = (date: string, start: string, end: string) =>
  date >= start && date <= end;

const pickHalfDaySession = (overlapping: LeaveRequestRow[]): LeaveSession | null => {
  const hasFullDay = overlapping.some((row) => rowDurationType(row) === 'full_day');
  if (hasFullDay) return null;

  const usedSessions = new Set(
    overlapping
      .filter((row) => rowDurationType(row) === 'half_day')
      .map((row) => row.session)
  );

  if (!usedSessions.has('first_half')) return 'first_half';
  if (!usedSessions.has('second_half')) return 'second_half';
  return null;
};

async function resolveLeaveTypeId(companyId: string): Promise<string | null> {
  const cached = leaveTypeCache.get(companyId);
  if (cached) return cached;

  const { data, error } = await supabase
    .from('leave_types')
    .select('id, name')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('name');

  if (error || !data?.length) return null;

  const byName = new Map(data.map((type) => [type.name.toLowerCase(), type.id]));
  for (const preferredName of PREFERRED_LEAVE_TYPE_NAMES) {
    const match = byName.get(preferredName.toLowerCase());
    if (match) {
      leaveTypeCache.set(companyId, match);
      return match;
    }
  }

  const fallback = data[0].id;
  leaveTypeCache.set(companyId, fallback);
  return fallback;
}

async function fetchOverlappingLeaveRequests(
  employeeId: string,
  companyId: string,
  date: string
): Promise<LeaveRequestRow[]> {
  const { data, error } = await supabase
    .from('leave_requests')
    .select('id, employee_id, start_date, end_date, total_days, status, reason, duration_type, session')
    .eq('employee_id', employeeId)
    .eq('company_id', companyId)
    .in('status', ['pending', 'approved'])
    .lte('start_date', date)
    .gte('end_date', date);

  if (error) {
    throw error;
  }

  return (data ?? []).filter((row) => dateWithinRange(date, row.start_date, row.end_date));
}

export async function syncLeaveForAbsentAttendance(params: {
  employeeId: string;
  companyId: string;
  date: string;
  approvedBy: string;
}): Promise<AttendanceLeaveSyncResult> {
  const { employeeId, companyId, date, approvedBy } = params;

  try {
    const overlapping = await fetchOverlappingLeaveRequests(employeeId, companyId, date);

    const approvedLeave = overlapping.find((row) => row.status === 'approved');
    if (approvedLeave) {
      return {
        ok: true,
        action: 'skipped_existing',
        message: 'Employee already has approved leave for this date.',
      };
    }

    const pendingSingleDay = overlapping.find(
      (row) =>
        row.status === 'pending' &&
        row.start_date === date &&
        row.end_date === date
    );

    if (pendingSingleDay) {
      const { error } = await supabase
        .from('leave_requests')
        .update({
          status: 'approved',
          approved_by: approvedBy,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          admin_comments: `${ATTENDANCE_LEAVE_REASON_PREFIX} Approved via Manage Attendance`,
        })
        .eq('id', pendingSingleDay.id);

      if (error) {
        return {
          ok: false,
          action: 'none',
          error: error.message,
        };
      }

      return {
        ok: true,
        action: 'approved_existing',
        message: 'Existing pending leave request approved for this date.',
      };
    }

    if (overlapping.some((row) => row.status === 'pending')) {
      return {
        ok: true,
        action: 'skipped_existing',
        message: 'Employee already has a pending leave request covering this date.',
      };
    }

    const leaveTypeId = await resolveLeaveTypeId(companyId);
    if (!leaveTypeId) {
      return {
        ok: false,
        action: 'none',
        error: 'No active leave type found for this company.',
      };
    }

    const { error } = await supabase.from('leave_requests').insert({
      employee_id: employeeId,
      company_id: companyId,
      leave_type_id: leaveTypeId,
      start_date: date,
      end_date: date,
      total_days: 1,
      duration_type: 'full_day',
      session: null,
      reason: ATTENDANCE_LEAVE_REASON,
      status: 'approved',
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
    });

    if (error) {
      return {
        ok: false,
        action: 'none',
        error: error.message,
      };
    }

    return {
      ok: true,
      action: 'created',
      message: 'Approved leave record created for this date.',
    };
  } catch (error) {
    return {
      ok: false,
      action: 'none',
      error: error instanceof Error ? error.message : 'Failed to sync leave record',
    };
  }
}

export async function syncLeaveForHalfDayAttendance(params: {
  employeeId: string;
  companyId: string;
  date: string;
  approvedBy: string;
}): Promise<AttendanceLeaveSyncResult> {
  const { employeeId, companyId, date, approvedBy } = params;

  try {
    const overlapping = await fetchOverlappingLeaveRequests(employeeId, companyId, date);

    const existingAutoHalfDay = overlapping.find(
      (row) => isAutoSyncedLeave(row, date) && rowDurationType(row) === 'half_day'
    );
    if (existingAutoHalfDay) {
      return {
        ok: true,
        action: 'skipped_existing',
        message: 'Half-day leave is already synced for this date.',
      };
    }

    const session = pickHalfDaySession(overlapping);

    if (!session) {
      return {
        ok: true,
        action: 'skipped_existing',
        message: 'Employee already has leave covering this date, so a half-day leave was not added.',
      };
    }

    const pendingMatchingHalfDay = overlapping.find(
      (row) =>
        row.status === 'pending' &&
        row.start_date === date &&
        row.end_date === date &&
        rowDurationType(row) === 'half_day' &&
        row.session === session
    );

    if (pendingMatchingHalfDay) {
      const { error } = await supabase
        .from('leave_requests')
        .update({
          status: 'approved',
          approved_by: approvedBy,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          admin_comments: `${ATTENDANCE_LEAVE_REASON_PREFIX} Approved half day via Manage Attendance`,
        })
        .eq('id', pendingMatchingHalfDay.id);

      if (error) {
        return {
          ok: false,
          action: 'none',
          error: error.message,
        };
      }

      return {
        ok: true,
        action: 'approved_existing',
        message: `Existing pending half-day leave (${session === 'first_half' ? 'first half' : 'second half'}) was approved.`,
      };
    }

    const leaveTypeId = await resolveLeaveTypeId(companyId);
    if (!leaveTypeId) {
      return {
        ok: false,
        action: 'none',
        error: 'No active leave type found for this company.',
      };
    }

    const { error } = await supabase.from('leave_requests').insert({
      employee_id: employeeId,
      company_id: companyId,
      leave_type_id: leaveTypeId,
      start_date: date,
      end_date: date,
      total_days: 0.5,
      duration_type: 'half_day',
      session,
      reason: ATTENDANCE_HALF_DAY_LEAVE_REASON,
      status: 'approved',
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
    });

    if (error) {
      return {
        ok: false,
        action: 'none',
        error: error.message,
      };
    }

    return {
      ok: true,
      action: 'created',
      message: `Approved half-day leave (${session === 'first_half' ? 'first half' : 'second half'}) was created for this date.`,
    };
  } catch (error) {
    return {
      ok: false,
      action: 'none',
      error: error instanceof Error ? error.message : 'Failed to sync half-day leave record',
    };
  }
}

export async function cancelSyncedLeaveForAttendance(params: {
  employeeId: string;
  companyId: string;
  date: string;
  cancelledBy: string;
  durationType?: DurationType;
}): Promise<AttendanceLeaveSyncResult> {
  const { employeeId, companyId, date, cancelledBy, durationType } = params;

  try {
    const { data, error } = await supabase
      .from('leave_requests')
      .select('id, employee_id, start_date, end_date, total_days, status, reason, duration_type, session')
      .eq('employee_id', employeeId)
      .eq('company_id', companyId)
      .eq('start_date', date)
      .eq('end_date', date)
      .eq('status', 'approved');

    if (error) {
      return {
        ok: false,
        action: 'none',
        error: error.message,
      };
    }

    const autoSyncedLeaves = (data ?? []).filter((row) => {
      if (!isAutoSyncedLeave(row, date)) return false;
      if (!durationType) return true;
      return rowDurationType(row) === durationType;
    });
    if (!autoSyncedLeaves.length) {
      return {
        ok: true,
        action: 'none',
      };
    }

    const now = new Date().toISOString();
    for (const leave of autoSyncedLeaves) {
      const { error: updateError } = await supabase
        .from('leave_requests')
        .update({
          status: 'rejected',
          approved_by: null,
          approved_at: null,
          updated_at: now,
          admin_comments: `${ATTENDANCE_LEAVE_REASON_PREFIX} Cancelled because attendance status was changed (${cancelledBy}).`,
        })
        .eq('id', leave.id);

      if (updateError) {
        return {
          ok: false,
          action: 'none',
          error: updateError.message,
        };
      }
    }

    return {
      ok: true,
      action: 'cancelled',
      message: 'Synced leave record cancelled for this date.',
    };
  } catch (error) {
    return {
      ok: false,
      action: 'none',
      error: error instanceof Error ? error.message : 'Failed to cancel synced leave record',
    };
  }
}
