-- Test script to insert sample commission data
-- Run this in your Supabase SQL Editor to test

-- First, get your company ID
-- SELECT id FROM companies WHERE name = 'Your Company Name';

-- Insert sample commission engagement (replace YOUR_COMPANY_ID with actual company ID)
INSERT INTO commission_engagements (
  id,
  company_id,
  created_by,
  consultant_name,
  client,
  end_client,
  start_date,
  commission_cycle,
  hours,
  bill_rate,
  pay_rate,
  load_percent,
  recruiter_name,
  recruiter_split_percent,
  recruitment_lead_name,
  recruitment_lead_split_percent,
  sales_name,
  sales_split_percent,
  sales_lead_name,
  sales_lead_split_percent
) VALUES (
  gen_random_uuid(),
  'YOUR_COMPANY_ID', -- Replace with your actual company ID
  auth.uid(),
  'John Doe',
  'ABC Corporation',
  'XYZ Subsidiary',
  '2024-01-15',
  'Monthly',
  160.0,
  100.0,
  75.0,
  20.0,
  10.0,
  'Jane Smith',
  5.0,
  'Mike Johnson',
  5.0,
  NULL,
  0.0,
  NULL,
  0.0
);

-- Check if data was inserted
SELECT * FROM commission_engagements WHERE company_id = 'YOUR_COMPANY_ID';
