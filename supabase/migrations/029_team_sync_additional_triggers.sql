-- Additional Team Management Synchronization Triggers
-- Enhanced safety and comprehensive coverage

-- Function to sync when employee is inserted (new employee)
CREATE OR REPLACE FUNCTION sync_new_employee()
RETURNS TRIGGER AS $$
BEGIN
    -- Update profiles for new employee
    UPDATE profiles 
    SET team_id = NEW.team_id,
        reporting_manager_id = NEW.reporting_manager_id
    WHERE id = NEW.id AND company_id = NEW.company_id;
    
    -- Performance reports for new employee will be created separately
    -- No need to update performance_reports on insert
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to sync when profile is updated directly (backup sync)
CREATE OR REPLACE FUNCTION sync_profile_to_employee()
RETURNS TRIGGER AS $$
BEGIN
    -- Only sync if profile update affects team or manager
    IF OLD.team_id IS DISTINCT FROM NEW.team_id OR 
       OLD.reporting_manager_id IS DISTINCT FROM NEW.reporting_manager_id THEN
        
        UPDATE employees
        SET team_id = NEW.team_id,
            reporting_manager_id = NEW.reporting_manager_id
        WHERE id = NEW.id AND company_id = NEW.company_id;
        
        -- Update performance_reports if team changed
        IF OLD.team_id IS DISTINCT FROM NEW.team_id THEN
            UPDATE performance_reports
            SET team_id = NEW.team_id
            WHERE user_id = NEW.id AND company_id = NEW.company_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle team deletion - clean up references
CREATE OR REPLACE FUNCTION cleanup_team_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- Set team_id to NULL for all employees in deleted team
    UPDATE employees
    SET team_id = NULL
    WHERE team_id = OLD.id AND company_id = OLD.company_id;
    
    -- Update profiles accordingly
    UPDATE profiles
    SET team_id = NULL
    WHERE id IN (
        SELECT id FROM employees 
        WHERE team_id = OLD.id AND company_id = OLD.company_id
    );
    
    -- Update performance_reports accordingly
    UPDATE performance_reports
    SET team_id = NULL
    WHERE user_id IN (
        SELECT id FROM employees 
        WHERE team_id = OLD.id AND company_id = OLD.company_id
    ) AND company_id = OLD.company_id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Function to handle employee deletion - clean up references
CREATE OR REPLACE FUNCTION cleanup_employee_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- Update profiles for deleted employee
    UPDATE profiles
    SET team_id = NULL,
        reporting_manager_id = NULL,
        is_active = false
    WHERE id = OLD.id AND company_id = OLD.company_id;
    
    -- Update performance_reports for deleted employee
    UPDATE performance_reports
    SET team_id = NULL,
        is_active = false
    WHERE user_id = OLD.id AND company_id = OLD.company_id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Additional triggers
CREATE TRIGGER trigger_sync_new_employee
    AFTER INSERT ON employees
    FOR EACH ROW EXECUTE FUNCTION sync_new_employee();

CREATE TRIGGER trigger_sync_profile_to_employee
    AFTER UPDATE OF team_id, reporting_manager_id ON profiles
    FOR EACH ROW EXECUTE FUNCTION sync_profile_to_employee();

CREATE TRIGGER trigger_cleanup_team_deletion
    BEFORE DELETE ON teams
    FOR EACH ROW EXECUTE FUNCTION cleanup_team_deletion();

CREATE TRIGGER trigger_cleanup_employee_deletion
    BEFORE DELETE ON employees
    FOR EACH ROW EXECUTE FUNCTION cleanup_employee_deletion();
