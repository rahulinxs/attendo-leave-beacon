-- Migration: Add company_id to profiles table

-- Add company_id column to profiles if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_id UUID;

-- Update profiles with company_id from employees
UPDATE profiles p
SET company_id = (
  SELECT company_id 
  FROM employees e
  WHERE e.id = p.id
);

-- Set NOT NULL constraint (after populating existing rows)
ALTER TABLE profiles ALTER COLUMN company_id SET NOT NULL;

-- Add composite unique constraint to ensure each user can only be associated with one company
ALTER TABLE profiles ADD CONSTRAINT profiles_user_company_unique UNIQUE (id, company_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON profiles(company_id);
