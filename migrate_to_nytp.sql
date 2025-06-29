-- Migration script to create companies table and associate all existing data with NYTP
-- Run this in your Supabase SQL editor

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

-- Get NYTP company ID and migrate all existing data
DO $$
DECLARE
    nytp_company_id UUID;
BEGIN
    SELECT id INTO nytp_company_id FROM companies WHERE name = 'New York Technology Partners (NYTP)' LIMIT 1;
    
    -- Add company_id columns to all tables
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'company_id') THEN
        ALTER TABLE employees ADD COLUMN company_id UUID;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leave_types' AND column_name = 'company_id') THEN
        ALTER TABLE leave_types ADD COLUMN company_id UUID;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'company_id') THEN
        ALTER TABLE attendance ADD COLUMN company_id UUID;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leave_requests' AND column_name = 'company_id') THEN
        ALTER TABLE leave_requests ADD COLUMN company_id UUID;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leave_balances' AND column_name = 'company_id') THEN
        ALTER TABLE leave_balances ADD COLUMN company_id UUID;
    END IF;
    
    -- Update all existing data to associate with NYTP
    UPDATE employees SET company_id = nytp_company_id WHERE company_id IS NULL;
    UPDATE leave_types SET company_id = nytp_company_id WHERE company_id IS NULL;
    UPDATE attendance SET company_id = nytp_company_id WHERE company_id IS NULL;
    UPDATE leave_requests SET company_id = nytp_company_id WHERE company_id IS NULL;
    UPDATE leave_balances SET company_id = nytp_company_id WHERE company_id IS NULL;
    
    RAISE NOTICE 'Successfully created companies table and migrated all data to NYTP company (ID: %)', nytp_company_id;
END $$;

-- Set NOT NULL constraints after populating data
ALTER TABLE employees ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE leave_types ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE attendance ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE leave_requests ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE leave_balances ALTER COLUMN company_id SET NOT NULL;

-- Add foreign key constraints
DO $$
BEGIN
    -- Employees foreign key
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'employees_company_id_fkey') THEN
        ALTER TABLE employees ADD CONSTRAINT employees_company_id_fkey 
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    END IF;
    
    -- Leave types foreign key
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'leave_types_company_id_fkey') THEN
        ALTER TABLE leave_types ADD CONSTRAINT leave_types_company_id_fkey 
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    END IF;
    
    -- Attendance foreign key
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'attendance_company_id_fkey') THEN
        ALTER TABLE attendance ADD CONSTRAINT attendance_company_id_fkey 
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    END IF;
    
    -- Leave requests foreign key
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'leave_requests_company_id_fkey') THEN
        ALTER TABLE leave_requests ADD CONSTRAINT leave_requests_company_id_fkey 
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    END IF;
    
    -- Leave balances foreign key
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'leave_balances_company_id_fkey') THEN
        ALTER TABLE leave_balances ADD CONSTRAINT leave_balances_company_id_fkey 
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    END IF;
END $$;

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

-- Verify the migration
SELECT 
    'companies' as table_name,
    COUNT(*) as total_records,
    'N/A' as records_with_company_id
FROM companies
UNION ALL
SELECT 
    'employees' as table_name,
    COUNT(*) as total_records,
    COUNT(company_id)::text as records_with_company_id
FROM employees
UNION ALL
SELECT 
    'leave_types' as table_name,
    COUNT(*) as total_records,
    COUNT(company_id)::text as records_with_company_id
FROM leave_types
UNION ALL
SELECT 
    'attendance' as table_name,
    COUNT(*) as total_records,
    COUNT(company_id)::text as records_with_company_id
FROM attendance
UNION ALL
SELECT 
    'leave_requests' as table_name,
    COUNT(*) as total_records,
    COUNT(company_id)::text as records_with_company_id
FROM leave_requests
UNION ALL
SELECT 
    'leave_balances' as table_name,
    COUNT(*) as total_records,
    COUNT(company_id)::text as records_with_company_id
FROM leave_balances; 