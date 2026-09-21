# Egress-Minimal Development Standard

AttendEdge changes must preserve existing behavior while minimizing data transferred from Supabase, Storage, and Edge Functions.

## Required practices

- Select only the columns a screen, hook, service, or function uses. `SELECT *` is not allowed in new code.
- Apply server-side filters, date ranges, limits, and pagination for large or multi-tenant datasets.
- Reuse data already loaded by the module or a shared hook. Do not repeat equivalent reads from sibling components.
- Do not poll or enable automatic refetching unless the workflow requires it. Prefer an explicit refresh or a targeted cache update.
- Do not download files or large JSON fields when a summary, filtered result, or metadata is sufficient.
- Use realtime only for user-visible, time-sensitive changes. Scope subscriptions by company or record and always remove them.
- Edge Functions must select and return only the fields required by their caller and avoid duplicate external/database requests.
- Before finalizing a module, list each Supabase call, its selected columns, expected row count, trigger/refetch behavior, and cache/reuse strategy.
- Do not alter business logic, RLS, permissions, or database structure as an optimization without recording the impact and reviewing the change separately.

## Query review checklist

1. What exact fields does the caller render or mutate?
2. Can the query be filtered, paginated, limited, or aggregated on the server?
3. Is this data already available from a context, hook, or module cache?
4. What causes this request to run again, and is that necessary?
5. Does a write need a full refetch, or can the local cache be updated with the known result?
6. For realtime or Edge Functions, are the subscription, response, and downstream reads scoped to the smallest useful payload?

## Initial review: Employee Anniversaries and Work History

- Employee Anniversaries now applies company, search, role, department, location, status, and employee filters in Supabase and fetches only the visible page plus the two profile date fields required by the screen.
- Work History updates use the existing employee authorization check and profile upsert, then update the in-memory profile. They do not refetch the employee, full profile, or document list after every save.
- The profile loader uses explicit columns for the employee, employee profile, and document metadata used by the Profile module.
- Remaining application-wide `SELECT *` and realtime findings are tracked for incremental follow-up; this standard applies to all new modules and future edits immediately.

## Review: Reports & Analytics

- The enabled Reports & Analytics module uses explicit columns for attendance, leave requests, employees, leave types, daily attendance, and employee detail history.
- Date-scoped queries retain their existing report ranges; daily employee filtering is applied server-side when a team is selected.
- The internal tab switch no longer triggers a complete report refetch. Manual refresh remains available.
- The module preserves its existing client-side aggregation and manual joins to avoid changing report calculations or permissions; a future database-side aggregate can be evaluated separately with query-result parity tests.

## Report Module Purpose

- **Reports & Analytics** is the operational workspace for a selected day: attendance status, approved leave visibility, team snapshots, exports, and employee drill-down history.
- **Reports & Analytics 2** is the management analysis workspace for a selected period: daily, weekly, monthly, quarterly, or half-year trends with paginated attendance, leave, and team views.
- The modules remain separate because their workflows and time horizons differ; labels and headers state the distinction directly.
- Team Performance in Reports & Analytics now uses selected-day team headcount as the denominator and reports present, late, absent, approved-leave, and attention-needed metrics from real records rather than placeholder percentages.
- The Reports & Analytics Leave tab contains its filters, nested tabs, and wide tables within responsive containers; table overflow is horizontal inside the card rather than expanding the page viewport.

## Recent Egress Audit

- Fixed the Reports & Analytics leave-type lookup to select only `id, name`; the previous payload requested unrelated attendance fields.
- Removed the duplicate selected-day attendance stats request; the active Attendance loader already computes those stats.
- Daily attendance data is now loaded only while the Attendance tab is active.
- Bulk leave import now defers employee lookup until a file is selected and requests only uploaded employee names, rather than downloading the entire company roster before upload.
- ReportsAnalytics2 still loads the selected period before client-side pagination because it synthesizes absent-day rows and team metrics. Replacing that with database aggregation should be a separately tested query/RPC change to preserve report parity.
- ReportsAnalytics2 now caches company reference data for the module lifetime; switching report tabs reuses employees, teams, and leave types instead of repeating those reads.
- ReportsAnalytics2 now uses security-invoker reporting views for active-employee attendance and non-rejected leave, with team, employee-search, and leave-status filters applied before rows cross the client boundary. Default detail pages use 20 rows; client-side absent-day synthesis remains for parity.
- Employee Anniversaries now loads one bounded, filtered employee dataset for all four local views: Existing, Calendar, Table/List, and Event List. No view switch refetches Supabase; recurring date-only events are derived locally with leap-day handling.