-- Only super_admin may create/update/delete super_admin employee records
-- (and related profile/document rows).

CREATE OR REPLACE FUNCTION public.enforce_super_admin_record_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_role text;
  target_id uuid;
  target_role text;
BEGIN
  SELECT e.role INTO actor_role
  FROM public.employees e
  WHERE e.id = auth.uid();

  IF TG_TABLE_NAME = 'employees' THEN
    IF actor_role IS DISTINCT FROM 'super_admin' THEN
      IF TG_OP = 'INSERT' AND NEW.role = 'super_admin' THEN
        RAISE EXCEPTION 'Only a Super Admin can create Super Admin employee records';
      END IF;
      IF TG_OP = 'UPDATE' AND OLD.role = 'super_admin' THEN
        RAISE EXCEPTION 'Only a Super Admin can edit Super Admin employee records';
      END IF;
      IF TG_OP = 'UPDATE' AND NEW.role = 'super_admin' AND OLD.role IS DISTINCT FROM 'super_admin' THEN
        RAISE EXCEPTION 'Only a Super Admin can assign the Super Admin role';
      END IF;
      IF TG_OP = 'DELETE' AND OLD.role = 'super_admin' THEN
        RAISE EXCEPTION 'Only a Super Admin can delete Super Admin employee records';
      END IF;
    END IF;
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    target_id := OLD.employee_id;
  ELSE
    target_id := NEW.employee_id;
  END IF;

  SELECT e.role INTO target_role
  FROM public.employees e
  WHERE e.id = target_id;

  IF target_role = 'super_admin' AND actor_role IS DISTINCT FROM 'super_admin' THEN
    RAISE EXCEPTION 'Only a Super Admin can edit Super Admin employee records';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_super_admin_employees ON public.employees;
CREATE TRIGGER trg_guard_super_admin_employees
  BEFORE INSERT OR UPDATE OR DELETE ON public.employees
  FOR EACH ROW
  EXECUTE PROCEDURE public.enforce_super_admin_record_guard();

DROP TRIGGER IF EXISTS trg_guard_super_admin_profiles ON public.employee_profiles;
CREATE TRIGGER trg_guard_super_admin_profiles
  BEFORE INSERT OR UPDATE OR DELETE ON public.employee_profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.enforce_super_admin_record_guard();

DROP TRIGGER IF EXISTS trg_guard_super_admin_documents ON public.employee_documents;
CREATE TRIGGER trg_guard_super_admin_documents
  BEFORE INSERT OR UPDATE OR DELETE ON public.employee_documents
  FOR EACH ROW
  EXECUTE PROCEDURE public.enforce_super_admin_record_guard();
