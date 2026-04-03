-- =========================================================
-- ATTENDEDGE EVENT-DRIVEN SYNC ARCHITECTURE
-- Supabase Realtime + Edge Function based synchronization
-- =========================================================

-- =========================================================
-- 1. PROFILES = SOURCE OF TRUTH
-- =========================================================
-- Employees table mirrors profiles automatically

CREATE OR REPLACE FUNCTION sync_profile_to_employee()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO employees (
        id,
        email,
        name,
        role,
        department,
        position,
        hire_date,
        is_active,
        company_id,
        reporting_manager_id,
        role_id,
        team_id
    )
    VALUES (
        NEW.id,
        NEW.email,
        NEW.name,
        NEW.role,
        NEW.department,
        NEW.position,
        NEW.hire_date,
        NEW.is_active,
        NEW.company_id,
        NEW.reporting_manager_id,
        NEW.role_id,
        NEW.team_id
    )
    ON CONFLICT (id)
    DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        department = EXCLUDED.department,
        position = EXCLUDED.position,
        reporting_manager_id = EXCLUDED.reporting_manager_id,
        team_id = EXCLUDED.team_id,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_profiles_sync_employee ON profiles;
CREATE TRIGGER trigger_profiles_sync_employee
AFTER INSERT OR UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION sync_profile_to_employee();

-- =========================================================
-- 2. EMPLOYEE TEAM CHANGE SYNC
-- =========================================================

CREATE OR REPLACE FUNCTION sync_employee_team_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.team_id IS DISTINCT FROM OLD.team_id THEN
        UPDATE performance_reports
        SET team_id = NEW.team_id
        WHERE user_id = NEW.id
        AND company_id = NEW.company_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_employee_team_sync ON employees;
CREATE TRIGGER trigger_employee_team_sync
AFTER UPDATE OF team_id ON employees
FOR EACH ROW
EXECUTE FUNCTION sync_employee_team_changes();

-- =========================================================
-- 3. TEAM MANAGER CHANGE PROPAGATION
-- =========================================================

CREATE OR REPLACE FUNCTION sync_team_manager_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.manager_id IS DISTINCT FROM OLD.manager_id THEN
        UPDATE profiles
        SET reporting_manager_id = NEW.manager_id
        WHERE team_id = NEW.id
        AND company_id = NEW.company_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_team_manager_change ON teams;
CREATE TRIGGER trigger_team_manager_change
AFTER UPDATE OF manager_id ON teams
FOR EACH ROW
EXECUTE FUNCTION sync_team_manager_change();

-- =========================================================
-- 4. REALTIME ENABLEMENT
-- =========================================================

ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE employees;
ALTER PUBLICATION supabase_realtime ADD TABLE teams;

-- =========================================================
-- 5. MONITORING VIEW
-- =========================================================

CREATE OR REPLACE VIEW team_sync_health AS
SELECT
    e.id,
    e.name,
    e.team_id AS employee_team,
    p.team_id AS profile_team,
    p.reporting_manager_id,
    e.reporting_manager_id,
    CASE
        WHEN p.team_id IS DISTINCT FROM e.team_id THEN 'TEAM_MISMATCH'
        WHEN p.reporting_manager_id IS DISTINCT FROM e.reporting_manager_id THEN 'MANAGER_MISMATCH'
        ELSE 'SYNCED'
    END AS status
FROM employees e
LEFT JOIN profiles p
ON e.id = p.id
WHERE e.is_active = true;

-- =========================================================
-- 6. CLEANUP OLD TRIGGERS AND FUNCTIONS
-- =========================================================

-- Drop old complex triggers to prevent conflicts
DROP TRIGGER IF EXISTS trigger_sync_employee_changes ON employees;
DROP TRIGGER IF EXISTS trigger_sync_team_manager_changes ON teams;
DROP TRIGGER IF EXISTS trigger_sync_new_employee ON employees;
DROP TRIGGER IF EXISTS trigger_sync_profile_to_employee ON profiles;

-- Drop old functions
DROP FUNCTION IF EXISTS sync_team_changes();
DROP FUNCTION IF EXISTS sync_reporting_manager_changes();
DROP FUNCTION IF EXISTS sync_team_manager_changes();
DROP FUNCTION IF EXISTS validate_team_sync();
DROP FUNCTION IF EXISTS fix_team_sync_issues();
DROP FUNCTION IF EXISTS log_sync_event();
DROP FUNCTION IF EXISTS sync_team_changes_logged();

-- Drop old monitoring table (replaced by view)
DROP TABLE IF EXISTS sync_events;
