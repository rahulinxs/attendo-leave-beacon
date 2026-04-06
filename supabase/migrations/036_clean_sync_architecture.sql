-- =========================================================
-- ATTENDEDGE DATABASE SYNC ARCHITECTURE
-- Supabase Auth → employees → profiles → performance_reports
-- =========================================================

-- =========================================================
-- 1. CREATE EMPLOYEE WHEN USER SIGNS UP (AUTH → EMPLOYEES)
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
        'employee',
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
-- 2. EMPLOYEES → PROFILES SYNC (MASTER HR DATA)
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
-- 3. EMPLOYEE TEAM CHANGE → PERFORMANCE REPORTS
-- =========================================================

CREATE OR REPLACE FUNCTION sync_employee_team_change()
RETURNS TRIGGER
LANGUAGE plpgsql
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
-- 4. TEAM MANAGER CHANGE → UPDATE EMPLOYEES
-- =========================================================

CREATE OR REPLACE FUNCTION sync_team_manager_change()
RETURNS TRIGGER
LANGUAGE plpgsql
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
-- 5. PERFORMANCE INDEXES (IMPORTANT FOR HR QUERIES)
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_employees_team
ON employees(team_id);

CREATE INDEX IF NOT EXISTS idx_employees_manager
ON employees(reporting_manager_id);

CREATE INDEX IF NOT EXISTS idx_employees_company
ON employees(company_id);

CREATE INDEX IF NOT EXISTS idx_profiles_id
ON profiles(id);

CREATE INDEX IF NOT EXISTS idx_performance_reports_user
ON performance_reports(user_id);

-- =========================================================
-- 6. SYNC HEALTH MONITORING VIEW
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
LEFT JOIN profiles p
ON e.id = p.id
WHERE e.is_active = true;

-- =========================================================
-- 7. QUICK SYNC HEALTH SUMMARY
-- =========================================================

CREATE OR REPLACE VIEW employee_sync_summary AS
SELECT
    sync_status,
    COUNT(*) AS total
FROM employee_sync_health
GROUP BY sync_status;

-- =========================================================
-- 8. CLEANUP OLD CONFLICTING TRIGGERS
-- =========================================================

DROP TRIGGER IF EXISTS trigger_employee_to_profile_sync ON employees;
DROP TRIGGER IF EXISTS trigger_profile_to_employee_sync ON profiles;
DROP TRIGGER IF EXISTS trigger_profiles_sync_employee ON profiles;

DROP FUNCTION IF EXISTS sync_employee_to_profile_safe();
DROP FUNCTION IF EXISTS sync_profile_to_employee_safe();
DROP FUNCTION IF EXISTS set_sync_session_variable();

DROP VIEW IF EXISTS bidirectional_sync_health;
DROP TABLE IF EXISTS sync_events;

-- =========================================================
-- 9. ARCHITECTURE SUMMARY
-- =========================================================

-- Data Flow:
-- Supabase Auth
--       │
--       ▼
-- employees  ← MASTER HR TABLE
--       │
--       ▼
-- profiles   ← UI / APP DATA
--       │
--       ▼
-- performance_reports

-- Features:
-- ✓ Auto employee creation on signup
-- ✓ Employees is single source of truth
-- ✓ Profiles automatically mirror employee data
-- ✓ Team changes propagate to performance reports
-- ✓ Team manager changes update reporting managers
-- ✓ Health monitoring views
-- ✓ Index optimized
-- ✓ No circular triggers
-- ✓ Production safe
