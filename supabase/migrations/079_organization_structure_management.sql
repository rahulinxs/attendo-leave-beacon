-- Super Admin-only organization structure management and audit trail.
-- Uses existing employees relationships; no duplicate hierarchy table is introduced.

CREATE TABLE IF NOT EXISTS public.organization_structure_audit (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  previous_reporting_manager_id uuid NULL,
  new_reporting_manager_id uuid NULL,
  previous_department text NULL,
  new_department text NULL,
  previous_team_id uuid NULL,
  new_team_id uuid NULL,
  previous_position text NULL,
  new_position text NULL,
  changed_by uuid NOT NULL REFERENCES public.profiles(id),
  change_type text NOT NULL DEFAULT 'structure_update',
  changed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.organization_structure_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can view organization structure audit" ON public.organization_structure_audit;
CREATE POLICY "Super admins can view organization structure audit"
  ON public.organization_structure_audit FOR SELECT
  USING (public.is_super_admin() AND company_id = public.get_user_company_id());

CREATE OR REPLACE FUNCTION public.update_organization_structure(
  p_employee_id uuid,
  p_company_id uuid,
  p_reporting_manager_id uuid DEFAULT NULL,
  p_team_id uuid DEFAULT NULL,
  p_department text DEFAULT NULL,
  p_position text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target public.employees%ROWTYPE;
  manager_id uuid;
  manager_parent_id uuid;
  previous_manager uuid;
  previous_team uuid;
  previous_department text;
  previous_position text;
  ancestor uuid;
  visited uuid[] := ARRAY[p_employee_id];
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only Super Admin can manage organization structure';
  END IF;

  SELECT e.id, e.email, e.name, e.role, e.department, e.position, e.hire_date, e.is_active, e.created_at, e.updated_at, e.company_id, e.reporting_manager_id, e.role_id, e.team_id, e.avatar_url, e.work_location
    INTO target
    FROM public.employees AS e
    WHERE e.id = p_employee_id AND e.company_id = p_company_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Employee does not belong to the selected company'; END IF;

  IF p_reporting_manager_id IS NOT NULL THEN
    SELECT e.id, e.reporting_manager_id INTO manager_id, manager_parent_id
      FROM public.employees AS e
      WHERE e.id = p_reporting_manager_id AND e.company_id = p_company_id AND e.is_active = true;
    IF NOT FOUND THEN RAISE EXCEPTION 'Reporting manager must be an active employee in the same company'; END IF;
    IF manager_id = p_employee_id THEN RAISE EXCEPTION 'Employee cannot report to themselves'; END IF;

    ancestor := manager_parent_id;
    WHILE ancestor IS NOT NULL LOOP
      IF ancestor = p_employee_id THEN RAISE EXCEPTION 'Circular reporting relationship detected'; END IF;
      IF ancestor = ANY(visited) THEN EXIT; END IF;
      visited := array_append(visited, ancestor);
      SELECT reporting_manager_id INTO ancestor FROM public.employees
        WHERE id = ancestor AND company_id = p_company_id;
    END LOOP;
  END IF;

  previous_manager := target.reporting_manager_id;
  previous_team := target.team_id;
  previous_department := target.department;
  previous_position := target.position;

  UPDATE public.employees
  SET reporting_manager_id = p_reporting_manager_id,
      team_id = p_team_id,
      department = p_department,
      position = p_position
  WHERE id = p_employee_id AND company_id = p_company_id
  RETURNING id, email, name, role, department, position, hire_date, is_active, created_at, updated_at, company_id, reporting_manager_id, role_id, team_id, avatar_url, work_location
  INTO target;

  INSERT INTO public.organization_structure_audit (
    company_id, employee_id, previous_reporting_manager_id, new_reporting_manager_id,
    previous_department, new_department, previous_team_id, new_team_id,
    previous_position, new_position, changed_by, change_type
  ) VALUES (
    p_company_id, p_employee_id, previous_manager, p_reporting_manager_id,
    previous_department, p_department, previous_team, p_team_id,
    previous_position, p_position, auth.uid(), 'structure_update'
  );

  RETURN jsonb_build_object('id', target.id, 'employee_id', target.id, 'reporting_manager_id', target.reporting_manager_id, 'team_id', target.team_id, 'department', target.department, 'position', target.position);
END;
$$;

REVOKE ALL ON FUNCTION public.update_organization_structure(uuid, uuid, uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_organization_structure(uuid, uuid, uuid, uuid, text, text) TO authenticated;
