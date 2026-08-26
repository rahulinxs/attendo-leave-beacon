-- Extended employee profile fields (HR, identity, bank, employment status)

ALTER TABLE public.employee_profiles
  ADD COLUMN IF NOT EXISTS employment_status text,
  ADD COLUMN IF NOT EXISTS last_working_day date,
  ADD COLUMN IF NOT EXISTS billing_status text,
  ADD COLUMN IF NOT EXISTS contract_valid_upto date,
  ADD COLUMN IF NOT EXISTS annual_ctc numeric,
  ADD COLUMN IF NOT EXISTS aadhaar_number text,
  ADD COLUMN IF NOT EXISTS pan_number text,
  ADD COLUMN IF NOT EXISTS uan_number text,
  ADD COLUMN IF NOT EXISTS pf_number text,
  ADD COLUMN IF NOT EXISTS esi_number text,
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS bank_branch text,
  ADD COLUMN IF NOT EXISTS bank_city text,
  ADD COLUMN IF NOT EXISTS ifsc_code text,
  ADD COLUMN IF NOT EXISTS account_number text;

COMMENT ON COLUMN public.employee_profiles.employment_status IS 'Profile HR status: Active, On notice, Relieved, Contract, Probation, etc. Independent of employees.is_active.';
