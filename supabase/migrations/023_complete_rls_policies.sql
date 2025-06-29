-- Migration: Complete RLS policies for ALL tables and ALL aspects
-- This migration ensures super admins can access ALL data across ALL companies and teams
-- Covers every table and every component in the application

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

CREATE OR REPLACE FUNCTION is_reporting_manager()
RETURNS BOOLEAN AS $$
SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'reporting_manager'
);
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================================================
-- PROFILES TABLE POLICIES
-- ============================================================================
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

-- ============================================================================
-- EMPLOYEES TABLE POLICIES (legacy table support)
-- ============================================================================
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

-- ============================================================================
-- COMPANIES TABLE POLICIES
-- ============================================================================
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

-- ============================================================================
-- TEAMS TABLE POLICIES
-- ============================================================================
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

-- ============================================================================
-- ATTENDANCE TABLE POLICIES
-- ============================================================================
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
            SELECT id FROM profiles 
            WHERE reporting_manager_id = auth.uid()
        )
    );

-- ============================================================================
-- LEAVE REQUESTS TABLE POLICIES
-- ============================================================================
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
            SELECT id FROM profiles 
            WHERE reporting_manager_id = auth.uid()
        )
    );

-- ============================================================================
-- LEAVE BALANCES TABLE POLICIES
-- ============================================================================
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

-- ============================================================================
-- LEAVE TYPES TABLE POLICIES
-- ============================================================================
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

-- ============================================================================
-- HOLIDAYS TABLE POLICIES
-- ============================================================================
-- Everyone can view holidays (global)
CREATE POLICY "Users can view holidays" ON holidays
    FOR SELECT USING (true);

-- Super admins can manage ALL holidays
CREATE POLICY "Super admins can manage all holidays" ON holidays
    FOR ALL USING (is_super_admin());

-- Admins can manage holidays
CREATE POLICY "Admins can manage holidays" ON holidays
    FOR ALL USING (is_admin_or_super_admin());

-- ============================================================================
-- SYSTEM SETTINGS TABLE POLICIES
-- ============================================================================
-- Everyone can view system settings (global)
CREATE POLICY "Users can view system settings" ON system_settings
    FOR SELECT USING (true);

-- Super admins can manage ALL system settings
CREATE POLICY "Super admins can manage all system settings" ON system_settings
    FOR ALL USING (is_super_admin());

-- Admins can manage system settings
CREATE POLICY "Admins can manage system settings" ON system_settings
    FOR ALL USING (is_admin_or_super_admin());

-- ============================================================================
-- DEPARTMENTS TABLE POLICIES
-- ============================================================================
-- Users can view departments in their company
CREATE POLICY "Users can view company departments" ON departments
    FOR SELECT USING (
        head_employee_id IN (
            SELECT id FROM profiles 
            WHERE company_id = get_user_company_id()
        )
    );

-- Super admins can view ALL departments (cross-company)
CREATE POLICY "Super admins can view all departments" ON departments
    FOR SELECT USING (is_super_admin());

-- Super admins can manage ALL departments
CREATE POLICY "Super admins can manage all departments" ON departments
    FOR ALL USING (is_super_admin());

-- Admins can manage departments in their company
CREATE POLICY "Admins can manage company departments" ON departments
    FOR ALL USING (
        is_admin_or_super_admin() AND 
        head_employee_id IN (
            SELECT id FROM profiles 
            WHERE company_id = get_user_company_id()
        )
    );

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- VERIFICATION AND TESTING
-- ============================================================================
-- Show migration results
SELECT 'Complete RLS policies applied successfully!' as status;

-- Test the policies by checking if we can query all tables
SELECT 
    'Table Access Summary' as info,
    'profiles' as table_name,
    COUNT(*) as accessible_records
FROM profiles
UNION ALL
SELECT 
    'employees' as table_name,
    COUNT(*) as accessible_records
FROM employees
UNION ALL
SELECT 
    'companies' as table_name,
    COUNT(*) as accessible_records
FROM companies
UNION ALL
SELECT 
    'teams' as table_name,
    COUNT(*) as accessible_records
FROM teams
UNION ALL
SELECT 
    'attendance' as table_name,
    COUNT(*) as accessible_records
FROM attendance
UNION ALL
SELECT 
    'leave_requests' as table_name,
    COUNT(*) as accessible_records
FROM leave_requests
UNION ALL
SELECT 
    'leave_balances' as table_name,
    COUNT(*) as accessible_records
FROM leave_balances
UNION ALL
SELECT 
    'leave_types' as table_name,
    COUNT(*) as accessible_records
FROM leave_types
UNION ALL
SELECT 
    'holidays' as table_name,
    COUNT(*) as accessible_records
FROM holidays
UNION ALL
SELECT 
    'system_settings' as table_name,
    COUNT(*) as accessible_records
FROM system_settings
UNION ALL
SELECT 
    'departments' as table_name,
    COUNT(*) as accessible_records
FROM departments;

-- Test helper functions
SELECT 
    'Helper Functions Test' as info,
    is_super_admin() as is_super_admin,
    is_admin_or_super_admin() as is_admin_or_super_admin,
    is_reporting_manager() as is_reporting_manager,
    get_user_company_id() as user_company_id;

-- List all created policies
SELECT 
    'Created Policies' as info,
    tablename,
    policyname,
    permissive,
    cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname; 