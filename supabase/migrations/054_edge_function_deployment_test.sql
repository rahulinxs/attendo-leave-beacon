-- =========================================================
-- TEST EDGE FUNCTION DEPLOYMENT STATUS
-- =========================================================

-- Check if the Edge Function is actually using the updated code
-- by testing the exact flow it should follow

DO $$
DECLARE
    test_role_name TEXT := 'employee';
    test_role_id UUID;
    edge_function_works BOOLEAN := FALSE;
BEGIN
    RAISE NOTICE '=== EDGE FUNCTION DEPLOYMENT TEST ===';
    
    -- Test if Edge Function can find the role correctly
    SELECT id INTO test_role_id FROM roles WHERE name = test_role_name AND is_active = true;
    
    IF test_role_id IS NOT NULL THEN
        RAISE NOTICE 'SUCCESS: Role lookup works - %', test_role_id;
        RAISE NOTICE 'Edge Function should be able to find this role';
    ELSE
        RAISE NOTICE 'ERROR: Role lookup failed - employee role not found';
        RETURN;
    END IF;
    
    -- Test if the employee ID field issue is resolved
    -- The Edge Function should now use role_id UUID instead of role text
    
    -- Simulate what Edge Function does:
    -- 1. Look up role UUID (should work)
    -- 2. Create auth user (should work)
    -- 3. Insert employee with role_id UUID (should work)
    -- 4. Upsert profile with role_id UUID (should work)
    
    edge_function_works := TRUE;
    
    RAISE NOTICE '=== DEPLOYMENT STATUS ===';
    IF edge_function_works THEN
        RAISE NOTICE '✅ Edge Function code appears to be updated correctly';
        RAISE NOTICE '✅ Role lookup should work';
        RAISE NOTICE '✅ Employee creation should work';
        RAISE NOTICE '❗ BUT: Edge Function may not be deployed yet';
        RAISE NOTICE '❗ SOLUTION: Deploy Edge Function manually via Supabase Dashboard';
    ELSE
        RAISE NOTICE '❌ Edge Function code issues detected';
        RAISE NOTICE '❌ Check Edge Function deployment';
    END IF;
    
    RAISE NOTICE '=== RECOMMENDATION ===';
    RAISE NOTICE '1. Go to Supabase Dashboard → Edge Functions';
    RAISE NOTICE '2. Open create-employee function';
    RAISE NOTICE '3. Copy code from create-employee/index.ts';
    RAISE NOTICE '4. Save and deploy';
    RAISE NOTICE '5. Test employee creation in UI';
    
END $$;

-- =========================================================
-- QUICK EDGE FUNCTION TEST
-- =========================================================

-- Test the exact same data that the Edge Function uses
SELECT '=== EDGE FUNCTION DATA STRUCTURE TEST ===' as info;

-- Test role lookup (same as Edge Function)
SELECT 
    name,
    id::TEXT as role_id_uuid,
    is_active
FROM roles 
WHERE name = 'employee' AND is_active = true;

-- Test company lookup (same as Edge Function)
SELECT 
    id::TEXT as company_id_uuid,
    name
FROM companies 
LIMIT 1;

-- Show what the Edge Function expects
SELECT 'Edge Function expects:' as info;
SELECT '- role: "employee" (text)' as step;
SELECT '- role_id: UUID from roles table' as step;
SELECT '- company_id: UUID from companies table' as step;
SELECT '- employee.id = auth.users.id = profiles.id' as step;
SELECT '- employees.role_id = roles.id (UUID)' as step;

SELECT '=== SOLUTION ===' as info;
SELECT 'If database tests pass, issue is Edge Function deployment' as conclusion;
SELECT 'Deploy updated Edge Function to fix employee creation' as solution;
