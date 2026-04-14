-- =========================================================
-- TEST EDGE FUNCTION ISSUE DIRECTLY
-- =========================================================

-- This simulates what the Edge Function does step by step

-- =========================================================
-- 1. TEST ROLE LOOKUP (Step 1 in Edge Function)
-- =========================================================

DO $$
DECLARE
    employee_role_id UUID;
    valid_company_id UUID;
    test_user_id UUID := gen_random_uuid();
    test_email TEXT := 'test-employee@example.com';
    error_message TEXT;
BEGIN
    RAISE NOTICE '=== TESTING EDGE FUNCTION STEPS ===';
    
    -- Step 1: Role lookup (same as Edge Function)
    SELECT id INTO employee_role_id FROM roles WHERE name = 'employee' AND is_active = true;
    
    IF employee_role_id IS NULL THEN
        RAISE NOTICE 'ERROR: Employee role not found - this would cause Edge Function to fail';
        RETURN;
    END IF;
    
    RAISE NOTICE 'SUCCESS: Role lookup works - role_id: %', employee_role_id;
    
    -- Step 2: Company lookup
    SELECT id INTO valid_company_id FROM companies LIMIT 1;
    
    IF valid_company_id IS NULL THEN
        RAISE NOTICE 'ERROR: No companies found - this would cause Edge Function to fail';
        RETURN;
    END IF;
    
    RAISE NOTICE 'SUCCESS: Company lookup works - company_id: %', valid_company_id;
    
    -- Step 3: Test the exact employee insert (Step 2 in Edge Function)
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
            'Test Employee',
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
        
        RAISE NOTICE 'SUCCESS: Employee insert works - database layer is fine';
        
        -- Clean up
        DELETE FROM employees WHERE id = test_user_id;
        RAISE NOTICE 'SUCCESS: Test record cleaned up';
        
        -- Step 4: Test profile upsert (Step 3 in Edge Function)
        BEGIN
            INSERT INTO profiles (
                id,
                email,
                name,
                role,
                department,
                position,
                company_id,
                team_id,
                updated_at
            ) VALUES (
                test_user_id,
                test_email,
                'Test Employee',
                'employee',
                'IT',
                'Developer',
                valid_company_id,
                NULL,
                NOW()
            ) ON CONFLICT (id) DO UPDATE SET
                email = EXCLUDED.email,
                name = EXCLUDED.name,
                role = EXCLUDED.role,
                department = EXCLUDED.department,
                position = EXCLUDED.position,
                company_id = EXCLUDED.company_id,
                team_id = EXCLUDED.team_id,
                updated_at = NOW();
            
            RAISE NOTICE 'SUCCESS: Profile upsert works';
            
            -- Clean up
            DELETE FROM profiles WHERE id = test_user_id;
            RAISE NOTICE 'SUCCESS: Profile test record cleaned up';
            
        EXCEPTION
            WHEN OTHERS THEN
                error_message := SQLERRM;
                RAISE NOTICE 'ERROR: Profile upsert failed: %', error_message;
        END;
        
    EXCEPTION
        WHEN OTHERS THEN
            error_message := SQLERRM;
            RAISE NOTICE 'ERROR: Employee insert failed: %', error_message;
            RAISE NOTICE 'SQLSTATE: %', SQLSTATE;
            
            IF SQLSTATE = '23503' THEN
                RAISE NOTICE 'FOREIGN KEY ISSUE: Check if role_id or company_id references are valid';
            ELSIF SQLSTATE = '23505' THEN
                RAISE NOTICE 'UNIQUE CONSTRAINT: Email or ID already exists';
            ELSIF SQLSTATE = '42703' THEN
                RAISE NOTICE 'COLUMN ERROR: Check column names in employees table';
            END IF;
    END;
    
    RAISE NOTICE '=== TEST COMPLETE ===';
    RAISE NOTICE 'If all steps show SUCCESS, the issue is in Edge Function deployment';
    RAISE NOTICE 'If any step shows ERROR, that is the root cause';
END $$;

-- =========================================================
-- 2. CHECK CURRENT EDGE FUNCTION STATUS
-- =========================================================

-- Check if there are any issues with the current setup
SELECT '=== CURRENT DATABASE STATUS ===' as info;

-- Check if employees table has all required columns
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'employees' 
AND column_name IN ('id', 'email', 'name', 'role_id', 'company_id', 'created_at', 'updated_at')
ORDER BY column_name;

-- Check if profiles table exists and has required columns
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles' 
AND column_name IN ('id', 'email', 'name', 'role', 'company_id', 'updated_at')
ORDER BY column_name;
