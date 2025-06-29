-- Migration: Safe Complete RLS policies for existing tables only
-- This migration ensures super admins can access ALL data across ALL companies and teams
-- Only applies policies to tables that actually exist in the database

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
-- PROFILES TABLE POLICIES (if table exists)
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        -- Users can view their own profile
        EXECUTE 'CREATE POLICY "Users can view own profile" ON profiles
            FOR SELECT USING (auth.uid()::text = id::text)';
        
        -- Users can update their own profile
        EXECUTE 'CREATE POLICY "Users can update own profile" ON profiles
            FOR UPDATE USING (auth.uid()::text = id::text)';
        
        -- Users can insert their own profile
        EXECUTE 'CREATE POLICY "Users can insert own profile" ON profiles
            FOR INSERT WITH CHECK (auth.uid()::text = id::text)';
        
        -- Super admins can view ALL profiles (cross-company)
        EXECUTE 'CREATE POLICY "Super admins can view all profiles" ON profiles
            FOR SELECT USING (is_super_admin())';
        
        -- Super admins can update ALL profiles
        EXECUTE 'CREATE POLICY "Super admins can update all profiles" ON profiles
            FOR UPDATE USING (is_super_admin())';
        
        -- Super admins can insert profiles
        EXECUTE 'CREATE POLICY "Super admins can insert profiles" ON profiles
            FOR INSERT WITH CHECK (is_super_admin())';
        
        -- Super admins can delete profiles
        EXECUTE 'CREATE POLICY "Super admins can delete profiles" ON profiles
            FOR DELETE USING (is_super_admin())';
        
        -- Admins can view profiles in their company
        EXECUTE 'CREATE POLICY "Admins can view company profiles" ON profiles
            FOR SELECT USING (
                is_admin_or_super_admin() AND company_id = get_user_company_id()
            )';
        
        -- Admins can update profiles in their company
        EXECUTE 'CREATE POLICY "Admins can update company profiles" ON profiles
            FOR UPDATE USING (
                is_admin_or_super_admin() AND company_id = get_user_company_id()
            )';
        
        -- Admins can insert profiles in their company
        EXECUTE 'CREATE POLICY "Admins can insert company profiles" ON profiles
            FOR INSERT WITH CHECK (
                is_admin_or_super_admin() AND company_id = get_user_company_id()
            )';
        
        -- Managers can view their team members
        EXECUTE 'CREATE POLICY "Managers can view team profiles" ON profiles
            FOR SELECT USING (
                reporting_manager_id = auth.uid()
            )';
        
        -- Enable RLS
        EXECUTE 'ALTER TABLE profiles ENABLE ROW LEVEL SECURITY';
        
        RAISE NOTICE 'Profiles table policies created successfully';
    ELSE
        RAISE NOTICE 'Profiles table does not exist, skipping policies';
    END IF;
END$$;

-- ============================================================================
-- EMPLOYEES TABLE POLICIES (if table exists)
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employees') THEN
        -- Users can view their own employee data
        EXECUTE 'CREATE POLICY "Users can view own employee data" ON employees
            FOR SELECT USING (auth.uid()::text = id::text)';
        
        -- Super admins can view ALL employees (cross-company)
        EXECUTE 'CREATE POLICY "Super admins can view all employees" ON employees
            FOR SELECT USING (is_super_admin())';
        
        -- Super admins can manage ALL employees
        EXECUTE 'CREATE POLICY "Super admins can manage all employees" ON employees
            FOR ALL USING (is_super_admin())';
        
        -- Admins can view employees in their company
        EXECUTE 'CREATE POLICY "Admins can view company employees" ON employees
            FOR SELECT USING (
                is_admin_or_super_admin() AND company_id = get_user_company_id()
            )';
        
        -- Admins can manage employees in their company
        EXECUTE 'CREATE POLICY "Admins can manage company employees" ON employees
            FOR ALL USING (
                is_admin_or_super_admin() AND company_id = get_user_company_id()
            )';
        
        -- Managers can view their team members
        EXECUTE 'CREATE POLICY "Managers can view team employees" ON employees
            FOR SELECT USING (
                reporting_manager_id = auth.uid() OR id = auth.uid()
            )';
        
        -- Enable RLS
        EXECUTE 'ALTER TABLE employees ENABLE ROW LEVEL SECURITY';
        
        RAISE NOTICE 'Employees table policies created successfully';
    ELSE
        RAISE NOTICE 'Employees table does not exist, skipping policies';
    END IF;
END$$;

-- ============================================================================
-- COMPANIES TABLE POLICIES (if table exists)
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies') THEN
        -- Users can view their own company
        EXECUTE 'CREATE POLICY "Users can view own company" ON companies
            FOR SELECT USING (id = get_user_company_id())';
        
        -- Super admins can view ALL companies
        EXECUTE 'CREATE POLICY "Super admins can view all companies" ON companies
            FOR SELECT USING (is_super_admin())';
        
        -- Super admins can manage ALL companies
        EXECUTE 'CREATE POLICY "Super admins can manage all companies" ON companies
            FOR ALL USING (is_super_admin())';
        
        -- Admins can view their company
        EXECUTE 'CREATE POLICY "Admins can view company" ON companies
            FOR SELECT USING (
                is_admin_or_super_admin() AND id = get_user_company_id()
            )';
        
        -- Enable RLS
        EXECUTE 'ALTER TABLE companies ENABLE ROW LEVEL SECURITY';
        
        RAISE NOTICE 'Companies table policies created successfully';
    ELSE
        RAISE NOTICE 'Companies table does not exist, skipping policies';
    END IF;
END$$;

-- ============================================================================
-- TEAMS TABLE POLICIES (if table exists)
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teams') THEN
        -- Users can view teams in their company
        EXECUTE 'CREATE POLICY "Users can view company teams" ON teams
            FOR SELECT USING (company_id = get_user_company_id())';
        
        -- Super admins can view ALL teams (cross-company)
        EXECUTE 'CREATE POLICY "Super admins can view all teams" ON teams
            FOR SELECT USING (is_super_admin())';
        
        -- Super admins can manage ALL teams
        EXECUTE 'CREATE POLICY "Super admins can manage all teams" ON teams
            FOR ALL USING (is_super_admin())';
        
        -- Admins can manage teams in their company
        EXECUTE 'CREATE POLICY "Admins can manage company teams" ON teams
            FOR ALL USING (
                is_admin_or_super_admin() AND company_id = get_user_company_id()
            )';
        
        -- Enable RLS
        EXECUTE 'ALTER TABLE teams ENABLE ROW LEVEL SECURITY';
        
        RAISE NOTICE 'Teams table policies created successfully';
    ELSE
        RAISE NOTICE 'Teams table does not exist, skipping policies';
    END IF;
END$$;

-- ============================================================================
-- ATTENDANCE TABLE POLICIES (if table exists)
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance') THEN
        -- Users can view their own attendance
        EXECUTE 'CREATE POLICY "Users can view own attendance" ON attendance
            FOR SELECT USING (employee_id = auth.uid())';
        
        -- Super admins can view ALL attendance (cross-company)
        EXECUTE 'CREATE POLICY "Super admins can view all attendance" ON attendance
            FOR SELECT USING (is_super_admin())';
        
        -- Super admins can manage ALL attendance
        EXECUTE 'CREATE POLICY "Super admins can manage all attendance" ON attendance
            FOR ALL USING (is_super_admin())';
        
        -- Admins can view attendance in their company
        EXECUTE 'CREATE POLICY "Admins can view company attendance" ON attendance
            FOR SELECT USING (
                is_admin_or_super_admin() AND company_id = get_user_company_id()
            )';
        
        -- Admins can manage attendance in their company
        EXECUTE 'CREATE POLICY "Admins can manage company attendance" ON attendance
            FOR ALL USING (
                is_admin_or_super_admin() AND company_id = get_user_company_id()
            )';
        
        -- Users can manage their own attendance
        EXECUTE 'CREATE POLICY "Users can manage own attendance" ON attendance
            FOR ALL USING (employee_id = auth.uid())';
        
        -- Managers can view their team''s attendance
        EXECUTE 'CREATE POLICY "Managers can view team attendance" ON attendance
            FOR SELECT USING (
                employee_id IN (
                    SELECT id FROM profiles 
                    WHERE reporting_manager_id = auth.uid()
                )
            )';
        
        -- Enable RLS
        EXECUTE 'ALTER TABLE attendance ENABLE ROW LEVEL SECURITY';
        
        RAISE NOTICE 'Attendance table policies created successfully';
    ELSE
        RAISE NOTICE 'Attendance table does not exist, skipping policies';
    END IF;
END$$;

-- ============================================================================
-- LEAVE REQUESTS TABLE POLICIES (if table exists)
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leave_requests') THEN
        -- Users can view their own leave requests
        EXECUTE 'CREATE POLICY "Users can view own leave requests" ON leave_requests
            FOR SELECT USING (employee_id = auth.uid())';
        
        -- Super admins can view ALL leave requests (cross-company)
        EXECUTE 'CREATE POLICY "Super admins can view all leave requests" ON leave_requests
            FOR SELECT USING (is_super_admin())';
        
        -- Super admins can manage ALL leave requests
        EXECUTE 'CREATE POLICY "Super admins can manage all leave requests" ON leave_requests
            FOR ALL USING (is_super_admin())';
        
        -- Admins can view leave requests in their company
        EXECUTE 'CREATE POLICY "Admins can view company leave requests" ON leave_requests
            FOR SELECT USING (
                is_admin_or_super_admin() AND company_id = get_user_company_id()
            )';
        
        -- Admins can manage leave requests in their company
        EXECUTE 'CREATE POLICY "Admins can manage company leave requests" ON leave_requests
            FOR ALL USING (
                is_admin_or_super_admin() AND company_id = get_user_company_id()
            )';
        
        -- Users can manage their own leave requests
        EXECUTE 'CREATE POLICY "Users can manage own leave requests" ON leave_requests
            FOR ALL USING (employee_id = auth.uid())';
        
        -- Managers can view their team''s leave requests
        EXECUTE 'CREATE POLICY "Managers can view team leave requests" ON leave_requests
            FOR SELECT USING (
                employee_id IN (
                    SELECT id FROM profiles 
                    WHERE reporting_manager_id = auth.uid()
                )
            )';
        
        -- Enable RLS
        EXECUTE 'ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY';
        
        RAISE NOTICE 'Leave requests table policies created successfully';
    ELSE
        RAISE NOTICE 'Leave requests table does not exist, skipping policies';
    END IF;
END$$;

-- ============================================================================
-- LEAVE BALANCES TABLE POLICIES (if table exists)
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leave_balances') THEN
        -- Users can view their own leave balances
        EXECUTE 'CREATE POLICY "Users can view own leave balances" ON leave_balances
            FOR SELECT USING (employee_id = auth.uid())';
        
        -- Super admins can view ALL leave balances (cross-company)
        EXECUTE 'CREATE POLICY "Super admins can view all leave balances" ON leave_balances
            FOR SELECT USING (is_super_admin())';
        
        -- Super admins can manage ALL leave balances
        EXECUTE 'CREATE POLICY "Super admins can manage all leave balances" ON leave_balances
            FOR ALL USING (is_super_admin())';
        
        -- Admins can view leave balances in their company
        EXECUTE 'CREATE POLICY "Admins can view company leave balances" ON leave_balances
            FOR SELECT USING (
                is_admin_or_super_admin() AND company_id = get_user_company_id()
            )';
        
        -- Admins can manage leave balances in their company
        EXECUTE 'CREATE POLICY "Admins can manage company leave balances" ON leave_balances
            FOR ALL USING (
                is_admin_or_super_admin() AND company_id = get_user_company_id()
            )';
        
        -- Enable RLS
        EXECUTE 'ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY';
        
        RAISE NOTICE 'Leave balances table policies created successfully';
    ELSE
        RAISE NOTICE 'Leave balances table does not exist, skipping policies';
    END IF;
END$$;

-- ============================================================================
-- LEAVE TYPES TABLE POLICIES (if table exists)
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leave_types') THEN
        -- Everyone can view leave types in their company
        EXECUTE 'CREATE POLICY "Users can view company leave types" ON leave_types
            FOR SELECT USING (company_id = get_user_company_id())';
        
        -- Super admins can view ALL leave types (cross-company)
        EXECUTE 'CREATE POLICY "Super admins can view all leave types" ON leave_types
            FOR SELECT USING (is_super_admin())';
        
        -- Super admins can manage ALL leave types
        EXECUTE 'CREATE POLICY "Super admins can manage all leave types" ON leave_types
            FOR ALL USING (is_super_admin())';
        
        -- Admins can manage leave types in their company
        EXECUTE 'CREATE POLICY "Admins can manage company leave types" ON leave_types
            FOR ALL USING (
                is_admin_or_super_admin() AND company_id = get_user_company_id()
            )';
        
        -- Enable RLS
        EXECUTE 'ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY';
        
        RAISE NOTICE 'Leave types table policies created successfully';
    ELSE
        RAISE NOTICE 'Leave types table does not exist, skipping policies';
    END IF;
END$$;

-- ============================================================================
-- HOLIDAYS TABLE POLICIES (if table exists)
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'holidays') THEN
        -- Everyone can view holidays (global)
        EXECUTE 'CREATE POLICY "Users can view holidays" ON holidays
            FOR SELECT USING (true)';
        
        -- Super admins can manage ALL holidays
        EXECUTE 'CREATE POLICY "Super admins can manage all holidays" ON holidays
            FOR ALL USING (is_super_admin())';
        
        -- Admins can manage holidays
        EXECUTE 'CREATE POLICY "Admins can manage holidays" ON holidays
            FOR ALL USING (is_admin_or_super_admin())';
        
        -- Enable RLS
        EXECUTE 'ALTER TABLE holidays ENABLE ROW LEVEL SECURITY';
        
        RAISE NOTICE 'Holidays table policies created successfully';
    ELSE
        RAISE NOTICE 'Holidays table does not exist, skipping policies';
    END IF;
END$$;

-- ============================================================================
-- SYSTEM SETTINGS TABLE POLICIES (if table exists)
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_settings') THEN
        -- Everyone can view system settings (global)
        EXECUTE 'CREATE POLICY "Users can view system settings" ON system_settings
            FOR SELECT USING (true)';
        
        -- Super admins can manage ALL system settings
        EXECUTE 'CREATE POLICY "Super admins can manage all system settings" ON system_settings
            FOR ALL USING (is_super_admin())';
        
        -- Admins can manage system settings
        EXECUTE 'CREATE POLICY "Admins can manage system settings" ON system_settings
            FOR ALL USING (is_admin_or_super_admin())';
        
        -- Enable RLS
        EXECUTE 'ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY';
        
        RAISE NOTICE 'System settings table policies created successfully';
    ELSE
        RAISE NOTICE 'System settings table does not exist, skipping policies';
    END IF;
END$$;

-- ============================================================================
-- DEPARTMENTS TABLE POLICIES (if table exists)
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'departments') THEN
        -- Users can view departments in their company
        EXECUTE 'CREATE POLICY "Users can view company departments" ON departments
            FOR SELECT USING (
                head_employee_id IN (
                    SELECT id FROM profiles 
                    WHERE company_id = get_user_company_id()
                )
            )';
        
        -- Super admins can view ALL departments (cross-company)
        EXECUTE 'CREATE POLICY "Super admins can view all departments" ON departments
            FOR SELECT USING (is_super_admin())';
        
        -- Super admins can manage ALL departments
        EXECUTE 'CREATE POLICY "Super admins can manage all departments" ON departments
            FOR ALL USING (is_super_admin())';
        
        -- Admins can manage departments in their company
        EXECUTE 'CREATE POLICY "Admins can manage company departments" ON departments
            FOR ALL USING (
                is_admin_or_super_admin() AND 
                head_employee_id IN (
                    SELECT id FROM profiles 
                    WHERE company_id = get_user_company_id()
                )
            )';
        
        -- Enable RLS
        EXECUTE 'ALTER TABLE departments ENABLE ROW LEVEL SECURITY';
        
        RAISE NOTICE 'Departments table policies created successfully';
    ELSE
        RAISE NOTICE 'Departments table does not exist, skipping policies';
    END IF;
END$$;

-- ============================================================================
-- VERIFICATION AND TESTING
-- ============================================================================
-- Show migration results
SELECT 'Safe RLS policies applied successfully!' as status;

-- Show which tables exist and have policies
SELECT 
    'Table Status' as info,
    t.table_name,
    CASE 
        WHEN p.policy_count > 0 THEN '✅ Has policies'
        ELSE '❌ No policies'
    END as policy_status,
    p.policy_count
FROM information_schema.tables t
LEFT JOIN (
    SELECT tablename, COUNT(*) as policy_count 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    GROUP BY tablename
) p ON t.table_name = p.tablename
WHERE t.table_schema = 'public' 
AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name;

-- Test helper functions
SELECT 
    'Helper Functions Test' as info,
    is_super_admin() as is_super_admin,
    is_admin_or_super_admin() as is_admin_or_super_admin,
    is_reporting_manager() as is_reporting_manager,
    get_user_company_id() as user_company_id; 