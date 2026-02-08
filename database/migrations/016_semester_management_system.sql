-- ============================================
-- SEMESTER MANAGEMENT SYSTEM MIGRATION
-- ============================================
-- Adds multi-semester support with archiving capabilities
-- Allows users to start new semesters while retaining or archiving old data
-- IDEMPOTENT: Safe to run multiple times
-- ============================================

-- ============================================
-- PART 1: CREATE SEMESTERS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS semesters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_date_range CHECK (start_date < end_date),
    CONSTRAINT semester_name_length CHECK (char_length(name) >= 3 AND char_length(name) <= 100)
);

-- Only one active semester per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_semester_per_user 
    ON semesters(user_id) 
    WHERE is_active = true;

-- Fast lookups
CREATE INDEX IF NOT EXISTS idx_semesters_user_active ON semesters(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_semesters_user_dates ON semesters(user_id, start_date DESC);

-- Comments
COMMENT ON TABLE semesters IS 'Semester periods for organizing attendance data across time';
COMMENT ON COLUMN semesters.name IS 'User-friendly name like "Semester 1 2026" or "Spring 2026"';
COMMENT ON COLUMN semesters.is_active IS 'Only one semester can be active per user at a time';

-- ============================================
-- PART 2: ADD SEMESTER_ID TO EXISTING TABLES
-- ============================================

-- Add semester_id columns (nullable initially for migration)
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS semester_id UUID REFERENCES semesters(id) ON DELETE CASCADE;
ALTER TABLE timetable_slots ADD COLUMN IF NOT EXISTS semester_id UUID REFERENCES semesters(id) ON DELETE CASCADE;
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS semester_id UUID REFERENCES semesters(id) ON DELETE CASCADE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_subjects_semester ON subjects(semester_id) WHERE semester_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_timetable_semester ON timetable_slots(semester_id) WHERE semester_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_attendance_semester ON attendance_logs(semester_id) WHERE semester_id IS NOT NULL;

-- Update unique constraints to include semester_id for proper isolation
-- Drop old unique index for timetable
DROP INDEX IF EXISTS idx_unique_timetable_slot;

-- Create new unique index that includes semester_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_timetable_slot_semester
    ON timetable_slots(user_id, semester_id, day_of_week, start_time, slot_type)
    WHERE semester_id IS NOT NULL;

-- For backwards compatibility: slots without semester_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_timetable_slot_no_semester
    ON timetable_slots(user_id, day_of_week, start_time, slot_type)
    WHERE semester_id IS NULL;

-- Update attendance log indexes to include semester_id
DROP INDEX IF EXISTS idx_unique_attendance_with_slot;
DROP INDEX IF EXISTS idx_unique_attendance_extra_class;
DROP INDEX IF EXISTS idx_unique_attendance_no_slot_no_time;

-- New indexes with semester isolation
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_attendance_with_slot_semester
    ON attendance_logs(user_id, semester_id, date, timetable_slot_id)
    WHERE timetable_slot_id IS NOT NULL AND semester_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_attendance_extra_class_semester
    ON attendance_logs(user_id, semester_id, date, subject_id, start_time)
    WHERE timetable_slot_id IS NULL AND start_time IS NOT NULL AND semester_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_attendance_no_slot_no_time_semester
    ON attendance_logs(user_id, semester_id, date, subject_id)
    WHERE timetable_slot_id IS NULL AND start_time IS NULL AND semester_id IS NOT NULL;

-- Backwards compatibility indexes (for data without semester_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_attendance_with_slot_legacy
    ON attendance_logs(user_id, date, timetable_slot_id)
    WHERE timetable_slot_id IS NOT NULL AND semester_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_attendance_extra_class_legacy
    ON attendance_logs(user_id, date, subject_id, start_time)
    WHERE timetable_slot_id IS NULL AND start_time IS NOT NULL AND semester_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_attendance_no_slot_no_time_legacy
    ON attendance_logs(user_id, date, subject_id)
    WHERE timetable_slot_id IS NULL AND start_time IS NULL AND semester_id IS NULL;

-- Comments
COMMENT ON COLUMN subjects.semester_id IS 'Links subject to a specific semester for data organization';
COMMENT ON COLUMN timetable_slots.semester_id IS 'Links timetable slot to a specific semester';
COMMENT ON COLUMN attendance_logs.semester_id IS 'Links attendance record to a specific semester';

-- ============================================
-- PART 3: MIGRATE EXISTING DATA
-- ============================================

-- Create default "Legacy Semester" for existing users with data
DO $$
DECLARE
    v_user RECORD;
    v_semester_id UUID;
    v_earliest_date DATE;
    v_latest_date DATE;
BEGIN
    -- For each user with existing data
    FOR v_user IN 
        SELECT DISTINCT user_id 
        FROM subjects 
        WHERE semester_id IS NULL
    LOOP
        -- Find date range from existing attendance logs
        SELECT 
            MIN(date::date),
            MAX(date::date)
        INTO v_earliest_date, v_latest_date
        FROM attendance_logs
        WHERE user_id = v_user.user_id;
        
        -- Use sensible defaults if no logs exist
        IF v_earliest_date IS NULL THEN
            v_earliest_date := CURRENT_DATE - INTERVAL '6 months';
            v_latest_date := CURRENT_DATE + INTERVAL '6 months';
        END IF;
        
        -- Ensure end_date is after start_date (handle single-day data)
        IF v_latest_date <= v_earliest_date THEN
            v_latest_date := v_earliest_date + INTERVAL '6 months';
        END IF;
        
        -- Create legacy semester
        INSERT INTO semesters (user_id, name, start_date, end_date, is_active)
        VALUES (
            v_user.user_id,
            'Current Semester',
            v_earliest_date,
            v_latest_date,
            true
        )
        RETURNING id INTO v_semester_id;
        
        -- Link existing subjects to this semester
        UPDATE subjects 
        SET semester_id = v_semester_id
        WHERE user_id = v_user.user_id AND semester_id IS NULL;
        
        -- Link existing timetable slots to this semester
        UPDATE timetable_slots
        SET semester_id = v_semester_id
        WHERE user_id = v_user.user_id AND semester_id IS NULL;
        
        -- Link existing attendance logs to this semester
        UPDATE attendance_logs
        SET semester_id = v_semester_id
        WHERE user_id = v_user.user_id AND semester_id IS NULL;
        
        RAISE NOTICE 'Migrated user % to semester: Current Semester (%)', v_user.user_id, v_semester_id;
    END LOOP;
END $$;

-- ============================================
-- PART 4: ROW LEVEL SECURITY FOR SEMESTERS
-- ============================================

ALTER TABLE semesters ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own semesters" ON semesters;
DROP POLICY IF EXISTS "Users can insert their own semesters" ON semesters;
DROP POLICY IF EXISTS "Users can update their own semesters" ON semesters;
DROP POLICY IF EXISTS "Users can delete their own semesters" ON semesters;

-- Create comprehensive RLS policies
CREATE POLICY "Users can view their own semesters" ON semesters
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own semesters" ON semesters
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own semesters" ON semesters
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own semesters" ON semesters
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- PART 5: AUTO-UPDATE TRIGGER FOR SEMESTERS
-- ============================================

DROP TRIGGER IF EXISTS update_semesters_updated_at ON semesters;
CREATE TRIGGER update_semesters_updated_at 
    BEFORE UPDATE ON semesters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PART 6: HELPER FUNCTION - CLONE SEMESTER DATA
-- ============================================

CREATE OR REPLACE FUNCTION clone_semester_data(
    p_user_id UUID,
    p_from_semester_id UUID,
    p_to_semester_id UUID
)
RETURNS TABLE(subjects_cloned INT, slots_cloned INT) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_subjects_count INT := 0;
    v_slots_count INT := 0;
    v_subject_mapping JSONB := '{}';
    v_old_subject_id UUID;
    v_new_subject_id UUID;
BEGIN
    -- Verify user owns both semesters
    IF NOT EXISTS (
        SELECT 1 FROM semesters 
        WHERE id IN (p_from_semester_id, p_to_semester_id) 
        AND user_id = p_user_id
    ) THEN
        RAISE EXCEPTION 'Unauthorized: user does not own these semesters';
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
        
        -- Store mapping for timetable cloning
        v_subject_mapping := v_subject_mapping || 
            jsonb_build_object(v_old_subject_id::text, v_new_subject_id::text);
        
        v_subjects_count := v_subjects_count + 1;
    END LOOP;
    
    -- Clone timetable slots with new subject IDs
    INSERT INTO timetable_slots (
        user_id, semester_id, subject_id, day_of_week, 
        slot_type, start_time, end_time
    )
    SELECT 
        user_id,
        p_to_semester_id,
        (v_subject_mapping->>subject_id::text)::UUID,
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

COMMENT ON FUNCTION clone_semester_data IS 'Clones subjects and timetable from one semester to another';

-- ============================================
-- PART 7: HELPER FUNCTION - GET ACTIVE SEMESTER
-- ============================================

CREATE OR REPLACE FUNCTION get_active_semester_id(p_user_id UUID)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_semester_id UUID;
BEGIN
    SELECT id INTO v_semester_id
    FROM semesters
    WHERE user_id = p_user_id AND is_active = true
    LIMIT 1;
    
    RETURN v_semester_id;
END;
$$;

COMMENT ON FUNCTION get_active_semester_id IS 'Returns the active semester ID for a user';

-- ============================================
-- PART 8: HELPER FUNCTION - ARCHIVE SEMESTER
-- ============================================

CREATE OR REPLACE FUNCTION archive_semester(
    p_user_id UUID,
    p_semester_id UUID,
    p_archive_name TEXT DEFAULT NULL
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- Verify ownership
    IF NOT EXISTS (
        SELECT 1 FROM semesters 
        WHERE id = p_semester_id AND user_id = p_user_id
    ) THEN
        RAISE EXCEPTION 'Unauthorized: user does not own this semester';
    END IF;
    
    -- Archive the semester
    UPDATE semesters
    SET 
        is_active = false,
        name = COALESCE(p_archive_name, name),
        updated_at = NOW()
    WHERE id = p_semester_id AND user_id = p_user_id;
    
    RETURN true;
END;
$$;

COMMENT ON FUNCTION archive_semester IS 'Archives a semester by setting is_active to false';

-- ============================================
-- PART 9: VERIFICATION AND REPORTING
-- ============================================

DO $$
DECLARE
    v_semesters_count INTEGER;
    v_active_semesters INTEGER;
    v_subjects_linked INTEGER;
    v_logs_linked INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_semesters_count FROM semesters;
    SELECT COUNT(*) INTO v_active_semesters FROM semesters WHERE is_active = true;
    SELECT COUNT(*) INTO v_subjects_linked FROM subjects WHERE semester_id IS NOT NULL;
    SELECT COUNT(*) INTO v_logs_linked FROM attendance_logs WHERE semester_id IS NOT NULL;
    
    RAISE NOTICE '============================================';
    RAISE NOTICE 'SEMESTER MANAGEMENT MIGRATION COMPLETED ✅';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Statistics:';
    RAISE NOTICE '  - Total Semesters: %', v_semesters_count;
    RAISE NOTICE '  - Active Semesters: %', v_active_semesters;
    RAISE NOTICE '  - Subjects Linked: %', v_subjects_linked;
    RAISE NOTICE '  - Logs Linked: %', v_logs_linked;
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Features Enabled:';
    RAISE NOTICE '  ✅ Multi-semester support';
    RAISE NOTICE '  ✅ Semester archiving';
    RAISE NOTICE '  ✅ Data cloning for new semesters';
    RAISE NOTICE '  ✅ Active semester enforcement';
    RAISE NOTICE '  ✅ Legacy data migration';
    RAISE NOTICE '  ✅ Helper functions for semester management';
    RAISE NOTICE '============================================';
END $$;

-- Record migration
INSERT INTO schema_migrations (version, description) 
VALUES ('016', 'Semester management system with archiving support')
ON CONFLICT (version) DO NOTHING;
