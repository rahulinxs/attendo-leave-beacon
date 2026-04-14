-- =========================================================
-- CORRECTED EMPLOYEE CREATION TEST
-- =========================================================

-- Based on roles table structure, role_id is UUID, not text

-- =========================================================
-- 1. GET VALID ROLE_ID
-- =========================================================

-- First, get a valid role_id from roles table
DO $$
DECLARE
    valid_role_id UUID;
    valid_company_id UUID;
    test_user_id UUID := gen_random_uuid();
    error_message TEXT;
BEGIN
    -- Get a valid role_id
    SELECT id INTO valid_role_id FROM roles WHERE is_active = true LIMIT 1;
    
    IF valid_role_id IS NULL THEN
        RAISE NOTICE 'ERROR: No active roles found';
        RETURN;
    END IF;
    
    -- Get a valid company_id
    SELECT id INTO valid_company_id FROM companies LIMIT 1;
    
    IF valid_company_id IS NULL THEN
        RAISE NOTICE 'ERROR: No companies found';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Using role_id: %', valid_role_id;
    RAISE NOTICE 'Using company_id: %', valid_company_id;
    RAISE NOTICE 'Creating test employee with ID: %', test_user_id;
    
    -- =========================================================
    -- 2. CORRECTED INSERT TEST
    -- =========================================================
    
    BEGIN
        INSERT INTO employees (
            id,
            email,
            name,
            role_id,           -- Use UUID, not text
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
            valid_role_id,     -- Use valid UUID from roles table
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
        
        RAISE NOTICE 'SUCCESS: Employee inserted successfully';
        
        -- Clean up
        DELETE FROM employees WHERE id = test_user_id;
        RAISE NOTICE 'SUCCESS: Test record cleaned up';
        
    EXCEPTION
        WHEN OTHERS THEN
            error_message := SQLERRM;
            RAISE NOTICE 'ERROR: %', error_message;
            RAISE NOTICE 'SQLSTATE: %', SQLSTATE;
            
            -- Detailed error analysis
            IF SQLSTATE = '23503' THEN
                RAISE NOTICE 'FOREIGN KEY VIOLATION: Check if role_id, company_id, team_id, or reporting_manager_id exist';
            ELSIF SQLSTATE = '23505' THEN
                RAISE NOTICE 'UNIQUE VIOLATION: Email or ID already exists';
            ELSIF SQLSTATE = '42703' THEN
                RAISE NOTICE 'COLUMN ERROR: Column does not exist - check schema';
            ELSIF SQLSTATE = '42601' THEN
                RAISE NOTICE 'SYNTAX ERROR: Problem with INSERT statement';
            ELSIF SQLSTATE = '23514' THEN
                RAISE NOTICE 'CHECK VIOLATION: Data violates table constraints';
            END IF;
    END;
END $$;

-- =========================================================
-- 3. CHECK AVAILABLE ROLES
-- =========================================================

-- Show all available roles for reference
SELECT 
    id,
    name,
    description,
    is_active
FROM roles 
ORDER BY name;
