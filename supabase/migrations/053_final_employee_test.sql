-- =========================================================
-- FINAL EMPLOYEE CREATION TEST
-- =========================================================

-- Test the complete employee creation flow with new architecture
DO $$
DECLARE
    test_user_id UUID := gen_random_uuid();
    test_email TEXT := 'final-test@example.com';
    test_name TEXT := 'Final Test Employee';
    test_role TEXT := 'employee';
    test_password TEXT := 'testPassword123!';
    employee_role_id UUID;
    valid_company_id UUID;
    test_result TEXT;
BEGIN
    RAISE NOTICE '=== FINAL EMPLOYEE CREATION TEST ===';
    
    -- Step 1: Get valid role and company
    SELECT id INTO employee_role_id FROM roles WHERE name = test_role AND is_active = true;
    SELECT id INTO valid_company_id FROM companies LIMIT 1;
    
    IF employee_role_id IS NULL OR valid_company_id IS NULL THEN
        RAISE NOTICE 'ERROR: Cannot get valid role or company';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Role ID: %, Company ID: %', employee_role_id, valid_company_id;
    
    -- Step 2: Test profile creation (simulating auth.users trigger)
    BEGIN
        INSERT INTO profiles (
            id, email, name, role_id, created_at, updated_at
        ) VALUES (
            test_user_id, test_email, test_name, employee_role_id, NOW(), NOW()
        );
        
        RAISE NOTICE 'SUCCESS: Profile created for %', test_email;
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'ERROR: Profile creation failed: %', SQLERRM;
            RETURN;
    END;
    
    -- Step 3: Test employee creation (will sync to profile)
    BEGIN
        INSERT INTO employees (
            id, email, name, role_id, department, position,
            company_id, team_id, reporting_manager_id, hire_date,
            is_active, created_at, updated_at
        ) VALUES (
            test_user_id, test_email, test_name, employee_role_id,
            'IT', 'Developer', valid_company_id, NULL, NULL,
            CURRENT_DATE, true, NOW(), NOW()
        );
        
        RAISE NOTICE 'SUCCESS: Employee created for %', test_email;
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'ERROR: Employee creation failed: %', SQLERRM;
            RAISE NOTICE 'SQLSTATE: %', SQLSTATE;
            RETURN;
    END;
    
    -- Step 4: Verify sync worked
    BEGIN
        -- Check if profile was updated by employee trigger
        SELECT email, name, role_id INTO test_result FROM profiles WHERE id = test_user_id;
        RAISE NOTICE 'Profile after employee creation: %', test_result;
        
        -- Check if performance record was created
        PERFORM 1 FROM performance_reports WHERE user_id = test_user_id;
        IF FOUND THEN
            RAISE NOTICE 'SUCCESS: Performance record created automatically';
        ELSE
            RAISE NOTICE 'WARNING: Performance record not found';
        END IF;
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'ERROR: Verification failed: %', SQLERRM;
    END;
    
    -- Step 5: Clean up test data
    BEGIN
        DELETE FROM performance_reports WHERE user_id = test_user_id;
        DELETE FROM employees WHERE id = test_user_id;
        DELETE FROM profiles WHERE id = test_user_id;
        
        RAISE NOTICE 'SUCCESS: Test data cleaned up';
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'WARNING: Cleanup failed: %', SQLERRM;
    END;
    
    RAISE NOTICE '=== TEST COMPLETE ===';
    RAISE NOTICE 'If all steps show SUCCESS, employee creation should work in UI!';
    
END $$;

-- =========================================================
-- EDGE FUNCTION COMPATIBILITY TEST
-- =========================================================

-- Test the exact data that Edge Function will use
DO $$
DECLARE
    edge_function_data JSONB;
BEGIN
    RAISE NOTICE '=== EDGE FUNCTION DATA TEST ===';
    
    -- Simulate Edge Function payload
    edge_function_data := jsonb_build_object(
        'name', 'Edge Function Test',
        'email', 'edge-test@example.com',
        'role', 'employee',
        'department', 'IT',
        'position', 'Developer',
        'company_id', (SELECT id FROM companies LIMIT 1),
        'team_id', NULL,
        'reporting_manager_id', NULL,
        'hire_date', CURRENT_DATE::TEXT,
        'is_active', true
    );
    
    RAISE NOTICE 'Edge Function payload: %', edge_function_data;
    
    -- Test role lookup (same as Edge Function)
    DECLARE
        role_uuid UUID;
    BEGIN
        SELECT id INTO role_uuid FROM roles WHERE name = 'employee' AND is_active = true;
        IF role_uuid IS NOT NULL THEN
            RAISE NOTICE 'SUCCESS: Role lookup works - %', role_uuid;
        ELSE
            RAISE NOTICE 'ERROR: Role lookup failed';
        END IF;
    END;
    
    RAISE NOTICE '=== EDGE FUNCTION TEST COMPLETE ===';
    RAISE NOTICE 'Employee creation should work with this data structure!';
    
END $$;
