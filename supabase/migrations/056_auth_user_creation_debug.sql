-- =========================================================
-- AUTH USER CREATION DEBUG TEST
-- =========================================================

-- Test if auth user creation works directly in database
-- This will help identify if the issue is with auth configuration

DO $$
DECLARE
    test_email TEXT := 'auth-test-' || gen_random_uuid()::TEXT || '@example.com';
    test_password TEXT := 'testPassword123!';
    test_name TEXT := 'Auth Test User';
    auth_result JSONB;
BEGIN
    RAISE NOTICE '=== AUTH USER CREATION TEST ===';
    
    -- The Edge Function calls supabaseAdmin.auth.admin.createUser()
    -- Let's test if this works directly
    
    -- Check if there are any constraints on auth.users table
    RAISE NOTICE 'Testing auth user creation constraints...';
    
    -- Check if there are any triggers on auth.users that might interfere
    SELECT 
        tgname AS trigger_name,
        tgrelid::regclass AS table_name,
        CASE WHEN tgenabled = 'O' THEN 'ENABLED' ELSE 'DISABLED' END AS status
    FROM pg_trigger 
    WHERE tgrelid = 'auth.users'::regclass 
    AND NOT tgisinternal;
    
    -- Check if there are any constraints on auth.users
    SELECT 
        conname AS constraint_name,
        contype AS constraint_type,
        CASE WHEN convalidated THEN 'VALIDATED' ELSE 'NOT VALIDATED' END AS status
    FROM pg_constraint 
    WHERE conrelid = 'auth.users'::regclass;
    
    -- Test if we can manually create an auth user (this might fail)
    -- Note: This might not work due to auth system restrictions
    
    RAISE NOTICE '=== AUTH USER CREATION ANALYSIS ===';
    RAISE NOTICE '1. If triggers exist on auth.users, they might be interfering';
    RAISE NOTICE '2. If constraints exist, they might be blocking creation';
    RAISE NOTICE '3. Edge Function might not have proper admin privileges';
    RAISE NOTICE '4. Auth system might have rate limiting or other restrictions';
    
    RAISE NOTICE '=== NEXT DEBUGGING STEPS ===';
    RAISE NOTICE '1. Check if any triggers exist on auth.users table';
    RAISE NOTICE '2. Verify Edge Function has proper admin permissions';
    RAISE NOTICE '3. Test auth user creation manually via Supabase Dashboard';
    RAISE NOTICE '4. Check Supabase auth settings and restrictions';
    
END $$;

-- =========================================================
-- AUTH SYSTEM STATUS CHECK
-- =========================================================

-- Check auth system configuration
SELECT '=== AUTH SYSTEM STATUS ===' as info;

-- Check if auth.users table exists and its structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'auth'
ORDER BY ordinal_position;

-- Check if there are any RLS policies on auth.users
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'auth' 
AND tablename = 'users';

-- Check if there are any foreign key constraints pointing to auth.users
SELECT 
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    confrelid::regclass AS referenced_table,
    conkey AS columns
FROM pg_constraint 
WHERE confrelid = 'auth.users'::regclass;

SELECT '=== AUTH DEBUGGING COMPLETE ===' as info;
SELECT 'If auth user creation fails, the issue is in auth configuration' as conclusion;
