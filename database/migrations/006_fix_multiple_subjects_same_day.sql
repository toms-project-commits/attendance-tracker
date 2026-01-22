-- Fix: Allow multiple attendance records for the same subject on the same day
-- Problem: Current unique constraint prevents tracking multiple sessions of same subject

-- Step 1: Drop the old unique constraint that's causing issues
DROP INDEX IF EXISTS idx_unique_attendance_log;

-- Step 2: Add timetable_slot_id to link attendance to specific class session
-- This allows us to track which specific class session the attendance is for
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS timetable_slot_id UUID REFERENCES timetable_slots(id) ON DELETE SET NULL;

-- Step 3: Add start_time and end_time for extra classes (that don't have timetable slots)
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS start_time TIME;
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS end_time TIME;

-- Step 4: Create new unique constraint that allows multiple subjects per day
-- We identify unique sessions by: user_id + date + (timetable_slot_id OR subject_id+start_time)
-- For regular timetable classes: use timetable_slot_id
-- For extra classes: use subject_id + start_time combination
CREATE UNIQUE INDEX idx_unique_attendance_with_slot 
  ON attendance_logs(user_id, date, timetable_slot_id) 
  WHERE timetable_slot_id IS NOT NULL;

CREATE UNIQUE INDEX idx_unique_attendance_extra_class 
  ON attendance_logs(user_id, date, subject_id, start_time) 
  WHERE timetable_slot_id IS NULL AND start_time IS NOT NULL;

-- Step 5: Add index for performance
CREATE INDEX IF NOT EXISTS idx_attendance_logs_slot ON attendance_logs(timetable_slot_id) WHERE timetable_slot_id IS NOT NULL;

-- Step 6: Update existing records to link them to timetable slots if possible
-- This is a best-effort migration for existing data
UPDATE attendance_logs al
SET timetable_slot_id = (
  SELECT ts.id 
  FROM timetable_slots ts
  WHERE ts.user_id = al.user_id
    AND ts.subject_id = al.subject_id
    AND ts.day_of_week = EXTRACT(ISODOW FROM al.date::date)
  LIMIT 1
)
WHERE al.timetable_slot_id IS NULL;

COMMENT ON COLUMN attendance_logs.timetable_slot_id IS 'Links to specific timetable slot for scheduled classes';
COMMENT ON COLUMN attendance_logs.start_time IS 'Start time for extra classes not in timetable';
COMMENT ON COLUMN attendance_logs.end_time IS 'End time for extra classes not in timetable';
