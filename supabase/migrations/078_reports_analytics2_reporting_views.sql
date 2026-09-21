-- Egress-efficient reporting views for ReportsAnalytics2.
-- These views preserve underlying RLS through security_invoker and do not alter tables or policies.

CREATE OR REPLACE VIEW public.reports_analytics2_active_employees
WITH (security_invoker = true) AS
SELECT
  e.id,
  e.name,
  e.email,
  e.position,
  e.role,
  e.team_id,
  e.company_id
FROM public.employees AS e
WHERE e.is_active = true;

CREATE OR REPLACE VIEW public.reports_analytics2_attendance
WITH (security_invoker = true) AS
SELECT
  a.id,
  a.employee_id,
  a.company_id,
  a.date,
  a.status,
  a.check_in_time,
  a.check_out_time,
  e.name AS employee_name,
  e.team_id
FROM public.attendance AS a
JOIN public.employees AS e ON e.id = a.employee_id
WHERE e.is_active = true;

CREATE OR REPLACE VIEW public.reports_analytics2_leave
WITH (security_invoker = true) AS
SELECT
  l.id,
  l.employee_id,
  l.company_id,
  l.leave_type_id,
  l.start_date,
  l.end_date,
  l.total_days,
  l.duration_type,
  l.session,
  l.status,
  l.reason,
  e.name AS employee_name,
  e.team_id,
  lt.name AS leave_type_name
FROM public.leave_requests AS l
JOIN public.employees AS e ON e.id = l.employee_id
LEFT JOIN public.leave_types AS lt ON lt.id = l.leave_type_id
WHERE e.is_active = true
  AND COALESCE(l.status, 'pending') <> 'rejected';

COMMENT ON VIEW public.reports_analytics2_active_employees IS 'Active employee reference data for period reports.';
COMMENT ON VIEW public.reports_analytics2_attendance IS 'Active-employee attendance fields used by ReportsAnalytics2.';
COMMENT ON VIEW public.reports_analytics2_leave IS 'Non-rejected leave fields for active employees used by ReportsAnalytics2.';
