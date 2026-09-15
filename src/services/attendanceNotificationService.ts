import { supabase } from '@/integrations/supabase/client';
import { getEdgeFunctionErrorMessage } from '@/lib/edgeFunctionError';

export type AttendanceNotificationAction = 'clock-in' | 'clock-out';

export interface AttendanceNotificationResult {
  success: boolean;
  error?: string;
}

export const attendanceNotificationService = {
  async sendNotification(
    action: AttendanceNotificationAction,
    employeeId: string,
    companyId?: string
  ): Promise<AttendanceNotificationResult> {
    try {
      const { data, error } = await supabase.functions.invoke('send-attendance-notification', {
        body: {
          action,
          employee_id: employeeId,
          company_id: companyId,
        },
      });

      if (error) {
        const message = await getEdgeFunctionErrorMessage(error, 'Failed to send attendance notification');
        console.error('Attendance notification error:', error, message);
        return {
          success: false,
          error: message,
        };
      }

      if (!data || (typeof data === 'object' && 'success' in data && data.success === false)) {
        const message =
          typeof data === 'object' && data && 'error' in data && typeof data.error === 'string'
            ? data.error
            : 'Attendance notification failed';

        return { success: false, error: message };
      }

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error sending attendance notification';
      console.error('Unexpected attendance notification failure:', err);
      return { success: false, error: message };
    }
  },

  async notifyClockIn(employeeId: string, companyId?: string): Promise<AttendanceNotificationResult> {
    return this.sendNotification('clock-in', employeeId, companyId);
  },

  async notifyClockOut(employeeId: string, companyId?: string): Promise<AttendanceNotificationResult> {
    return this.sendNotification('clock-out', employeeId, companyId);
  },
};

export default attendanceNotificationService;
