-- =========================================================
-- SIMPLE MANAGER APPROVAL TEST
-- =========================================================

-- Simple test to verify if managers can approve leave requests
-- This focuses on the core functionality without complex logic

-- 1. Check current manager-team setup
SELECT '=== CURRENT MANAGER-TEAM SETUP ===' as info;

SELECT 
    m.name as manager_name,
    m.role as manager_role,
    m.id as manager_id,
    COUNT(e.id) as team_members_count
FROM employees m
LEFT JOIN employees e ON m.id = e.reporting_manager_id AND e.is_active = true
WHERE m.role IN ('reporting_manager', 'admin', 'super_admin')
AND m.is_active = true
GROUP BY m.id, m.name, m.role
ORDER BY m.name;

-- 2. Check pending leave requests
SELECT '=== PENDING LEAVE REQUESTS ===' as info;

SELECT 
    lr.id as request_id,
    e.name as employee_name,
    e.role as employee_role,
    e.reporting_manager_id,
    m.name as manager_name,
    lr.status,
    lt.name as leave_type,
    lr.start_date,
    lr.end_date,
    CASE 
        WHEN e.reporting_manager_id = m.id THEN 'CORRECT MANAGER'
        ELSE 'MANAGER MISMATCH'
    END as manager_relationship
FROM leave_requests lr
JOIN employees e ON lr.employee_id = e.id
JOIN leave_types lt ON lr.leave_type_id = lt.id
LEFT JOIN employees m ON e.reporting_manager_id = m.id
WHERE lr.status = 'pending'
ORDER BY lr.created_at;

-- 3. Test a simple approval
DO $$
DECLARE
    test_request_id UUID;
    manager_id UUID;
    employee_id UUID;
    leave_type_id UUID;
    approval_worked BOOLEAN := FALSE;
BEGIN
    RAISE NOTICE '=== SIMPLE APPROVAL TEST ===';
    
    -- Get a manager for testing
    SELECT id INTO manager_id
    FROM employees
    WHERE role IN ('reporting_manager', 'admin', 'super_admin')
    AND is_active = true
    LIMIT 1;
    
    IF manager_id IS NULL THEN
        RAISE NOTICE 'No manager found for testing';
        RETURN;
    END IF;
    
    -- Get an employee for testing
    SELECT id INTO employee_id
    FROM employees
    WHERE is_active = true
    AND id != manager_id
    LIMIT 1;
    
    IF employee_id IS NULL THEN
        RAISE NOTICE 'No employee found for testing';
        RETURN;
    END IF;
    
    -- Get a leave type for testing
    SELECT id INTO leave_type_id
    FROM leave_types
    WHERE is_active = true
    LIMIT 1;
    
    IF leave_type_id IS NULL THEN
        RAISE NOTICE 'No leave type found for testing';
        RETURN;
    END IF;
    
    -- Create a test leave request
    INSERT INTO leave_requests (
        employee_id,
        leave_type_id,
        start_date,
        end_date,
        total_days,
        reason,
        status,
        company_id
    ) VALUES (
        employee_id,
        leave_type_id,
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '1 day',
        1,
        'Test request',
        'pending',
        (SELECT company_id FROM employees WHERE id = manager_id LIMIT 1)
    ) RETURNING id INTO test_request_id;
    
    RAISE NOTICE 'Created test request: %', test_request_id;
    
    -- Try to approve it
    UPDATE leave_requests
    SET 
        status = 'approved',
        approved_by = manager_id,
        approved_at = NOW(),
        updated_at = NOW()
    WHERE id = test_request_id;
    
    -- Check if it worked
    DECLARE
        current_status TEXT;
    BEGIN
        SELECT status INTO current_status
        FROM leave_requests
        WHERE id = test_request_id;
        
        IF current_status = 'approved' THEN
            approval_worked := TRUE;
            RAISE NOTICE 'SUCCESS: Approval worked!';
        ELSE
            RAISE NOTICE 'FAILURE: Approval did not work. Status: %', current_status;
        END IF;
        
        -- Clean up
        DELETE FROM leave_requests WHERE id = test_request_id;
        
    END;
    
    -- Final result
    IF approval_worked THEN
        RAISE NOTICE '=== CONCLUSION: DATABASE ALLOWS APPROVALS ===';
        RAISE NOTICE 'Issue is likely in frontend logic or permissions';
    ELSE
        RAISE NOTICE '=== CONCLUSION: DATABASE BLOCKS APPROVALS ===';
        RAISE NOTICE 'Check RLS policies, triggers, or constraints';
    END IF;
    
END $$;

-- 4. Check RLS policies that might block updates
SELECT '=== RLS POLICIES ON LEAVE_REQUESTS ===' as info;

SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    CASE 
        WHEN qual IS NOT NULL THEN 'HAS RESTRICTION'
        ELSE 'NO RESTRICTION'
    END as policy_type
FROM pg_policies
WHERE tablename = 'leave_requests'
ORDER BY policyname;

SELECT '=== TEST COMPLETE ===' as info;
SELECT 'Check the results above to identify the issue' as next_step;
