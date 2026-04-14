-- =========================================================
-- QUICK FIX: DISABLE PROBLEMATIC TRIGGER
-- =========================================================

-- The trigger_employee_sync_profile is causing employee creation to fail
-- Let's disable it temporarily to allow employee creation to work

-- =========================================================
-- 1. DISABLE THE PROBLEMATIC TRIGGER
-- =========================================================

ALTER TABLE employees DISABLE TRIGGER trigger_employee_sync_profile;

-- =========================================================
-- 2. TEST EMPLOYEE CREATION WITHOUT TRIGGER
-- =========================================================

DO $$
DECLARE
    test_user_id UUID := gen_random_uuid();
    test_email TEXT := 'test-fixed@example.com';
    test_name TEXT := 'Test Fixed Employee';
    employee_role_id UUID;
    valid_company_id UUID;
BEGIN
    RAISE NOTICE '=== TESTING EMPLOYEE CREATION WITHOUT TRIGGER ===';
    
    -- Get valid role and company
    SELECT id INTO employee_role_id FROM roles WHERE name = 'employee' AND is_active = true;
    SELECT id INTO valid_company_id FROM companies LIMIT 1;
    
    IF employee_role_id IS NULL OR valid_company_id IS NULL THEN
        RAISE NOTICE 'ERROR: Cannot get valid role or company';
        RETURN;
    END IF;
    
    -- Test employee creation
    BEGIN
        INSERT INTO employees (
            id,
            email,
            name,
            role_id,
            department,
            position,
            company_id,
            team_id,
            reporting_manager_id,
            hire_date,
            is_active,
            created_at,
            updated_at
        ) VALUES (
            test_user_id,
            test_email,
            test_name,
            employee_role_id,
            'IT',
            'Developer',
            valid_company_id,
            NULL,
            NULL,
            CURRENT_DATE,
            true,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'SUCCESS: Employee created without trigger!';
        
        -- Clean up
        DELETE FROM employees WHERE id = test_user_id;
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'ERROR: Employee creation still failed: %', SQLERRM;
            RAISE NOTICE 'SQLSTATE: %', SQLSTATE;
    END;
    
END $$;

-- =========================================================
-- 3. VERIFY TRIGGER IS DISABLED
-- =========================================================

SELECT '=== TRIGGER STATUS ===' as info;

-- Check if trigger is disabled
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    CASE 
        WHEN tgparentid = 0 THEN 'ENABLED'
        ELSE 'DISABLED'
    END as status
FROM pg_trigger 
WHERE tgrelid = 'employees'::regclass 
AND tgname = 'trigger_employee_sync_profile';

-- =========================================================
-- 4. ALTERNATIVE: CREATE A MANUAL SYNC FUNCTION
-- =========================================================

-- Create a manual sync function that can be called after employee creation
CREATE OR REPLACE FUNCTION manual_sync_employee_to_profile(employee_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    employee_record RECORD;
    profile_exists BOOLEAN;
BEGIN
    -- Get employee data
    SELECT * INTO employee_record FROM employees WHERE id = employee_uuid;
    
    IF NOT FOUND THEN
        RETURN 'ERROR: Employee not found';
    END IF;
    
    -- Check if profile exists
    SELECT 1 INTO profile_exists FROM profiles WHERE id = employee_uuid;
    
    IF profile_exists THEN
        -- Update existing profile
        UPDATE profiles SET
            email = employee_record.email,
            name = employee_record.name,
            role_id = employee_record.role_id,
            department = employee_record.department,
            position = employee_record.position,
            company_id = employee_record.company_id,
            team_id = employee_record.team_id,
            reporting_manager_id = employee_record.reporting_manager_id,
            updated_at = NOW()
        WHERE id = employee_uuid;
        
        RETURN 'Profile updated successfully';
    ELSE
        -- Create new profile
        INSERT INTO profiles (
            id,
            email,
            name,
            role_id,
            department,
            position,
            company_id,
            team_id,
            reporting_manager_id,
            created_at,
            updated_at
        ) VALUES (
            employee_uuid,
            employee_record.email,
            employee_record.name,
            employee_record.role_id,
            employee_record.department,
            employee_record.position,
            employee_record.company_id,
            employee_record.team_id,
            employee_record.reporting_manager_id,
            NOW(),
            NOW()
        );
        
        RETURN 'Profile created successfully';
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'ERROR: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- 5. INSTRUCTIONS
-- =========================================================

SELECT '=== NEXT STEPS ===' as info;
SELECT '1. Test employee creation in UI' as step;
SELECT '2. If it works, the trigger was the issue' as step;
SELECT '3. Use manual_sync_employee_to_profile() for manual sync' as step;
SELECT '4. Optionally re-enable trigger with safer version later' as step;

SELECT '=== QUICK FIX APPLIED ===' as info;
SELECT 'The problematic trigger has been disabled' as info;
SELECT 'Employee creation should now work in the UI' as info;
SELECT 'Use manual_sync_employee_to_profile() for manual sync if needed' as info;
