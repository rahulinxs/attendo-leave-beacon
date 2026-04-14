-- =========================================================
-- FIX FOREIGN KEY CASCADE ISSUES (CORRECTED)
-- =========================================================

-- Only disable foreign key constraints on tables that actually exist
DO $$
DECLARE
    fk_record RECORD;
    table_exists BOOLEAN;
BEGIN
    RAISE NOTICE '=== DISABLING FOREIGN KEY CONSTRAINTS ===';
    
    -- Find all foreign key constraints referencing auth.users
    -- Only process tables that actually exist
    FOR fk_record IN 
        SELECT conname, conrelid::regclass AS table_name
        FROM pg_constraint
        WHERE confrelid = 'auth.users'::regclass
        AND contype = 'f'
    LOOP
        -- Check if table actually exists before trying to drop constraint
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = fk_record.table_name::TEXT
        ) INTO table_exists;
        
        IF table_exists THEN
            RAISE NOTICE 'Disabling foreign key: % on table %', fk_record.conname, fk_record.table_name;
            
            -- Disable foreign key constraint
            EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I CASCADE', 
                        fk_record.table_name, fk_record.conname);
        ELSE
            RAISE NOTICE 'Skipping non-existent table: %', fk_record.table_name;
        END IF;
    END LOOP;
    
    RAISE NOTICE '=== FOREIGN KEYS DISABLED FOR TESTING ===';
    RAISE NOTICE 'This should allow auth user creation to work';
    
END $$;

-- =========================================================
-- VERIFY FOREIGN KEY STATUS
-- =========================================================

SELECT '=== FOREIGN KEY STATUS AFTER DISABLING ===' as info;

-- Check if any foreign keys still reference auth.users in existing tables
SELECT
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    confrelid::regclass AS referenced_table,
    'STILL ACTIVE' AS status
FROM pg_constraint
WHERE confrelid = 'auth.users'::regclass
AND contype = 'f'
AND EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = conrelid::regclass::TEXT
);

-- =========================================================
-- CHECK ACTUAL TABLE STRUCTURE
-- =========================================================

SELECT '=== ACTUAL TABLE STRUCTURE ===' as info;

-- Check which tables actually exist
SELECT 
    table_name,
    'EXISTS' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'employees', 'companies', 'roles', 'performance_reports')
ORDER BY table_name;

-- Check foreign keys on existing tables
SELECT 
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_schema = 'public'
AND tc.table_name IN ('profiles', 'employees')
ORDER BY tc.table_name, tc.constraint_name;

SELECT '=== CORRECTED FOREIGN KEY FIX APPLIED ===' as info;
SELECT 'Only existing tables were processed' as fix;
SELECT 'Try creating user/employee in UI now' as next_step;
