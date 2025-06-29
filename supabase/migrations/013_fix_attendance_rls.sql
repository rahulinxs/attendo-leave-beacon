-- Migration: Fix RLS policies for attendance table
-- This migration ensures the attendance table's RLS policies use the profiles table
-- instead of the employees table to prevent infinite recursion.

-- Drop existing attendance policies
DROP POLICY IF EXISTS "Employees can view their own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Admins can view all attendance in company" ON public.attendance;
DROP POLICY IF EXISTS "Employees can insert their own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Admins can insert any attendance in company" ON public.attendance;
DROP POLICY IF EXISTS "Employees can update their own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Admins can update any attendance in company" ON public.attendance;

-- Create new policies using profiles table
CREATE POLICY "Employees can view their own attendance" ON public.attendance
  FOR SELECT USING (
    employee_id::text = auth.uid()::text AND
    company_id = (SELECT company_id FROM public.profiles WHERE id::text = auth.uid()::text LIMIT 1)
  );

CREATE POLICY "Admins can view all attendance in company" ON public.attendance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id::text = auth.uid()::text AND role = 'admin'
    ) AND
    company_id = (SELECT company_id FROM public.profiles WHERE id::text = auth.uid()::text LIMIT 1)
  );

CREATE POLICY "Employees can insert their own attendance" ON public.attendance
  FOR INSERT WITH CHECK (
    employee_id::text = auth.uid()::text AND
    company_id = (SELECT company_id FROM public.profiles WHERE id::text = auth.uid()::text LIMIT 1)
  );

CREATE POLICY "Admins can insert any attendance in company" ON public.attendance
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id::text = auth.uid()::text AND role = 'admin'
    ) AND
    company_id = (SELECT company_id FROM public.profiles WHERE id::text = auth.uid()::text LIMIT 1)
  );

CREATE POLICY "Employees can update their own attendance" ON public.attendance
  FOR UPDATE USING (
    employee_id::text = auth.uid()::text AND
    company_id = (SELECT company_id FROM public.profiles WHERE id::text = auth.uid()::text LIMIT 1)
  );

CREATE POLICY "Admins can update any attendance in company" ON public.attendance
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id::text = auth.uid()::text AND role = 'admin'
    ) AND
    company_id = (SELECT company_id FROM public.profiles WHERE id::text = auth.uid()::text LIMIT 1)
  );
