-- =========================================================
-- CLEANUP REMAINING OLD TRIGGERS
-- =========================================================

-- Remove old triggers that weren't cleaned up properly
DROP TRIGGER IF EXISTS trigger_employee_team_change ON employees;
DROP TRIGGER IF EXISTS trigger_employee_team_sync ON employees;
DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;
DROP TRIGGER IF EXISTS sync_profile_to_employee ON profiles;

-- Remove old functions if they exist
DROP FUNCTION IF EXISTS sync_employee_team_change() CASCADE;
DROP FUNCTION IF EXISTS sync_employee_team_changes() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- =========================================================
-- VERIFY CLEANUP
-- =========================================================

SELECT '=== FINAL TRIGGER STATUS ===' AS info;

SELECT
    tgname AS trigger_name,
    tgrelid::regclass AS table_name,
    CASE
        WHEN tgenabled = 'O' THEN 'ENABLED'
        ELSE 'DISABLED'
    END AS status
FROM pg_trigger
WHERE tgrelid IN ('profiles'::regclass, 'employees'::regclass)
AND NOT tgisinternal
ORDER BY table_name, trigger_name;

SELECT '=== CLEANUP COMPLETE ===' AS info;
SELECT 'Employee creation should now work without conflicts' AS result;
