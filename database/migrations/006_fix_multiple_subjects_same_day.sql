-- SAFE VERSION: Fix multiple subjects same day issue
-- This version has better error handling and is idempotent (can run multiple times safely)

-- Step 1: Drop the old problematic unique constraint (safe if doesn't exist)
DROP INDEX IF EXISTS idx_unique_attendance_log;

-- Step 2: Add new columns safely (won't fail if columns already exist)
DO $$ 
BEGIN
    -- Add timetable_slot_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendance_logs' AND column_name = 'timetable_slot_id'
    ) THEN
        ALTER TABLE attendance_logs ADD COLUMN timetable_slot_id UUID REFERENCES timetable_slots(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added timetable_slot_id column';
    ELSE
        RAISE NOTICE 'timetable_slot_id column already exists';
    END IF;

    -- Add start_time column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendance_logs' AND column_name = 'start_time'
    ) THEN
        ALTER TABLE attendance_logs ADD COLUMN start_time TIME;
        RAISE NOTICE 'Added start_time column';
    ELSE
        RAISE NOTICE 'start_time column already exists';
    END IF;

    -- Add end_time column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendance_logs' AND column_name = 'end_time'
    ) THEN
        ALTER TABLE attendance_logs ADD COLUMN end_time TIME;
        RAISE NOTICE 'Added end_time column';
    ELSE
        RAISE NOTICE 'end_time column already exists';
    END IF;
END $$;

-- Step 3: Create new unique indexes (safe if already exist)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_attendance_with_slot 
  ON attendance_logs(user_id, date, timetable_slot_id) 
  WHERE timetable_slot_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_attendance_extra_class 
  ON attendance_logs(user_id, date, subject_id, start_time) 
  WHERE timetable_slot_id IS NULL AND start_time IS NOT NULL;

-- Step 4: Add performance index (safe if already exists)
CREATE INDEX IF NOT EXISTS idx_attendance_logs_slot 
  ON attendance_logs(timetable_slot_id) 
  WHERE timetable_slot_id IS NOT NULL;

-- Step 5: Migrate existing data (improved version with JOIN)
-- This links old attendance records to their corresponding timetable slots
UPDATE attendance_logs al
SET timetable_slot_id = ts.id
FROM timetable_slots ts
WHERE al.timetable_slot_id IS NULL
  AND ts.user_id = al.user_id
  AND ts.subject_id = al.subject_id
  AND ts.day_of_week = EXTRACT(ISODOW FROM al.date::date)
  AND ts.slot_type = 'SUBJECT';

-- Step 6: Add helpful comments
COMMENT ON COLUMN attendance_logs.timetable_slot_id IS 'Links to specific timetable slot for scheduled classes';
COMMENT ON COLUMN attendance_logs.start_time IS 'Start time for extra classes not in timetable';
COMMENT ON COLUMN attendance_logs.end_time IS 'End time for extra classes not in timetable';

-- Step 7: Verify the migration worked
SELECT 
    'Migration Complete!' as status,
    COUNT(*) as total_attendance_records,
    COUNT(timetable_slot_id) as linked_to_timetable,
    COUNT(start_time) as extra_classes
FROM attendance_logs;
