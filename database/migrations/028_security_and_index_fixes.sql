-- ============================================================
-- Migration 028: Security & Index Fixes
-- Date: 2026-02-27
-- 
-- Fixes:
-- 1. SECURITY: Restrict schema_migrations RLS to authenticated users
-- 2. SECURITY: Fix clone_semester_data ownership check (both semesters must belong to user)
-- 3. PERFORMANCE: Drop duplicate idx_logs_user_date (redundant with idx_attendance_logs_user_date)
-- 4. PERFORMANCE: Drop duplicate idx_holidays_user_date (redundant with idx_unique_holiday)
-- 5. PERFORMANCE: Replace idx_subjects_user_id with proper (user_id, semester_id) index
-- 6. PERFORMANCE: Add (user_id, semester_id) index on attendance_logs for semester-scoped queries
-- 7. PERFORMANCE: Add (user_id, semester_id, day_of_week) index on timetable_slots
-- ============================================================


-- ── 1. SECURITY: Restrict schema_migrations to authenticated users ──────────
-- Currently allows anyone (even unauthenticated) to read migration history.
-- Restrict to authenticated users only (still publicly visible but requires login).

DROP POLICY IF EXISTS "Anyone can view migrations" ON schema_migrations;

CREATE POLICY "Authenticated users can view migrations"
  ON schema_migrations FOR SELECT
  TO authenticated
  USING (true);


-- ── 2. SECURITY: Fix clone_semester_data ownership verification ───────────────
-- The original check uses IN (...) which only requires ONE semester to belong to
-- the user. Rewrite to explicitly verify BOTH semester IDs belong to p_user_id.

CREATE OR REPLACE FUNCTION public.clone_semester_data(
  p_user_id uuid,
  p_from_semester_id uuid,
  p_to_semester_id uuid
)
RETURNS TABLE(subjects_cloned integer, slots_cloned integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_subjects_count INT := 0;
  v_slots_count    INT := 0;
  v_subject_mapping JSONB := '{}';
  v_old_subject_id  UUID;
  v_new_subject_id  UUID;
BEGIN
  -- Verify user owns the SOURCE semester
  IF NOT EXISTS (
    SELECT 1 FROM semesters
    WHERE id = p_from_semester_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized: user does not own the source semester';
  END IF;

  -- Verify user owns the DESTINATION semester
  IF NOT EXISTS (
    SELECT 1 FROM semesters
    WHERE id = p_to_semester_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized: user does not own the destination semester';
  END IF;

  -- Prevent cloning a semester into itself
  IF p_from_semester_id = p_to_semester_id THEN
    RAISE EXCEPTION 'Cannot clone a semester into itself';
  END IF;

  -- Clone subjects and build ID mapping
  FOR v_old_subject_id IN
    SELECT id FROM subjects
    WHERE user_id = p_user_id
      AND semester_id = p_from_semester_id
  LOOP
    INSERT INTO subjects (user_id, semester_id, name, color_hex, target_percentage)
    SELECT user_id, p_to_semester_id, name, color_hex, target_percentage
    FROM subjects
    WHERE id = v_old_subject_id
    RETURNING id INTO v_new_subject_id;

    v_subject_mapping := v_subject_mapping ||
      jsonb_build_object(v_old_subject_id::text, v_new_subject_id::text);

    v_subjects_count := v_subjects_count + 1;
  END LOOP;

  -- Clone timetable slots with remapped subject IDs
  INSERT INTO timetable_slots (
    user_id, semester_id, subject_id, day_of_week,
    slot_type, start_time, end_time
  )
  SELECT
    user_id,
    p_to_semester_id,
    (v_subject_mapping ->> subject_id::text)::UUID,
    day_of_week,
    slot_type,
    start_time,
    end_time
  FROM timetable_slots
  WHERE user_id = p_user_id
    AND semester_id = p_from_semester_id;

  GET DIAGNOSTICS v_slots_count = ROW_COUNT;

  RETURN QUERY SELECT v_subjects_count, v_slots_count;
END;
$$;


-- ── 3. PERFORMANCE: Drop duplicate attendance_logs index ──────────────────────
-- idx_logs_user_date (user_id, date DESC) duplicates idx_attendance_logs_user_date
-- (user_id, date ASC). PostgreSQL can scan an ASC index in reverse for DESC queries.

DROP INDEX IF EXISTS public.idx_logs_user_date;


-- ── 4. PERFORMANCE: Drop duplicate holidays index ─────────────────────────────
-- idx_holidays_user_date (user_id, date) is a plain index that exactly duplicates
-- idx_unique_holiday which is a UNIQUE index on the same columns. A unique index
-- already serves as a lookup index — the plain one is completely redundant.

DROP INDEX IF EXISTS public.idx_holidays_user_date;


-- ── 5. PERFORMANCE: Fix subjects index ───────────────────────────────────────
-- The existing idx_subjects_user_id is on (user_id, created_at DESC) which is
-- useless for the app's primary query pattern: WHERE user_id = $1 AND semester_id = $2.
-- Replace it with a proper composite index.

DROP INDEX IF EXISTS public.idx_subjects_user_id;

CREATE INDEX idx_subjects_user_semester
  ON public.subjects (user_id, semester_id);


-- ── 6. PERFORMANCE: Add semester-scoped index on attendance_logs ──────────────
-- The app always filters attendance logs by (user_id, semester_id) and orders
-- by date DESC. The current index only covers (user_id, date) with no semester_id.

CREATE INDEX IF NOT EXISTS idx_attendance_logs_user_semester
  ON public.attendance_logs (user_id, semester_id, date DESC);


-- ── 7. PERFORMANCE: Add semester-scoped index on timetable_slots ─────────────
-- The app queries timetable by (user_id, semester_id). The current index covers
-- (user_id, day_of_week) which is fine for day lookups but not semester filtering.

CREATE INDEX IF NOT EXISTS idx_timetable_slots_user_semester
  ON public.timetable_slots (user_id, semester_id, day_of_week);


-- ── Record migration ──────────────────────────────────────────────────────────
INSERT INTO schema_migrations (version, description, applied_at)
VALUES ('028', '028_security_and_index_fixes', NOW())
ON CONFLICT (version) DO NOTHING;
