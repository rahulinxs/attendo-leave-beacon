-- Migration: Complete company migration and data association
-- This migration ensures all existing data is properly associated with NYTP

-- First, ensure companies table exists and NYTP is inserted
DO $$
BEGIN
    -- Create companies table if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'companies') THEN
        CREATE TABLE companies (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name VARCHAR(255) NOT NULL UNIQUE,
            domain VARCHAR(255),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
    
    -- Insert NYTP if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM companies WHERE name = 'New York Technology Partners (NYTP)') THEN
        INSERT INTO companies (name, domain)
        VALUES ('New York Technology Partners (NYTP)', 'nytp.com');
    END IF;
END $$;

-- Add company_id to employees table if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'company_id') THEN
        ALTER TABLE employees ADD COLUMN company_id UUID;
    END IF;
END $$;

-- Add company_id to leave_types table if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leave_types' AND column_name = 'company_id') THEN
        ALTER TABLE leave_types ADD COLUMN company_id UUID;
    END IF;
END $$;

-- Add company_id to attendance table if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'company_id') THEN
        ALTER TABLE attendance ADD COLUMN company_id UUID;
    END IF;
END $$;

-- Add company_id to leave_requests table if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leave_requests' AND column_name = 'company_id') THEN
        ALTER TABLE leave_requests ADD COLUMN company_id UUID;
    END IF;
END $$;

-- Add company_id to leave_balances table if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leave_balances' AND column_name = 'company_id') THEN
        ALTER TABLE leave_balances ADD COLUMN company_id UUID;
    END IF;
END $$;

-- Get NYTP company ID and update all existing data
DO $$
DECLARE
    nytp_company_id UUID;
BEGIN
    SELECT id INTO nytp_company_id FROM companies WHERE name = 'New York Technology Partners (NYTP)' LIMIT 1;
    
    -- Update all existing data to associate with NYTP
    UPDATE employees SET company_id = nytp_company_id WHERE company_id IS NULL;
    UPDATE leave_types SET company_id = nytp_company_id WHERE company_id IS NULL;
    UPDATE attendance SET company_id = nytp_company_id WHERE company_id IS NULL;
    UPDATE leave_requests SET company_id = nytp_company_id WHERE company_id IS NULL;
    UPDATE leave_balances SET company_id = nytp_company_id WHERE company_id IS NULL;
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

-- Create updated_at trigger for companies table if not exists
CREATE OR REPLACE FUNCTION update_companies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_companies_updated_at') THEN
        CREATE TRIGGER update_companies_updated_at
            BEFORE UPDATE ON companies
            FOR EACH ROW
            EXECUTE FUNCTION update_companies_updated_at();
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_employees_company_id ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_leave_types_company_id ON leave_types(company_id);
CREATE INDEX IF NOT EXISTS idx_attendance_company_id ON attendance(company_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_company_id ON leave_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_leave_balances_company_id ON leave_balances(company_id);

-- Update RLS policies to include company-based filtering
-- Drop existing policies and recreate with company filtering
DROP POLICY IF EXISTS "Employees can view their own data" ON employees;
DROP POLICY IF EXISTS "Admins can view all employees" ON employees;
DROP POLICY IF EXISTS "Admins can insert employees" ON employees;
DROP POLICY IF EXISTS "Admins can update employees" ON employees;

DROP POLICY IF EXISTS "Employees can view their own attendance" ON attendance;
DROP POLICY IF EXISTS "Admins can view all attendance" ON attendance;
DROP POLICY IF EXISTS "Employees can insert their own attendance" ON attendance;
DROP POLICY IF EXISTS "Admins can insert any attendance" ON attendance;
DROP POLICY IF EXISTS "Employees can update their own attendance" ON attendance;
DROP POLICY IF EXISTS "Admins can update any attendance" ON attendance;

DROP POLICY IF EXISTS "Everyone can view leave types" ON leave_types;
DROP POLICY IF EXISTS "Admins can manage leave types" ON leave_types;

DROP POLICY IF EXISTS "Employees can view their own leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Admins can view all leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Employees can insert their own leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Employees can update their own pending leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Admins can update any leave request" ON leave_requests;

DROP POLICY IF EXISTS "Employees can view their own leave balances" ON leave_balances;
DROP POLICY IF EXISTS "Admins can view all leave balances" ON leave_balances;
DROP POLICY IF EXISTS "Admins can manage leave balances" ON leave_balances;

-- Create new company-aware policies for employees
CREATE POLICY "Employees can view their own data" ON employees
    FOR SELECT USING (
        auth.uid()::text = id::text AND 
        company_id = (SELECT company_id FROM employees WHERE id::text = auth.uid()::text LIMIT 1)
    );

CREATE POLICY "Admins can view all employees in company" ON employees
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id::text = auth.uid()::text AND role = 'admin'
        ) AND
        company_id = (SELECT company_id FROM employees WHERE id::text = auth.uid()::text LIMIT 1)
    );

CREATE POLICY "Admins can insert employees in company" ON employees
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id::text = auth.uid()::text AND role = 'admin'
        ) AND
        company_id = (SELECT company_id FROM employees WHERE id::text = auth.uid()::text LIMIT 1)
    );

CREATE POLICY "Admins can update employees in company" ON employees
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id::text = auth.uid()::text AND role = 'admin'
        ) AND
        company_id = (SELECT company_id FROM employees WHERE id::text = auth.uid()::text LIMIT 1)
    );

-- Create new company-aware policies for attendance
CREATE POLICY "Employees can view their own attendance" ON attendance
    FOR SELECT USING (
        employee_id::text = auth.uid()::text AND 
        company_id = (SELECT company_id FROM employees WHERE id::text = auth.uid()::text LIMIT 1)
    );

CREATE POLICY "Admins can view all attendance in company" ON attendance
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id::text = auth.uid()::text AND role = 'admin'
        ) AND
        company_id = (SELECT company_id FROM employees WHERE id::text = auth.uid()::text LIMIT 1)
    );

CREATE POLICY "Employees can insert their own attendance" ON attendance
    FOR INSERT WITH CHECK (
        employee_id::text = auth.uid()::text AND
        company_id = (SELECT company_id FROM employees WHERE id::text = auth.uid()::text LIMIT 1)
    );

CREATE POLICY "Admins can insert any attendance in company" ON attendance
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id::text = auth.uid()::text AND role = 'admin'
        ) AND
        company_id = (SELECT company_id FROM employees WHERE id::text = auth.uid()::text LIMIT 1)
    );

CREATE POLICY "Employees can update their own attendance" ON attendance
    FOR UPDATE USING (
        employee_id::text = auth.uid()::text AND
        company_id = (SELECT company_id FROM employees WHERE id::text = auth.uid()::text LIMIT 1)
    );

CREATE POLICY "Admins can update any attendance in company" ON attendance
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id::text = auth.uid()::text AND role = 'admin'
        ) AND
        company_id = (SELECT company_id FROM employees WHERE id::text = auth.uid()::text LIMIT 1)
    );

-- Create new company-aware policies for leave_types
CREATE POLICY "Everyone can view leave types in company" ON leave_types
    FOR SELECT USING (
        company_id = (SELECT company_id FROM employees WHERE id::text = auth.uid()::text LIMIT 1)
    );

CREATE POLICY "Admins can manage leave types in company" ON leave_types
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id::text = auth.uid()::text AND role = 'admin'
        ) AND
        company_id = (SELECT company_id FROM employees WHERE id::text = auth.uid()::text LIMIT 1)
    );

-- Create new company-aware policies for leave_requests
CREATE POLICY "Employees can view their own leave requests" ON leave_requests
    FOR SELECT USING (
        employee_id::text = auth.uid()::text AND
        company_id = (SELECT company_id FROM employees WHERE id::text = auth.uid()::text LIMIT 1)
    );

CREATE POLICY "Admins can view all leave requests in company" ON leave_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id::text = auth.uid()::text AND role = 'admin'
        ) AND
        company_id = (SELECT company_id FROM employees WHERE id::text = auth.uid()::text LIMIT 1)
    );

CREATE POLICY "Employees can insert their own leave requests" ON leave_requests
    FOR INSERT WITH CHECK (
        employee_id::text = auth.uid()::text AND
        company_id = (SELECT company_id FROM employees WHERE id::text = auth.uid()::text LIMIT 1)
    );

CREATE POLICY "Employees can update their own pending leave requests" ON leave_requests
    FOR UPDATE USING (
        employee_id::text = auth.uid()::text AND status = 'pending' AND
        company_id = (SELECT company_id FROM employees WHERE id::text = auth.uid()::text LIMIT 1)
    );

CREATE POLICY "Admins can update any leave request in company" ON leave_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id::text = auth.uid()::text AND role = 'admin'
        ) AND
        company_id = (SELECT company_id FROM employees WHERE id::text = auth.uid()::text LIMIT 1)
    );

-- Create new company-aware policies for leave_balances
CREATE POLICY "Employees can view their own leave balances" ON leave_balances
    FOR SELECT USING (
        employee_id::text = auth.uid()::text AND
        company_id = (SELECT company_id FROM employees WHERE id::text = auth.uid()::text LIMIT 1)
    );

CREATE POLICY "Admins can view all leave balances in company" ON leave_balances
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id::text = auth.uid()::text AND role = 'admin'
        ) AND
        company_id = (SELECT company_id FROM employees WHERE id::text = auth.uid()::text LIMIT 1)
    );

CREATE POLICY "Admins can manage leave balances in company" ON leave_balances
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id::text = auth.uid()::text AND role = 'admin'
        ) AND
        company_id = (SELECT company_id FROM employees WHERE id::text = auth.uid()::text LIMIT 1)
    );

-- Create policies for companies table
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own company" ON companies
    FOR SELECT USING (
        id = (SELECT company_id FROM employees WHERE id::text = auth.uid()::text LIMIT 1)
    ); 