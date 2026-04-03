-- Team Management Synchronization - Corrected Version
-- Fixed SQL issues and performance optimizations

-- Create monitoring table first (before functions)
CREATE TABLE IF NOT EXISTS sync_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    operation TEXT NOT NULL,
    table_name TEXT NOT NULL,
    employee_id UUID,
    old_values JSONB,
    new_values JSONB,
    company_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create performance indexes first
CREATE INDEX IF NOT EXISTS idx_performance_reports_user_company 
ON performance_reports(user_id, company_id);
CREATE INDEX IF NOT EXISTS idx_sync_events_employee_id ON sync_events(employee_id);
CREATE INDEX IF NOT EXISTS idx_sync_events_company_id ON sync_events(company_id);
CREATE INDEX IF NOT EXISTS idx_sync_events_created_at ON sync_events(created_at);

-- Fixed validation function - prevents duplicates
CREATE OR REPLACE FUNCTION validate_team_sync()
RETURNS TABLE(
    employee_id UUID,
    profile_team_id UUID,
    employee_team_id UUID,
    profile_manager_id UUID,
    employee_manager_id UUID,
    performance_team_id UUID,
    sync_status TEXT,
    issue_description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id as employee_id,
        p.team_id as profile_team_id,
        e.team_id as employee_team_id,
        p.reporting_manager_id as profile_manager_id,
        e.reporting_manager_id as employee_manager_id,
        pr.team_id as performance_team_id,
        CASE 
            WHEN p.team_id IS DISTINCT FROM e.team_id THEN 'TEAM_MISMATCH'
            WHEN p.reporting_manager_id IS DISTINCT FROM e.reporting_manager_id THEN 'MANAGER_MISMATCH'
            WHEN pr.team_id IS DISTINCT FROM e.team_id THEN 'PERFORMANCE_MISMATCH'
            ELSE 'SYNCED'
        END as sync_status,
        CASE 
            WHEN p.team_id IS DISTINCT FROM e.team_id THEN 'Profile team_id differs from employee team_id'
            WHEN p.reporting_manager_id IS DISTINCT FROM e.reporting_manager_id THEN 'Profile reporting_manager_id differs from employee reporting_manager_id'
            WHEN pr.team_id IS DISTINCT FROM e.team_id THEN 'Performance report team_id differs from employee team_id'
            ELSE 'All tables synchronized'
        END as issue_description
    FROM employees e
    LEFT JOIN profiles p ON e.id = p.id AND e.company_id = p.company_id
    LEFT JOIN (
        SELECT user_id, company_id, MIN(team_id) AS team_id
        FROM performance_reports
        GROUP BY user_id, company_id
    ) pr ON e.id = pr.user_id AND e.company_id = pr.company_id
    WHERE e.is_active = true
    AND (
        p.team_id IS DISTINCT FROM e.team_id
        OR p.reporting_manager_id IS DISTINCT FROM e.reporting_manager_id
        OR pr.team_id IS DISTINCT FROM e.team_id
    )
    ORDER BY e.company_id, e.name;
END;
$$ LANGUAGE plpgsql;

-- Fixed fix function - uses separate CTEs
CREATE OR REPLACE FUNCTION fix_team_sync_issues()
RETURNS TABLE(
    employee_id UUID,
    employee_name TEXT,
    fixes_applied TEXT,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH sync_issues AS (
        SELECT 
            e.id,
            e.name,
            e.team_id as correct_team_id,
            e.reporting_manager_id as correct_manager_id,
            e.company_id,
            p.team_id as profile_team_id,
            p.reporting_manager_id as profile_manager_id,
            pr.team_id as perf_team_id
        FROM employees e
        LEFT JOIN profiles p ON e.id = p.id AND e.company_id = p.company_id
        LEFT JOIN (
            SELECT user_id, company_id, MIN(team_id) AS team_id
            FROM performance_reports
            GROUP BY user_id, company_id
        ) pr ON e.id = pr.user_id AND e.company_id = pr.company_id
        WHERE e.is_active = true
        AND (
            p.team_id IS DISTINCT FROM e.team_id
            OR p.reporting_manager_id IS DISTINCT FROM e.reporting_manager_id
            OR pr.team_id IS DISTINCT FROM e.team_id
        )
    ),
    profile_fix AS (
        UPDATE profiles p
        SET team_id = si.correct_team_id,
            reporting_manager_id = si.correct_manager_id
        FROM sync_issues si
        WHERE p.id = si.id AND p.company_id = si.company_id
        RETURNING si.id, 'profiles' as table_fixed
    ),
    perf_fix AS (
        UPDATE performance_reports pr
        SET team_id = si.correct_team_id
        FROM sync_issues si
        WHERE pr.user_id = si.id AND pr.company_id = si.company_id
        RETURNING si.id, 'performance_reports' as table_fixed
    )
    SELECT 
        si.id as employee_id,
        si.name as employee_name,
        COALESCE(pf.table_fixed, '') || 
        CASE WHEN pf.table_fixed IS NOT NULL AND prf.table_fixed IS NOT NULL THEN ', ' ELSE '' END ||
        COALESCE(prf.table_fixed, '') as fixes_applied,
        'FIXED' as status
    FROM sync_issues si
    LEFT JOIN profile_fix pf ON si.id = pf.id
    LEFT JOIN perf_fix prf ON si.id = prf.id
    ORDER BY si.name;
END;
$$ LANGUAGE plpgsql;

-- Logging function - now safe with table existing
CREATE OR REPLACE FUNCTION log_sync_event(
    p_operation TEXT,
    p_table_name TEXT,
    p_employee_id UUID,
    p_old_values JSONB,
    p_new_values JSONB,
    p_company_id UUID
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO sync_events (
        operation,
        table_name,
        employee_id,
        old_values,
        new_values,
        company_id,
        created_at
    ) VALUES (
        p_operation,
        p_table_name,
        p_employee_id,
        p_old_values,
        p_new_values,
        p_company_id,
        NOW()
    );
    
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Sync event logging failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Enhanced trigger with performance optimizations and proper field detection
CREATE OR REPLACE FUNCTION sync_employee_changes_logged()
RETURNS TRIGGER AS $$
BEGIN
    -- Log the sync event
    PERFORM log_sync_event(
        'UPDATE',
        'employees',
        NEW.id,
        jsonb_build_object(
            'team_id', OLD.team_id,
            'reporting_manager_id', OLD.reporting_manager_id
        ),
        jsonb_build_object(
            'team_id', NEW.team_id,
            'reporting_manager_id', NEW.reporting_manager_id
        ),
        NEW.company_id
    );
    
    -- Only update if team_id actually changed
    IF NEW.team_id IS DISTINCT FROM OLD.team_id THEN
        UPDATE profiles 
        SET team_id = NEW.team_id
        WHERE id = NEW.id AND company_id = NEW.company_id;
        
        UPDATE performance_reports
        SET team_id = NEW.team_id
        WHERE user_id = NEW.id AND company_id = NEW.company_id;
    END IF;
    
    -- Only update if reporting_manager_id actually changed
    IF NEW.reporting_manager_id IS DISTINCT FROM OLD.reporting_manager_id THEN
        UPDATE profiles 
        SET reporting_manager_id = NEW.reporting_manager_id
        WHERE id = NEW.id AND company_id = NEW.company_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Enhanced team manager change trigger
CREATE OR REPLACE FUNCTION sync_team_manager_changes_logged()
RETURNS TRIGGER AS $$
BEGIN
    -- Log the sync event
    PERFORM log_sync_event(
        'UPDATE',
        'teams',
        OLD.id,
        jsonb_build_object('manager_id', OLD.manager_id),
        jsonb_build_object('manager_id', NEW.manager_id),
        NEW.company_id
    );
    
    -- Only update if manager_id actually changed
    IF NEW.manager_id IS DISTINCT FROM OLD.manager_id THEN
        -- Update all employees in this team to report to new manager
        UPDATE employees
        SET reporting_manager_id = NEW.manager_id
        WHERE team_id = NEW.id AND company_id = NEW.company_id;
        
        -- Update corresponding profiles
        UPDATE profiles
        SET reporting_manager_id = NEW.manager_id
        WHERE id IN (
            SELECT id FROM employees 
            WHERE team_id = NEW.id AND company_id = NEW.company_id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop old triggers and create new ones
DROP TRIGGER IF EXISTS trigger_sync_team_changes ON employees;
DROP TRIGGER IF EXISTS trigger_sync_reporting_manager_changes ON employees;
DROP TRIGGER IF EXISTS trigger_sync_team_manager_changes ON teams;
DROP TRIGGER IF EXISTS trigger_sync_new_employee ON employees;
DROP TRIGGER IF EXISTS trigger_sync_profile_to_employee ON profiles;
DROP TRIGGER IF EXISTS trigger_cleanup_team_deletion ON teams;
DROP TRIGGER IF EXISTS trigger_cleanup_employee_deletion ON employees;

-- Create optimized triggers
CREATE TRIGGER trigger_sync_employee_changes
    AFTER UPDATE OF team_id, reporting_manager_id ON employees
    FOR EACH ROW EXECUTE FUNCTION sync_employee_changes_logged();

CREATE TRIGGER trigger_sync_team_manager_changes
    AFTER UPDATE OF manager_id ON teams
    FOR EACH ROW EXECUTE FUNCTION sync_team_manager_changes_logged();

-- Insert trigger for new employees
CREATE OR REPLACE FUNCTION sync_new_employee_logged()
RETURNS TRIGGER AS $$
BEGIN
    -- Update profiles for new employee
    UPDATE profiles 
    SET team_id = NEW.team_id,
        reporting_manager_id = NEW.reporting_manager_id
    WHERE id = NEW.id AND company_id = NEW.company_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_new_employee
    AFTER INSERT ON employees
    FOR EACH ROW EXECUTE FUNCTION sync_new_employee_logged();
