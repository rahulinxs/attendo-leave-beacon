-- =========================================================
-- FIX AUTH USER CREATION - DISABLE RECURSIVE TRIGGER
-- =========================================================

-- Temporarily disable the trigger that causes recursion during auth user creation
ALTER TABLE profiles DISABLE TRIGGER trigger_profile_sync_employee;

-- =========================================================
-- TEST AUTH USER CREATION
-- =========================================================

-- Now test if auth user creation works without the recursive trigger
DO $$
DECLARE
    test_email TEXT := 'test-' || gen_random_uuid()::TEXT || '@example.com';
    test_password TEXT := 'testPassword123!';
    test_name TEXT := 'Test User';
BEGIN
    RAISE NOTICE '=== TESTING AUTH USER CREATION WITHOUT RECURSIVE TRIGGER ===';
    RAISE NOTICE '1. trigger_profile_sync_employee has been disabled';
    RAISE NOTICE '2. Try creating employee in UI now';
    RAISE NOTICE '3. If it works, we confirmed the recursion issue';
    RAISE NOTICE '4. If it still fails, there might be other issues';
    
    RAISE NOTICE '=== NEXT STEPS ===';
    RAISE NOTICE '1. Test employee creation in UI';
    RAISE NOTICE '2. If successful, we need to fix the trigger logic';
    RAISE NOTICE '3. If still failing, check for other recursive triggers';
    
END $$;

-- =========================================================
-- CURRENT TRIGGER STATUS
-- =========================================================

SELECT '=== CURRENT TRIGGER STATUS ===' as info;

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

SELECT '=== RECURSION FIX APPLIED ===' as info;
SELECT 'trigger_profile_sync_employee has been disabled' as fix;
SELECT 'This should allow auth user creation to work' as result;
SELECT 'Test employee creation in UI now' as next_step;
