-- =========================================================
-- QUICK EMPLOYEE CREATION TEST
-- =========================================================

-- Run this directly in Supabase SQL Editor to identify the exact error

-- =========================================================
-- 1. CHECK TABLE STRUCTURE
-- =========================================================

SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'employees' 
ORDER BY ordinal_position;

-- =========================================================
-- 2. CHECK FOR TRIGGERS
-- =========================================================

SELECT 
    trigger_name, 
    event_manipulation, 
    action_timing, 
    action_condition
FROM information_schema.triggers 
WHERE event_object_table = 'employees';

-- =========================================================
-- 3. SIMPLE INSERT TEST
-- =========================================================

-- This mimics exactly what the Edge Function does
DO $$
DECLARE
    test_user_id UUID := gen_random_uuid();
    test_company_id UUID;
    error_message TEXT;
BEGIN
    -- Get a valid company
    SELECT id INTO test_company_id FROM companies LIMIT 1;
    
    IF test_company_id IS NULL THEN
        RAISE NOTICE 'ERROR: No companies found in database';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Using company_id: %', test_company_id;
    RAISE NOTICE 'Creating test employee with ID: %', test_user_id;
    
    -- Try the exact insert from Edge Function
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
            'test@example.com',
            'Test Employee',
            'employee',
            'IT',
            'Developer',
            test_company_id,
            NULL,
            NULL,
            CURRENT_DATE,
            true,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'SUCCESS: Employee inserted successfully';
        
        -- Clean up
        DELETE FROM employees WHERE id = test_user_id;
        RAISE NOTICE 'SUCCESS: Test record cleaned up';
        
    EXCEPTION
        WHEN OTHERS THEN
            error_message := SQLERRM;
            RAISE NOTICE 'ERROR: %', error_message;
            RAISE NOTICE 'SQLSTATE: %', SQLSTATE;
            
            -- Try to get more details
            IF SQLSTATE = '23503' THEN
                RAISE NOTICE 'DETAIL: Foreign key violation - check if company_id, team_id, or reporting_manager_id exist';
            ELSIF SQLSTATE = '23505' THEN
                RAISE NOTICE 'DETAIL: Unique constraint violation - email or ID already exists';
            ELSIF SQLSTATE = '42703' THEN
                RAISE NOTICE 'DETAIL: Column does not exist - check column names';
            ELSIF SQLSTATE = '42601' THEN
                RAISE NOTICE 'DETAIL: Syntax error in INSERT statement';
            END IF;
    END;
END $$;

-- =========================================================
-- 4. CHECK IF ROLES TABLE EXISTS (for role_id)
-- =========================================================

SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'roles' 
AND table_schema = 'public'
ORDER BY column_name;
