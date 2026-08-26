-- Predefined work locations per company (admins can add / inactivate)

CREATE TABLE IF NOT EXISTS public.company_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_company_locations_company_name
  ON public.company_locations (company_id, lower(btrim(name)));

CREATE INDEX IF NOT EXISTS idx_company_locations_company
  ON public.company_locations (company_id);

ALTER TABLE public.company_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view company locations" ON public.company_locations;
CREATE POLICY "Users can view company locations"
ON public.company_locations FOR SELECT
TO authenticated
USING (
  company_id IN (SELECT company_id FROM public.employees WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Admins can insert company locations" ON public.company_locations;
CREATE POLICY "Admins can insert company locations"
ON public.company_locations FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
      AND company_id = company_locations.company_id
  )
);

DROP POLICY IF EXISTS "Admins can update company locations" ON public.company_locations;
CREATE POLICY "Admins can update company locations"
ON public.company_locations FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
      AND company_id = company_locations.company_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
      AND company_id = company_locations.company_id
  )
);

-- Ensure employee office column exists (073 may not have been applied yet)
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS work_location text;

UPDATE public.employees e
SET work_location = p.work_location
FROM public.employee_profiles p
WHERE p.employee_id = e.id
  AND e.work_location IS NULL
  AND p.work_location IS NOT NULL
  AND btrim(p.work_location) <> '';

-- Seed from companies.locations (dedupe case-insensitive within the same insert)
INSERT INTO public.company_locations (company_id, name, is_active)
SELECT DISTINCT ON (c.id, lower(btrim(part)))
  c.id,
  btrim(part),
  true
FROM public.companies c
CROSS JOIN LATERAL unnest(regexp_split_to_array(coalesce(c.locations, ''), '[,;/|]+')) AS part
WHERE btrim(part) <> ''
ORDER BY c.id, lower(btrim(part)), btrim(part)
ON CONFLICT (company_id, (lower(btrim(name)))) DO NOTHING;

-- Seed from employee assignments (employees + profiles)
INSERT INTO public.company_locations (company_id, name, is_active)
SELECT DISTINCT ON (src.company_id, lower(btrim(src.work_location)))
  src.company_id,
  btrim(src.work_location),
  true
FROM (
  SELECT e.company_id, e.work_location
  FROM public.employees e
  WHERE e.company_id IS NOT NULL
    AND e.work_location IS NOT NULL
    AND btrim(e.work_location) <> ''
  UNION ALL
  SELECT e.company_id, p.work_location
  FROM public.employee_profiles p
  JOIN public.employees e ON e.id = p.employee_id
  WHERE e.company_id IS NOT NULL
    AND p.work_location IS NOT NULL
    AND btrim(p.work_location) <> ''
) src
ORDER BY src.company_id, lower(btrim(src.work_location)), btrim(src.work_location)
ON CONFLICT (company_id, (lower(btrim(name)))) DO NOTHING;

GRANT SELECT, INSERT, UPDATE ON public.company_locations TO authenticated;
