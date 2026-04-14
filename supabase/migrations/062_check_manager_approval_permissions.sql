-- =========================================================
-- CHECK MANAGER APPROVAL PERMISSIONS
-- =========================================================

-- Check if managers can approve their team members' leave requests
-- This will help identify any permission or relationship issues

-- 1. Check employee-manager relationships
SELECT '=== EMPLOYEE-MANAGER RELATIONSHIPS ===' as info;

SELECT 
    e.name as employee_name,
    e.role as employee_role,
    e.reporting_manager_id,
    m.name as manager_name,
    m.role as manager_role,
    CASE 
        WHEN e.reporting_manager_id = m.id THEN 'VALID'
        ELSE 'INVALID'
    END as relationship_status
FROM employees e
LEFT JOIN employees m ON e.reporting_manager_id = m.id
WHERE e.is_active = true
ORDER BY manager_name, employee_name;

-- 2. Check leave requests and their approval status
SELECT '=== LEAVE REQUESTS STATUS ===' as info;

SELECT 
    lr.id as request_id,
    e.name as employee_name,
    e.role as employee_role,
    e.reporting_manager_id,
    lr.status,
    lr.approved_by,
    approver.name as approver_name,
    approver.role as approver_role,
    CASE 
        WHEN lr.approved_by = e.reporting_manager_id THEN 'APPROVED BY MANAGER'
        WHEN lr.approved_by IS NULL THEN 'PENDING'
        ELSE 'APPROVED BY OTHER'
    END as approval_type,
    lr.created_at,
    lr.approved_at
FROM leave_requests lr
JOIN employees e ON lr.employee_id = e.id
LEFT JOIN employees approver ON lr.approved_by = approver.id
ORDER BY lr.created_at DESC;

-- 3. Check if there are any RLS policies preventing approvals
SELECT '=== RLS POLICIES ON LEAVE REQUESTS ===' as info;

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'leave_requests'
ORDER BY policyname;

-- 4. Check if there are any constraints on leave_requests table
SELECT '=== CONSTRAINTS ON LEAVE REQUESTS ===' as info;

SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    CASE WHEN convalidated THEN 'VALIDATED' ELSE 'NOT VALIDATED' END AS status
FROM pg_constraint
WHERE conrelid = 'leave_requests'::regclass
ORDER BY conname;

-- 5. Test if managers can see their team members' requests
SELECT '=== MANAGER TEAM VISIBILITY TEST ===' as info;

-- For each manager, show their team members
SELECT 
    manager.name as manager_name,
    manager.role as manager_role,
    COUNT(team_member.id) as team_count,
    STRING_AGG(team_member.name, ', ') as team_members
FROM employees manager
LEFT JOIN employees team_member ON manager.id = team_member.reporting_manager_id
WHERE manager.role IN ('reporting_manager', 'admin', 'super_admin')
AND manager.is_active = true
GROUP BY manager.id, manager.name, manager.role
ORDER BY manager_name;

-- 6. Check pending requests that managers should be able to approve
SELECT '=== PENDING REQUESTS BY MANAGER ===' as info;

SELECT 
    manager.name as manager_name,
    lr.id as request_id,
    employee.name as employee_name,
    lr.status,
    lt.name as leave_type,
    lr.start_date,
    lr.end_date,
    CASE 
        WHEN employee.reporting_manager_id = manager.id THEN 'CAN APPROVE'
        ELSE 'CANNOT APPROVE'
    END as approval_permission
FROM employees manager
CROSS JOIN leave_requests lr
JOIN employees employee ON lr.employee_id = employee.id
JOIN leave_types lt ON lr.leave_type_id = lt.id
WHERE lr.status = 'pending'
AND manager.role IN ('reporting_manager', 'admin', 'super_admin')
AND manager.is_active = true
ORDER BY manager_name, lr.created_at;

SELECT '=== DIAGNOSIS COMPLETE ===' as info;
SELECT 'Check the results above to identify approval permission issues' as next_step;
