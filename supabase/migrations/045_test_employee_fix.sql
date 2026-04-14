-- =========================================================
-- TEST EMPLOYEE CREATION FIX
-- =========================================================

-- This tests the exact scenario that was failing

-- =========================================================
-- VERIFY ROLES AND COMPANIES EXIST
-- =========================================================

SELECT '=== ROLES AVAILABLE ===' as info;
SELECT id, name, description FROM roles WHERE is_active = true;

SELECT '=== COMPANIES AVAILABLE ===' as info;
SELECT id, name FROM companies LIMIT 5;

-- =========================================================
-- TEST EMPLOYEE CREATION WITH CORRECT ROLE_ID
-- =========================================================

DO $$
DECLARE
    employee_role_id UUID;
    valid_company_id UUID;
    test_user_id UUID := gen_random_uuid();
BEGIN
    -- Get the employee role UUID (same as Edge Function does)
    SELECT id INTO employee_role_id FROM roles WHERE name = 'employee' AND is_active = true;
    
    IF employee_role_id IS NULL THEN
        RAISE NOTICE 'ERROR: Employee role not found';
        RETURN;
    END IF;
    
    -- Get a valid company
    SELECT id INTO valid_company_id FROM companies LIMIT 1;
    
    IF valid_company_id IS NULL THEN
        RAISE NOTICE 'ERROR: No companies found';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Using role_id: % (for employee role)', employee_role_id;
    RAISE NOTICE 'Using company_id: %', valid_company_id;
    
    -- Test the exact insert that Edge Function now does
    BEGIN
        INSERT INTO employees (
            id,
            email,
            name,
            role_id,           -- Now using correct UUID
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
            'test@example.com',
            'Test Employee',
            employee_role_id,     -- Use UUID from roles table
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
        
        RAISE NOTICE 'SUCCESS: Employee creation works with UUID role_id';
        
        -- Clean up
        DELETE FROM employees WHERE id = test_user_id;
        RAISE NOTICE 'SUCCESS: Test record cleaned up';
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'ERROR: %', SQLERRM;
            RAISE NOTICE 'SQLSTATE: %', SQLSTATE;
    END;
END $$;

-- =========================================================
-- SUMMARY
-- =========================================================

SELECT '=== TEST COMPLETE ===' as info;
SELECT 'If you see SUCCESS above, the Edge Function fix should work' as recommendation;
