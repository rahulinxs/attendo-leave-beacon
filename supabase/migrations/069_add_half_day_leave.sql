-- Half-day leave support for leave_requests
-- Existing rows default to full_day with session null.

ALTER TABLE public.leave_requests
  ADD COLUMN IF NOT EXISTS duration_type text NOT NULL DEFAULT 'full_day',
  ADD COLUMN IF NOT EXISTS session text NULL;

ALTER TABLE public.leave_requests
  DROP CONSTRAINT IF EXISTS leave_requests_duration_type_check,
  DROP CONSTRAINT IF EXISTS leave_requests_session_check,
  DROP CONSTRAINT IF EXISTS leave_requests_half_day_shape_check;

ALTER TABLE public.leave_requests
  ADD CONSTRAINT leave_requests_duration_type_check
    CHECK (duration_type IN ('full_day', 'half_day')),
  ADD CONSTRAINT leave_requests_session_check
    CHECK (session IS NULL OR session IN ('first_half', 'second_half'));

ALTER TABLE public.leave_requests
  ALTER COLUMN total_days TYPE numeric(5,1)
  USING total_days::numeric(5,1);

ALTER TABLE public.leave_requests
  ADD CONSTRAINT leave_requests_half_day_shape_check
  CHECK (
    (
      duration_type = 'full_day'
      AND session IS NULL
      AND total_days >= 1
    )
    OR
    (
      duration_type = 'half_day'
      AND start_date = end_date
      AND total_days = 0.5
      AND session IN ('first_half', 'second_half')
    )
  );

COMMENT ON COLUMN public.leave_requests.duration_type IS 'full_day or half_day';
COMMENT ON COLUMN public.leave_requests.session IS 'first_half or second_half when duration_type is half_day';
