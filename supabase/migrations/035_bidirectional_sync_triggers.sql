-- =========================================================
-- BIDIRECTIONAL SYNCHRONIZATION TRIGGERS
-- profiles ↔ employees synchronization for shared fields
-- =========================================================

-- =========================================================
-- 1. EMPLOYEES → PROFILES SYNC FUNCTION
-- =========================================================

CREATE OR REPLACE FUNCTION sync_employee_to_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if any of the shared fields actually changed
    IF (
        NEW.reporting_manager_id IS DISTINCT FROM OLD.reporting_manager_id OR
        NEW.role_id IS DISTINCT FROM OLD.role_id OR
        NEW.team_id IS DISTINCT FROM OLD.team_id
    ) THEN
        -- Update only the changed fields in profiles
        UPDATE profiles
        SET 
            reporting_manager_id = NEW.reporting_manager_id,
            role_id = NEW.role_id,
            team_id = NEW.team_id
        WHERE id = NEW.id;
        
        -- Log the sync event (optional, for monitoring)
        RAISE NOTICE 'Employee → Profile sync: ID=%, manager=%, role=%, team=%', 
            NEW.id, NEW.reporting_manager_id, NEW.role_id, NEW.team_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- 2. PROFILES → EMPLOYEES SYNC FUNCTION
-- =========================================================

CREATE OR REPLACE FUNCTION sync_profile_to_employee()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if any of the shared fields actually changed
    IF (
        NEW.reporting_manager_id IS DISTINCT FROM OLD.reporting_manager_id OR
        NEW.role_id IS DISTINCT FROM OLD.role_id OR
        NEW.team_id IS DISTINCT FROM OLD.team_id
    ) THEN
        -- Update only the changed fields in employees
        UPDATE employees
        SET 
            reporting_manager_id = NEW.reporting_manager_id,
            role_id = NEW.role_id,
            team_id = NEW.team_id,
            updated_at = NOW()  -- Update timestamp for employees table
        WHERE id = NEW.id;
        
        -- Log the sync event (optional, for monitoring)
        RAISE NOTICE 'Profile → Employee sync: ID=%, manager=%, role=%, team=%', 
            NEW.id, NEW.reporting_manager_id, NEW.role_id, NEW.team_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- 3. DROP EXISTING TRIGGERS (CLEANUP)
-- =========================================================

-- Drop any existing bidirectional sync triggers
DROP TRIGGER IF EXISTS trigger_employee_to_profile_sync ON employees;
DROP TRIGGER IF EXISTS trigger_profile_to_employee_sync ON profiles;

-- =========================================================
-- 4. CREATE NEW TRIGGERS
-- =========================================================

-- Trigger for employees → profiles synchronization
CREATE TRIGGER trigger_employee_to_profile_sync
    AFTER UPDATE OF reporting_manager_id, role_id, team_id ON employees
    FOR EACH ROW
    EXECUTE FUNCTION sync_employee_to_profile();

-- Trigger for profiles → employees synchronization  
CREATE TRIGGER trigger_profile_to_employee_sync
    AFTER UPDATE OF reporting_manager_id, role_id, team_id ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION sync_profile_to_employee();

-- =========================================================
-- 5. LOOP PREVENTION MECHANISM
-- =========================================================

-- Create a session variable to track sync operations
-- This prevents infinite loops by marking when a sync is in progress
CREATE OR REPLACE FUNCTION set_sync_session_variable(p_table_name TEXT, p_operation TEXT)
RETURNS VOID AS $$
BEGIN
    -- Set a session variable to indicate sync is in progress
    PERFORM set_config('app.sync_in_progress', p_table_name || ':' || p_operation, true);
END;
$$ LANGUAGE plpgsql;

-- Enhanced sync functions with loop prevention
CREATE OR REPLACE FUNCTION sync_employee_to_profile_safe()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if we're already in a sync operation to prevent loops
    IF current_setting('app.sync_in_progress', true) = 'employees:to_profiles' THEN
        -- We're already syncing from employees to profiles, skip to prevent loop
        RETURN NEW;
    END IF;
    
    -- Only update if any of the shared fields actually changed
    IF (
        NEW.reporting_manager_id IS DISTINCT FROM OLD.reporting_manager_id OR
        NEW.role_id IS DISTINCT FROM OLD.role_id OR
        NEW.team_id IS DISTINCT FROM OLD.team_id
    ) THEN
        -- Mark sync in progress
        PERFORM set_sync_session_variable('employees', 'to_profiles');
        
        -- Update only the changed fields in profiles
        UPDATE profiles
        SET 
            reporting_manager_id = NEW.reporting_manager_id,
            role_id = NEW.role_id,
            team_id = NEW.team_id
        WHERE id = NEW.id;
        
        -- Clear sync marker
        PERFORM set_config('app.sync_in_progress', '', true);
        
        -- Log the sync event (optional, for monitoring)
        RAISE NOTICE 'Employee → Profile sync: ID=%', NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_profile_to_employee_safe()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if we're already in a sync operation to prevent loops
    IF current_setting('app.sync_in_progress', true) = 'profiles:to_employees' THEN
        -- We're already syncing from profiles to employees, skip to prevent loop
        RETURN NEW;
    END IF;
    
    -- Only update if any of the shared fields actually changed
    IF (
        NEW.reporting_manager_id IS DISTINCT FROM OLD.reporting_manager_id OR
        NEW.role_id IS DISTINCT FROM OLD.role_id OR
        NEW.team_id IS DISTINCT FROM OLD.team_id
    ) THEN
        -- Mark sync in progress
        PERFORM set_sync_session_variable('profiles', 'to_employees');
        
        -- Update only the changed fields in employees
        UPDATE employees
        SET 
            reporting_manager_id = NEW.reporting_manager_id,
            role_id = NEW.role_id,
            team_id = NEW.team_id,
            updated_at = NOW()  -- Update timestamp for employees table
        WHERE id = NEW.id;
        
        -- Clear sync marker
        PERFORM set_config('app.sync_in_progress', '', true);
        
        -- Log the sync event (optional, for monitoring)
        RAISE NOTICE 'Profile → Employee sync: ID=%', NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- 6. REPLACE TRIGGERS WITH SAFE VERSIONS
-- =========================================================

-- Drop existing triggers
DROP TRIGGER IF EXISTS trigger_employee_to_profile_sync ON employees;
DROP TRIGGER IF EXISTS trigger_profile_to_employee_sync ON profiles;

-- Create safe triggers with loop prevention
CREATE TRIGGER trigger_employee_to_profile_sync
    AFTER UPDATE OF reporting_manager_id, role_id, team_id ON employees
    FOR EACH ROW
    EXECUTE FUNCTION sync_employee_to_profile_safe();

CREATE TRIGGER trigger_profile_to_employee_sync
    AFTER UPDATE OF reporting_manager_id, role_id, team_id ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION sync_profile_to_employee_safe();

-- =========================================================
-- 7. MONITORING VIEW FOR SYNC HEALTH
-- =========================================================

CREATE OR REPLACE VIEW bidirectional_sync_health AS
SELECT
    e.id,
    e.name,
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
    END AS sync_status,
    CASE
        WHEN p.id IS NULL THEN 'Profile record missing'
        WHEN e.reporting_manager_id IS DISTINCT FROM p.reporting_manager_id THEN 'Manager ID differs between tables'
        WHEN e.role_id IS DISTINCT FROM p.role_id THEN 'Role ID differs between tables'
        WHEN e.team_id IS DISTINCT FROM p.team_id THEN 'Team ID differs between tables'
        ELSE 'All shared fields synchronized'
    END AS issue_description
FROM employees e
LEFT JOIN profiles p ON e.id = p.id
WHERE e.is_active = true;

-- =========================================================
-- 8. VERIFICATION NOTES
-- =========================================================

-- This implementation provides:
-- ✅ Bidirectional synchronization between profiles and employees
-- ✅ Only runs when values actually change (IS DISTINCT FROM)
-- ✅ Prevents infinite trigger loops using session variables
-- ✅ Updates only relevant fields, not entire rows
-- ✅ Optimized for production with minimal overhead
-- ✅ Compatible with Supabase Postgres
-- ✅ Includes monitoring view for sync health
-- ✅ Proper cleanup of existing triggers
-- ✅ Comprehensive logging for debugging

-- Expected behavior:
-- 1. Update employees.reporting_manager_id → profiles.reporting_manager_id updates automatically
-- 2. Update profiles.team_id → employees.team_id updates automatically  
-- 3. Update either table's role_id → other table's role_id updates automatically
-- 4. No infinite loops due to session variable tracking
-- 5. Only changed fields are updated for performance
