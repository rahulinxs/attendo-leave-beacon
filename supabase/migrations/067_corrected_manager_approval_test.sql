-- =========================================================
-- FINAL MANAGER APPROVAL TEST - IMPROVED
-- =========================================================

SELECT '=== CURRENT MANAGER-TEAM SETUP ===' as info;

SELECT 
    m.name as manager_name,
    m.role as manager_role,
    m.id as manager_id,
    COUNT(e.id) as team_members_count
FROM employees m
LEFT JOIN employees e 
ON m.id = e.reporting_manager_id 
AND e.is_active = true
WHERE m.role IN ('reporting_manager','admin','super_admin')
AND m.is_active = true
GROUP BY m.id,m.name,m.role
ORDER BY m.name;

-- =========================================================
-- APPROVAL TEST
-- =========================================================

DO $$
DECLARE
    manager_record RECORD;
    team_member_record RECORD;
    test_request_id UUID;
    leave_type_id UUID;
    approval_rows INT := 0;
    current_status TEXT;
BEGIN

RAISE NOTICE '=== SIMPLE APPROVAL TEST ===';

SELECT e.id,e.name,e.role
INTO manager_record
FROM employees e
WHERE e.role IN ('reporting_manager','admin','super_admin')
AND e.is_active=true
AND EXISTS (
    SELECT 1
    FROM employees tm
    WHERE tm.reporting_manager_id=e.id
    AND tm.is_active=true
)
LIMIT 1;

IF manager_record IS NULL THEN
    RAISE NOTICE 'No manager with team members found';
    RETURN;
END IF;

RAISE NOTICE 'Testing manager: % (%)',manager_record.name,manager_record.role;

SELECT e.id,e.name
INTO team_member_record
FROM employees e
WHERE e.reporting_manager_id=manager_record.id
AND e.is_active=true
LIMIT 1;

RAISE NOTICE 'Team member: %',team_member_record.name;

SELECT id
INTO leave_type_id
FROM leave_types
WHERE is_active=true
LIMIT 1;

INSERT INTO leave_requests(
    employee_id,
    leave_type_id,
    start_date,
    end_date,
    total_days,
    reason,
    status,
    company_id
)
VALUES(
    team_member_record.id,
    leave_type_id,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '1 day',
    1,
    'Approval test',
    'pending',
    (SELECT company_id FROM employees WHERE id = team_member_record.id)
)
RETURNING id INTO test_request_id;

RAISE NOTICE 'Test request created: %',test_request_id;

UPDATE leave_requests
SET
    status='approved',
    approved_by=manager_record.id,
    approved_at=NOW(),
    updated_at=NOW()
WHERE id=test_request_id;

GET DIAGNOSTICS approval_rows = ROW_COUNT;

SELECT status
INTO current_status
FROM leave_requests
WHERE id=test_request_id;

RAISE NOTICE 'Rows updated: %',approval_rows;
RAISE NOTICE 'Current status: %',current_status;

DELETE FROM leave_requests WHERE id=test_request_id;

END $$;

-- =========================================================
-- RLS POLICIES
-- =========================================================

SELECT
policyname,
cmd,
roles,
qual
FROM pg_policies
WHERE tablename='leave_requests'
ORDER BY policyname;

-- =========================================================
-- TRIGGERS
-- =========================================================

SELECT
tgname AS trigger_name,
tgrelid::regclass AS table_name,
CASE
WHEN tgenabled='O' THEN 'ENABLED'
WHEN tgenabled='D' THEN 'DISABLED'
END AS status
FROM pg_trigger
WHERE tgrelid='leave_requests'::regclass
AND NOT tgisinternal
ORDER BY tgname;
