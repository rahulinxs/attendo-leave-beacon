-- =========================================================
-- AUTH SYSTEM DEEP DIVE
-- =========================================================

-- Check if there are any triggers on auth.users (this is the real culprit)
SELECT '=== AUTH.USERS TRIGGERS ===' as info;

SELECT
    tgname AS trigger_name,
    tgrelid::regclass AS table_name,
    CASE 
        WHEN tgenabled = 'O' THEN 'ENABLED' 
        WHEN tgenabled = 'D' THEN 'DISABLED' 
        ELSE 'UNKNOWN' 
    END AS status,
    tgfoid::regproc AS function_name
FROM pg_trigger
WHERE tgrelid = 'auth.users'::regclass
AND NOT tgisinternal
ORDER BY tgname;

-- Check if there are any constraints on auth.users
SELECT '=== AUTH.USERS CONSTRAINTS ===' as info;

SELECT
    conname AS constraint_name,
    contype AS constraint_type,
    CASE WHEN convalidated THEN 'VALIDATED' ELSE 'NOT VALIDATED' END AS status
FROM pg_constraint
WHERE conrelid = 'auth.users'::regclass
ORDER BY conname;

-- Check if there are any foreign keys referencing auth.users
SELECT '=== FOREIGN KEYS REFERENCING AUTH.USERS ===' as info;

SELECT
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    confrelid::regclass AS referenced_table,
    conkey AS columns,
    confkey AS referenced_columns
FROM pg_constraint
WHERE confrelid = 'auth.users'::regclass
AND contype = 'f'
ORDER BY conrelid::regclass;

-- =========================================================
-- CHECK FOR AUTH SYSTEM TRIGGERS
-- =========================================================

-- Look for any functions that might be called by auth.users triggers
SELECT '=== AUTH-RELATED FUNCTIONS ===' as info;

SELECT
    proname AS function_name,
    pronamespace::regnamespace AS schema_name,
    prosrc AS source_code_preview
FROM pg_proc
WHERE proname LIKE '%auth%' 
OR proname LIKE '%user%' 
OR proname LIKE '%profile%'
OR proname LIKE '%employee%'
ORDER BY proname
LIMIT 10;

SELECT '=== DIAGNOSIS ===' as info;
SELECT 'If triggers exist on auth.users, they are causing signup failures' as diagnosis;
SELECT 'If constraints exist on auth.users, they are blocking user creation' as diagnosis;
SELECT 'If foreign keys exist, they might be causing cascade issues' as diagnosis;
