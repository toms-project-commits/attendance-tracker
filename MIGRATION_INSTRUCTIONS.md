# 🔧 CRITICAL DATABASE MIGRATION REQUIRED

## Issue Fixed
- **Multiple subjects on same day**: Previously, you could only save ONE attendance record per subject per day
- **Extra classes not persisting**: Extra classes were lost after page refresh
- **Duplicate subject handling**: If you had the same subject twice in one day, only one would save

## What Changed
The database schema has been updated to properly handle:
1. Multiple sessions of the same subject on the same day
2. Extra classes that persist across sessions
3. Proper linking between attendance records and timetable slots

## ⚠️ IMPORTANT: You MUST run this migration on Supabase

### Step 1: Access Supabase SQL Editor
1. Go to your Supabase project: https://supabase.com/dashboard/project/YOUR_PROJECT_ID
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"

### Step 2: Run the Migration
Copy and paste the entire contents of `database/migrations/006_fix_multiple_subjects_same_day.sql` into the SQL editor and click "Run".

**OR** you can copy this SQL directly:

```sql
-- Fix: Allow multiple attendance records for the same subject on the same day
-- Problem: Current unique constraint prevents tracking multiple sessions of same subject

-- Step 1: Drop the old unique constraint that's causing issues
DROP INDEX IF EXISTS idx_unique_attendance_log;

-- Step 2: Add timetable_slot_id to link attendance to specific class session
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS timetable_slot_id UUID REFERENCES timetable_slots(id) ON DELETE SET NULL;

-- Step 3: Add start_time and end_time for extra classes
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS start_time TIME;
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS end_time TIME;

-- Step 4: Create new unique constraints
CREATE UNIQUE INDEX idx_unique_attendance_with_slot 
  ON attendance_logs(user_id, date, timetable_slot_id) 
  WHERE timetable_slot_id IS NOT NULL;

CREATE UNIQUE INDEX idx_unique_attendance_extra_class 
  ON attendance_logs(user_id, date, subject_id, start_time) 
  WHERE timetable_slot_id IS NULL AND start_time IS NOT NULL;

-- Step 5: Add index for performance
CREATE INDEX IF NOT EXISTS idx_attendance_logs_slot ON attendance_logs(timetable_slot_id) WHERE timetable_slot_id IS NOT NULL;

-- Step 6: Update existing records
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
```

### Step 3: Verify Migration Success
After running, you should see a success message. The migration:
- ✅ Drops the old problematic constraint
- ✅ Adds new columns to attendance_logs
- ✅ Creates proper unique indexes
- ✅ Migrates existing data

### Step 4: Test the Fix
1. Go to Mark Attendance page
2. Try adding multiple sessions of the same subject
3. Save and verify they all appear in analytics
4. Add extra classes and verify they persist after refresh

## What If Migration Fails?

If you see any errors:
1. Check if columns already exist (safe to ignore "already exists" warnings)
2. Make sure you're connected to the correct database
3. Check Supabase logs for detailed error messages
4. Contact support if issues persist

## After Migration

Once the migration is complete:
- Multiple subjects per day will work correctly
- Extra classes will persist
- Past date attendance will reflect properly in analytics
- All features will work as expected!

---
**Status**: Migration file created and code updated
**Action Required**: Run SQL migration in Supabase before using the app
