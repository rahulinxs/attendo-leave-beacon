import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

interface EmailQueueRow {
  id: string;
  subject: string;
  body: string;
  recipients: string[];
}

serve(async (req) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const DAYS_AHEAD = Number(Deno.env.get('DAYS_AHEAD') || '1')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Fetch active employees
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, email, name, reporting_manager_id, company_id')
      .eq('is_active', true)

    if (empError) throw new Error(`Failed to load employees: ${empError.message}`)
    if (!employees || employees.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No active employees' }), { headers: { 'Content-Type': 'application/json' } })
    }

    const idMap = new Map<string, any>()
    const allEmails: string[] = []
    for (const e of employees) {
      idMap.set(e.id, e)
      if (e.email) allEmails.push(e.email)
    }

    // Fetch profiles for these employees
    const ids = employees.map((e: any) => e.id)
    const { data: profiles, error: profError } = await supabase
      .from('employee_profiles')
      .select('employee_id, date_of_birth')
      .in('employee_id', ids)
      .not('date_of_birth', 'is', null)

    if (profError) throw new Error(`Failed to load profiles: ${profError.message}`)

    const matches: Array<{ employee: any; date_of_birth: string }> = []

    const target = new Date()
    target.setDate(target.getDate() + DAYS_AHEAD)
    const targetMonth = target.getMonth() + 1
    const targetDay = target.getDate()

    for (const p of profiles || []) {
      try {
        const dob = new Date(p.date_of_birth)
        if (!isNaN(dob.getTime())) {
          const m = dob.getMonth() + 1
          const d = dob.getDate()
          if (m === targetMonth && d === targetDay) {
            const employee = idMap.get(p.employee_id)
            if (employee) matches.push({ employee, date_of_birth: p.date_of_birth })
          }
        }
      } catch (err) {
        console.warn('Invalid dob for profile', p, err)
      }
    }

    if (matches.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No birthdays found' }), { headers: { 'Content-Type': 'application/json' } })
    }

    // For each matching birthday, enqueue two emails: announcement to all, greeting to employee
    const inserted: EmailQueueRow[] = []

    for (const m of matches) {
      const emp = m.employee
      const formattedDate = new Date(m.date_of_birth).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })

      const announcementSubject = `Upcoming birthday: ${emp.name} — ${formattedDate}`
      const announcementBody = `Hello team,\n\nPlease join us in wishing ${emp.name} a happy birthday on ${formattedDate}!\n\nBest,\nHR`
      const announcementHtml = `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#E3F2FD;font-family:Arial,sans-serif;">
    <div style="max-width:640px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;">
      <div style="background:#1976D2;padding:20px 0;text-align:center;color:#fff;">
        <h1 style="margin:0;font-size:1.4rem;">AttendEdge</h1>
        <p style="margin:4px 0 0;color:#BBDEFB;">Smart Attendance &amp; Leave Management</p>
      </div>
      <div style="padding:24px;">
        <h2 style="color:#1976D2;margin-top:0;">Upcoming Birthday: ${emp.name}</h2>
        <p style="color:#333;font-size:1rem;">Please join us in wishing <strong>${emp.name}</strong> a happy birthday on <strong>${formattedDate}</strong>!</p>
        <p style="color:#666;font-size:0.9rem;">— HR</p>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
        <p style="color:#999;font-size:0.85rem;text-align:center;">&copy; ${new Date().getFullYear()} AttendEdge</p>
      </div>
    </div>
  </body>
</html>`

      const greetingSubject = `Happy Birthday, ${emp.name}!`
      const greetingBody = `Hi ${emp.name},\n\nWishing you a very happy birthday! Enjoy your day.\n\n— The Company`
      const greetingHtml = `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#FFF8E1;font-family:Arial,sans-serif;">
    <div style="max-width:640px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;">
      <div style="background:#FFB74D;padding:20px 0;text-align:center;color:#000;">
        <h1 style="margin:0;font-size:1.4rem;">Happy Birthday!</h1>
      </div>
      <div style="padding:24px;">
        <h2 style="color:#333;margin-top:0;">Dear ${emp.name},</h2>
        <p style="color:#333;font-size:1rem;">Wishing you a wonderful birthday on <strong>${formattedDate}</strong>. May your day be filled with joy!</p>
        <p style="color:#666;font-size:0.9rem;">Warm wishes,<br/>The Team</p>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
      </div>
    </div>
  </body>
</html>`

      // Insert announcement to all employees
      const { data: aData, error: aErr } = await supabase
        .from('email_queue')
        .insert([{ subject: announcementSubject, body: announcementBody, html_body: announcementHtml, recipients: allEmails }])

      if (aErr) console.error('Failed to enqueue announcement', aErr)
      else if (aData && aData[0]) inserted.push(aData[0])

      // Insert personal greeting
      const toEmployee = emp.email ? [emp.email] : []
      const { data: gData, error: gErr } = await supabase
        .from('email_queue')
        .insert([{ subject: greetingSubject, body: greetingBody, html_body: greetingHtml, recipients: toEmployee }])

      if (gErr) console.error('Failed to enqueue greeting', gErr)
      else if (gData && gData[0]) inserted.push(gData[0])
    }

    return new Response(JSON.stringify({ success: true, enqueued: inserted.length }), { headers: { 'Content-Type': 'application/json' } })

  } catch (error) {
    console.error('Birthday reminder error:', error)
    return new Response(JSON.stringify({ success: false, error: error.message }), { headers: { 'Content-Type': 'application/json' }, status: 500 })
  }
})
