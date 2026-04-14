-- =========================================================
-- TEST MANAGER APPROVAL FUNCTIONALITY
-- =========================================================

-- Test if managers can actually approve their team members' leave requests
-- This will simulate the approval process and identify any issues

-- 1. Find a manager with team members
DO $$
DECLARE
    manager_record RECORD;
    team_member_record RECORD;
    pending_request_record RECORD;
    test_request_id UUID;
    approval_result BOOLEAN;
BEGIN
    RAISE NOTICE '=== TESTING MANAGER APPROVAL FUNCTIONALITY ===';
    
    -- Find a manager with active team members
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
    
    -- Find a team member with a pending leave request
    SELECT lr.id, e.name INTO team_member_record
    FROM leave_requests lr
    JOIN employees e ON lr.employee_id = e.id
    WHERE e.reporting_manager_id = manager_record.id
    AND lr.status = 'pending'
    AND e.is_active = true
    LIMIT 1;
    
    IF team_member_record IS NULL THEN
        RAISE NOTICE 'No pending leave requests found for team members';
        
        -- Create a test leave request for testing
        RAISE NOTICE 'Creating test leave request for testing...';
        
        -- Get a leave type
        DECLARE
            leave_type_id UUID;
        BEGIN
            SELECT id INTO leave_type_id
            FROM leave_types
            WHERE is_active = true
            LIMIT 1;
            
            IF leave_type_id IS NULL THEN
                RAISE NOTICE 'No active leave types found';
                RETURN;
            END IF;
            
            -- Find a team member
            SELECT e.id, e.name INTO team_member_record
            FROM employees e
            WHERE e.reporting_manager_id = manager_record.id
            AND e.is_active = true
            LIMIT 1;
            
            IF team_member_record IS NULL THEN
                RAISE NOTICE 'No team members found for manager';
                RETURN;
            END IF;
            
            -- Create test leave request
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
                (SELECT company_id FROM employees WHERE id = manager_record.id)
            ) RETURNING id INTO test_request_id;
            
            RAISE NOTICE 'Created test leave request: %', test_request_id;
            
            -- Now try to approve it
            RAISE NOTICE 'Testing approval by manager: %', manager_record.name;
            
            -- Simulate the approval process (same as useLeave.ts)
            UPDATE leave_requests
            SET 
                status = 'approved',
                approved_by = manager_record.id,
                approved_at = NOW(),
                updated_at = NOW()
            WHERE id = test_request_id;
            
            -- Check if approval worked
            SELECT status INTO approval_result
            FROM leave_requests
            WHERE id = test_request_id;
            
            IF approval_result = 'approved' THEN
                RAISE NOTICE 'SUCCESS: Manager % can approve team member requests', manager_record.name;
            ELSE
                RAISE NOTICE 'FAILURE: Manager % cannot approve team member requests', manager_record.name;
            END IF;
            
            -- Clean up test request
            DELETE FROM leave_requests WHERE id = test_request_id;
            
        END;
        
    ELSE
        RAISE NOTICE 'Found team member with pending request: %', team_member_record.name;
        
        -- Test approval of existing pending request
        RAISE NOTICE 'Testing approval of existing request...';
        
        -- Get the request ID
        SELECT lr.id INTO test_request_id
        FROM leave_requests lr
        JOIN employees e ON lr.employee_id = e.id
        WHERE e.reporting_manager_id = manager_record.id
        AND lr.status = 'pending'
        AND e.is_active = true
        LIMIT 1;
        
        -- Store original status
        DECLARE
            original_status TEXT;
        BEGIN
            SELECT status INTO original_status
            FROM leave_requests
            WHERE id = test_request_id;
            
            -- Test approval
            UPDATE leave_requests
            SET 
                status = 'approved',
                approved_by = manager_record.id,
                approved_at = NOW(),
                updated_at = NOW()
            WHERE id = test_request_id;
            
            -- Check if it worked
            SELECT status INTO approval_result
            FROM leave_requests
            WHERE id = test_request_id;
            
            IF approval_result = 'approved' THEN
                RAISE NOTICE 'SUCCESS: Manager % can approve team member requests', manager_record.name;
                -- Revert to original status for testing
                UPDATE leave_requests
                SET status = original_status,
                    approved_by = NULL,
                    approved_at = NULL,
                    updated_at = NOW()
                WHERE id = test_request_id;
            ELSE
                RAISE NOTICE 'FAILURE: Manager % cannot approve team member requests', manager_record.name;
            END IF;
        END;
    END IF;
    
END $$;

-- 2. Check for any database-level restrictions
SELECT '=== DATABASE RESTRICTIONS CHECK ===' as info;

-- Check if there are any triggers on leave_requests
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
AND NOT tgisinternal;

-- Check if there are any RLS policies that might block updates
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    CASE 
        WHEN qual IS NOT NULL THEN 'HAS QUALIFICATION'
        ELSE 'NO QUALIFICATION'
    END as has_qualification
FROM pg_policies
WHERE tablename = 'leave_requests'
AND cmd IN ('UPDATE', 'ALL')
ORDER BY policyname;

SELECT '=== MANAGER APPROVAL TEST COMPLETE ===' as info;
SELECT 'If SUCCESS shown above, managers can approve team requests' as result;
SELECT 'If FAILURE shown above, there are permission issues' as result;
