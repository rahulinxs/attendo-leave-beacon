-- Allow admin / super_admin to delete leave records (including approved)

DROP POLICY IF EXISTS "Admins can delete company leave requests" ON public.leave_requests;
CREATE POLICY "Admins can delete company leave requests"
ON public.leave_requests FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
      AND company_id = leave_requests.company_id
  )
);
