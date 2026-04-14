-- =========================================================
-- FIX MANAGER APPROVAL RLS POLICY (PRODUCTION SAFE)
-- =========================================================

DROP POLICY IF EXISTS "reporting_manager_can_approve_team_leave_fixed"
ON leave_requests;

-- =========================================================
-- UPDATE POLICY
-- =========================================================

CREATE POLICY "managers_can_approve_team_leave_requests"
ON leave_requests
FOR UPDATE
USING (

    -- Admin / Super Admin
    (
        is_admin_or_super_admin()
        AND company_id = get_user_company_id()
    )

    OR

    -- Reporting manager approving team member
    EXISTS (
        SELECT 1
        FROM employees emp
        WHERE
        emp.id = leave_requests.employee_id
        AND emp.reporting_manager_id = auth.uid()
        AND emp.company_id = get_user_company_id()
    )
)

WITH CHECK (

    -- Admin / Super Admin validation
    (
        is_admin_or_super_admin()
        AND company_id = get_user_company_id()
    )

    OR

    -- Manager validation
    EXISTS (
        SELECT 1
        FROM employees emp
        WHERE
        emp.id = leave_requests.employee_id
        AND emp.reporting_manager_id = auth.uid()
        AND emp.company_id = get_user_company_id()
    )

);

-- =========================================================
-- SELECT POLICY
-- =========================================================

DROP POLICY IF EXISTS "Managers can view team leave requests"
ON leave_requests;

CREATE POLICY "managers_can_view_team_leave_requests"
ON leave_requests
FOR SELECT
USING (

    -- Admin / Super Admin
    (
        is_admin_or_super_admin()
        AND company_id = get_user_company_id()
    )

    OR

    -- Manager viewing team
    EXISTS (
        SELECT 1
        FROM employees emp
        WHERE
        emp.id = leave_requests.employee_id
        AND emp.reporting_manager_id = auth.uid()
        AND emp.company_id = get_user_company_id()
    )

    OR

    -- Employee viewing own
    employee_id = auth.uid()

);

-- =========================================================
-- VERIFY POLICIES
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
-- IMPORTANT: CHECK EMPLOYEE TABLE SCHEMA
-- =========================================================

-- Check if employees table uses id or user_id for auth mapping
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'employees' 
    AND table_schema = 'public'
    AND column_name IN ('id', 'user_id')
ORDER BY column_name;

-- If employees table uses user_id instead of id, 
-- you may need to update the RLS policies to use:
-- emp.user_id = auth.uid() instead of emp.id = auth.uid()

-- =========================================================
-- PERFORMANCE INDEX FOR MANAGER LOOKUPS
-- =========================================================

-- Add index for faster manager-team lookups in RLS policies
CREATE INDEX IF NOT EXISTS idx_employees_manager_lookup
ON employees (reporting_manager_id, company_id);
