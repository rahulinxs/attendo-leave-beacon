-- Migration: Ensure employees table has all necessary columns
-- This migration ensures the employees table has all required columns for the application

-- Add team_id column to employees if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'team_id') THEN
        ALTER TABLE employees ADD COLUMN team_id UUID;
        RAISE NOTICE 'Added team_id column to employees table';
    END IF;
END$$;

-- Add reporting_manager_id column to employees if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'reporting_manager_id') THEN
        ALTER TABLE employees ADD COLUMN reporting_manager_id UUID REFERENCES employees(id);
        RAISE NOTICE 'Added reporting_manager_id column to employees table';
    END IF;
END$$;

-- Add company_id column to employees if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'company_id') THEN
        ALTER TABLE employees ADD COLUMN company_id UUID;
        RAISE NOTICE 'Added company_id column to employees table';
    END IF;
END$$;

-- Add foreign key constraints if they don't exist
DO $$
BEGIN
    -- Add team_id foreign key constraint
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'employees_team_id_fkey') THEN
        ALTER TABLE employees ADD CONSTRAINT employees_team_id_fkey 
        FOREIGN KEY (team_id) REFERENCES teams(id);
        RAISE NOTICE 'Added team_id foreign key constraint';
    END IF;
    
    -- Add company_id foreign key constraint
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'employees_company_id_fkey') THEN
        ALTER TABLE employees ADD CONSTRAINT employees_company_id_fkey 
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added company_id foreign key constraint';
    END IF;
END$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_employees_team_id ON employees(team_id);
CREATE INDEX IF NOT EXISTS idx_employees_reporting_manager_id ON employees(reporting_manager_id);
CREATE INDEX IF NOT EXISTS idx_employees_company_id ON employees(company_id);

-- Update role constraint to include all roles
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'employees_role_check') THEN
        ALTER TABLE employees DROP CONSTRAINT employees_role_check;
    END IF;
    
    -- Add new constraint with all roles
    ALTER TABLE employees ADD CONSTRAINT employees_role_check 
    CHECK (role IN ('employee', 'reporting_manager', 'admin', 'super_admin'));
    
    RAISE NOTICE 'Updated role constraint to include all roles';
END$$;

-- Update existing employees to have company_id if not set
UPDATE employees 
SET company_id = (SELECT id FROM companies WHERE name = 'New York Technology Partners (NYTP)' LIMIT 1)
WHERE company_id IS NULL;

-- Set NOT NULL constraints after populating data
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'company_id' AND is_nullable = 'YES') THEN
        ALTER TABLE employees ALTER COLUMN company_id SET NOT NULL;
        RAISE NOTICE 'Set company_id as NOT NULL';
    END IF;
END$$;

-- Show migration results
SELECT 'Migration completed successfully!' as status;
SELECT COUNT(*) as total_employees FROM employees;
SELECT COUNT(*) as employees_with_team_id FROM employees WHERE team_id IS NOT NULL;
SELECT COUNT(*) as employees_with_company_id FROM employees WHERE company_id IS NOT NULL; 