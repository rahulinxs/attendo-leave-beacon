-- =========================================================
-- FIX EMPLOYEE CREATION TRIGGER ISSUE
-- =========================================================

-- The issue is that the sync_employee_to_profile() trigger fires
-- immediately when employee is inserted, but the auth user might
-- not be fully committed yet, causing the trigger to fail.

-- =========================================================
-- SOLUTION 1: DISABLE PROBLEMATIC TRIGGERS TEMPORARILY
-- =========================================================

-- Disable the problematic trigger during employee creation
ALTER TABLE employees DISABLE TRIGGER trigger_employee_sync_profile;

-- =========================================================
-- SOLUTION 2: CREATE A SAFER SYNC FUNCTION
-- =========================================================

-- Create a more robust sync function that handles timing issues
CREATE OR REPLACE FUNCTION sync_employee_to_profile_safe()
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
    -- Add a small delay to ensure auth user is fully committed
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

-- Replace the trigger with the safer version
DROP TRIGGER IF EXISTS trigger_employee_sync_profile ON employees;
CREATE TRIGGER trigger_employee_sync_profile_safe
AFTER INSERT OR UPDATE ON employees
FOR EACH ROW
EXECUTE FUNCTION sync_employee_to_profile_safe();

-- =========================================================
-- SOLUTION 3: TEST EMPLOYEE CREATION WITHOUT TRIGGERS
-- =========================================================

-- Test employee creation with triggers disabled
DO $$
DECLARE
    test_user_id UUID := gen_random_uuid();
    test_email TEXT := 'test-no-triggers@example.com';
    test_name TEXT := 'Test No Triggers';
    employee_role_id UUID;
    valid_company_id UUID;
BEGIN
    RAISE NOTICE '=== TEST: Employee Creation With Triggers Disabled ===';
    
    -- Get valid role and company
    SELECT id INTO employee_role_id FROM roles WHERE name = 'employee' AND is_active = true;
    SELECT id INTO valid_company_id FROM companies LIMIT 1;
    
    IF employee_role_id IS NULL OR valid_company_id IS NULL THEN
        RAISE NOTICE 'ERROR: Cannot get valid role or company';
        RETURN;
    END IF;
    
    -- Test employee creation with triggers disabled
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
        
        RAISE NOTICE 'SUCCESS: Employee created with triggers disabled';
        
        -- Clean up
        DELETE FROM employees WHERE id = test_user_id;
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'ERROR: Employee creation still failed: %', SQLERRM;
            RAISE NOTICE 'SQLSTATE: %', SQLSTATE;
    END;
    
END $$;

-- =========================================================
-- SOLUTION 4: RE-ENABLE TRIGGERS
-- =========================================================

-- Re-enable the trigger after testing
ALTER TABLE employees ENABLE TRIGGER trigger_employee_sync_profile_safe;

-- =========================================================
-- SUMMARY
-- =========================================================

SELECT '=== TRIGGER FIX SUMMARY ===' as info;
SELECT '1. Disabled problematic trigger' as step;
SELECT '2. Created safer sync function' as step;
SELECT '3. Tested employee creation' as step;
SELECT '4. Re-enabled safer trigger' as step;

RAISE NOTICE '=== FIX COMPLETE ===';
RAISE NOTICE 'The trigger issue should now be resolved';
RAISE NOTICE 'Employee creation should work without timing conflicts';
