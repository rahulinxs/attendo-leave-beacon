-- Team Management Synchronization Validation and Monitoring
-- Ensures data integrity and provides monitoring capabilities

-- Function to validate team synchronization integrity
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
    LEFT JOIN performance_reports pr ON e.id = pr.user_id AND e.company_id = pr.company_id
    WHERE e.is_active = true
    AND (
        p.team_id IS DISTINCT FROM e.team_id
        OR p.reporting_manager_id IS DISTINCT FROM e.reporting_manager_id
        OR pr.team_id IS DISTINCT FROM e.team_id
    )
    ORDER BY e.company_id, e.name;
END;
$$ LANGUAGE plpgsql;

-- Function to fix synchronization issues
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
        LEFT JOIN performance_reports pr ON e.id = pr.user_id AND e.company_id = pr.company_id
        WHERE e.is_active = true
        AND (
            p.team_id IS DISTINCT FROM e.team_id
            OR p.reporting_manager_id IS DISTINCT FROM e.reporting_manager_id
            OR pr.team_id IS DISTINCT FROM e.team_id
        )
    ),
    fixes AS (
        -- Fix profiles
        UPDATE profiles p
        SET team_id = si.correct_team_id,
            reporting_manager_id = si.correct_manager_id
        FROM sync_issues si
        WHERE p.id = si.id AND p.company_id = si.company_id
        RETURNING si.id, 'profiles' as table_fixed
        
        UNION ALL
        
        -- Fix performance_reports
        UPDATE performance_reports pr
        SET team_id = si.correct_team_id
        FROM sync_issues si
        WHERE pr.user_id = si.id AND pr.company_id = si.company_id
        RETURNING si.id, 'performance_reports' as table_fixed
    )
    SELECT 
        si.id as employee_id,
        si.name as employee_name,
        STRING_AGG(DISTINCT f.table_fixed, ', ') as fixes_applied,
        'FIXED' as status
    FROM sync_issues si
    LEFT JOIN fixes f ON si.id = f.id
    GROUP BY si.id, si.name
    ORDER BY si.name;
END;
$$ LANGUAGE plpgsql;

-- Function to log synchronization events for monitoring
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
    -- Log to sync_events table (create if not exists)
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
        -- If sync_events table doesn't exist or other error, continue silently
        NULL;
END;
$$ LANGUAGE plpgsql;

-- Create sync_events table for monitoring
CREATE TABLE IF NOT EXISTS sync_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    operation TEXT NOT NULL,
    table_name TEXT NOT NULL,
    employee_id UUID,
    old_values JSONB,
    new_values JSONB,
    company_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_sync_events_employee_id ON sync_events(employee_id);
CREATE INDEX IF NOT EXISTS idx_sync_events_company_id ON sync_events(company_id);
CREATE INDEX IF NOT EXISTS idx_sync_events_created_at ON sync_events(created_at);

-- Enhanced trigger functions with logging
CREATE OR REPLACE FUNCTION sync_team_changes_logged()
RETURNS TRIGGER AS $$
BEGIN
    -- Log the sync event
    PERFORM log_sync_event(
        'UPDATE',
        'employees',
        NEW.id,
        jsonb_build_object('team_id', OLD.team_id),
        jsonb_build_object('team_id', NEW.team_id),
        NEW.company_id
    );
    
    -- Update profiles table when employee team changes
    UPDATE profiles 
    SET team_id = NEW.team_id
    WHERE id = NEW.id AND company_id = NEW.company_id;
    
    -- Update performance_reports when employee team changes
    UPDATE performance_reports
    SET team_id = NEW.team_id
    WHERE user_id = NEW.id AND company_id = NEW.company_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Replace original trigger with logged version
DROP TRIGGER IF EXISTS trigger_sync_team_changes ON employees;
CREATE TRIGGER trigger_sync_team_changes
    AFTER UPDATE OF team_id ON employees
    FOR EACH ROW EXECUTE FUNCTION sync_team_changes_logged();
