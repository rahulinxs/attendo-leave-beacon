-- =========================================================
-- ISOLATE AUTH USER CREATION ISSUE
-- =========================================================

-- The problem is likely in the auth.user creation step
-- Let's test this separately from employee/profile creation

-- =========================================================
-- 1. TEST IF WE CAN CREATE EMPLOYEE/PROFILE WITHOUT AUTH USER
-- =========================================================

DO $$
DECLARE
    test_user_id UUID := gen_random_uuid();
    test_email TEXT := 'test-isolated@example.com';
    test_name TEXT := 'Test Isolated Employee';
    employee_role_id UUID;
    valid_company_id UUID;
    success_count INTEGER := 0;
BEGIN
    RAISE NOTICE '=== ISOLATED TEST: Employee/Profile Creation Without Auth ===';
    
    -- Get valid role and company
    SELECT id INTO employee_role_id FROM roles WHERE name = 'employee' AND is_active = true;
    SELECT id INTO valid_company_id FROM companies LIMIT 1;
    
    IF employee_role_id IS NULL OR valid_company_id IS NULL THEN
        RAISE NOTICE 'ERROR: Cannot get valid role or company';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Using role_id: %, company_id: %', employee_role_id, valid_company_id;
    
    -- =========================================================
    -- TEST 1: Create profile record only
    -- =========================================================
    
    BEGIN
        INSERT INTO profiles (
            id,
            email,
            name,
            role_id,
            department,
            position,
            company_id,
            team_id,
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
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'SUCCESS: Profile record created without auth user';
        success_count := success_count + 1;
        
        -- Clean up
        DELETE FROM profiles WHERE id = test_user_id;
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'ERROR: Profile creation failed: %', SQLERRM;
            RAISE NOTICE 'SQLSTATE: %', SQLSTATE;
    END;
    
    -- =========================================================
    -- TEST 2: Create employee record only
    -- =========================================================
    
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
        
        RAISE NOTICE 'SUCCESS: Employee record created without auth user';
        success_count := success_count + 1;
        
        -- Clean up
        DELETE FROM employees WHERE id = test_user_id;
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'ERROR: Employee creation failed: %', SQLERRM;
            RAISE NOTICE 'SQLSTATE: %', SQLSTATE;
    END;
    
    -- =========================================================
    -- TEST 3: Create both records together
    -- =========================================================
    
    BEGIN
        -- Create profile
        INSERT INTO profiles (
            id, email, name, role_id, department, position,
            company_id, team_id, created_at, updated_at
        ) VALUES (
            test_user_id, test_email, test_name, employee_role_id,
            'IT', 'Developer', valid_company_id, NULL, NOW(), NOW()
        );
        
        -- Create employee
        INSERT INTO employees (
            id, email, name, role_id, department, position,
            company_id, team_id, reporting_manager_id, hire_date,
            is_active, created_at, updated_at
        ) VALUES (
            test_user_id, test_email, test_name, employee_role_id,
            'IT', 'Developer', valid_company_id, NULL, NULL,
            CURRENT_DATE, true, NOW(), NOW()
        );
        
        RAISE NOTICE 'SUCCESS: Both records created without auth user';
        success_count := success_count + 1;
        
        -- Clean up
        DELETE FROM employees WHERE id = test_user_id;
        DELETE FROM profiles WHERE id = test_user_id;
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'ERROR: Combined creation failed: %', SQLERRM;
            RAISE NOTICE 'SQLSTATE: %', SQLSTATE;
    END;
    
    -- =========================================================
    -- SUMMARY
    -- =========================================================
    
    RAISE NOTICE '=== ISOLATED TEST SUMMARY ===';
    RAISE NOTICE 'Success count: %/3', success_count;
    
    IF success_count = 3 THEN
        RAISE NOTICE 'CONCLUSION: Employee/Profile creation works fine';
        RAISE NOTICE 'ISSUE: Auth user creation is the problem';
        RAISE NOTICE 'SOLUTION: Fix Edge Function auth user creation step';
    ELSE
        RAISE NOTICE 'CONCLUSION: Database layer has issues';
        RAISE NOTICE 'ISSUE: Employee/Profile creation failed';
        RAISE NOTICE 'SOLUTION: Fix database schema or constraints';
    END IF;
    
END $$;

-- =========================================================
-- 2. CHECK AUTH USER CREATION REQUIREMENTS
-- =========================================================

-- Check what auth.users table expects
SELECT '=== AUTH.USERS TABLE STRUCTURE ===' as info;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'auth' 
AND table_name = 'users' 
AND column_name IN ('id', 'email', 'created_at', 'updated_at')
ORDER BY column_name;

-- Check if there are any constraints on auth.users
SELECT '=== AUTH.USERS CONSTRAINTS ===' as info;

SELECT 
    conname,
    contype,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'auth.users'::regclass
ORDER BY conname;

-- =========================================================
-- 3. CHECK IF THERE ARE TRIGGERS THAT MIGHT BE CAUSING ISSUES
-- =========================================================

SELECT '=== TRIGGERS ON EMPLOYEES/PROFILES ===' as info;

SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_condition,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table IN ('employees', 'profiles')
ORDER BY event_object_table, trigger_name;
