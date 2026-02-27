-- Migration 027: Backfill semester_id on attendance_logs that are missing it
-- 
-- Root cause: The mark attendance page was not setting semester_id when saving logs.
-- This caused attendance_logs to be invisible to the dashboard and analytics,
-- which query logs filtered by the active semester_id.
--
-- This migration backfills semester_id for all attendance_logs where:
--   - semester_id IS NULL
--   - The log's date falls within the user's active semester's date range
--
-- Safe to run multiple times (idempotent).

UPDATE attendance_logs al
SET semester_id = s.id
FROM semesters s
WHERE al.semester_id IS NULL
  AND al.user_id = s.user_id
  AND s.is_active = true
  AND al.date >= s.start_date::date
  AND al.date <= COALESCE(s.end_date::date, CURRENT_DATE);

-- Also backfill for any inactive semesters where the date falls within their range
-- (in case the user switched semesters)
UPDATE attendance_logs al
SET semester_id = s.id
FROM semesters s
WHERE al.semester_id IS NULL
  AND al.user_id = s.user_id
  AND s.is_active = false
  AND al.date >= s.start_date::date
  AND al.date <= s.end_date::date;
