import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AttendanceNotificationRequest {
  action: 'clock-in' | 'clock-out';
  employee_id: string;
  company_id?: string;
}

function getEmailHtml(action: 'clock-in' | 'clock-out', recipientName: string, timestamp: string): string {
  const isClockIn = action === 'clock-in';
  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <style>
      body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
      .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 6px 20px rgba(0,0,0,0.08); }
      .header { padding: 28px 24px; background: linear-gradient(135deg, ${isClockIn ? '#28a745' : '#dc3545'} 0%, ${isClockIn ? '#1f7a3b' : '#a61d2a'} 100%); color: white; }
      .header h1 { margin: 0; font-size: 28px; }
      .content { padding: 28px 24px; color: #222; }
      .badge { display: inline-block; margin: 12px 0 18px; padding: 8px 14px; border-radius: 999px; background: ${isClockIn ? '#eafaf1' : '#fdecef'}; color: ${isClockIn ? '#1f7a3b' : '#a61d2a'}; font-weight: 700; }
      .meta { margin-top: 18px; padding: 16px 18px; background: #f8f9fa; border-left: 4px solid ${isClockIn ? '#28a745' : '#dc3545'}; border-radius: 8px; }
      .footer { padding: 20px 24px; font-size: 12px; color: #777; background: #fafafa; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>${isClockIn ? 'Clock-in Confirmation' : 'Clock-out Confirmation'}</h1>
      </div>
      <div class="content">
        <p>Hi ${recipientName},</p>
        <div class="badge">${isClockIn ? 'CHECKED IN' : 'CHECKED OUT'}</div>
        <p>You have successfully ${isClockIn ? 'clocked in' : 'clocked out'}.</p>
        <div class="meta">
          <strong>Time:</strong> ${timestamp}
        </div>
      </div>
      <div class="footer">This is an automated email from AttendEase.</div>
    </div>
  </body>
</html>
  `;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, employee_id, company_id } = await req.json() as AttendanceNotificationRequest;

    if (!action || !employee_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: action and employee_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const gmailEmail = Deno.env.get('GMAIL_EMAIL');
    const gmailPassword = Deno.env.get('GMAIL_PASSWORD');

    if (!gmailEmail || !gmailPassword) {
      return new Response(
        JSON.stringify({ error: 'Email service not configured', message: 'GMAIL_EMAIL and GMAIL_PASSWORD are required' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: employee, error: employeeError } = await supabase
      .from('profiles')
      .select('email, name')
      .eq('id', employee_id)
      .maybeSingle();

    if (employeeError || !employee?.email) {
      return new Response(
        JSON.stringify({ error: 'Employee not found', details: employeeError?.message || 'No email available' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const timestamp = new Date().toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const client = new SmtpClient();
    await client.connectTLS({
      hostname: 'smtp.gmail.com',
      port: 465,
      username: gmailEmail,
      password: gmailPassword,
    });

    await client.send({
      from: gmailEmail,
      to: employee.email,
      subject: action === 'clock-in' ? '⏰ Clock-in Confirmation' : '🏁 Clock-out Confirmation',
      content: getEmailHtml(action, employee.name || 'Employee', timestamp),
      html: true,
    });

    await client.close();

    return new Response(
      JSON.stringify({ success: true, sentTo: employee.email, action }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Attendance notification edge function error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
