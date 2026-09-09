import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LeaveNotificationRequest {
  action: 'apply' | 'approve' | 'reject';
  leaveRequestId: string;
  company_id: string;
}

// Format date for display
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

// Email template: Leave Application
function getLeaveAppliedEmail(
  employeeName: string,
  leaveType: string,
  startDate: string,
  endDate: string,
  totalDays: number,
  reason: string,
  recipientName: string
): string {
  const appUrl = Deno.env.get('APP_URL') || 'https://attendease.com';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 0; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); color: white; padding: 30px 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .content { padding: 30px; background-color: #f8f9fa; }
    .greeting { font-size: 16px; margin-bottom: 20px; }
    .details { background-color: white; padding: 20px; border-left: 4px solid #007bff; margin: 20px 0; border-radius: 4px; }
    .details-row { display: flex; margin: 12px 0; }
    .details-label { font-weight: 600; color: #007bff; width: 150px; min-width: 150px; }
    .details-value { color: #333; flex: 1; }
    .message { font-size: 15px; color: #555; margin: 20px 0; line-height: 1.8; }
    .action-button { display: inline-block; padding: 12px 30px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; font-weight: 600; margin-top: 15px; }
    .action-button:hover { background-color: #0056b3; }
    .footer { background-color: #f0f0f0; padding: 20px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #e0e0e0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 New Leave Application</h1>
    </div>
    <div class="content">
      <p class="greeting">Dear ${recipientName},</p>
      <p class="message"><strong>${employeeName}</strong> has submitted a new leave application that requires your attention.</p>
      
      <div class="details">
        <div class="details-row">
          <span class="details-label">Leave Type:</span>
          <span class="details-value">${leaveType}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Start Date:</span>
          <span class="details-value">${formatDate(startDate)}</span>
        </div>
        <div class="details-row">
          <span class="details-label">End Date:</span>
          <span class="details-value">${formatDate(endDate)}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Duration:</span>
          <span class="details-value">${totalDays} day(s)</span>
        </div>
        <div class="details-row">
          <span class="details-label">Reason:</span>
          <span class="details-value">${reason}</span>
        </div>
      </div>
      
      <p class="message">Please review and approve or reject this request at your earliest convenience.</p>
      <div style="text-align: center;">
        <a href="${appUrl}/leave-management" class="action-button">Review Leave Requests</a>
      </div>
    </div>
    <div class="footer">
      <p>This is an automated email from AttendEase. Please do not reply to this email.</p>
      <p>&copy; ${new Date().getFullYear()} AttendEase. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

// Email template: Approved
function getLeaveApprovedEmail(
  employeeName: string,
  leaveType: string,
  startDate: string,
  endDate: string,
  totalDays: number,
  approverName: string,
  comments?: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 0; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #28a745 0%, #1e7e34 100%); color: white; padding: 30px 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .content { padding: 30px; background-color: #f8f9fa; }
    .greeting { font-size: 16px; margin-bottom: 20px; }
    .badge { display: inline-block; background-color: #28a745; color: white; padding: 8px 16px; border-radius: 20px; font-weight: 600; margin: 10px 0; }
    .details { background-color: white; padding: 20px; border-left: 4px solid #28a745; margin: 20px 0; border-radius: 4px; }
    .details-row { display: flex; margin: 12px 0; }
    .details-label { font-weight: 600; color: #28a745; width: 150px; min-width: 150px; }
    .details-value { color: #333; flex: 1; }
    .message { font-size: 15px; color: #555; margin: 20px 0; line-height: 1.8; }
    .footer { background-color: #f0f0f0; padding: 20px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #e0e0e0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✓ Leave Request Approved</h1>
    </div>
    <div class="content">
      <p class="greeting">Dear ${employeeName},</p>
      <p class="message">Good news! Your leave request has been <span class="badge">APPROVED</span></p>
      
      <div class="details">
        <div class="details-row">
          <span class="details-label">Leave Type:</span>
          <span class="details-value">${leaveType}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Start Date:</span>
          <span class="details-value">${formatDate(startDate)}</span>
        </div>
        <div class="details-row">
          <span class="details-label">End Date:</span>
          <span class="details-value">${formatDate(endDate)}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Duration:</span>
          <span class="details-value">${totalDays} day(s)</span>
        </div>
        <div class="details-row">
          <span class="details-label">Approved By:</span>
          <span class="details-value">${approverName}</span>
        </div>
        ${comments ? `<div class="details-row"><span class="details-label">Comments:</span><span class="details-value">${comments}</span></div>` : ''}
      </div>
      
      <p class="message">Your leave has been confirmed. Please ensure all handover activities are completed before your leave period.</p>
    </div>
    <div class="footer">
      <p>This is an automated email from AttendEase. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
  `;
}

// Email template: Rejected
function getLeaveRejectedEmail(
  employeeName: string,
  leaveType: string,
  startDate: string,
  endDate: string,
  rejectorName: string,
  comments?: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 0; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 30px 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .content { padding: 30px; background-color: #f8f9fa; }
    .greeting { font-size: 16px; margin-bottom: 20px; }
    .badge { display: inline-block; background-color: #dc3545; color: white; padding: 8px 16px; border-radius: 20px; font-weight: 600; margin: 10px 0; }
    .details { background-color: white; padding: 20px; border-left: 4px solid #dc3545; margin: 20px 0; border-radius: 4px; }
    .details-row { display: flex; margin: 12px 0; }
    .details-label { font-weight: 600; color: #dc3545; width: 150px; min-width: 150px; }
    .details-value { color: #333; flex: 1; }
    .message { font-size: 15px; color: #555; margin: 20px 0; line-height: 1.8; }
    .footer { background-color: #f0f0f0; padding: 20px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #e0e0e0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✗ Leave Request Rejected</h1>
    </div>
    <div class="content">
      <p class="greeting">Dear ${employeeName},</p>
      <p class="message">We regret to inform you that your leave request has been <span class="badge">REJECTED</span></p>
      
      <div class="details">
        <div class="details-row">
          <span class="details-label">Leave Type:</span>
          <span class="details-value">${leaveType}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Period:</span>
          <span class="details-value">${formatDate(startDate)} to ${formatDate(endDate)}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Rejected By:</span>
          <span class="details-value">${rejectorName}</span>
        </div>
        ${comments ? `<div class="details-row"><span class="details-label">Reason:</span><span class="details-value">${comments}</span></div>` : ''}
      </div>
      
      <p class="message">If you have any questions about this decision, please contact your reporting manager. You can reapply for leave on alternative dates if needed.</p>
    </div>
    <div class="footer">
      <p>This is an automated email from AttendEase. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
  `;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, leaveRequestId, company_id } = await req.json() as LeaveNotificationRequest;

    if (!action || !leaveRequestId || !company_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: action, leaveRequestId, company_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch the leave request
    const { data: leaveRequest, error: leaveError } = await supabase
      .from('leave_requests')
      .select(`
        id,
        employee_id,
        start_date,
        end_date,
        total_days,
        reason,
        status,
        approved_by,
        admin_comments,
        leave_types(name),
        employees(name, email, reporting_manager_id)
      `)
      .eq('id', leaveRequestId)
      .eq('company_id', company_id)
      .single();

    if (leaveError || !leaveRequest) {
      console.error('❌ Leave request not found:', leaveError);
      return new Response(
        JSON.stringify({ error: 'Leave request not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const emails: Array<{ to: string; subject: string; html: string }> = [];
    const employee = leaveRequest.employees as any;
    const leaveType = (leaveRequest.leave_types as any)?.name || 'Leave';

    console.log(`📧 Processing ${action} notification for leave request:`, leaveRequestId);

    if (action === 'apply') {
      // Notify reporting manager
      if (employee.reporting_manager_id) {
        const { data: manager } = await supabase
          .from('profiles')
          .select('email, name')
          .eq('id', employee.reporting_manager_id)
          .single();

        if (manager?.email) {
          emails.push({
            to: manager.email,
            subject: `New Leave Application - ${employee.name}`,
            html: getLeaveAppliedEmail(
              employee.name,
              leaveType,
              leaveRequest.start_date,
              leaveRequest.end_date,
              leaveRequest.total_days,
              leaveRequest.reason || 'No reason provided',
              manager.name
            )
          });
          console.log(`✓ Added email for reporting manager: ${manager.email}`);
        }
      }

      // Notify admins and super_admins
      const { data: admins } = await supabase
        .from('profiles')
        .select('email, name')
        .eq('company_id', company_id)
        .in('role', ['admin', 'super_admin']);

      if (admins && admins.length > 0) {
        for (const admin of admins) {
          emails.push({
            to: admin.email,
            subject: `New Leave Application - ${employee.name}`,
            html: getLeaveAppliedEmail(
              employee.name,
              leaveType,
              leaveRequest.start_date,
              leaveRequest.end_date,
              leaveRequest.total_days,
              leaveRequest.reason || 'No reason provided',
              admin.name
            )
          });
        }
        console.log(`✓ Added ${admins.length} admin email(s)`);
      }
    } else if (action === 'approve') {
      // Notify employee
      const { data: approver } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', leaveRequest.approved_by)
        .single();

      emails.push({
        to: employee.email,
        subject: `Leave Request Approved - ${leaveType}`,
        html: getLeaveApprovedEmail(
          employee.name,
          leaveType,
          leaveRequest.start_date,
          leaveRequest.end_date,
          leaveRequest.total_days,
          (approver as any)?.name || 'Administrator',
          leaveRequest.admin_comments
        )
      });
      console.log(`✓ Added approval email for employee: ${employee.email}`);
    } else if (action === 'reject') {
      // Notify employee
      const { data: rejector } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', leaveRequest.approved_by)
        .single();

      emails.push({
        to: employee.email,
        subject: `Leave Request Rejected - ${leaveType}`,
        html: getLeaveRejectedEmail(
          employee.name,
          leaveType,
          leaveRequest.start_date,
          leaveRequest.end_date,
          (rejector as any)?.name || 'Administrator',
          leaveRequest.admin_comments
        )
      });
      console.log(`✓ Added rejection email for employee: ${employee.email}`);
    }

    console.log(`📨 Total emails to send: ${emails.length}`, emails.map(e => e.to));

    // Send emails using Gmail SMTP
    const gmailEmail = Deno.env.get('GMAIL_EMAIL');
    const gmailPassword = Deno.env.get('GMAIL_PASSWORD');
    
    if (!gmailEmail || !gmailPassword) {
      console.error('❌ Gmail credentials not set! GMAIL_EMAIL or GMAIL_PASSWORD missing.');
      return new Response(
        JSON.stringify({ 
          error: 'Email service not configured',
          message: 'GMAIL_EMAIL and GMAIL_PASSWORD environment variables are required',
          emailsQueued: emails.length,
          recipients: emails.map(e => e.to)
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sentEmails = [];
    const failedEmails = [];

    const client = new SmtpClient();

    try {
      await client.connectTLS({
        hostname: "smtp.gmail.com",
        port: 465,
        username: gmailEmail,
        password: gmailPassword,
      });

      console.log(`✅ Connected to Gmail SMTP server`);

      for (const email of emails) {
        try {
          await client.send({
            from: gmailEmail,
            to: email.to,
            subject: email.subject,
            content: email.html,
            html: true,
          });

          sentEmails.push({ to: email.to, status: 'sent' });
          console.log(`✅ Email sent to ${email.to}`);
        } catch (err) {
          failedEmails.push({ to: email.to, error: err instanceof Error ? err.message : 'Failed to send' });
          console.error(`❌ Failed to send email to ${email.to}:`, err);
        }
      }

      await client.close();
      console.log(`✅ Disconnected from Gmail SMTP server`);
    } catch (err) {
      console.error('❌ SMTP Connection error:', err);
      failedEmails.push(...emails.map(e => ({ to: e.to, error: 'SMTP connection failed' })));
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `${sentEmails.length} email(s) sent successfully${failedEmails.length > 0 ? `, ${failedEmails.length} failed` : ''}`,
        sent: sentEmails,
        failed: failedEmails,
        action,
        totalAttempted: emails.length
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Error in send-leave-notification:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
