-- Migration: Populate profiles table with relevant data from employees table
-- This migration ensures profiles table has all necessary data from employees table

-- First, let's ensure all profiles have the basic employee data
UPDATE profiles 
SET 
    email = e.email,
    name = e.name,
    role = CASE 
        WHEN e.role = 'admin' THEN 'admin'
        WHEN e.role = 'employee' THEN 'employee'
        ELSE 'employee'
    END,
    department = e.department,
    position = e.position,
    hire_date = e.hire_date,
    is_active = e.is_active,
    company_id = e.company_id,
    updated_at = NOW()
FROM employees e
WHERE profiles.id = e.id
AND (
    profiles.email IS NULL OR 
    profiles.name IS NULL OR 
    profiles.department IS NULL OR 
    profiles.position IS NULL OR 
    profiles.company_id IS NULL
);

-- Insert missing profiles for employees that don't have profiles yet
INSERT INTO profiles (
    id, 
    email, 
    name, 
    role, 
    department, 
    position, 
    hire_date, 
    is_active, 
    company_id,
    created_at,
    updated_at
)
SELECT 
    e.id,
    e.email,
    e.name,
    CASE 
        WHEN e.role = 'admin' THEN 'admin'
        WHEN e.role = 'employee' THEN 'employee'
        ELSE 'employee'
    END as role,
    e.department,
    e.position,
    e.hire_date,
    e.is_active,
    e.company_id,
    e.created_at,
    NOW() as updated_at
FROM employees e
LEFT JOIN profiles p ON e.id = p.id
WHERE p.id IS NULL;

-- Update team assignments based on department mapping
UPDATE profiles 
SET team_id = (
    SELECT t.id 
    FROM teams t 
    WHERE t.company_id = profiles.company_id
    AND (
        (profiles.department = 'Engineering' AND t.name = 'Engineering Team') OR
        (profiles.department = 'Marketing' AND t.name = 'Marketing Team') OR
        (profiles.department = 'Sales' AND t.name = 'Sales Team') OR
        (profiles.department = 'Human Resources' AND t.name = 'HR Team') OR
        (profiles.department = 'IT' AND t.name = 'IT Team') OR
        (profiles.department = 'Finance' AND t.name = 'Finance Team') OR
        (profiles.department = 'Operations' AND t.name = 'Operations Team')
    )
    LIMIT 1
)
WHERE team_id IS NULL 
AND company_id IS NOT NULL;

-- Update reporting manager relationships
UPDATE profiles 
SET reporting_manager_id = (
    SELECT e.reporting_manager_id 
    FROM employees e 
    WHERE e.id = profiles.id 
    AND e.reporting_manager_id IS NOT NULL
    LIMIT 1
)
WHERE reporting_manager_id IS NULL;

-- Ensure all profiles have company_id set
UPDATE profiles 
SET company_id = (
    SELECT e.company_id 
    FROM employees e 
    WHERE e.id = profiles.id 
    AND e.company_id IS NOT NULL
    LIMIT 1
)
WHERE company_id IS NULL;

-- Create any missing teams for departments that don't have teams yet
INSERT INTO teams (id, name, description, company_id, created_at, updated_at)
SELECT 
    uuid_generate_v4(),
    CASE 
        WHEN p.department = 'Engineering' THEN 'Engineering Team'
        WHEN p.department = 'Marketing' THEN 'Marketing Team'
        WHEN p.department = 'Sales' THEN 'Sales Team'
        WHEN p.department = 'Human Resources' THEN 'HR Team'
        WHEN p.department = 'IT' THEN 'IT Team'
        WHEN p.department = 'Finance' THEN 'Finance Team'
        WHEN p.department = 'Operations' THEN 'Operations Team'
        ELSE p.department || ' Team'
    END as team_name,
    'Team for ' || p.department || ' department',
    p.company_id,
    NOW(),
    NOW()
FROM profiles p
LEFT JOIN teams t ON (
    t.company_id = p.company_id AND 
    t.name = CASE 
        WHEN p.department = 'Engineering' THEN 'Engineering Team'
        WHEN p.department = 'Marketing' THEN 'Marketing Team'
        WHEN p.department = 'Sales' THEN 'Sales Team'
        WHEN p.department = 'Human Resources' THEN 'HR Team'
        WHEN p.department = 'IT' THEN 'IT Team'
        WHEN p.department = 'Finance' THEN 'Finance Team'
        WHEN p.department = 'Operations' THEN 'Operations Team'
        ELSE p.department || ' Team'
    END
)
WHERE t.id IS NULL 
AND p.company_id IS NOT NULL
AND p.department IS NOT NULL
GROUP BY p.department, p.company_id;

-- Now assign profiles to the newly created teams
UPDATE profiles 
SET team_id = (
    SELECT t.id 
    FROM teams t 
    WHERE t.company_id = profiles.company_id
    AND t.name = CASE 
        WHEN profiles.department = 'Engineering' THEN 'Engineering Team'
        WHEN profiles.department = 'Marketing' THEN 'Marketing Team'
        WHEN profiles.department = 'Sales' THEN 'Sales Team'
        WHEN profiles.department = 'Human Resources' THEN 'HR Team'
        WHEN profiles.department = 'IT' THEN 'IT Team'
        WHEN profiles.department = 'Finance' THEN 'Finance Team'
        WHEN profiles.department = 'Operations' THEN 'Operations Team'
        ELSE profiles.department || ' Team'
    END
    LIMIT 1
)
WHERE team_id IS NULL 
AND company_id IS NOT NULL
AND department IS NOT NULL;

-- Set team managers based on role
UPDATE profiles 
SET role = 'reporting_manager'
WHERE role = 'employee' 
AND id IN (
    SELECT DISTINCT reporting_manager_id 
    FROM profiles 
    WHERE reporting_manager_id IS NOT NULL
);

-- Show migration results
SELECT 'Migration completed successfully!' as status;

-- Show statistics
SELECT 
    'Profiles Statistics' as category,
    COUNT(*) as total_profiles,
    COUNT(CASE WHEN company_id IS NOT NULL THEN 1 END) as profiles_with_company,
    COUNT(CASE WHEN team_id IS NOT NULL THEN 1 END) as profiles_with_team,
    COUNT(CASE WHEN reporting_manager_id IS NOT NULL THEN 1 END) as profiles_with_manager
FROM profiles;

SELECT 
    'Role Distribution' as category,
    role,
    COUNT(*) as count
FROM profiles 
GROUP BY role 
ORDER BY count DESC;

SELECT 
    'Department Distribution' as category,
    department,
    COUNT(*) as count
FROM profiles 
WHERE department IS NOT NULL
GROUP BY department 
ORDER BY count DESC;

SELECT 
    'Team Distribution' as category,
    t.name as team_name,
    COUNT(p.id) as member_count
FROM teams t
LEFT JOIN profiles p ON t.id = p.team_id
GROUP BY t.id, t.name
ORDER BY member_count DESC;
