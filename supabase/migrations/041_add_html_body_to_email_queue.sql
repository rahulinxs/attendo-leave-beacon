-- Migration: add html_body column to email_queue

ALTER TABLE email_queue
  ADD COLUMN IF NOT EXISTS html_body text;
