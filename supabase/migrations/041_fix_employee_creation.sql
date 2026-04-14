-- =========================================================
-- FIX EMPLOYEE CREATION - CORRECTED SYNC ARCHITECTURE
-- =========================================================

-- This migration fixes the employee creation issue by preserving
-- the existing employee_profiles table and only updating the sync logic

-- =========================================================
-- 1. CREATE EMPLOYEE WHEN USER SIGNS UP (AUTH -> EMPLOYEES)
-- =========================================================

CREATE OR REPLACE FUNCTION create_employee_from_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO employees (
        id,
        email,
        name,
        role_id,
        is_active,
        created_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
        -- Safe role_id assignment - handle different role_id types
        COALESCE(
            (SELECT id FROM roles WHERE name = 'employee' LIMIT 1),
            'employee'
        ),
        true,
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$;

-- Drop existing trigger first
DROP TRIGGER IF EXISTS trigger_create_employee ON auth.users;

CREATE TRIGGER trigger_create_employee
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION create_employee_from_auth();

-- =========================================================
-- 2. EMPLOYEES -> PROFILES SYNC (SAFE VERSION)
-- =========================================================

CREATE OR REPLACE FUNCTION sync_employee_to_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Prevent recursion
    IF pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    -- Only sync if the employee ID exists in auth.users (profiles requires auth.users)
    PERFORM 1 FROM auth.users WHERE id = NEW.id;
    IF FOUND THEN
        -- Check if profile exists, create if missing (prevents race conditions)
        PERFORM 1 FROM profiles WHERE id = NEW.id;
        IF NOT FOUND THEN
            -- Create profile if it doesn't exist
            INSERT INTO profiles (
                id,
                email,
                name,
                role_id,
                reporting_manager_id,
                team_id,
                company_id,
                created_at,
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
                NOW(),
                NOW()
            );
        ELSE
            -- Update existing profile
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
                company_id = EXCLUDED.company_id,
                updated_at = NOW()
            WHERE
                profiles.email IS DISTINCT FROM EXCLUDED.email
                OR profiles.name IS DISTINCT FROM EXCLUDED.name
                OR profiles.role_id IS DISTINCT FROM EXCLUDED.role_id
                OR profiles.reporting_manager_id IS DISTINCT FROM EXCLUDED.reporting_manager_id
                OR profiles.team_id IS DISTINCT FROM EXCLUDED.team_id
                OR profiles.company_id IS DISTINCT FROM EXCLUDED.company_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Drop existing trigger first
DROP TRIGGER IF EXISTS trigger_employee_sync_profile ON employees;

CREATE TRIGGER trigger_employee_sync_profile
AFTER INSERT OR UPDATE ON employees
FOR EACH ROW
EXECUTE FUNCTION sync_employee_to_profile();

-- =========================================================
-- 3. EMPLOYEE TEAM CHANGE -> PERFORMANCE REPORTS
-- =========================================================

CREATE OR REPLACE FUNCTION sync_employee_team_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.team_id IS DISTINCT FROM OLD.team_id THEN
        UPDATE performance_reports
        SET team_id = NEW.team_id
        WHERE user_id = NEW.id
        AND company_id = NEW.company_id
        AND team_id IS DISTINCT FROM NEW.team_id;
    END IF;

    RETURN NEW;
END;
$$;

-- Drop existing trigger first
DROP TRIGGER IF EXISTS trigger_employee_team_change ON employees;

CREATE TRIGGER trigger_employee_team_change
AFTER UPDATE OF team_id
ON employees
FOR EACH ROW
EXECUTE FUNCTION sync_employee_team_change();

-- =========================================================
-- 4. TEAM MANAGER CHANGE -> UPDATE EMPLOYEES
-- =========================================================

CREATE OR REPLACE FUNCTION sync_team_manager_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.manager_id IS DISTINCT FROM OLD.manager_id THEN
        UPDATE employees
        SET reporting_manager_id = NEW.manager_id
        WHERE team_id = NEW.id
        AND company_id = NEW.company_id
        AND reporting_manager_id IS DISTINCT FROM NEW.manager_id;
    END IF;

    RETURN NEW;
END;
$$;

-- Drop existing trigger first
DROP TRIGGER IF EXISTS trigger_team_manager_change ON teams;

CREATE TRIGGER trigger_team_manager_change
AFTER UPDATE OF manager_id ON teams
FOR EACH ROW
EXECUTE FUNCTION sync_team_manager_change();

-- =========================================================
-- 5. PERFORMANCE INDEXES
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_employees_team ON employees(team_id);
CREATE INDEX IF NOT EXISTS idx_employees_manager ON employees(reporting_manager_id);
CREATE INDEX IF NOT EXISTS idx_employees_company ON employees(company_id);

-- Compound indexes for HR queries (recommended)
CREATE INDEX IF NOT EXISTS idx_employees_company_team ON employees(company_id, team_id);
CREATE INDEX IF NOT EXISTS idx_employees_company_manager ON employees(company_id, reporting_manager_id);

CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);
CREATE INDEX IF NOT EXISTS idx_performance_reports_user ON performance_reports(user_id);

-- =========================================================
-- 6. EMPLOYEE MASTER VIEW (RECOMMENDED FOR FRONTEND)
-- =========================================================

CREATE OR REPLACE VIEW employee_master_view AS
SELECT
    -- Auth data
    u.id,
    u.email,
    u.created_at AS user_created_at,
    
    -- Employee data (main source)
    e.name,
    e.role_id,
    e.department,
    e.position,
    e.hire_date,
    e.is_active AS employee_active,
    e.reporting_manager_id,
    e.team_id,
    e.company_id,
    e.created_at AS employee_created_at,
    e.updated_at AS employee_updated_at,
    
    -- Profile data (UI/app data)
    p.name AS profile_name,
    p.role_id AS profile_role,
    p.department AS profile_department,
    p.position AS profile_position,
    p.hire_date AS profile_hire_date,
    p.is_active AS profile_active,
    p.updated_at AS profile_updated_at,
    
    -- Team data
    t.name AS team_name,
    t.description AS team_description,
    
    -- Manager data (self-join)
    m.name AS manager_name,
    m.email AS manager_email,
    
    -- Company data
    c.name AS company_name,
    
    -- Sync status
    CASE
        WHEN p.id IS NULL THEN 'MISSING_PROFILE'
        WHEN e.reporting_manager_id IS DISTINCT FROM p.reporting_manager_id THEN 'MANAGER_MISMATCH'
        WHEN e.role_id IS DISTINCT FROM p.role_id THEN 'ROLE_MISMATCH'
        WHEN e.team_id IS DISTINCT FROM p.team_id THEN 'TEAM_MISMATCH'
        ELSE 'SYNCED'
    END AS sync_status
    
FROM auth.users u
JOIN employees e ON u.id = e.id
LEFT JOIN profiles p ON u.id = p.id
LEFT JOIN teams t ON e.team_id = t.id
LEFT JOIN employees m ON e.reporting_manager_id = m.id
LEFT JOIN companies c ON e.company_id = c.id
WHERE e.is_active = true;

-- =========================================================
-- 7. SYNC HEALTH MONITORING
-- =========================================================

CREATE OR REPLACE VIEW employee_sync_health AS
SELECT
    e.id,
    e.name,
    e.email,
    e.reporting_manager_id AS employee_manager,
    p.reporting_manager_id AS profile_manager,
    e.role_id AS employee_role,
    p.role_id AS profile_role,
    e.team_id AS employee_team,
    p.team_id AS profile_team,
    CASE
        WHEN p.id IS NULL THEN 'MISSING_PROFILE'
        WHEN e.reporting_manager_id IS DISTINCT FROM p.reporting_manager_id THEN 'MANAGER_MISMATCH'
        WHEN e.role_id IS DISTINCT FROM p.role_id THEN 'ROLE_MISMATCH'
        WHEN e.team_id IS DISTINCT FROM p.team_id THEN 'TEAM_MISMATCH'
        ELSE 'SYNCED'
    END AS sync_status
FROM employees e
LEFT JOIN profiles p ON e.id = p.id
WHERE e.is_active = true;

CREATE OR REPLACE VIEW employee_sync_summary AS
SELECT
    sync_status,
    COUNT(*) AS total
FROM employee_sync_health
GROUP BY sync_status;

-- =========================================================
-- 8. SAFE CLEANUP (PRESERVE EMPLOYEE_PROFILES)
-- =========================================================

-- DO NOT DROP employee_profiles - it contains real data
-- Only remove old bidirectional triggers and monitoring objects

DROP TRIGGER IF EXISTS trigger_employee_to_profile_sync ON employees;
DROP TRIGGER IF EXISTS trigger_profile_to_employee_sync ON profiles;
DROP TRIGGER IF EXISTS trigger_profiles_sync_employee ON profiles;

DROP FUNCTION IF EXISTS sync_employee_to_profile_safe();
DROP FUNCTION IF EXISTS sync_profile_to_employee_safe();
DROP FUNCTION IF EXISTS set_sync_session_variable();
DROP FUNCTION IF EXISTS sync_employee_to_employee_profile();

DROP VIEW IF EXISTS bidirectional_sync_health;
DROP VIEW IF EXISTS employee_profiles_sync_health;
DROP TABLE IF EXISTS sync_events;

-- =========================================================
-- 9. VERIFICATION
-- =========================================================

DO $$
BEGIN
    RAISE NOTICE '=== EMPLOYEE CREATION FIX VERIFICATION ===';
    
    -- Check employee_profiles exists (should be preserved)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employee_profiles') THEN
        RAISE NOTICE 'employee_profiles table: PRESERVED';
    ELSE
        RAISE NOTICE 'employee_profiles table: MISSING (problem!)';
    END IF;
    
    -- Check employee_documents exists (should be preserved)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employee_documents') THEN
        RAISE NOTICE 'employee_documents table: PRESERVED';
    ELSE
        RAISE NOTICE 'employee_documents table: MISSING (problem!)';
    END IF;
    
    -- Check triggers are created
    IF EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trigger_create_employee') THEN
        RAISE NOTICE 'trigger_create_employee: CREATED';
    ELSE
        RAISE NOTICE 'trigger_create_employee: MISSING';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trigger_employee_sync_profile') THEN
        RAISE NOTICE 'trigger_employee_sync_profile: CREATED';
    ELSE
        RAISE NOTICE 'trigger_employee_sync_profile: MISSING';
    END IF;
    
    RAISE NOTICE '=== VERIFICATION COMPLETE ===';
END $$;
