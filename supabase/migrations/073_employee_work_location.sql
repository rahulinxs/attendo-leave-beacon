-- Store each employee's office on employees so lists can filter/group by companies.locations

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS work_location text;

COMMENT ON COLUMN public.employees.work_location IS 'Office name from companies.locations (comma-separated master list)';

-- Copy existing profile work_location onto the employee row
UPDATE public.employees e
SET work_location = p.work_location
FROM public.employee_profiles p
WHERE p.employee_id = e.id
  AND e.work_location IS NULL
  AND p.work_location IS NOT NULL
  AND btrim(p.work_location) <> '';
