-- Fix for migration 003 constraint error and RLS performance issues
-- Run this instead of migration 003 if you got the valid_time_order error

-- ============================================
-- PART 1: Fix Existing Data Issues
-- ============================================

-- First, check and fix any timetable slots where start_time >= end_time
UPDATE timetable_slots 
SET end_time = (start_time::time + interval '1 hour')::time
WHERE start_time >= end_time OR start_time IS NULL OR end_time IS NULL;

-- ============================================
-- PART 2: Add Timestamps (if not already added)
-- ============================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE subjects ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE timetable_slots ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE timetable_slots ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE holidays ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================
-- PART 3: Add Foreign Key Constraints with CASCADE
-- ============================================

ALTER TABLE timetable_slots DROP CONSTRAINT IF EXISTS timetable_slots_subject_id_fkey;
ALTER TABLE timetable_slots ADD CONSTRAINT timetable_slots_subject_id_fkey 
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;

ALTER TABLE attendance_logs DROP CONSTRAINT IF EXISTS attendance_logs_subject_id_fkey;
ALTER TABLE attendance_logs ADD CONSTRAINT attendance_logs_subject_id_fkey 
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;

-- ============================================
-- PART 4: Add Validation Constraints (Fixed)
-- ============================================

-- Target percentage must be 0-100
ALTER TABLE subjects DROP CONSTRAINT IF EXISTS target_percentage_range;
ALTER TABLE subjects ADD CONSTRAINT target_percentage_range 
  CHECK (target_percentage >= 0 AND target_percentage <= 100);

-- Day of week must be 1-7
ALTER TABLE timetable_slots DROP CONSTRAINT IF EXISTS valid_day_of_week;
ALTER TABLE timetable_slots ADD CONSTRAINT valid_day_of_week 
  CHECK (day_of_week >= 1 AND day_of_week <= 7);

-- Start time must be less than end time (only add after data is fixed)
ALTER TABLE timetable_slots DROP CONSTRAINT IF EXISTS valid_time_order;
ALTER TABLE timetable_slots ADD CONSTRAINT valid_time_order 
  CHECK (start_time < end_time);

-- ============================================
-- PART 5: Clean Up Duplicate Data Before Adding Constraints
-- ============================================

-- Remove duplicate attendance logs, keeping only the most recent one
DELETE FROM attendance_logs a
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, subject_id, date) id
  FROM attendance_logs
  ORDER BY user_id, subject_id, date, created_at DESC NULLS LAST
);

-- Remove duplicate timetable slots, keeping only the most recent one
DELETE FROM timetable_slots t
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, day_of_week, start_time, slot_type) id
  FROM timetable_slots
  ORDER BY user_id, day_of_week, start_time, slot_type, created_at DESC NULLS LAST
);

-- Remove duplicate holidays, keeping only the most recent one
DELETE FROM holidays h
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, date) id
  FROM holidays
  ORDER BY user_id, date, created_at DESC NULLS LAST
);

-- ============================================
-- PART 6: Add Unique Constraints
-- ============================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_timetable_slot 
  ON timetable_slots(user_id, day_of_week, start_time) WHERE slot_type = 'SUBJECT';

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_attendance_log 
  ON attendance_logs(user_id, subject_id, date);

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_holiday 
  ON holidays(user_id, date);

-- ============================================
-- PART 7: Create Auto-Update Function and Triggers
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subjects_updated_at ON subjects;
CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_timetable_slots_updated_at ON timetable_slots;
CREATE TRIGGER update_timetable_slots_updated_at BEFORE UPDATE ON timetable_slots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_attendance_logs_updated_at ON attendance_logs;
CREATE TRIGGER update_attendance_logs_updated_at BEFORE UPDATE ON attendance_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PART 8: Add Performance Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_subjects_user_created ON subjects(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_date_desc ON attendance_logs(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_holidays_date_asc ON holidays(user_id, date ASC);

-- ============================================
-- PART 9: Add Status and Type Constraints
-- ============================================

ALTER TABLE attendance_logs DROP CONSTRAINT IF EXISTS valid_attendance_status;
ALTER TABLE attendance_logs ADD CONSTRAINT valid_attendance_status 
  CHECK (status IN ('PRESENT', 'ABSENT', 'CANCELLED'));

ALTER TABLE timetable_slots DROP CONSTRAINT IF EXISTS valid_slot_type;
ALTER TABLE timetable_slots ADD CONSTRAINT valid_slot_type 
  CHECK (slot_type IN ('SUBJECT', 'BREAK', 'SPORTS', 'LIBRARY', 'EXAM'));

-- ============================================
-- PART 10: Fix RLS Policy Performance Issues
-- ============================================

-- Fix profiles RLS policy
DROP POLICY IF EXISTS "Users manage their own profiles" ON profiles;
CREATE POLICY "Users manage their own profiles" ON profiles
  FOR ALL USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Fix subjects RLS policy
DROP POLICY IF EXISTS "Users manage their own subjects" ON subjects;
CREATE POLICY "Users manage their own subjects" ON subjects
  FOR ALL USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Fix timetable_slots RLS policy
DROP POLICY IF EXISTS "Users manage their own timetable" ON timetable_slots;
CREATE POLICY "Users manage their own timetable" ON timetable_slots
  FOR ALL USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Fix holidays RLS policy
DROP POLICY IF EXISTS "Users manage their own holidays" ON holidays;
CREATE POLICY "Users manage their own holidays" ON holidays
  FOR ALL USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Fix attendance_logs RLS policy
DROP POLICY IF EXISTS "Users manage their own logs" ON attendance_logs;
CREATE POLICY "Users manage their own logs" ON attendance_logs
  FOR ALL USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ============================================
-- PART 11: Fix Function Security Issue
-- ============================================

-- Drop and recreate handle_new_user function with proper search_path
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (id, created_at, updated_at)
  VALUES (NEW.id, NOW(), NOW());
  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- PART 12: Add Table Documentation
-- ============================================

COMMENT ON TABLE profiles IS 'User profiles with semester configuration';
COMMENT ON TABLE subjects IS 'Academic subjects tracked by users';
COMMENT ON TABLE timetable_slots IS 'Weekly timetable slots for each user';
COMMENT ON TABLE attendance_logs IS 'Daily attendance records';
COMMENT ON TABLE holidays IS 'User-specific holidays and breaks';

COMMENT ON COLUMN profiles.username IS 'Unique username, cannot be changed once set';
COMMENT ON COLUMN profiles.saturday_offs IS 'Array of Saturday weeks (1-5) that are holidays';
COMMENT ON COLUMN subjects.target_percentage IS 'Target attendance percentage for this subject';
COMMENT ON COLUMN attendance_logs.status IS 'PRESENT, ABSENT, or CANCELLED';
COMMENT ON COLUMN timetable_slots.slot_type IS 'Type of slot: SUBJECT, BREAK, SPORTS, LIBRARY, EXAM';
