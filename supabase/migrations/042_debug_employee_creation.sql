-- =========================================================
-- DEBUG EMPLOYEE CREATION ERROR
-- =========================================================

-- This migration helps diagnose why employee creation is failing

-- =========================================================
-- CHECK CURRENT TABLE STRUCTURES
-- =========================================================

DO $$
DECLARE
    col RECORD;
    trig RECORD;
    missing_columns TEXT[] := '{}';
    required_columns TEXT[] := ARRAY[
        'id','email','name','role_id','department','position',
        'company_id','team_id','reporting_manager_id',
        'hire_date','is_active'
    ];
    col_exists BOOLEAN;
BEGIN
    RAISE NOTICE '=== DEBUGGING EMPLOYEE CREATION ERROR ===';
    
    -- Check employees table structure
    RAISE NOTICE '--- EMPLOYEES TABLE COLUMNS ---';
    FOR col IN 
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'employees' 
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE 'Column: %, Type: %, Nullable: %, Default: %', 
            col.column_name, col.data_type, col.is_nullable, col.column_default;
    END LOOP;
    
    -- Check if required columns exist for employee creation
    FOR i IN 1..array_length(required_columns, 1) LOOP
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'employees' 
            AND column_name = required_columns[i]
        ) INTO col_exists;
        
        IF NOT col_exists THEN
            missing_columns := array_append(missing_columns, required_columns[i]);
        END IF;
    END LOOP;
    
    IF array_length(missing_columns, 1) > 0 THEN
        RAISE NOTICE 'MISSING REQUIRED COLUMNS: %', missing_columns;
    ELSE
        RAISE NOTICE 'ALL REQUIRED COLUMNS EXIST';
    END IF;
    
    -- Check employee_profiles table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employee_profiles') THEN
        RAISE NOTICE 'employee_profiles table: EXISTS';
    ELSE
        RAISE NOTICE 'employee_profiles table: MISSING';
    END IF;
    
    -- Check profiles table exists (needed for sync)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        RAISE NOTICE 'profiles table: EXISTS';
    ELSE
        RAISE NOTICE 'profiles table: MISSING';
    END IF;
    
    -- Check for any triggers that might be causing issues
    RAISE NOTICE '--- TRIGGERS ON EMPLOYEES TABLE ---';
    FOR trig IN 
        SELECT trigger_name, event_manipulation, action_timing, action_condition
        FROM information_schema.triggers 
        WHERE event_object_table = 'employees'
    LOOP
        RAISE NOTICE 'Trigger: %, Event: %, Timing: %', 
            trig.trigger_name, trig.event_manipulation, trig.action_timing;
    END LOOP;
    
    RAISE NOTICE '=== DEBUG COMPLETE ===';
END $$;

-- =========================================================
-- TEST EMPLOYEE INSERT (SIMPLE VERSION)
-- =========================================================

-- Create a test function to isolate the issue
CREATE OR REPLACE FUNCTION test_employee_insert()
RETURNS TEXT AS $$
DECLARE
    test_user_id UUID := gen_random_uuid();
    test_company_id UUID;
    result TEXT := 'SUCCESS';
BEGIN
    -- Get a valid company_id
    SELECT id INTO test_company_id FROM companies LIMIT 1;
    
    IF test_company_id IS NULL THEN
        RETURN 'ERROR: No company found';
    END IF;
    
    -- Try to insert a test employee
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
        
        -- Clean up test record
        DELETE FROM employees WHERE id = test_user_id;
        
    EXCEPTION
        WHEN OTHERS THEN
            result := 'ERROR: ' || SQLERRM;
    END;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- RUN THE TEST
-- =========================================================

DO $$
DECLARE
    test_result TEXT;
BEGIN
    test_result := test_employee_insert();
    RAISE NOTICE 'Employee insert test result: %', test_result;
    
    IF test_result = 'SUCCESS' THEN
        RAISE NOTICE 'Employee insertion works - issue likely in Edge Function';
    ELSE
        RAISE NOTICE 'Employee insertion failed - database issue detected';
    END IF;
END $$;

-- =========================================================
-- CLEANUP TEST FUNCTION
-- =========================================================

DROP FUNCTION IF EXISTS test_employee_insert();
