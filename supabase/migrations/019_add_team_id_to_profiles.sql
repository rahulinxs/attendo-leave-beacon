-- Migration: Add team_id to profiles table
-- This migration adds team_id column to profiles table to establish relationship with teams

-- Add team_id column to profiles table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'team_id') THEN
        ALTER TABLE profiles ADD COLUMN team_id UUID;
    END IF;
END$$;

-- Add foreign key constraint for team_id
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'profiles_team_id_fkey') THEN
        ALTER TABLE profiles ADD CONSTRAINT profiles_team_id_fkey 
        FOREIGN KEY (team_id) REFERENCES teams(id);
    END IF;
END$$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_team_id ON profiles(team_id);

-- Update existing profiles to assign them to teams based on department
UPDATE profiles 
SET team_id = (
    SELECT t.id 
    FROM teams t 
    WHERE t.company_id = (SELECT company_id FROM employees WHERE id = profiles.id LIMIT 1)
    AND (
        (profiles.department = 'Engineering' AND t.name = 'Engineering Team') OR
        (profiles.department = 'Marketing' AND t.name = 'Marketing Team') OR
        (profiles.department = 'Sales' AND t.name = 'Sales Team') OR
        (profiles.department = 'Human Resources' AND t.name = 'HR Team')
    )
    LIMIT 1
)
WHERE team_id IS NULL;

-- Add reporting_manager_id to profiles table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'reporting_manager_id') THEN
        ALTER TABLE profiles ADD COLUMN reporting_manager_id UUID REFERENCES profiles(id);
    END IF;
END$$;

-- Create index for reporting_manager_id
CREATE INDEX IF NOT EXISTS idx_profiles_reporting_manager_id ON profiles(reporting_manager_id);

-- Update profiles to have reporting_manager_id based on employees table
UPDATE profiles 
SET reporting_manager_id = (
    SELECT e.reporting_manager_id 
    FROM employees e 
    WHERE e.id = profiles.id 
    AND e.reporting_manager_id IS NOT NULL
    LIMIT 1
)
WHERE reporting_manager_id IS NULL;

-- Add company_id to profiles table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'company_id') THEN
        ALTER TABLE profiles ADD COLUMN company_id UUID;
    END IF;
END$$;

-- Add foreign key constraint for company_id
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'profiles_company_id_fkey') THEN
        ALTER TABLE profiles ADD CONSTRAINT profiles_company_id_fkey 
        FOREIGN KEY (company_id) REFERENCES companies(id);
    END IF;
END$$;

-- Create index for company_id
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON profiles(company_id);

-- Update profiles to have company_id based on employees table
UPDATE profiles 
SET company_id = (
    SELECT e.company_id 
    FROM employees e 
    WHERE e.id = profiles.id 
    AND e.company_id IS NOT NULL
    LIMIT 1
)
WHERE company_id IS NULL;

-- Update RLS policies to include team-based access
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins and Super Admins can view all profiles" ON profiles;

-- Create updated policies for profiles table
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Admins and Super Admins can view all profiles in their company" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id::text = auth.uid()::text AND role IN ('admin', 'super_admin')
        ) AND
        company_id = (SELECT company_id FROM profiles WHERE id::text = auth.uid()::text LIMIT 1)
    );

CREATE POLICY "Reporting Managers can view team profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id::text = auth.uid()::text AND role = 'reporting_manager'
        ) AND
        (
            id IN (
                SELECT id FROM profiles 
                WHERE reporting_manager_id::text = auth.uid()::text
            )
        ) AND
        company_id = (SELECT company_id FROM profiles WHERE id::text = auth.uid()::text LIMIT 1)
    );

-- Show the results
SELECT 'Migration completed successfully!' as status;
SELECT COUNT(*) as total_profiles FROM profiles;
SELECT COUNT(*) as profiles_with_team_id FROM profiles WHERE team_id IS NOT NULL;
SELECT COUNT(*) as profiles_with_company_id FROM profiles WHERE company_id IS NOT NULL; 