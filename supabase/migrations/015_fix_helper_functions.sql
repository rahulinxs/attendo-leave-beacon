-- Migration: Update helper functions to be SQL functions and modify policies

-- First modify the existing policies to use the SQL function
ALTER POLICY "Admins can view all employees in their company" ON public.employees
  USING (current_user_has_role('admin') AND company_id = get_current_user_company_id());

ALTER POLICY "Admins can insert employees in their company" ON public.employees
  WITH CHECK (current_user_has_role('admin') AND company_id = get_current_user_company_id());

ALTER POLICY "Admins can update employees in their company" ON public.employees
  USING (current_user_has_role('admin') AND company_id = get_current_user_company_id());

ALTER POLICY "Admins can view all attendance in their company" ON public.attendance
  USING (current_user_has_role('admin') AND company_id = get_current_user_company_id());

ALTER POLICY "Admins can manage any attendance in their company" ON public.attendance
  USING (current_user_has_role('admin') AND company_id = get_current_user_company_id());

ALTER POLICY "Users can view leave types in their company" ON public.leave_types
  USING (company_id = get_current_user_company_id());

ALTER POLICY "Admins can manage leave types in their company" ON public.leave_types
  USING (current_user_has_role('admin') AND company_id = get_current_user_company_id());

ALTER POLICY "Admins can view all leave requests in their company" ON public.leave_requests
  USING (current_user_has_role('admin') AND company_id = get_current_user_company_id());

ALTER POLICY "Admins can manage any leave request in their company" ON public.leave_requests
  USING (current_user_has_role('admin') AND company_id = get_current_user_company_id());

ALTER POLICY "Admins can manage leave balances in their company" ON public.leave_balances
  USING (current_user_has_role('admin') AND company_id = get_current_user_company_id());

ALTER POLICY "Users can view their own company" ON public.companies
  USING (id = get_current_user_company_id());

-- Update the existing functions to be SQL functions
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
