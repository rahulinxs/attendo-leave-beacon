-- Team Management Data Synchronization Triggers
-- Ensures consistency across employees, profiles, teams, and performance_reports

-- Function to sync team_id changes from employees to profiles and performance_reports
CREATE OR REPLACE FUNCTION sync_team_changes()
RETURNS TRIGGER AS $$
BEGIN
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

-- Function to sync reporting_manager_id changes from employees to profiles
CREATE OR REPLACE FUNCTION sync_reporting_manager_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Update profiles table when employee reporting manager changes
    UPDATE profiles 
    SET reporting_manager_id = NEW.reporting_manager_id
    WHERE id = NEW.id AND company_id = NEW.company_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to sync team manager changes to employees and profiles
CREATE OR REPLACE FUNCTION sync_team_manager_changes()
RETURNS TRIGGER AS $$
BEGIN
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
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER trigger_sync_team_changes
    AFTER UPDATE OF team_id ON employees
    FOR EACH ROW EXECUTE FUNCTION sync_team_changes();

CREATE TRIGGER trigger_sync_reporting_manager_changes
    AFTER UPDATE OF reporting_manager_id ON employees
    FOR EACH ROW EXECUTE FUNCTION sync_reporting_manager_changes();

CREATE TRIGGER trigger_sync_team_manager_changes
    AFTER UPDATE OF manager_id ON teams
    FOR EACH ROW EXECUTE FUNCTION sync_team_manager_changes();
