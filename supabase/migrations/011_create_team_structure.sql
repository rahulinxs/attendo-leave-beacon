-- Migration: Create team structure and reporting manager assignments
-- This migration adds team hierarchy and reporting manager relationships

-- Add reporting_manager_id to employees table if it does not exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='reporting_manager_id') THEN
        ALTER TABLE employees ADD COLUMN reporting_manager_id UUID REFERENCES employees(id);
    END IF;
END$$;

-- Add team_id to employees table if it does not exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='team_id') THEN
        ALTER TABLE employees ADD COLUMN team_id UUID;
    END IF;
END$$;

-- Create teams table
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

-- Create updated_at trigger for teams table
CREATE OR REPLACE FUNCTION update_teams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_teams_updated_at
    BEFORE UPDATE ON teams
    FOR EACH ROW
    EXECUTE FUNCTION update_teams_updated_at();

-- Remove IF NOT EXISTS and add DROP CONSTRAINT for employees_team_id_fkey
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_team_id_fkey;
ALTER TABLE employees ADD CONSTRAINT employees_team_id_fkey FOREIGN KEY (team_id) REFERENCES teams(id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_employees_reporting_manager_id ON employees(reporting_manager_id);
CREATE INDEX IF NOT EXISTS idx_employees_team_id ON employees(team_id);
CREATE INDEX IF NOT EXISTS idx_teams_company_id ON teams(company_id);
CREATE INDEX IF NOT EXISTS idx_teams_manager_id ON teams(manager_id);

-- Insert default teams for NYTP
INSERT INTO teams (name, description, company_id) VALUES
('Engineering Team', 'Software development and technical team', (SELECT id FROM companies WHERE name = 'New York Technology Partners (NYTP)' LIMIT 1)),
('Marketing Team', 'Marketing and communications team', (SELECT id FROM companies WHERE name = 'New York Technology Partners (NYTP)' LIMIT 1)),
('Sales Team', 'Sales and business development team', (SELECT id FROM companies WHERE name = 'New York Technology Partners (NYTP)' LIMIT 1)),
('HR Team', 'Human resources and administration team', (SELECT id FROM companies WHERE name = 'New York Technology Partners (NYTP)' LIMIT 1))
ON CONFLICT DO NOTHING;

-- Update existing employees to assign them to teams based on department
UPDATE employees 
SET team_id = (
    SELECT t.id 
    FROM teams t 
    WHERE t.company_id = employees.company_id 
    AND (
        (employees.department = 'Engineering' AND t.name = 'Engineering Team') OR
        (employees.department = 'Marketing' AND t.name = 'Marketing Team') OR
        (employees.department = 'Sales' AND t.name = 'Sales Team') OR
        (employees.department = 'Human Resources' AND t.name = 'HR Team')
    )
    LIMIT 1
)
WHERE team_id IS NULL;

-- Assign reporting managers based on role and department
-- First, promote some employees to reporting_manager role
UPDATE employees 
SET role = 'reporting_manager'
WHERE id IN (
    '550e8400-e29b-41d4-a716-446655440004', -- Bob Brown (Engineering)
    '550e8400-e29b-41d4-a716-446655440001'  -- Sarah Johnson (HR)
);

-- Assign reporting managers to teams
UPDATE teams 
SET manager_id = (
    SELECT e.id 
    FROM employees e 
    WHERE e.role = 'reporting_manager' 
    AND e.company_id = teams.company_id
    AND (
        (teams.name = 'Engineering Team' AND e.department = 'Engineering') OR
        (teams.name = 'HR Team' AND e.department = 'Human Resources')
    )
    LIMIT 1
)
WHERE manager_id IS NULL;

-- Assign employees to their reporting managers
UPDATE employees 
SET reporting_manager_id = (
    SELECT t.manager_id 
    FROM teams t 
    WHERE t.id = employees.team_id 
    AND t.manager_id IS NOT NULL
    LIMIT 1
)
WHERE reporting_manager_id IS NULL 
AND role = 'employee';

-- Enable Row Level Security on teams table
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for teams table
CREATE POLICY "Users can view teams in their company" ON teams
    FOR SELECT USING (
        company_id = (SELECT company_id FROM employees WHERE id::text = auth.uid()::text LIMIT 1)
    );

CREATE POLICY "Admins can manage teams in their company" ON teams
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id::text = auth.uid()::text AND role IN ('admin', 'super_admin')
        ) AND
        company_id = (SELECT company_id FROM employees WHERE id::text = auth.uid()::text LIMIT 1)
    );

-- Update existing RLS policies to include reporting manager access
-- Drop existing leave request policies for reporting managers
DROP POLICY IF EXISTS "Reporting Managers can view team leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Reporting Managers can update team leave requests" ON leave_requests;

-- Create new reporting manager policies for leave requests
CREATE POLICY "Reporting Managers can view team leave requests" ON leave_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id::text = auth.uid()::text AND role = 'reporting_manager'
        ) AND
        (
            employee_id IN (
                SELECT id FROM employees 
                WHERE reporting_manager_id::text = auth.uid()::text
            )
        ) AND
        company_id = (SELECT company_id FROM employees WHERE id::text = auth.uid()::text LIMIT 1)
    );

CREATE POLICY "Reporting Managers can update team leave requests" ON leave_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id::text = auth.uid()::text AND role = 'reporting_manager'
        ) AND
        (
            employee_id IN (
                SELECT id FROM employees 
                WHERE reporting_manager_id::text = auth.uid()::text
            )
        ) AND
        company_id = (SELECT company_id FROM employees WHERE id::text = auth.uid()::text LIMIT 1)
    );

-- Create reporting manager policies for attendance
CREATE POLICY "Reporting Managers can view team attendance" ON attendance
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id::text = auth.uid()::text AND role = 'reporting_manager'
        ) AND
        (
            employee_id IN (
                SELECT id FROM employees 
                WHERE reporting_manager_id::text = auth.uid()::text
            )
        ) AND
        company_id = (SELECT company_id FROM employees WHERE id::text = auth.uid()::text LIMIT 1)
    );

CREATE POLICY "Reporting Managers can update team attendance" ON attendance
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id::text = auth.uid()::text AND role = 'reporting_manager'
        ) AND
        (
            employee_id IN (
                SELECT id FROM employees 
                WHERE reporting_manager_id::text = auth.uid()::text
            )
        ) AND
        company_id = (SELECT company_id FROM employees WHERE id::text = auth.uid()::text LIMIT 1)
    );

-- Create reporting manager policies for employees (view their team members)
CREATE POLICY "Reporting Managers can view team members" ON employees
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id::text = auth.uid()::text AND role = 'reporting_manager'
        ) AND
        (
            reporting_manager_id::text = auth.uid()::text OR
            id::text = auth.uid()::text
        ) AND
        company_id = (SELECT company_id FROM employees WHERE id::text = auth.uid()::text LIMIT 1)
    );

-- Add comments for documentation
COMMENT ON COLUMN employees.reporting_manager_id IS 'ID of the employee who is the reporting manager for this employee';
COMMENT ON COLUMN employees.team_id IS 'ID of the team this employee belongs to';
COMMENT ON COLUMN teams.manager_id IS 'ID of the employee who manages this team'; 