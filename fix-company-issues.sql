-- Fix Company Context Issues
-- Run this in Supabase SQL Editor to resolve "Company Not Found" errors

-- First, ensure we have the NYTP company
INSERT INTO companies (id, name, domain, created_at, updated_at) 
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'New York Technology Partners (NYTP)',
  'nytp.com',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Update all existing employees to have the NYTP company_id
UPDATE employees 
SET company_id = '550e8400-e29b-41d4-a716-446655440000'
WHERE company_id IS NULL;

-- Update all existing profiles to have the NYTP company_id (if they don't have it)
UPDATE profiles 
SET company_id = '550e8400-e29b-41d4-a716-446655440000'
WHERE company_id IS NULL;

-- Ensure all leave requests have the company_id
UPDATE leave_requests 
SET company_id = '550e8400-e29b-41d4-a716-446655440000'
WHERE company_id IS NULL;

-- Ensure all attendance records have the company_id
UPDATE attendance 
SET company_id = '550e8400-e29b-41d4-a716-446655440000'
WHERE company_id IS NULL;

-- Ensure all leave balances have the company_id
UPDATE leave_balances 
SET company_id = '550e8400-e29b-41d4-a716-446655440000'
WHERE company_id IS NULL;

-- Ensure all leave types have the company_id
UPDATE leave_types 
SET company_id = '550e8400-e29b-41d4-a716-446655440000'
WHERE company_id IS NULL;

-- Create teams table if it doesn't exist
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    manager_id UUID REFERENCES employees(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default teams for NYTP
INSERT INTO teams (id, name, description, company_id) VALUES
('550e8400-e29b-41d4-a716-446655440010', 'Engineering Team', 'Software development and technical team', '550e8400-e29b-41d4-a716-446655440000'),
('550e8400-e29b-41d4-a716-446655440011', 'Marketing Team', 'Marketing and communications team', '550e8400-e29b-41d4-a716-446655440000'),
('550e8400-e29b-41d4-a716-446655440012', 'Sales Team', 'Sales and business development team', '550e8400-e29b-41d4-a716-446655440000'),
('550e8400-e29b-41d4-a716-446655440013', 'HR Team', 'Human resources and administration team', '550e8400-e29b-41d4-a716-446655440000')
ON CONFLICT (id) DO NOTHING;

-- Add team_id column to employees if it doesn't exist
ALTER TABLE employees ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id);

-- Add reporting_manager_id column to employees if it doesn't exist
ALTER TABLE employees ADD COLUMN IF NOT EXISTS reporting_manager_id UUID REFERENCES employees(id);

-- Assign employees to teams based on department
UPDATE employees 
SET team_id = '550e8400-e29b-41d4-a716-446655440010'
WHERE department = 'Engineering' AND team_id IS NULL;

UPDATE employees 
SET team_id = '550e8400-e29b-41d4-a716-446655440011'
WHERE department = 'Marketing' AND team_id IS NULL;

UPDATE employees 
SET team_id = '550e8400-e29b-41d4-a716-446655440012'
WHERE department = 'Sales' AND team_id IS NULL;

UPDATE employees 
SET team_id = '550e8400-e29b-41d4-a716-446655440013'
WHERE department = 'Human Resources' AND team_id IS NULL;

-- Assign default team for employees without department
UPDATE employees 
SET team_id = '550e8400-e29b-41d4-a716-446655440010'
WHERE team_id IS NULL;

-- Promote some employees to reporting_manager role
UPDATE employees 
SET role = 'reporting_manager'
WHERE id IN (
  '550e8400-e29b-41d4-a716-446655440004', -- Bob Brown (Engineering)
  '550e8400-e29b-41d4-a716-446655440001'  -- Sarah Johnson (HR)
);

-- Assign team managers
UPDATE teams 
SET manager_id = '550e8400-e29b-41d4-a716-446655440004'
WHERE name = 'Engineering Team';

UPDATE teams 
SET manager_id = '550e8400-e29b-41d4-a716-446655440001'
WHERE name = 'HR Team';

-- Assign reporting managers to employees
UPDATE employees 
SET reporting_manager_id = '550e8400-e29b-41d4-a716-446655440004'
WHERE department = 'Engineering' AND role = 'employee';

UPDATE employees 
SET reporting_manager_id = '550e8400-e29b-41d4-a716-446655440001'
WHERE department = 'Human Resources' AND role = 'employee';

-- Show the results
SELECT 'Migration completed successfully!' as status;
SELECT COUNT(*) as total_employees FROM employees;
SELECT COUNT(*) as total_teams FROM teams;
SELECT name, department, role, team_id, reporting_manager_id FROM employees ORDER BY name; 