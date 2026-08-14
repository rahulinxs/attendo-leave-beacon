-- Migration: Create email_queue table for outbound emails

CREATE TABLE IF NOT EXISTS email_queue (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    subject text NOT NULL,
    body text NOT NULL,
    recipients jsonb NOT NULL, -- array of email addresses
    meta jsonb DEFAULT '{}'::jsonb,
    status text NOT NULL DEFAULT 'pending', -- pending | processing | sent | failed
    attempts int NOT NULL DEFAULT 0,
    last_error text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_queue_status_created_at ON email_queue(status, created_at);
