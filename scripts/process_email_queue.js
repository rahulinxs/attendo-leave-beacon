#!/usr/bin/env node
// Simple email queue processor. Sends emails using SendGrid if SENDGRID_API_KEY is set.
// Usage: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY and optionally SENDGRID_API_KEY, then run.

const fetch = require('node-fetch')

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

async function getPending() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/email_queue?status=eq.pending&select=*`, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
    }
  })
  if (!res.ok) throw new Error(`Failed to fetch queue: ${res.statusText}`)
  return res.json()
}

async function mark(id, patch) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/email_queue?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify(patch)
  })
  if (!res.ok) console.error('Failed to patch', await res.text())
  else return res.json()
}

async function sendWithSendGrid(email) {
  if (!SENDGRID_API_KEY) throw new Error('SENDGRID_API_KEY not set')
  const content = []
  if (email.body) content.push({ type: 'text/plain', value: email.body })
  if (email.html_body) content.push({ type: 'text/html', value: email.html_body })

  const body = {
    personalizations: [{ to: email.recipients.map(r => ({ email: r })) }],
    from: { email: process.env.FROM_EMAIL || 'no-reply@example.com' },
    subject: email.subject,
    content: content.length ? content : [{ type: 'text/plain', value: email.body || '' }]
  }

  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  if (!res.ok) throw new Error(`SendGrid error: ${res.status} ${res.statusText}`)
}

;(async function main() {
  try {
    const pending = await getPending()
    if (!pending || pending.length === 0) {
      console.log('No pending emails')
      return
    }

    for (const email of pending) {
      try {
        await mark(email.id, { status: 'processing', updated_at: new Date().toISOString() })
        if (SENDGRID_API_KEY) {
          await sendWithSendGrid(email)
        } else {
          console.log('SENDGRID_API_KEY not set — would send:', email.subject, email.recipients)
        }
        await mark(email.id, { status: 'sent', updated_at: new Date().toISOString() })
      } catch (err) {
        console.error('Failed to send email', email.id, err.message)
        await mark(email.id, { status: 'failed', last_error: err.message, attempts: (email.attempts || 0) + 1, updated_at: new Date().toISOString() })
      }
    }
  } catch (err) {
    console.error('Processor error', err)
  }
})()
