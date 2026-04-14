-- =========================================================
-- FINAL MANAGER APPROVAL TEST - SYNTAX FIXED
-- =========================================================

-- Test if managers can actually approve their team members' leave requests
-- This will simulate the approval process and identify any issues

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

-- 2. Check pending leave requests and their manager relationships
SELECT '=== PENDING LEAVE REQUESTS WITH MANAGER RELATIONSHIPS ===' as info;

SELECT 
    lr.id as request_id,
    e.name as employee_name,
    e.role as employee_role,
    e.reporting_manager_id,
    m.name as manager_name,
    m.role as manager_role,
    lt.name as leave_type,
    lr.status,
    lr.start_date,
    lr.end_date,
    CASE 
        WHEN e.reporting_manager_id = m.id THEN 'CAN APPROVE'
        ELSE 'CANNOT APPROVE'
    END as approval_permission,
    lr.created_at
FROM leave_requests lr
JOIN employees e ON lr.employee_id = e.id
JOIN leave_types lt ON lr.leave_type_id = lt.id
LEFT JOIN employees m ON e.reporting_manager_id = m.id
WHERE lr.status = 'pending'
ORDER BY lr.created_at DESC;

-- 3. Simple approval test
DO $$
DECLARE
    manager_record RECORD;
    team_member_record RECORD;
    test_request_id UUID;
    leave_type_id UUID;
    approval_worked BOOLEAN := FALSE;
BEGIN
    RAISE NOTICE '=== SIMPLE APPROVAL TEST ===';
    
    -- Find a manager for testing
    SELECT e.id, e.name, e.role INTO manager_record
    FROM employees e
    WHERE e.role IN ('reporting_manager', 'admin', 'super_admin')
    AND e.is_active = true
    AND EXISTS (
        SELECT 1 FROM employees tm 
        WHERE tm.reporting_manager_id = e.id 
        AND tm.is_active = true
    )
    LIMIT 1;
    
    IF manager_record IS NULL THEN
        RAISE NOTICE 'No manager with team members found for testing';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Testing with manager: % (%)', manager_record.name, manager_record.role;
    
    -- Find a team member for testing
    SELECT e.id, e.name INTO team_member_record
    FROM employees e
    WHERE e.reporting_manager_id = manager_record.id
    AND e.is_active = true
    LIMIT 1;
    
    IF team_member_record IS NULL THEN
        RAISE NOTICE 'No team members found for manager';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Team member found: %', team_member_record.name;
    
    -- Get an active leave type for testing
    SELECT id INTO leave_type_id
    FROM leave_types
    WHERE is_active = true
    LIMIT 1;
    
    IF leave_type_id IS NULL THEN
        RAISE NOTICE 'No active leave types found';
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
        team_member_record.id,
        leave_type_id,
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '1 day',
        1,
        'Test request for approval functionality',
        'pending',
        (SELECT company_id FROM employees WHERE id = manager_record.id LIMIT 1)
    ) RETURNING id INTO test_request_id;
    
    RAISE NOTICE 'Created test leave request: %', test_request_id;
    
    -- Try to approve it
    UPDATE leave_requests
    SET 
        status = 'approved',
        approved_by = manager_record.id,
        approved_at = NOW(),
        updated_at = NOW()
    WHERE id = test_request_id;
    
    -- Check if approval worked
    DECLARE
        current_status TEXT;
    BEGIN
        SELECT status INTO current_status
        FROM leave_requests
        WHERE id = test_request_id;
        
        IF current_status = 'approved' THEN
            approval_worked := TRUE;
            RAISE NOTICE 'SUCCESS: Manager % can approve team member requests', manager_record.name;
        ELSE
            RAISE NOTICE 'FAILURE: Manager % cannot approve team member requests', manager_record.name;
            RAISE NOTICE 'Current status: %', current_status;
        END IF;
        
        -- Clean up test request
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

-- 4. Check for RLS policies that might block updates
SELECT '=== RLS POLICIES ON LEAVE_REQUESTS ===' as info;

SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'leave_requests'
ORDER BY policyname;

-- 5. Check for triggers that might interfere
SELECT '=== TRIGGERS ON LEAVE_REQUESTS ===' as info;

SELECT 
    tgname AS trigger_name,
    tgrelid::regclass AS table_name,
    CASE 
        WHEN tgenabled = 'O' THEN 'ENABLED' 
        WHEN tgenabled = 'D' THEN 'DISABLED' 
        ELSE 'UNKNOWN' 
    END AS status
FROM pg_trigger
WHERE tgrelid = 'leave_requests'::regclass
AND NOT tgisinternal
ORDER BY tgname;

SELECT '=== MANAGER APPROVAL TEST COMPLETE ===' as info;
SELECT 'Check the results above to identify the issue' as next_step;
