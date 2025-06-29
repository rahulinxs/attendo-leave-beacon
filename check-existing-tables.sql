-- Check what tables actually exist in your database
-- Run this first to see what tables you have

SELECT 
    '=== EXISTING TABLES IN DATABASE ===' as info;

-- List all tables in the public schema
SELECT 
    table_name,
    table_type,
    CASE 
        WHEN table_name IN ('profiles', 'employees', 'companies', 'teams', 'attendance', 
                           'leave_requests', 'leave_balances', 'leave_types', 'holidays', 
                           'system_settings', 'departments') THEN '✅ Expected table'
        ELSE '❓ Unexpected table'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Check which tables have RLS enabled
SELECT 
    '=== RLS STATUS ===' as info;

SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check existing policies
SELECT 
    '=== EXISTING POLICIES ===' as info;

SELECT 
    tablename,
    policyname,
    permissive,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Test basic queries to see what works
SELECT 
    '=== BASIC QUERY TESTS ===' as info;

-- Test profiles table
SELECT 
    'Profiles table test' as test_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') 
        THEN (SELECT COUNT(*) FROM profiles)::text
        ELSE 'Table does not exist'
    END as result;

-- Test employees table
SELECT 
    'Employees table test' as test_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employees') 
        THEN (SELECT COUNT(*) FROM employees)::text
        ELSE 'Table does not exist'
    END as result;

-- Test companies table
SELECT 
    'Companies table test' as test_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies') 
        THEN (SELECT COUNT(*) FROM companies)::text
        ELSE 'Table does not exist'
    END as result;

-- Test teams table
SELECT 
    'Teams table test' as test_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teams') 
        THEN (SELECT COUNT(*) FROM teams)::text
        ELSE 'Table does not exist'
    END as result;

-- Test attendance table
SELECT 
    'Attendance table test' as test_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance') 
        THEN (SELECT COUNT(*) FROM attendance)::text
        ELSE 'Table does not exist'
    END as result;

-- Test system_settings table
SELECT 
    'System settings table test' as test_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_settings') 
        THEN (SELECT COUNT(*) FROM system_settings)::text
        ELSE 'Table does not exist'
    END as result;

-- Test holidays table
SELECT 
    'Holidays table test' as test_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'holidays') 
        THEN (SELECT COUNT(*) FROM holidays)::text
        ELSE 'Table does not exist'
    END as result;

-- Test departments table
SELECT 
    'Departments table test' as test_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'departments') 
        THEN (SELECT COUNT(*) FROM departments)::text
        ELSE 'Table does not exist'
    END as result; 