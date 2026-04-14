-- =========================================================
-- ATTENDEDGE FULL DATABASE SYNC RESET + REBUILD
-- =========================================================


-- =========================================================
-- 1. DROP EXISTING TRIGGERS
-- =========================================================

DROP TRIGGER IF EXISTS trigger_employee_sync_profile ON employees;
DROP TRIGGER IF EXISTS trigger_employee_sync_profile_insert ON employees;
DROP TRIGGER IF EXISTS trigger_employee_sync_profile_update ON employees;
DROP TRIGGER IF EXISTS trigger_profile_sync_employee ON profiles;
DROP TRIGGER IF EXISTS trigger_employee_create_performance ON employees;
DROP TRIGGER IF EXISTS trigger_create_profile_on_signup ON auth.users;
DROP TRIGGER IF EXISTS set_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS set_employees_updated_at ON employees;


-- =========================================================
-- 2. DROP EXISTING FUNCTIONS
-- =========================================================

DROP FUNCTION IF EXISTS sync_employee_to_profile() CASCADE;
DROP FUNCTION IF EXISTS sync_profile_to_employee() CASCADE;
DROP FUNCTION IF EXISTS create_performance_record() CASCADE;
DROP FUNCTION IF EXISTS create_profile_from_auth() CASCADE;
DROP FUNCTION IF EXISTS update_timestamp() CASCADE;



-- =========================================================
-- 3. CREATE PROFILE WHEN USER SIGNS UP
-- =========================================================

CREATE OR REPLACE FUNCTION create_profile_from_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

    INSERT INTO profiles (
        id,
        email,
        name,
        role_id,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
        NULL,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;

END;
$$;


CREATE TRIGGER trigger_create_profile_on_signup
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION create_profile_from_auth();



-- =========================================================
-- 4. EMPLOYEE → PROFILE SYNC
-- =========================================================

CREATE OR REPLACE FUNCTION sync_employee_to_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

    IF pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF
            OLD.email IS NOT DISTINCT FROM NEW.email AND
            OLD.name IS NOT DISTINCT FROM NEW.name AND
            OLD.role_id IS NOT DISTINCT FROM NEW.role_id AND
            OLD.team_id IS NOT DISTINCT FROM NEW.team_id AND
            OLD.reporting_manager_id IS NOT DISTINCT FROM NEW.reporting_manager_id AND
            OLD.company_id IS NOT DISTINCT FROM NEW.company_id
        THEN
            RETURN NEW;
        END IF;
    END IF;

    BEGIN

        INSERT INTO profiles (
            id,
            email,
            name,
            role_id,
            team_id,
            reporting_manager_id,
            company_id,
            updated_at
        )
        VALUES (
            NEW.id,
            NEW.email,
            NEW.name,
            NEW.role_id,
            NEW.team_id,
            NEW.reporting_manager_id,
            NEW.company_id,
            NOW()
        )
        ON CONFLICT (id)
        DO UPDATE SET
            email = EXCLUDED.email,
            name = EXCLUDED.name,
            role_id = EXCLUDED.role_id,
            team_id = EXCLUDED.team_id,
            reporting_manager_id = EXCLUDED.reporting_manager_id,
            company_id = EXCLUDED.company_id,
            updated_at = NOW();

    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'Employee → Profile sync failed for %: %', NEW.id, SQLERRM;
    END;

    RETURN NEW;

END;
$$;


CREATE TRIGGER trigger_employee_sync_profile_insert
AFTER INSERT ON employees
FOR EACH ROW
EXECUTE FUNCTION sync_employee_to_profile();


CREATE TRIGGER trigger_employee_sync_profile_update
AFTER UPDATE OF email, name, role_id, team_id, reporting_manager_id, company_id
ON employees
FOR EACH ROW
WHEN (
    OLD.email IS DISTINCT FROM NEW.email OR
    OLD.name IS DISTINCT FROM NEW.name OR
    OLD.role_id IS DISTINCT FROM NEW.role_id OR
    OLD.team_id IS DISTINCT FROM NEW.team_id OR
    OLD.reporting_manager_id IS DISTINCT FROM NEW.reporting_manager_id OR
    OLD.company_id IS DISTINCT FROM NEW.company_id
)
EXECUTE FUNCTION sync_employee_to_profile();



-- =========================================================
-- 5. PROFILE → EMPLOYEE SYNC
-- =========================================================

CREATE OR REPLACE FUNCTION sync_profile_to_employee()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

    IF pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    BEGIN

        UPDATE employees
        SET
            role_id = NEW.role_id,
            team_id = NEW.team_id,
            reporting_manager_id = NEW.reporting_manager_id,
            company_id = NEW.company_id,
            updated_at = NOW()
        WHERE id = NEW.id;

    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'Profile → Employee sync failed for %: %', NEW.id, SQLERRM;
    END;

    RETURN NEW;

END;
$$;


CREATE TRIGGER trigger_profile_sync_employee
AFTER UPDATE OF role_id, team_id, reporting_manager_id, company_id
ON profiles
FOR EACH ROW
WHEN (
    OLD.role_id IS DISTINCT FROM NEW.role_id OR
    OLD.team_id IS DISTINCT FROM NEW.team_id OR
    OLD.reporting_manager_id IS DISTINCT FROM NEW.reporting_manager_id OR
    OLD.company_id IS DISTINCT FROM NEW.company_id
)
EXECUTE FUNCTION sync_profile_to_employee();



-- =========================================================
-- 6. AUTO CREATE PERFORMANCE RECORD (FIXED FOR user_id)
-- =========================================================

CREATE OR REPLACE FUNCTION create_performance_record()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

    BEGIN

        INSERT INTO performance_reports (
            user_id,
            team_id,
            company_id,
            report_date,
            created_at,
            updated_at
        )
        VALUES (
            NEW.id,
            NEW.team_id,
            NEW.company_id,
            CURRENT_DATE,
            NOW(),
            NOW()
        )
        ON CONFLICT DO NOTHING;

    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'Performance record creation failed for %: %', NEW.id, SQLERRM;
    END;

    RETURN NEW;

END;
$$;


CREATE TRIGGER trigger_employee_create_performance
AFTER INSERT ON employees
FOR EACH ROW
EXECUTE FUNCTION create_performance_record();



-- =========================================================
-- 7. AUTO UPDATE TIMESTAMP
-- =========================================================

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();


CREATE TRIGGER set_employees_updated_at
BEFORE UPDATE ON employees
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();



-- =========================================================
-- 8. PERFORMANCE INDEXES
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_profiles_team
ON profiles(team_id);

CREATE INDEX IF NOT EXISTS idx_profiles_company
ON profiles(company_id);

CREATE INDEX IF NOT EXISTS idx_employees_manager
ON employees(reporting_manager_id);

CREATE INDEX IF NOT EXISTS idx_employees_company
ON employees(company_id);



-- =========================================================
-- 9. STATUS CHECK
-- =========================================================

SELECT '=== ATTENDEDGE TRIGGERS STATUS ===' AS info;

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