-- ============================================
-- REMOVE DUPLICATE INDEXES
-- Migration 013
-- ============================================
-- Removes duplicate indexes to improve database performance
-- and reduce storage overhead
-- ============================================

BEGIN;

-- Record this migration
INSERT INTO schema_migrations (version, description) 
VALUES ('013', 'Remove duplicate indexes from attendance_logs and holidays tables')
ON CONFLICT (version) DO UPDATE SET
  description = EXCLUDED.description,
  applied_at = CURRENT_TIMESTAMP;

-- ============================================
-- PART 1: REMOVE DUPLICATE INDEXES FROM ATTENDANCE_LOGS
-- ============================================

-- Drop duplicate slot index (keep idx_logs_slot, drop idx_attendance_logs_slot)
DROP INDEX IF EXISTS idx_attendance_logs_slot;

-- Drop duplicate date index (keep idx_logs_user_date, drop idx_logs_date_desc)
DROP INDEX IF EXISTS idx_logs_date_desc;

-- ============================================
-- PART 2: REMOVE DUPLICATE INDEXES FROM HOLIDAYS
-- ============================================

-- Drop duplicate date index (keep idx_holidays_user_date, drop idx_holidays_date_asc)
DROP INDEX IF EXISTS idx_holidays_date_asc;

-- ============================================
-- PART 3: VERIFICATION
-- ============================================

DO $$
DECLARE
    v_attendance_indexes INTEGER;
    v_holidays_indexes INTEGER;
    v_total_indexes INTEGER;
BEGIN
    -- Count indexes per table
    SELECT COUNT(*) INTO v_attendance_indexes 
    FROM pg_indexes 
    WHERE schemaname = 'public' AND tablename = 'attendance_logs';
    
    SELECT COUNT(*) INTO v_holidays_indexes 
    FROM pg_indexes 
    WHERE schemaname = 'public' AND tablename = 'holidays';
    
    SELECT COUNT(*) INTO v_total_indexes 
    FROM pg_indexes 
    WHERE schemaname = 'public';
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ DUPLICATE INDEXES REMOVED';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE '📦 INDEXES REMOVED:';
    RAISE NOTICE '  ❌ idx_attendance_logs_slot (duplicate of idx_logs_slot)';
    RAISE NOTICE '  ❌ idx_logs_date_desc (duplicate of idx_logs_user_date)';
    RAISE NOTICE '  ❌ idx_holidays_date_asc (duplicate of idx_holidays_user_date)';
    RAISE NOTICE '';
    RAISE NOTICE '📊 CURRENT INDEX COUNT:';
    RAISE NOTICE '  ✅ attendance_logs: % indexes', v_attendance_indexes;
    RAISE NOTICE '  ✅ holidays: % indexes', v_holidays_indexes;
    RAISE NOTICE '  ✅ Total public indexes: %', v_total_indexes;
    RAISE NOTICE '';
    RAISE NOTICE '⚡ BENEFITS:';
    RAISE NOTICE '  ✅ Reduced storage overhead';
    RAISE NOTICE '  ✅ Faster write operations (fewer indexes to update)';
    RAISE NOTICE '  ✅ Simplified maintenance';
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'MIGRATION 013 COMPLETED SUCCESSFULLY ✅';
    RAISE NOTICE '============================================';
END $$;

COMMIT;

-- Final verification
SELECT 
    '✅ Duplicate Indexes Removed!' as status,
    version as migration_version,
    applied_at as when_applied,
    description
FROM schema_migrations 
WHERE version = '013'
ORDER BY version DESC
LIMIT 1;
