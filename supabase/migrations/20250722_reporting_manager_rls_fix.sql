-- Drop any existing reporting manager policies to avoid conflicts
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'attendance'
        AND (policyname LIKE '%reporting%' OR policyname LIKE '%manager%')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON attendance', policy_record.policyname);
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
END $$;

-- 1. Policy for viewing team attendance
CREATE POLICY "Reporting managers can view team attendance" ON public.attendance
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employees
    WHERE employees.id = attendance.employee_id
    AND employees.reporting_manager_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM employees
    WHERE employees.id = auth.uid()
    AND employees.role = 'reporting_manager'
  )
);

-- 2. Policy for inserting team attendance
CREATE POLICY "Reporting managers can insert team attendance" ON public.attendance
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees
    WHERE employees.id = attendance.employee_id
    AND employees.reporting_manager_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM employees
    WHERE employees.id = auth.uid()
    AND employees.role = 'reporting_manager'
  )
);

-- 3. Policy for updating team attendance
CREATE POLICY "Reporting managers can update team attendance" ON public.attendance
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM employees
    WHERE employees.id = attendance.employee_id
    AND employees.reporting_manager_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM employees
    WHERE employees.id = auth.uid()
    AND employees.role = 'reporting_manager'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees
    WHERE employees.id = attendance.employee_id
    AND employees.reporting_manager_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM employees
    WHERE employees.id = auth.uid()
    AND employees.role = 'reporting_manager'
  )
);

-- 4. Policy for deleting team attendance
CREATE POLICY "Reporting managers can delete team attendance" ON public.attendance
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM employees
    WHERE employees.id = attendance.employee_id
    AND employees.reporting_manager_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM employees
    WHERE employees.id = auth.uid()
    AND employees.role = 'reporting_manager'
  )
);

-- Verify the policies were created
SELECT 
  policyname as name,
  cmd as operation,
  permissive,
  roles,
  qual as using_expression,
  with_check
FROM pg_policies 
WHERE tablename = 'attendance'
ORDER BY policyname;
