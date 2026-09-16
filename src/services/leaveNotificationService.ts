import { supabase } from '@/integrations/supabase/client';
import { getEdgeFunctionErrorMessage } from '@/lib/edgeFunctionError';

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
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        const message = sessionError?.message || 'You must be signed in to send a leave notification';
        console.error('[LeaveNotification DEBUG] no valid session for edge function invocation', {
          action,
          leaveRequestId,
          message,
        });
        return { success: false, error: message };
      }

      console.log('[LeaveNotification DEBUG] invoking edge function', {
        functionName: 'send-leave-notification',
        action,
        leaveRequestId,
        company_id: companyId,
      });

      const { data, error } = await supabase.functions.invoke('send-leave-notification', {
        body: {
          action,
          leaveRequestId,
          company_id: companyId,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      console.log('[LeaveNotification DEBUG] edge function response', {
        action,
        leaveRequestId,
        data,
        error: error ? { message: error.message, name: error.name } : null,
      });

      if (error) {
        const message = await getEdgeFunctionErrorMessage(error, 'Failed to send leave notification');
        console.error('Leave notification error:', error, message);
        return {
          success: false,
          error: message,
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
