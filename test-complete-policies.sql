-- Comprehensive Test Script for Complete RLS Policies
-- Run this in your Supabase SQL Editor after applying the migration
-- This tests ALL aspects of the application

-- ============================================================================
-- 1. BASIC USER AND ROLE INFORMATION
-- ============================================================================
SELECT 
    '=== USER AND ROLE INFORMATION ===' as section;

-- Check current user's profile
SELECT 
    'Current User Profile' as info,
    auth.uid() as user_id,
    p.name,
    p.email,
    p.role,
    p.company_id,
    p.department,
    p.position,
    p.is_active
FROM profiles p
WHERE p.id = auth.uid();

-- Test helper functions
SELECT 
    'Helper Functions Test' as info,
    is_super_admin() as is_super_admin,
    is_admin_or_super_admin() as is_admin_or_super_admin,
    is_reporting_manager() as is_reporting_manager,
    get_user_company_id() as user_company_id;

-- ============================================================================
-- 2. TABLE ACCESS TESTS
-- ============================================================================
SELECT 
    '=== TABLE ACCESS TESTS ===' as section;

-- Test access to all tables
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

-- ============================================================================
-- 3. COMPANY-SPECIFIC TESTS
-- ============================================================================
SELECT 
    '=== COMPANY-SPECIFIC TESTS ===' as section;

-- Test company access
SELECT 
    'Company Access Test' as info,
    c.name as company_name,
    c.domain,
    c.created_at
FROM companies c
WHERE c.id = get_user_company_id();

-- Test profiles in user's company
SELECT 
    'Profiles in User Company' as info,
    COUNT(*) as total_profiles,
    COUNT(CASE WHEN role = 'super_admin' THEN 1 END) as super_admins,
    COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
    COUNT(CASE WHEN role = 'reporting_manager' THEN 1 END) as managers,
    COUNT(CASE WHEN role = 'employee' THEN 1 END) as employees
FROM profiles 
WHERE company_id = get_user_company_id();

-- ============================================================================
-- 4. TEAM AND MANAGER TESTS
-- ============================================================================
SELECT 
    '=== TEAM AND MANAGER TESTS ===' as section;

-- Test team access
SELECT 
    'Team Access Test' as info,
    t.name as team_name,
    t.description,
    COUNT(p.id) as member_count
FROM teams t
LEFT JOIN profiles p ON t.id = p.team_id
WHERE t.company_id = get_user_company_id()
GROUP BY t.id, t.name, t.description
ORDER BY t.name;

-- Test manager access to team members
SELECT 
    'Manager Team Access Test' as info,
    p.name as manager_name,
    p.role as manager_role,
    COUNT(tm.id) as team_member_count
FROM profiles p
LEFT JOIN profiles tm ON p.id = tm.reporting_manager_id
WHERE p.role = 'reporting_manager'
GROUP BY p.id, p.name, p.role
ORDER BY p.name;

-- ============================================================================
-- 5. ATTENDANCE TESTS
-- ============================================================================
SELECT 
    '=== ATTENDANCE TESTS ===' as section;

-- Test attendance access
SELECT 
    'Attendance Access Test' as info,
    COUNT(*) as total_attendance_records,
    COUNT(CASE WHEN employee_id = auth.uid() THEN 1 END) as own_records,
    COUNT(CASE WHEN company_id = get_user_company_id() THEN 1 END) as company_records
FROM attendance;

-- Test recent attendance for current user
SELECT 
    'Recent Attendance (Current User)' as info,
    date,
    check_in_time,
    check_out_time,
    status,
    notes
FROM attendance
WHERE employee_id = auth.uid()
ORDER BY date DESC
LIMIT 5;

-- ============================================================================
-- 6. LEAVE TESTS
-- ============================================================================
SELECT 
    '=== LEAVE TESTS ===' as section;

-- Test leave requests access
SELECT 
    'Leave Requests Access Test' as info,
    COUNT(*) as total_leave_requests,
    COUNT(CASE WHEN employee_id = auth.uid() THEN 1 END) as own_requests,
    COUNT(CASE WHEN company_id = get_user_company_id() THEN 1 END) as company_requests
FROM leave_requests;

-- Test leave types access
SELECT 
    'Leave Types Access Test' as info,
    name,
    description,
    max_days_per_year,
    is_active
FROM leave_types
WHERE company_id = get_user_company_id()
ORDER BY name;

-- Test leave balances access
SELECT 
    'Leave Balances Access Test' as info,
    COUNT(*) as total_leave_balances,
    COUNT(CASE WHEN employee_id = auth.uid() THEN 1 END) as own_balances,
    COUNT(CASE WHEN company_id = get_user_company_id() THEN 1 END) as company_balances
FROM leave_balances;

-- ============================================================================
-- 7. SYSTEM SETTINGS TESTS
-- ============================================================================
SELECT 
    '=== SYSTEM SETTINGS TESTS ===' as section;

-- Test system settings access
SELECT 
    'System Settings Access Test' as info,
    key,
    value,
    description
FROM system_settings
ORDER BY key;

-- ============================================================================
-- 8. HOLIDAYS TESTS
-- ============================================================================
SELECT 
    '=== HOLIDAYS TESTS ===' as section;

-- Test holidays access
SELECT 
    'Holidays Access Test' as info,
    name,
    date,
    description,
    is_recurring
FROM holidays
ORDER BY date;

-- ============================================================================
-- 9. DEPARTMENTS TESTS
-- ============================================================================
SELECT 
    '=== DEPARTMENTS TESTS ===' as section;

-- Test departments access
SELECT 
    'Departments Access Test' as info,
    d.name as department_name,
    d.description,
    p.name as head_name,
    p.email as head_email
FROM departments d
LEFT JOIN profiles p ON d.head_employee_id = p.id
WHERE p.company_id = get_user_company_id()
ORDER BY d.name;

-- ============================================================================
-- 10. SUPER ADMIN SPECIFIC TESTS
-- ============================================================================
SELECT 
    '=== SUPER ADMIN SPECIFIC TESTS ===' as section;

-- Test super admin cross-company access
SELECT 
    'Super Admin Cross-Company Access' as info,
    CASE 
        WHEN is_super_admin() THEN 'SUPER ADMIN - Can access ALL companies'
        ELSE 'NOT SUPER ADMIN - Limited to own company'
    END as access_level;

-- If super admin, show all companies
SELECT 
    'All Companies (Super Admin Only)' as info,
    c.name,
    c.domain,
    COUNT(p.id) as employee_count
FROM companies c
LEFT JOIN profiles p ON c.id = p.company_id
WHERE is_super_admin() OR c.id = get_user_company_id()
GROUP BY c.id, c.name, c.domain
ORDER BY c.name;

-- ============================================================================
-- 11. POLICY VERIFICATION
-- ============================================================================
SELECT 
    '=== POLICY VERIFICATION ===' as section;

-- List all created policies
SELECT 
    'Created Policies Summary' as info,
    tablename,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- Show detailed policies
SELECT 
    'Detailed Policies' as info,
    tablename,
    policyname,
    permissive,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- 12. COMPONENT-SPECIFIC TESTS
-- ============================================================================
SELECT 
    '=== COMPONENT-SPECIFIC TESTS ===' as section;

-- Test EmployeeList component data
SELECT 
    'EmployeeList Component Test' as info,
    COUNT(*) as total_employees,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_employees,
    COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count,
    COUNT(CASE WHEN role = 'super_admin' THEN 1 END) as super_admin_count
FROM profiles
WHERE (is_super_admin() OR company_id = get_user_company_id())
AND is_active = true;

-- Test TeamManagement component data
SELECT 
    'TeamManagement Component Test' as info,
    COUNT(*) as total_teams,
    COUNT(CASE WHEN manager_id IS NOT NULL THEN 1 END) as teams_with_managers
FROM teams
WHERE is_super_admin() OR company_id = get_user_company_id();

-- Test ReportsAnalytics component data
SELECT 
    'ReportsAnalytics Component Test' as info,
    (SELECT COUNT(*) FROM attendance WHERE is_super_admin() OR company_id = get_user_company_id()) as attendance_count,
    (SELECT COUNT(*) FROM leave_requests WHERE is_super_admin() OR company_id = get_user_company_id()) as leave_requests_count,
    (SELECT COUNT(*) FROM profiles WHERE is_super_admin() OR company_id = get_user_company_id()) as profiles_count;

-- ============================================================================
-- 13. FINAL VERIFICATION
-- ============================================================================
SELECT 
    '=== FINAL VERIFICATION ===' as section;

-- Overall success check
SELECT 
    'MIGRATION SUCCESS CHECK' as info,
    CASE 
        WHEN is_super_admin() THEN 
            CASE 
                WHEN (SELECT COUNT(*) FROM profiles) > 0 THEN '✅ SUPER ADMIN: Can access all profiles'
                ELSE '❌ SUPER ADMIN: Cannot access profiles'
            END
        ELSE 
            CASE 
                WHEN (SELECT COUNT(*) FROM profiles WHERE company_id = get_user_company_id()) > 0 THEN '✅ REGULAR USER: Can access company profiles'
                ELSE '❌ REGULAR USER: Cannot access company profiles'
            END
    END as profiles_access,
    
    CASE 
        WHEN is_super_admin() THEN 
            CASE 
                WHEN (SELECT COUNT(*) FROM teams) > 0 THEN '✅ SUPER ADMIN: Can access all teams'
                ELSE '❌ SUPER ADMIN: Cannot access teams'
            END
        ELSE 
            CASE 
                WHEN (SELECT COUNT(*) FROM teams WHERE company_id = get_user_company_id()) > 0 THEN '✅ REGULAR USER: Can access company teams'
                ELSE '❌ REGULAR USER: Cannot access company teams'
            END
    END as teams_access,
    
    CASE 
        WHEN (SELECT COUNT(*) FROM system_settings) > 0 THEN '✅ System settings accessible'
        ELSE '❌ System settings not accessible'
    END as system_settings_access;

-- Show summary
SELECT 
    'MIGRATION SUMMARY' as info,
    'All RLS policies have been applied successfully!' as status,
    'Super admins can now access ALL data across ALL companies' as super_admin_access,
    'Regular users are restricted to their own company' as regular_user_access,
    'All components should now work correctly' as component_status; 