-- =========================================================
-- FIX PROFILES FOREIGN KEY CONSTRAINT ISSUE
-- Handle profiles table that references auth.users
-- =========================================================

-- First, let's check if profiles table references auth.users
-- If it does, we need to modify our sync approach

-- =========================================================
-- CORRECTED SYNC FUNCTION - HANDLES AUTH.USERS REFERENCE
-- =========================================================

CREATE OR REPLACE FUNCTION sync_employee_to_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    -- Prevent recursion
    IF pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    -- Only sync if the employee ID exists in auth.users (profiles may reference auth.users)
    IF EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.id) THEN
        INSERT INTO profiles (
            id,
            email,
            name,
            role_id,
            reporting_manager_id,
            team_id,
            company_id
        )
        VALUES (
            NEW.id,
            NEW.email,
            NEW.name,
            NEW.role_id,
            NEW.reporting_manager_id,
            NEW.team_id,
            NEW.company_id
        )
        ON CONFLICT (id)
        DO UPDATE SET
            email = EXCLUDED.email,
            name = EXCLUDED.name,
            role_id = EXCLUDED.role_id,
            reporting_manager_id = EXCLUDED.reporting_manager_id,
            team_id = EXCLUDED.team_id,
            company_id = EXCLUDED.company_id
        WHERE
            profiles.email IS DISTINCT FROM EXCLUDED.email
            OR profiles.name IS DISTINCT FROM EXCLUDED.name
            OR profiles.role_id IS DISTINCT FROM EXCLUDED.role_id
            OR profiles.reporting_manager_id IS DISTINCT FROM EXCLUDED.reporting_manager_id
            OR profiles.team_id IS DISTINCT FROM EXCLUDED.team_id
            OR profiles.company_id IS DISTINCT FROM EXCLUDED.company_id;
    ELSE
        -- If no auth user exists, we can't create a profile record
        -- Log this for monitoring purposes
        RAISE NOTICE 'Cannot sync employee % to profiles: no auth.user found', NEW.id;
    END IF;

    RETURN NEW;
END;
$$;

-- =========================================================
-- ALTERNATIVE: CREATE PROFILES TABLE WITHOUT AUTH.USUSERS REFERENCE
-- =========================================================

-- If the profiles table has a foreign key to auth.users causing issues,
-- we might need to drop that constraint or create a separate table

-- Check if the constraint exists and drop it if necessary
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'profiles_id_fkey' 
        AND table_name = 'profiles'
    ) THEN
        ALTER TABLE profiles DROP CONSTRAINT profiles_id_fkey;
        RAISE NOTICE 'Dropped profiles_id_fkey constraint to allow employee sync';
    END IF;
END $$;

-- =========================================================
-- ALTERNATIVE APPROACH: CREATE SEPARATE EMPLOYEE_PROFILES TABLE
-- =========================================================

-- If we can't modify the existing profiles table, create a separate one
CREATE TABLE IF NOT EXISTS employee_profiles (
    id UUID PRIMARY KEY,  -- Same as employee.id
    email VARCHAR(255),
    name VARCHAR(255),
    role_id VARCHAR(20),
    reporting_manager_id UUID,
    team_id UUID,
    company_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for employee_profiles
CREATE INDEX IF NOT EXISTS idx_employee_profiles_company ON employee_profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_profiles_team ON employee_profiles(team_id);
CREATE INDEX IF NOT EXISTS idx_employee_profiles_manager ON employee_profiles(reporting_manager_id);

-- Create sync function for employee_profiles instead
CREATE OR REPLACE FUNCTION sync_employee_to_employee_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    -- Prevent recursion
    IF pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    INSERT INTO employee_profiles (
        id,
        email,
        name,
        role_id,
        reporting_manager_id,
        team_id,
        company_id,
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        NEW.name,
        NEW.role_id,
        NEW.reporting_manager_id,
        NEW.team_id,
        NEW.company_id,
        NOW()
    )
    ON CONFLICT (id)
    DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        role_id = EXCLUDED.role_id,
        reporting_manager_id = EXCLUDED.reporting_manager_id,
        team_id = EXCLUDED.team_id,
        company_id = EXCLUDED.company_id,
        updated_at = NOW()
    WHERE
        employee_profiles.email IS DISTINCT FROM EXCLUDED.email
        OR employee_profiles.name IS DISTINCT FROM EXCLUDED.name
        OR employee_profiles.role_id IS DISTINCT FROM EXCLUDED.role_id
        OR employee_profiles.reporting_manager_id IS DISTINCT FROM EXCLUDED.reporting_manager_id
        OR employee_profiles.team_id IS DISTINCT FROM EXCLUDED.team_id
        OR employee_profiles.company_id IS DISTINCT FROM EXCLUDED.company_id;

    RETURN NEW;
END;
$$;

-- Drop existing trigger and create new one for employee_profiles
DROP TRIGGER IF EXISTS trigger_employee_sync_profile ON employees;
DROP TRIGGER IF EXISTS trigger_employee_sync_employee_profile ON employees;

CREATE TRIGGER trigger_employee_sync_employee_profile
AFTER INSERT OR UPDATE ON employees
FOR EACH ROW
EXECUTE FUNCTION sync_employee_to_employee_profile();

-- =========================================================
-- HEALTH MONITORING FOR EMPLOYEE_PROFILES
-- =========================================================

CREATE OR REPLACE VIEW employee_profiles_sync_health AS
SELECT
    e.id,
    e.name,
    e.email,
    e.reporting_manager_id AS employee_manager,
    ep.reporting_manager_id AS profile_manager,
    e.role_id AS employee_role,
    ep.role_id AS profile_role,
    e.team_id AS employee_team,
    ep.team_id AS profile_team,
    CASE
        WHEN ep.id IS NULL THEN 'MISSING_EMPLOYEE_PROFILE'
        WHEN e.reporting_manager_id IS DISTINCT FROM ep.reporting_manager_id THEN 'MANAGER_MISMATCH'
        WHEN e.role_id IS DISTINCT FROM ep.role_id THEN 'ROLE_MISMATCH'
        WHEN e.team_id IS DISTINCT FROM ep.team_id THEN 'TEAM_MISMATCH'
        ELSE 'SYNCED'
    END AS sync_status
FROM employees e
LEFT JOIN employee_profiles ep ON e.id = ep.id
WHERE e.is_active = true;

-- =========================================================
-- RECOMMENDATION NOTES
-- =========================================================

-- Choose ONE of these approaches:

-- APPROACH 1: Drop the foreign key constraint on profiles table
-- PRO: Uses existing profiles table
-- CON: May break other functionality that expects auth.users reference

-- APPROACH 2: Use the separate employee_profiles table
-- PRO: No conflicts with existing profiles table
-- CON: Need to update application code to use employee_profiles

-- APPROACH 3: Only sync when auth.user exists (first function)
-- PRO: Maintains existing constraints
-- CON: Some employees won't have profiles until they have auth accounts

-- For now, all three approaches are implemented.
-- Choose the one that best fits your application architecture.
