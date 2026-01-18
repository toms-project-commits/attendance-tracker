-- Enhanced Database Schema for Better Data Management
-- This migration improves constraints, relationships, and data integrity

-- Add timestamps to all tables for audit trails
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE subjects ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE timetable_slots ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE timetable_slots ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE holidays ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Add proper foreign key constraints with CASCADE for data integrity
-- This ensures when a subject is deleted, all related data is cleaned up
ALTER TABLE timetable_slots DROP CONSTRAINT IF EXISTS timetable_slots_subject_id_fkey;
ALTER TABLE timetable_slots ADD CONSTRAINT timetable_slots_subject_id_fkey 
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;

ALTER TABLE attendance_logs DROP CONSTRAINT IF EXISTS attendance_logs_subject_id_fkey;
ALTER TABLE attendance_logs ADD CONSTRAINT attendance_logs_subject_id_fkey 
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;

-- Add constraints for better data validation
ALTER TABLE subjects ADD CONSTRAINT target_percentage_range 
  CHECK (target_percentage >= 0 AND target_percentage <= 100);

ALTER TABLE timetable_slots ADD CONSTRAINT valid_day_of_week 
  CHECK (day_of_week >= 1 AND day_of_week <= 7);

ALTER TABLE timetable_slots ADD CONSTRAINT valid_time_order 
  CHECK (start_time < end_time);

-- Add unique constraints to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_timetable_slot 
  ON timetable_slots(user_id, day_of_week, start_time) WHERE slot_type = 'SUBJECT';

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_attendance_log 
  ON attendance_logs(user_id, subject_id, date);

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_holiday 
  ON holidays(user_id, date);

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for auto-updating updated_at
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

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_subjects_user_created ON subjects(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_date_desc ON attendance_logs(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_holidays_date_asc ON holidays(user_id, date ASC);

-- Add check constraint for attendance status
ALTER TABLE attendance_logs DROP CONSTRAINT IF EXISTS valid_attendance_status;
ALTER TABLE attendance_logs ADD CONSTRAINT valid_attendance_status 
  CHECK (status IN ('PRESENT', 'ABSENT', 'CANCELLED'));

-- Add check constraint for slot types
ALTER TABLE timetable_slots DROP CONSTRAINT IF EXISTS valid_slot_type;
ALTER TABLE timetable_slots ADD CONSTRAINT valid_slot_type 
  CHECK (slot_type IN ('SUBJECT', 'BREAK', 'SPORTS', 'LIBRARY', 'EXAM'));

-- Comments for documentation
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
