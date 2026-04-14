-- =========================================================
-- COMPREHENSIVE EMPLOYEE CREATION DEBUG
-- =========================================================

-- This will identify the exact issue causing employee creation to fail

-- =========================================================
-- 1. CHECK IF EDGE FUNCTION IS USING UPDATED CODE
-- =========================================================

-- First, let's see if the Edge Function is actually using our fixed code
-- by checking what happens when we call it directly

-- Create a test that mimics exactly what the Edge Function does
DO $$
DECLARE
    -- Test variables (same as Edge Function)
    test_name TEXT := 'Test Employee';
    test_email TEXT := 'test-employee@example.com';
    test_role TEXT := 'employee';
    test_password TEXT := 'testPassword123!';
    
    -- Variables for lookups
    test_user_id UUID := gen_random_uuid();
    employee_role_id UUID;
    valid_company_id UUID;
    profile_error TEXT;
    employee_error TEXT;
    auth_user_id UUID;
    
BEGIN
    RAISE NOTICE '=== COMPREHENSIVE EMPLOYEE CREATION TEST ===';
    
    -- =========================================================
    -- STEP 1: Test role lookup (exact same as Edge Function)
    -- =========================================================
    
    SELECT id INTO employee_role_id FROM roles WHERE name = test_role AND is_active = true;
    
    IF employee_role_id IS NULL THEN
        RAISE NOTICE '❌ STEP 1 FAILED: Role lookup failed for role: %', test_role;
        RETURN;
    END IF;
    
    RAISE NOTICE '✅ STEP 1 SUCCESS: Role lookup works - role_id: %', employee_role_id;
    
    -- =========================================================
    -- STEP 2: Test company lookup
    -- =========================================================
    
    SELECT id INTO valid_company_id FROM companies LIMIT 1;
    
    IF valid_company_id IS NULL THEN
        RAISE NOTICE '❌ STEP 2 FAILED: No companies found';
        RETURN;
    END IF;
    
    RAISE NOTICE '✅ STEP 2 SUCCESS: Company lookup works - company_id: %', valid_company_id;
    
    -- =========================================================
    -- STEP 3: Test auth user creation (simulate Edge Function)
    -- =========================================================
    
    -- Note: We can't actually create auth users in SQL, but we can test the rest
    
    -- Use the same ID that would be created by auth
    auth_user_id := test_user_id;
    
    RAISE NOTICE '✅ STEP 3 SUCCESS: Simulated auth user creation - user_id: %', auth_user_id;
    
    -- =========================================================
    -- STEP 4: Test profile upsert (exact same as Edge Function)
    -- =========================================================
    
    BEGIN
        INSERT INTO profiles (
            id,
            email,
            name,
            role_id,  -- Use UUID from roles table
            department,
            position,
            company_id,
            team_id,
            updated_at
        ) VALUES (
            auth_user_id,
            test_email,
            test_name,
            employee_role_id,
            'IT',
            'Developer',
            valid_company_id,
            NULL,
            NOW()
        ) ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            name = EXCLUDED.name,
            role_id = EXCLUDED.role_id,
            department = EXCLUDED.department,
            position = EXCLUDED.position,
            company_id = EXCLUDED.company_id,
            team_id = EXCLUDED.team_id,
            updated_at = NOW();
        
        RAISE NOTICE '✅ STEP 4 SUCCESS: Profile upsert works';
        
    EXCEPTION
        WHEN OTHERS THEN
            profile_error := SQLERRM;
            RAISE NOTICE '❌ STEP 4 FAILED: Profile upsert error: %', profile_error;
            RAISE NOTICE 'SQLSTATE: %', SQLSTATE;
            
            IF SQLSTATE = '23503' THEN
                RAISE NOTICE '🔍 FOREIGN KEY: Check if role_id or company_id references are valid';
            ELSIF SQLSTATE = '42703' THEN
                RAISE NOTICE '🔍 COLUMN ERROR: Check column names in profiles table';
            END IF;
    END;
    
    -- =========================================================
    -- STEP 5: Test employee insert (exact same as Edge Function)
    -- =========================================================
    
    BEGIN
        INSERT INTO employees (
            id,
            email,
            name,
            role_id,           -- Use UUID from roles table
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
            auth_user_id,
            test_email,
            test_name,
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
        ) ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            name = EXCLUDED.name,
            role_id = EXCLUDED.role_id,
            department = EXCLUDED.department,
            position = EXCLUDED.position,
            company_id = EXCLUDED.company_id,
            team_id = EXCLUDED.team_id,
            reporting_manager_id = EXCLUDED.reporting_manager_id,
            hire_date = EXCLUDED.hire_date,
            is_active = EXCLUDED.is_active,
            updated_at = NOW();
        
        RAISE NOTICE '✅ STEP 5 SUCCESS: Employee insert works';
        
        -- Clean up test data
        DELETE FROM employees WHERE id = auth_user_id;
        DELETE FROM profiles WHERE id = auth_user_id;
        
    EXCEPTION
        WHEN OTHERS THEN
            employee_error := SQLERRM;
            RAISE NOTICE '❌ STEP 5 FAILED: Employee insert error: %', employee_error;
            RAISE NOTICE 'SQLSTATE: %', SQLSTATE;
            
            IF SQLSTATE = '23503' THEN
                RAISE NOTICE '🔍 FOREIGN KEY: Check if role_id or company_id references are valid';
            ELSIF SQLSTATE = '23505' THEN
                RAISE NOTICE '🔍 UNIQUE CONSTRAINT: Email or ID already exists';
            ELSIF SQLSTATE = '42703' THEN
                RAISE NOTICE '🔍 COLUMN ERROR: Check column names in employees table';
            END IF;
    END;
    
    -- =========================================================
    -- SUMMARY
    -- =========================================================
    
    RAISE NOTICE '=== TEST SUMMARY ===';
    RAISE NOTICE 'If all steps show SUCCESS, the database layer is working correctly';
    RAISE NOTICE 'If any step shows FAILED, that is the root cause';
    RAISE NOTICE 'Edge Function issue possibilities:';
    RAISE NOTICE '1. Edge Function not deployed with latest code';
    RAISE NOTICE '2. Edge Function caching issues';
    RAISE NOTICE '3. Network/timeout issues';
    RAISE NOTICE '4. Frontend error handling issues';
    
END $$;

-- =========================================================
-- 2. CHECK CURRENT EDGE FUNCTION STATUS
-- =========================================================

-- Let's also check if there are any issues with the current setup
SELECT '=== CURRENT SYSTEM STATUS ===' as info;

-- Check if all required tables exist
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('auth.users', 'profiles', 'employees', 'roles', 'companies') 
        THEN 'EXISTS'
        ELSE 'MISSING'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('auth.users', 'profiles', 'employees', 'roles', 'companies')
ORDER BY table_name;

-- Check if all required columns exist
SELECT '=== REQUIRED COLUMNS STATUS ===' as info;

SELECT 
    table_name,
    column_name,
    data_type,
    'OK' as status
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('employees', 'profiles') 
AND column_name IN ('id', 'email', 'name', 'role_id', 'company_id', 'created_at', 'updated_at')
ORDER BY table_name, column_name;
