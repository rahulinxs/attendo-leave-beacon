-- Test script to verify RLS policies for super admin access
-- Run this in your Supabase SQL Editor after applying the migration

-- 1. Check current user's role and company
SELECT 
    'Current User Info' as info,
    auth.uid() as user_id,
    role,
    company_id,
    name
FROM profiles 
WHERE id = auth.uid();

-- 2. Test helper functions
SELECT 
    'Helper Functions' as info,
    is_super_admin() as is_super_admin,
    is_admin_or_super_admin() as is_admin_or_super_admin,
    get_user_company_id() as user_company_id;

-- 3. Test super admin access to all data
SELECT 
    'Super Admin Access Test' as info,
    (SELECT COUNT(*) FROM profiles) as total_profiles,
    (SELECT COUNT(*) FROM teams) as total_teams,
    (SELECT COUNT(*) FROM companies) as total_companies,
    (SELECT COUNT(*) FROM attendance) as total_attendance,
    (SELECT COUNT(*) FROM leave_requests) as total_leave_requests;

-- 4. Test company-specific access for non-super admins
SELECT 
    'Company-Specific Access Test' as info,
    COUNT(*) as profiles_in_company
FROM profiles 
WHERE company_id = get_user_company_id();

-- 5. Test team access
SELECT 
    'Team Access Test' as info,
    t.name as team_name,
    COUNT(p.id) as member_count
FROM teams t
LEFT JOIN profiles p ON t.id = p.team_id
WHERE t.company_id = get_user_company_id()
GROUP BY t.id, t.name
ORDER BY t.name;

-- 6. Test manager access to team members
SELECT 
    'Manager Team Access Test' as info,
    p.name as manager_name,
    COUNT(tm.id) as team_member_count
FROM profiles p
LEFT JOIN profiles tm ON p.id = tm.reporting_manager_id
WHERE p.role = 'reporting_manager'
GROUP BY p.id, p.name
ORDER BY p.name;

-- 7. List all RLS policies
SELECT 
    'Current RLS Policies' as info,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 8. Test specific table access
SELECT 
    'Table Access Summary' as info,
    'profiles' as table_name,
    COUNT(*) as accessible_records
FROM profiles
UNION ALL
SELECT 
    'teams' as table_name,
    COUNT(*) as accessible_records
FROM teams
UNION ALL
SELECT 
    'companies' as table_name,
    COUNT(*) as accessible_records
FROM companies
UNION ALL
SELECT 
    'attendance' as table_name,
    COUNT(*) as accessible_records
FROM attendance
UNION ALL
SELECT 
    'leave_requests' as table_name,
    COUNT(*) as accessible_records
FROM leave_requests; 