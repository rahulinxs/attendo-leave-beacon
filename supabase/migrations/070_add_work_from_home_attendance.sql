-- Allow Work From Home as an attendance status.
-- Existing rows are unchanged.

ALTER TABLE public.attendance
  DROP CONSTRAINT IF EXISTS attendance_status_check;

ALTER TABLE public.attendance
  DROP CONSTRAINT IF EXISTS attendance_status_check;

ALTER TABLE public.attendance
  ADD CONSTRAINT attendance_status_check
  CHECK (
    status IS NULL OR status IN (
      'present',
      'absent',
      'late',
      'holiday',
      'half_day',
      'work_from_home'
    )
  );

COMMENT ON CONSTRAINT attendance_status_check ON public.attendance IS
  'Allowed attendance statuses including work_from_home';
