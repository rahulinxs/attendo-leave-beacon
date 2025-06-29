-- Migration: Create companies table and migrate existing data to NYTP
-- This migration creates the companies table and associates all existing data with NYTP

-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    domain VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create updated_at trigger for companies table
CREATE OR REPLACE FUNCTION update_companies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION update_companies_updated_at();

-- Insert NYTP company
INSERT INTO companies (name, domain)
VALUES ('New York Technology Partners (NYTP)', 'nytp.com')
ON CONFLICT (name) DO NOTHING;

-- Add company_id columns to all tables
ALTER TABLE employees ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE leave_balances ADD COLUMN IF NOT EXISTS company_id UUID;

-- Update all existing data to associate with NYTP
UPDATE employees 
SET company_id = (SELECT id FROM companies WHERE name = 'New York Technology Partners (NYTP)' LIMIT 1)
WHERE company_id IS NULL;

UPDATE leave_types 
SET company_id = (SELECT id FROM companies WHERE name = 'New York Technology Partners (NYTP)' LIMIT 1)
WHERE company_id IS NULL;

UPDATE attendance 
SET company_id = (SELECT id FROM companies WHERE name = 'New York Technology Partners (NYTP)' LIMIT 1)
WHERE company_id IS NULL;

UPDATE leave_requests 
SET company_id = (SELECT id FROM companies WHERE name = 'New York Technology Partners (NYTP)' LIMIT 1)
WHERE company_id IS NULL;

UPDATE leave_balances 
SET company_id = (SELECT id FROM companies WHERE name = 'New York Technology Partners (NYTP)' LIMIT 1)
WHERE company_id IS NULL;

-- Set NOT NULL constraints after populating data
ALTER TABLE employees ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE leave_types ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE attendance ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE leave_requests ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE leave_balances ALTER COLUMN company_id SET NOT NULL;

-- Add foreign key constraints
ALTER TABLE employees ADD CONSTRAINT IF NOT EXISTS employees_company_id_fkey 
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE leave_types ADD CONSTRAINT IF NOT EXISTS leave_types_company_id_fkey 
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE attendance ADD CONSTRAINT IF NOT EXISTS attendance_company_id_fkey 
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE leave_requests ADD CONSTRAINT IF NOT EXISTS leave_requests_company_id_fkey 
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE leave_balances ADD CONSTRAINT IF NOT EXISTS leave_balances_company_id_fkey 
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_employees_company_id ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_leave_types_company_id ON leave_types(company_id);
CREATE INDEX IF NOT EXISTS idx_attendance_company_id ON attendance(company_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_company_id ON leave_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_leave_balances_company_id ON leave_balances(company_id);

-- Enable Row Level Security on companies table
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for companies table
CREATE POLICY "Users can view their own company" ON companies
    FOR SELECT USING (
        id = (SELECT company_id FROM employees WHERE id::text = auth.uid()::text LIMIT 1)
    ); 