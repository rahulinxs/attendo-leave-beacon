-- Improved version of ChatGPT policy with correct schema
-- This is a single UPDATE policy only (incomplete compared to our full solution)

CREATE POLICY "reporting_manager_can_approve_team_leave_fixed"
ON public.leave_requests
FOR UPDATE
USING (
  -- Fixed: Use employees table instead of profiles for reporting_manager_id
  EXISTS (
    SELECT 1
    FROM employees rm
    JOIN employees emp ON emp.id = leave_requests.employee_id
    WHERE rm.id = auth.uid()
    AND rm.role = 'reporting_manager'
    AND emp.reporting_manager_id = rm.id
  )
)
WITH CHECK (
  -- Fixed: Use employees table instead of profiles for reporting_manager_id
  EXISTS (
    SELECT 1
    FROM employees rm
    JOIN employees emp ON emp.id = leave_requests.employee_id
    WHERE rm.id = auth.uid()
    AND rm.role = 'reporting_manager'
    AND emp.reporting_manager_id = rm.id
  )
  -- Additional check: Only allow updating approval fields
  AND (
    status IN ('pending', 'approved', 'rejected')
    AND approved_by = auth.uid()
    AND approved_at = NOW()
  )
);
