import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, recipient_email } = await req.json() as { action: 'clock-in' | 'clock-out', recipient_email: string };

    if (!action || !recipient_email) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields',
          required: ['action (clock-in or clock-out)', 'recipient_email']
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Gmail credentials
    const gmailEmail = Deno.env.get('GMAIL_EMAIL');
    const gmailPassword = Deno.env.get('GMAIL_PASSWORD');

    if (!gmailEmail || !gmailPassword) {
      console.error('❌ Gmail credentials not configured');
      return new Response(
        JSON.stringify({ 
          error: 'Email service not configured',
          message: 'GMAIL_EMAIL and GMAIL_PASSWORD environment variables are required'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create email content based on action
    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const subject = action === 'clock-in' ? '⏰ Clock-In Confirmation' : '🏁 Clock-Out Confirmation';
    
    const emailContent = action === 'clock-in' 
      ? `<h2 style="color: #28a745;">✓ You have clocked in</h2><p>Time: <strong>${now}</strong></p><p>Have a productive day!</p>`
      : `<h2 style="color: #dc3545;">✓ You have clocked out</h2><p>Time: <strong>${now}</strong></p><p>Thank you for your work today!</p>`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; }
    .container { max-width: 600px; margin: 50px auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    h2 { margin-top: 0; }
    p { color: #333; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="container">
    ${emailContent}
    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
    <p style="font-size: 12px; color: #999;">This is an automated test email from AttendEase.</p>
  </div>
</body>
</html>
    `;

    // Connect to Gmail SMTP
    const client = new SmtpClient();

    console.log(`📧 Testing email to: ${recipient_email}`);
    console.log(`🔐 Connecting to Gmail SMTP...`);

    try {
      await client.connectTLS({
        hostname: "smtp.gmail.com",
        port: 465,
        username: gmailEmail,
        password: gmailPassword,
      });

      console.log(`✅ Connected to Gmail SMTP`);

      await client.send({
        from: gmailEmail,
        to: recipient_email,
        subject: subject,
        content: html,
        html: true,
      });

      await client.close();

      console.log(`✅ Email sent successfully to ${recipient_email}`);

      return new Response(
        JSON.stringify({ 
          success: true,
          message: `Email sent successfully!`,
          details: {
            to: recipient_email,
            from: gmailEmail,
            subject: subject,
            action: action,
            timestamp: now
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (smtpError) {
      console.error(`❌ SMTP Error:`, smtpError);
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send email',
          message: smtpError instanceof Error ? smtpError.message : 'Unknown SMTP error',
          troubleshooting: [
            '1. Check GMAIL_EMAIL and GMAIL_PASSWORD are set in Supabase secrets',
            '2. If using app password, make sure it\'s 16 characters',
            '3. Check Gmail 2FA is enabled and app password was generated',
            '4. Verify recipient email address is valid'
          ]
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('💥 Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
