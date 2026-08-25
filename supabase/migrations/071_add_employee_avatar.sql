-- Employee profile photo (same pattern as companies.logo_url)

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS avatar_url text;

COMMENT ON COLUMN public.employees.avatar_url IS 'Public URL of the employee profile picture';

-- Storage: reuse company-document bucket, folder employee-avatars/
-- Policies are additive (OR) with any existing bucket policies.

DROP POLICY IF EXISTS "Authenticated users can upload employee avatars" ON storage.objects;
CREATE POLICY "Authenticated users can upload employee avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company-document'
  AND split_part(name, '/', 1) = 'employee-avatars'
);

DROP POLICY IF EXISTS "Authenticated users can update employee avatars" ON storage.objects;
CREATE POLICY "Authenticated users can update employee avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'company-document'
  AND split_part(name, '/', 1) = 'employee-avatars'
)
WITH CHECK (
  bucket_id = 'company-document'
  AND split_part(name, '/', 1) = 'employee-avatars'
);

DROP POLICY IF EXISTS "Public can read employee avatars" ON storage.objects;
CREATE POLICY "Public can read employee avatars"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'company-document'
  AND split_part(name, '/', 1) = 'employee-avatars'
);
