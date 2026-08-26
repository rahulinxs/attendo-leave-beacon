-- Audit log for custom profile data exports (admin / super_admin)

CREATE TABLE IF NOT EXISTS public.profile_export_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_role text NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  selected_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  applied_filters jsonb,
  record_count integer NOT NULL DEFAULT 0,
  export_format text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profile_export_audit_company
  ON public.profile_export_audit (company_id, created_at DESC);

ALTER TABLE public.profile_export_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can insert profile export audit" ON public.profile_export_audit;
CREATE POLICY "Admins can insert profile export audit"
ON public.profile_export_audit FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.employees
    WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
  )
);

DROP POLICY IF EXISTS "Admins can view company profile export audit" ON public.profile_export_audit;
CREATE POLICY "Admins can view company profile export audit"
ON public.profile_export_audit FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
      AND (
        role = 'super_admin'
        OR company_id = profile_export_audit.company_id
      )
  )
);

GRANT SELECT, INSERT ON public.profile_export_audit TO authenticated;
