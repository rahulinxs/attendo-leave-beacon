-- Per-employee visibility for the existing profile sections.
-- Missing rows intentionally mean enabled, preserving existing behavior.

CREATE TABLE IF NOT EXISTS public.employee_profile_field_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  field_key text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  updated_by uuid REFERENCES public.employees(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, field_key)
);

CREATE INDEX IF NOT EXISTS idx_employee_profile_field_settings_employee
  ON public.employee_profile_field_settings(employee_id);

ALTER TABLE public.employee_profile_field_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Employees can view own profile field settings" ON public.employee_profile_field_settings;
CREATE POLICY "Employees can view own profile field settings"
  ON public.employee_profile_field_settings FOR SELECT
  USING (
    employee_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.employees actor
      JOIN public.employees target ON target.id = employee_profile_field_settings.employee_id
      WHERE actor.id = auth.uid()
        AND actor.role IN ('admin', 'super_admin')
        AND actor.company_id = target.company_id
    )
  );

DROP POLICY IF EXISTS "Admins can manage profile field settings" ON public.employee_profile_field_settings;
CREATE POLICY "Admins can manage profile field settings"
  ON public.employee_profile_field_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.employees actor
      JOIN public.employees target ON target.id = employee_profile_field_settings.employee_id
      WHERE actor.id = auth.uid()
        AND actor.role IN ('admin', 'super_admin')
        AND actor.company_id = target.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.employees actor
      JOIN public.employees target ON target.id = employee_profile_field_settings.employee_id
      WHERE actor.id = auth.uid()
        AND actor.role IN ('admin', 'super_admin')
        AND actor.company_id = target.company_id
    )
  );

DROP TRIGGER IF EXISTS update_employee_profile_field_settings_updated_at
  ON public.employee_profile_field_settings;
CREATE OR REPLACE FUNCTION public.update_employee_profile_field_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_employee_profile_field_settings_updated_at
  BEFORE UPDATE ON public.employee_profile_field_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_employee_profile_field_settings_updated_at();
