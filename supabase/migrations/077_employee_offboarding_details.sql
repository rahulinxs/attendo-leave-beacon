-- Required offboarding details for inactive employees.

ALTER TABLE public.employee_profiles
  ADD COLUMN IF NOT EXISTS exit_date date,
  ADD COLUMN IF NOT EXISTS exit_reason text,
  ADD COLUMN IF NOT EXISTS exit_interview_details text;

COMMENT ON COLUMN public.employee_profiles.exit_date IS 'Employee exit/offboarding date';
COMMENT ON COLUMN public.employee_profiles.exit_reason IS 'Reason for employee exit';
COMMENT ON COLUMN public.employee_profiles.exit_interview_details IS 'Exit interview notes or outcome';

CREATE OR REPLACE FUNCTION public.require_employee_offboarding_details()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_exit_date date;
  profile_exit_reason text;
  profile_exit_interview text;
BEGIN
  IF NEW.is_active = false THEN
    SELECT exit_date, exit_reason, exit_interview_details
      INTO profile_exit_date, profile_exit_reason, profile_exit_interview
    FROM public.employee_profiles
    WHERE employee_id = NEW.id;

    IF profile_exit_date IS NULL
      OR nullif(trim(profile_exit_reason), '') IS NULL
      OR nullif(trim(profile_exit_interview), '') IS NULL THEN
      RAISE EXCEPTION 'Exit date, exit reason, and exit interview details are required before an employee can be marked inactive';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS require_employee_offboarding_details_on_deactivate
  ON public.employees;
CREATE TRIGGER require_employee_offboarding_details_on_deactivate
  BEFORE INSERT OR UPDATE OF is_active ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.require_employee_offboarding_details();
