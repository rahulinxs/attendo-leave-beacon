-- Migration: Fix RLS infinite recursion by using the profiles table
-- The previous policies on employees and other tables caused infinite recursion
-- because they queried the employees table within the policy itself.
-- This migration corrects the policies to query the `profiles` table instead,
-- which correctly links a user's auth.uid() to their company_id and role.

-- Helper function to get the current user's company_id from their profile
-- This breaks the recursive loop.
CREATE OR REPLACE FUNCTION get_current_user_company_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT company_id FROM public.profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if the current user has a specific role
CREATE OR REPLACE FUNCTION current_user_has_role(role_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND role = role_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop all potentially recursive policies before recreating them
-- It's safe to use DROP IF EXISTS
DROP POLICY IF EXISTS "Employees can view their own data" ON public.employees;
DROP POLICY IF EXISTS "Admins can view all employees in company" ON public.employees;
DROP POLICY IF EXISTS "Admins can insert employees in company" ON public.employees;
DROP POLICY IF EXISTS "Admins can update employees in company" ON public.employees;

DROP POLICY IF EXISTS "Employees can view their own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Admins can view all attendance in company" ON public.attendance;
DROP POLICY IF EXISTS "Employees can insert their own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Admins can insert any attendance in company" ON public.attendance;
DROP POLICY IF EXISTS "Employees can update their own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Admins can update any attendance in company" ON public.attendance;

DROP POLICY IF EXISTS "Everyone can view leave types in company" ON public.leave_types;
DROP POLICY IF EXISTS "Admins can manage leave types in company" ON public.leave_types;

DROP POLICY IF EXISTS "Employees can view their own leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Admins can view all leave requests in company" ON public.leave_requests;
DROP POLICY IF EXISTS "Employees can insert their own leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Employees can update their own pending leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Admins can update any leave request in company" ON public.leave_requests;

DROP POLICY IF EXISTS "Employees can view their own leave balances" ON public.leave_balances;
DROP POLICY IF EXISTS "Admins can view all leave balances in company" ON public.leave_balances;
DROP POLICY IF EXISTS "Admins can manage leave balances in company" ON public.leave_balances;

DROP POLICY IF EXISTS "Users can view their own company" ON public.companies;

-- Recreate policies for 'employees' table
CREATE POLICY "Employees can view their own data" ON public.employees
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Admins can view all employees in their company" ON public.employees
  FOR SELECT USING (current_user_has_role('admin') AND company_id = get_current_user_company_id());

CREATE POLICY "Admins can insert employees in their company" ON public.employees
  FOR INSERT WITH CHECK (current_user_has_role('admin') AND company_id = get_current_user_company_id());

CREATE POLICY "Admins can update employees in their company" ON public.employees
  FOR UPDATE USING (current_user_has_role('admin') AND company_id = get_current_user_company_id());

-- Recreate policies for 'attendance' table
CREATE POLICY "Employees can view their own attendance" ON public.attendance
  FOR SELECT USING (employee_id = auth.uid());

CREATE POLICY "Admins can view all attendance in their company" ON public.attendance
  FOR SELECT USING (current_user_has_role('admin') AND company_id = get_current_user_company_id());

CREATE POLICY "Employees can manage their own attendance" ON public.attendance
  FOR ALL USING (employee_id = auth.uid());

CREATE POLICY "Admins can manage any attendance in their company" ON public.attendance
  FOR ALL USING (current_user_has_role('admin') AND company_id = get_current_user_company_id());

-- Recreate policies for 'leave_types' table
CREATE POLICY "Users can view leave types in their company" ON public.leave_types
  FOR SELECT USING (company_id = get_current_user_company_id());

CREATE POLICY "Admins can manage leave types in their company" ON public.leave_types
  FOR ALL USING (current_user_has_role('admin') AND company_id = get_current_user_company_id());

-- Recreate policies for 'leave_requests' table
CREATE POLICY "Employees can view their own leave requests" ON public.leave_requests
  FOR SELECT USING (employee_id = auth.uid());

CREATE POLICY "Admins can view all leave requests in their company" ON public.leave_requests
  FOR SELECT USING (current_user_has_role('admin') AND company_id = get_current_user_company_id());

CREATE POLICY "Employees can manage their own leave requests" ON public.leave_requests
  FOR ALL USING (employee_id = auth.uid());

CREATE POLICY "Admins can manage any leave request in their company" ON public.leave_requests
  FOR ALL USING (current_user_has_role('admin') AND company_id = get_current_user_company_id());

-- Recreate policies for 'leave_balances' table
CREATE POLICY "Employees can view their own leave balances" ON public.leave_balances
  FOR SELECT USING (employee_id = auth.uid());

CREATE POLICY "Admins can manage leave balances in their company" ON public.leave_balances
  FOR ALL USING (current_user_has_role('admin') AND company_id = get_current_user_company_id());

-- Recreate policy for 'companies' table
CREATE POLICY "Users can view their own company" ON public.companies
  FOR SELECT USING (id = get_current_user_company_id());
