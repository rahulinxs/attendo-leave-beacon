-- Update role constraints to include all roles used by the application
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_role_check;
ALTER TABLE employees ADD CONSTRAINT employees_role_check 
CHECK (role IN ('employee', 'reporting_manager', 'admin', 'super_admin'));

-- Update RLS policies to include super_admin and reporting_manager roles
DROP POLICY IF EXISTS "Admins can view all employees" ON employees;
CREATE POLICY "Admins and Super Admins can view all employees" ON employees
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id::text = auth.uid()::text AND role IN ('admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "Admins can insert employees" ON employees;
CREATE POLICY "Admins and Super Admins can insert employees" ON employees
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id::text = auth.uid()::text AND role IN ('admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "Admins can update employees" ON employees;
CREATE POLICY "Admins and Super Admins can update employees" ON employees
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id::text = auth.uid()::text AND role IN ('admin', 'super_admin')
        )
    );

-- Update attendance policies to include super_admin and reporting_manager
DROP POLICY IF EXISTS "Admins can view all attendance" ON attendance;
CREATE POLICY "Admins and Super Admins can view all attendance" ON attendance
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id::text = auth.uid()::text AND role IN ('admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "Admins can insert any attendance" ON attendance;
CREATE POLICY "Admins and Super Admins can insert any attendance" ON attendance
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id::text = auth.uid()::text AND role IN ('admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "Admins can update any attendance" ON attendance;
CREATE POLICY "Admins and Super Admins can update any attendance" ON attendance
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id::text = auth.uid()::text AND role IN ('admin', 'super_admin')
        )
    );

-- Update leave_types policies
DROP POLICY IF EXISTS "Admins can manage leave types" ON leave_types;
CREATE POLICY "Admins and Super Admins can manage leave types" ON leave_types
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id::text = auth.uid()::text AND role IN ('admin', 'super_admin')
        )
    );

-- Update leave_requests policies
DROP POLICY IF EXISTS "Admins can view all leave requests" ON leave_requests;
CREATE POLICY "Admins and Super Admins can view all leave requests" ON leave_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id::text = auth.uid()::text AND role IN ('admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "Admins can update any leave request" ON leave_requests;
CREATE POLICY "Admins and Super Admins can update any leave request" ON leave_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id::text = auth.uid()::text AND role IN ('admin', 'super_admin')
        )
    );

-- Add policy for reporting managers to view their team's leave requests
CREATE POLICY "Reporting Managers can view team leave requests" ON leave_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id::text = auth.uid()::text AND role = 'reporting_manager'
        )
    );

-- Add policy for reporting managers to update their team's leave requests
CREATE POLICY "Reporting Managers can update team leave requests" ON leave_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id::text = auth.uid()::text AND role = 'reporting_manager'
        )
    ); 