-- Migration: Fix RLS policies for attendance table to prevent recursion
-- This migration updates the RLS policies to properly handle the relationship
-- between users and their attendance records using the profiles table.

-- Drop existing policies
DROP POLICY IF EXISTS "Employees can view their own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Admins can view all attendance in company" ON public.attendance;
DROP POLICY IF EXISTS "Employees can insert their own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Admins can insert any attendance in company" ON public.attendance;
DROP POLICY IF EXISTS "Employees can update their own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Admins can update any attendance in company" ON public.attendance;

-- Create new policies that prevent recursion
-- Helper function to get user's company ID
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT company_id FROM public.profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create policies that use these helper functions
CREATE POLICY "Employees can view their own attendance" ON public.attendance
  FOR SELECT USING (
    employee_id::text = auth.uid()::text AND
    company_id = get_user_company_id()
  );

CREATE POLICY "Admins can view all attendance in company" ON public.attendance
  FOR SELECT USING (
    get_user_role() = 'admin' AND
    company_id = get_user_company_id()
  );

CREATE POLICY "Employees can insert their own attendance" ON public.attendance
  FOR INSERT WITH CHECK (
    employee_id::text = auth.uid()::text AND
    company_id = get_user_company_id()
  );

CREATE POLICY "Admins can insert any attendance in company" ON public.attendance
  FOR INSERT WITH CHECK (
    get_user_role() = 'admin' AND
    company_id = get_user_company_id()
  );

CREATE POLICY "Employees can update their own attendance" ON public.attendance
  FOR UPDATE USING (
    employee_id::text = auth.uid()::text AND
    company_id = get_user_company_id()
  );

CREATE POLICY "Admins can update any attendance in company" ON public.attendance
  FOR UPDATE USING (
    get_user_role() = 'admin' AND
    company_id = get_user_company_id()
  );
