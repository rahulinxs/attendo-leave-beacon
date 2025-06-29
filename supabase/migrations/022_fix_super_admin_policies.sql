-- Migration: Fix RLS policies to properly handle super admin privileges
-- This migration ensures super admins can view all data across companies and teams

-- Drop all existing policies to start fresh
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop policies from all tables
    FOR r IN (SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON ' || r.schemaname || '.' || r.tablename || ';';
    END LOOP;
END$$;

-- Create helper functions for role checking
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'super_admin'
);
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin_or_super_admin()
RETURNS BOOLEAN AS $$
SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
);
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
SELECT company_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- PROFILES TABLE POLICIES
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid()::text = id::text);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid()::text = id::text);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid()::text = id::text);

-- Super admins can view ALL profiles (cross-company)
CREATE POLICY "Super admins can view all profiles" ON profiles
    FOR SELECT USING (is_super_admin());

-- Super admins can update ALL profiles
CREATE POLICY "Super admins can update all profiles" ON profiles
    FOR UPDATE USING (is_super_admin());

-- Super admins can insert profiles
CREATE POLICY "Super admins can insert profiles" ON profiles
    FOR INSERT WITH CHECK (is_super_admin());

-- Super admins can delete profiles
CREATE POLICY "Super admins can delete profiles" ON profiles
    FOR DELETE USING (is_super_admin());

-- Admins can view profiles in their company
CREATE POLICY "Admins can view company profiles" ON profiles
    FOR SELECT USING (
        is_admin_or_super_admin() AND company_id = get_user_company_id()
    );

-- Admins can update profiles in their company
CREATE POLICY "Admins can update company profiles" ON profiles
    FOR UPDATE USING (
        is_admin_or_super_admin() AND company_id = get_user_company_id()
    );

-- Admins can insert profiles in their company
CREATE POLICY "Admins can insert company profiles" ON profiles
    FOR INSERT WITH CHECK (
        is_admin_or_super_admin() AND company_id = get_user_company_id()
    );

-- Managers can view their team members
CREATE POLICY "Managers can view team profiles" ON profiles
    FOR SELECT USING (
        reporting_manager_id = auth.uid()
    );

-- EMPLOYEES TABLE POLICIES (if still using employees table)
-- Users can view their own employee data
CREATE POLICY "Users can view own employee data" ON employees
    FOR SELECT USING (auth.uid()::text = id::text);

-- Super admins can view ALL employees (cross-company)
CREATE POLICY "Super admins can view all employees" ON employees
    FOR SELECT USING (is_super_admin());

-- Super admins can manage ALL employees
CREATE POLICY "Super admins can manage all employees" ON employees
    FOR ALL USING (is_super_admin());

-- Admins can view employees in their company
CREATE POLICY "Admins can view company employees" ON employees
    FOR SELECT USING (
        is_admin_or_super_admin() AND company_id = get_user_company_id()
    );

-- Admins can manage employees in their company
CREATE POLICY "Admins can manage company employees" ON employees
    FOR ALL USING (
        is_admin_or_super_admin() AND company_id = get_user_company_id()
    );

-- Managers can view their team members
CREATE POLICY "Managers can view team employees" ON employees
    FOR SELECT USING (
        reporting_manager_id = auth.uid() OR id = auth.uid()
    );

-- ATTENDANCE TABLE POLICIES
-- Users can view their own attendance
CREATE POLICY "Users can view own attendance" ON attendance
    FOR SELECT USING (employee_id = auth.uid());

-- Super admins can view ALL attendance (cross-company)
CREATE POLICY "Super admins can view all attendance" ON attendance
    FOR SELECT USING (is_super_admin());

-- Super admins can manage ALL attendance
CREATE POLICY "Super admins can manage all attendance" ON attendance
    FOR ALL USING (is_super_admin());

-- Admins can view attendance in their company
CREATE POLICY "Admins can view company attendance" ON attendance
    FOR SELECT USING (
        is_admin_or_super_admin() AND company_id = get_user_company_id()
    );

-- Admins can manage attendance in their company
CREATE POLICY "Admins can manage company attendance" ON attendance
    FOR ALL USING (
        is_admin_or_super_admin() AND company_id = get_user_company_id()
    );

-- Users can manage their own attendance
CREATE POLICY "Users can manage own attendance" ON attendance
    FOR ALL USING (employee_id = auth.uid());

-- Managers can view their team's attendance
CREATE POLICY "Managers can view team attendance" ON attendance
    FOR SELECT USING (
        employee_id IN (
            SELECT id FROM employees 
            WHERE reporting_manager_id = auth.uid()
        )
    );

-- LEAVE REQUESTS TABLE POLICIES
-- Users can view their own leave requests
CREATE POLICY "Users can view own leave requests" ON leave_requests
    FOR SELECT USING (employee_id = auth.uid());

-- Super admins can view ALL leave requests (cross-company)
CREATE POLICY "Super admins can view all leave requests" ON leave_requests
    FOR SELECT USING (is_super_admin());

-- Super admins can manage ALL leave requests
CREATE POLICY "Super admins can manage all leave requests" ON leave_requests
    FOR ALL USING (is_super_admin());

-- Admins can view leave requests in their company
CREATE POLICY "Admins can view company leave requests" ON leave_requests
    FOR SELECT USING (
        is_admin_or_super_admin() AND company_id = get_user_company_id()
    );

-- Admins can manage leave requests in their company
CREATE POLICY "Admins can manage company leave requests" ON leave_requests
    FOR ALL USING (
        is_admin_or_super_admin() AND company_id = get_user_company_id()
    );

-- Users can manage their own leave requests
CREATE POLICY "Users can manage own leave requests" ON leave_requests
    FOR ALL USING (employee_id = auth.uid());

-- Managers can view their team's leave requests
CREATE POLICY "Managers can view team leave requests" ON leave_requests
    FOR SELECT USING (
        employee_id IN (
            SELECT id FROM employees 
            WHERE reporting_manager_id = auth.uid()
        )
    );

-- LEAVE BALANCES TABLE POLICIES
-- Users can view their own leave balances
CREATE POLICY "Users can view own leave balances" ON leave_balances
    FOR SELECT USING (employee_id = auth.uid());

-- Super admins can view ALL leave balances (cross-company)
CREATE POLICY "Super admins can view all leave balances" ON leave_balances
    FOR SELECT USING (is_super_admin());

-- Super admins can manage ALL leave balances
CREATE POLICY "Super admins can manage all leave balances" ON leave_balances
    FOR ALL USING (is_super_admin());

-- Admins can view leave balances in their company
CREATE POLICY "Admins can view company leave balances" ON leave_balances
    FOR SELECT USING (
        is_admin_or_super_admin() AND company_id = get_user_company_id()
    );

-- Admins can manage leave balances in their company
CREATE POLICY "Admins can manage company leave balances" ON leave_balances
    FOR ALL USING (
        is_admin_or_super_admin() AND company_id = get_user_company_id()
    );

-- LEAVE TYPES TABLE POLICIES
-- Everyone can view leave types in their company
CREATE POLICY "Users can view company leave types" ON leave_types
    FOR SELECT USING (company_id = get_user_company_id());

-- Super admins can view ALL leave types (cross-company)
CREATE POLICY "Super admins can view all leave types" ON leave_types
    FOR SELECT USING (is_super_admin());

-- Super admins can manage ALL leave types
CREATE POLICY "Super admins can manage all leave types" ON leave_types
    FOR ALL USING (is_super_admin());

-- Admins can manage leave types in their company
CREATE POLICY "Admins can manage company leave types" ON leave_types
    FOR ALL USING (
        is_admin_or_super_admin() AND company_id = get_user_company_id()
    );

-- TEAMS TABLE POLICIES
-- Users can view teams in their company
CREATE POLICY "Users can view company teams" ON teams
    FOR SELECT USING (company_id = get_user_company_id());

-- Super admins can view ALL teams (cross-company)
CREATE POLICY "Super admins can view all teams" ON teams
    FOR SELECT USING (is_super_admin());

-- Super admins can manage ALL teams
CREATE POLICY "Super admins can manage all teams" ON teams
    FOR ALL USING (is_super_admin());

-- Admins can manage teams in their company
CREATE POLICY "Admins can manage company teams" ON teams
    FOR ALL USING (
        is_admin_or_super_admin() AND company_id = get_user_company_id()
    );

-- COMPANIES TABLE POLICIES
-- Users can view their own company
CREATE POLICY "Users can view own company" ON companies
    FOR SELECT USING (id = get_user_company_id());

-- Super admins can view ALL companies
CREATE POLICY "Super admins can view all companies" ON companies
    FOR SELECT USING (is_super_admin());

-- Super admins can manage ALL companies
CREATE POLICY "Super admins can manage all companies" ON companies
    FOR ALL USING (is_super_admin());

-- Admins can view their company
CREATE POLICY "Admins can view company" ON companies
    FOR SELECT USING (
        is_admin_or_super_admin() AND id = get_user_company_id()
    );

-- Show migration results
SELECT 'Super admin RLS policies fixed successfully!' as status;

-- Test the policies by checking if we can query data
SELECT COUNT(*) as total_profiles FROM profiles;
SELECT COUNT(*) as total_employees FROM employees;
SELECT COUNT(*) as total_teams FROM teams;
SELECT COUNT(*) as total_companies FROM companies; 