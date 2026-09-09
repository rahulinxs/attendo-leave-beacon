import { supabase } from '@/integrations/supabase/client';

export type LeaveNotificationAction = 'apply' | 'approve' | 'reject';

export interface LeaveNotificationResult {
  success: boolean;
  error?: string;
}

export const leaveNotificationService = {
  async sendNotification(
    action: LeaveNotificationAction,
    leaveRequestId: string,
    companyId: string
  ): Promise<LeaveNotificationResult> {
    try {
      const { data, error } = await supabase.functions.invoke('send-leave-notification', {
        body: {
          action,
          leaveRequestId,
          company_id: companyId,
        },
      });

      if (error) {
        console.error('Leave notification error:', error);
        return {
          success: false,
          error: error.message || 'Failed to send leave notification',
        };
      }

      if (!data || (typeof data === 'object' && 'success' in data && data.success === false)) {
        const message =
          typeof data === 'object' && data && 'error' in data && typeof data.error === 'string'
            ? data.error
            : 'Leave notification failed';

        return { success: false, error: message };
      }

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error sending leave notification';
      console.error('Unexpected leave notification failure:', err);
      return { success: false, error: message };
    }
  },

  async notifyLeaveApplied(leaveRequestId: string, companyId: string): Promise<LeaveNotificationResult> {
    return this.sendNotification('apply', leaveRequestId, companyId);
  },

  async notifyLeaveApproved(leaveRequestId: string, companyId: string): Promise<LeaveNotificationResult> {
    return this.sendNotification('approve', leaveRequestId, companyId);
  },

  async notifyLeaveRejected(leaveRequestId: string, companyId: string): Promise<LeaveNotificationResult> {
    return this.sendNotification('reject', leaveRequestId, companyId);
  },
};

export default leaveNotificationService;
