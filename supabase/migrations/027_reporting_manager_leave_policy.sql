-- RLS Policy: Allow reporting managers to approve leave requests for their team members
-- This policy allows reporting managers to:
-- 1. View leave requests from employees in their team
-- 2. Update leave requests status and approval details for their team members

-- Enable RLS on the table
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Reporting managers can view team leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Reporting managers can update team leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Reporting managers can insert leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Reporting managers can delete own leave requests" ON leave_requests;

-- Policy for SELECT (viewing leave requests)
CREATE POLICY "Reporting managers can view team leave requests" ON leave_requests
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'reporting_manager'
  )
  AND (
    -- Can view own requests
    employee_id = auth.uid()
    -- Or view requests from team members
    OR employee_id IN (
      SELECT e.id FROM employees e
      WHERE e.team_id IN (
        SELECT rm.team_id FROM employees rm
        WHERE rm.id = auth.uid()
        AND rm.role = 'reporting_manager'
      )
    )
  )
);

-- Policy for UPDATE (approving leave requests)
CREATE POLICY "Reporting managers can update team leave requests" ON leave_requests
FOR UPDATE USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'reporting_manager'
  )
  AND (
    -- Can update own requests
    employee_id = auth.uid()
    -- Or can update team members' requests (status, approval fields)
    OR employee_id IN (
      SELECT e.id FROM employees e
      WHERE e.team_id IN (
        SELECT rm.team_id FROM employees rm
        WHERE rm.id = auth.uid()
        AND rm.role = 'reporting_manager'
      )
    )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'reporting_manager'
  )
  AND (
    -- Can update own requests with any fields
    employee_id = auth.uid()
    -- Or can only update approval fields for team members
    OR (
      employee_id IN (
        SELECT e.id FROM employees e
        WHERE e.team_id IN (
          SELECT rm.team_id FROM employees rm
          WHERE rm.id = auth.uid()
          AND rm.role = 'reporting_manager'
        )
      )
      AND (
        -- Allow updating status and approval fields for team members
        status IN ('pending', 'approved', 'rejected')
        AND approved_by = auth.uid()
        AND approved_at = NOW()
      )
    )
  )
);

-- Policy for INSERT (creating leave requests)
CREATE POLICY "Reporting managers can insert leave requests" ON leave_requests
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'reporting_manager'
  )
  AND employee_id = auth.uid() -- Can only create requests for themselves
);

-- Policy for DELETE (deleting leave requests)
CREATE POLICY "Reporting managers can delete own leave requests" ON leave_requests
FOR DELETE USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'reporting_manager'
  )
  AND employee_id = auth.uid() -- Can only delete own requests
);
