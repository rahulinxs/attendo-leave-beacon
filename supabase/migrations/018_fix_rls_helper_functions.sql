-- Migration: Convert helper functions to SQL to prevent RLS recursion

-- Create SQL helper functions
CREATE OR REPLACE FUNCTION get_current_user_company_id()
RETURNS UUID AS $$
SELECT company_id 
FROM public.profiles 
WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION current_user_has_role(role_name TEXT)
RETURNS BOOLEAN AS $$
SELECT EXISTS (
  SELECT 1
  FROM public.profiles
  WHERE id = auth.uid() AND role = role_name
);
$$ LANGUAGE sql SECURITY DEFINER;

-- Create policies if they don't exist
DO $$
BEGIN
    -- Check if policy exists and create if not
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'employees' 
        AND policyname = 'Employees can view their own data'
    ) THEN
        CREATE POLICY "Employees can view their own data" ON public.employees
            FOR SELECT USING (id = auth.uid() AND company_id = get_current_user_company_id());
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'employees' 
        AND policyname = 'Admins can view all employees in their company'
    ) THEN
        CREATE POLICY "Admins can view all employees in their company" ON public.employees
            FOR SELECT USING (current_user_has_role('admin') AND company_id = get_current_user_company_id());
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'employees' 
        AND policyname = 'Admins can insert employees in their company'
    ) THEN
        CREATE POLICY "Admins can insert employees in their company" ON public.employees
            FOR INSERT WITH CHECK (current_user_has_role('admin') AND company_id = get_current_user_company_id());
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'employees' 
        AND policyname = 'Admins can update employees in their company'
    ) THEN
        CREATE POLICY "Admins can update employees in their company" ON public.employees
            FOR UPDATE USING (current_user_has_role('admin') AND company_id = get_current_user_company_id());
    END IF;
    
    -- Attendance table
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'attendance' 
        AND policyname = 'Employees can view their own attendance'
    ) THEN
        CREATE POLICY "Employees can view their own attendance" ON public.attendance
            FOR SELECT USING (employee_id = auth.uid() AND company_id = get_current_user_company_id());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'attendance' 
        AND policyname = 'Admins can view all attendance in their company'
    ) THEN
        CREATE POLICY "Admins can view all attendance in their company" ON public.attendance
            FOR SELECT USING (current_user_has_role('admin') AND company_id = get_current_user_company_id());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'attendance' 
        AND policyname = 'Employees can manage their own attendance'
    ) THEN
        CREATE POLICY "Employees can manage their own attendance" ON public.attendance
            FOR ALL USING (employee_id = auth.uid() AND company_id = get_current_user_company_id());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'attendance' 
        AND policyname = 'Admins can manage any attendance in their company'
    ) THEN
        CREATE POLICY "Admins can manage any attendance in their company" ON public.attendance
            FOR ALL USING (current_user_has_role('admin') AND company_id = get_current_user_company_id());
    END IF;

    -- Leave Types table
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'leave_types' 
        AND policyname = 'Users can view leave types in their company'
    ) THEN
        CREATE POLICY "Users can view leave types in their company" ON public.leave_types
            FOR SELECT USING (company_id = get_current_user_company_id());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'leave_types' 
        AND policyname = 'Admins can manage leave types in their company'
    ) THEN
        CREATE POLICY "Admins can manage leave types in their company" ON public.leave_types
            FOR ALL USING (current_user_has_role('admin') AND company_id = get_current_user_company_id());
    END IF;

    -- Leave Requests table
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'leave_requests' 
        AND policyname = 'Employees can view their own leave requests'
    ) THEN
        CREATE POLICY "Employees can view their own leave requests" ON public.leave_requests
            FOR SELECT USING (employee_id = auth.uid() AND company_id = get_current_user_company_id());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'leave_requests' 
        AND policyname = 'Admins can view all leave requests in their company'
    ) THEN
        CREATE POLICY "Admins can view all leave requests in their company" ON public.leave_requests
            FOR SELECT USING (current_user_has_role('admin') AND company_id = get_current_user_company_id());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'leave_requests' 
        AND policyname = 'Employees can manage their own leave requests'
    ) THEN
        CREATE POLICY "Employees can manage their own leave requests" ON public.leave_requests
            FOR ALL USING (employee_id = auth.uid() AND company_id = get_current_user_company_id());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'leave_requests' 
        AND policyname = 'Admins can manage any leave request in their company'
    ) THEN
        CREATE POLICY "Admins can manage any leave request in their company" ON public.leave_requests
            FOR ALL USING (current_user_has_role('admin') AND company_id = get_current_user_company_id());
    END IF;

    -- Leave Balances table
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'leave_balances' 
        AND policyname = 'Employees can view their own leave balances'
    ) THEN
        CREATE POLICY "Employees can view their own leave balances" ON public.leave_balances
            FOR SELECT USING (employee_id = auth.uid() AND company_id = get_current_user_company_id());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'leave_balances' 
        AND policyname = 'Admins can view all leave balances in their company'
    ) THEN
        CREATE POLICY "Admins can view all leave balances in their company" ON public.leave_balances
            FOR SELECT USING (current_user_has_role('admin') AND company_id = get_current_user_company_id());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'leave_balances' 
        AND policyname = 'Admins can manage leave balances in their company'
    ) THEN
        CREATE POLICY "Admins can manage leave balances in their company" ON public.leave_balances
            FOR ALL USING (current_user_has_role('admin') AND company_id = get_current_user_company_id());
    END IF;

    -- Companies table
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'companies' 
        AND policyname = 'Users can view their own company'
    ) THEN
        CREATE POLICY "Users can view their own company" ON public.companies
            FOR SELECT USING (id = get_current_user_company_id());
    END IF;
END;
$$;
