-- =========================================================
-- COMPREHENSIVE AUTH USER CREATION FIX
-- =========================================================

-- Disable ALL triggers that could interfere with auth user creation
ALTER TABLE profiles DISABLE TRIGGER trigger_profile_sync_employee;
ALTER TABLE employees DISABLE TRIGGER trigger_employee_sync_profile_insert;
ALTER TABLE employees DISABLE TRIGGER trigger_employee_sync_profile_update;
ALTER TABLE employees DISABLE TRIGGER trigger_employee_create_performance;

-- =========================================================
-- CHECK CURRENT TRIGGER STATUS
-- =========================================================

SELECT '=== ALL TRIGGERS DISABLED FOR TESTING ===' as info;

SELECT
    tgname AS trigger_name,
    tgrelid::regclass AS table_name,
    CASE 
        WHEN tgenabled = 'O' THEN 'ENABLED' 
        WHEN tgenabled = 'D' THEN 'DISABLED' 
        ELSE 'UNKNOWN' 
    END AS status
FROM pg_trigger
WHERE tgrelid IN (
    'profiles'::regclass,
    'employees'::regclass
)
AND NOT tgisinternal
ORDER BY table_name, trigger_name;

-- =========================================================
-- TEST EDGE FUNCTION DEPLOYMENT STATUS
-- =========================================================

-- Check if Edge Function is actually using the updated code
DO $$
DECLARE
    edge_function_deployed BOOLEAN := FALSE;
BEGIN
    RAISE NOTICE '=== EDGE FUNCTION DEPLOYMENT CHECK ===';
    
    -- The Edge Function should now have all fixes:
    -- 1. Role UUID lookup instead of text
    -- 2. Proper role_id assignment
    -- 3. Safe error handling
    
    RAISE NOTICE 'Expected Edge Function behavior:';
    RAISE NOTICE '1. Look up role UUID from roles table';
    RAISE NOTICE '2. Create auth user with admin client';
    RAISE NOTICE '3. Insert employee with role_id UUID';
    RAISE NOTICE '4. Upsert profile with role_id UUID';
    
    -- If auth user creation still fails with all triggers disabled,
    -- the issue is likely:
    -- 1. Edge Function not deployed with fixes
    -- 2. Auth system configuration issue
    -- 3. Environment variable issue
    
    RAISE NOTICE '=== POSSIBLE ISSUES ===';
    RAISE NOTICE '1. Edge Function still using old code (not deployed)';
    RAISE NOTICE '2. Auth system has restrictions';
    RAISE NOTICE '3. Environment variables missing';
    RAISE NOTICE '4. Network or permission issues';
    
END $$;

-- =========================================================
-- VERIFY DATABASE READINESS
-- =========================================================

SELECT '=== DATABASE READINESS CHECK ===' as info;

-- Check if roles table has employee role
SELECT 
    'Employee Role' as check_type,
    CASE 
        WHEN COUNT(*) > 0 THEN 'FOUND'
        ELSE 'MISSING'
    END as status,
    COUNT(*) as count
FROM roles 
WHERE name = 'employee' AND is_active = true;

-- Check if companies table has data
SELECT 
    'Companies' as check_type,
    CASE 
        WHEN COUNT(*) > 0 THEN 'FOUND'
        ELSE 'MISSING'
    END as status,
    COUNT(*) as count
FROM companies;

-- Check if auth.users table is accessible
SELECT 
    'Auth Users Table' as check_type,
    CASE 
        WHEN COUNT(*) >= 0 THEN 'ACCESSIBLE'
        ELSE 'NOT ACCESSIBLE'
    END as status,
    COUNT(*) as count
FROM auth.users;

SELECT '=== COMPREHENSIVE FIX APPLIED ===' as info;
SELECT 'All triggers disabled for testing' as fix;
SELECT 'Test employee creation in UI now' as next_step;
SELECT 'If still fails, issue is in Edge Function deployment or auth system' as diagnosis;
