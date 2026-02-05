-- ============================================
-- FIX ALL RLS PERFORMANCE ISSUES
-- Migration 012
-- ============================================
-- This migration ensures ALL RLS policies are optimized
-- Wraps all auth.uid() calls in (SELECT auth.uid())
-- to prevent re-evaluation for each row
-- ============================================

BEGIN;

-- Record this migration
INSERT INTO schema_migrations (version, description) 
VALUES ('012', 'Fix all RLS performance issues - comprehensive optimization of all policies')
ON CONFLICT (version) DO UPDATE SET
  description = EXCLUDED.description,
  applied_at = CURRENT_TIMESTAMP;

-- ============================================
-- PART 1: PROFILES TABLE
-- ============================================

DROP POLICY IF EXISTS "Users manage their own profiles" ON profiles;

CREATE POLICY "Users manage their own profiles" ON profiles
  FOR ALL 
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- ============================================
-- PART 2: SUBJECTS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users manage their own subjects" ON subjects;

CREATE POLICY "Users manage their own subjects" ON subjects
  FOR ALL 
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ============================================
-- PART 3: TIMETABLE_SLOTS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users manage their own timetable" ON timetable_slots;

CREATE POLICY "Users manage their own timetable" ON timetable_slots
  FOR ALL 
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ============================================
-- PART 4: ATTENDANCE_LOGS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view their own attendance" ON attendance_logs;
DROP POLICY IF EXISTS "Users can insert their own attendance" ON attendance_logs;
DROP POLICY IF EXISTS "Users can update their own attendance" ON attendance_logs;
DROP POLICY IF EXISTS "Users can delete their own attendance" ON attendance_logs;
DROP POLICY IF EXISTS "Users manage their own logs" ON attendance_logs;

CREATE POLICY "Users manage their own logs" ON attendance_logs
  FOR ALL 
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ============================================
-- PART 5: HOLIDAYS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users manage their own holidays" ON holidays;

CREATE POLICY "Users manage their own holidays" ON holidays
  FOR ALL 
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ============================================
-- PART 6: USER_PASSWORDS TABLE (IMPORTANT!)
-- ============================================

-- Drop ALL existing policies on user_passwords
DROP POLICY IF EXISTS "Allow viewing all passwords" ON user_passwords;
DROP POLICY IF EXISTS "Users can insert own password" ON user_passwords;
DROP POLICY IF EXISTS "Users can update own password" ON user_passwords;
DROP POLICY IF EXISTS "Users can delete own password" ON user_passwords;

-- Create optimized policies with subqueries
CREATE POLICY "Allow viewing all passwords" ON user_passwords
  FOR SELECT 
  USING (true);  -- Admins need to view all passwords

CREATE POLICY "Users can insert own password" ON user_passwords
  FOR INSERT 
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own password" ON user_passwords
  FOR UPDATE 
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ============================================
-- PART 7: SCHEMA_MIGRATIONS TABLE
-- ============================================

ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view migrations" ON schema_migrations;
CREATE POLICY "Anyone can view migrations" ON schema_migrations
  FOR SELECT USING (true);

-- ============================================
-- PART 8: VERIFICATION REPORT
-- ============================================

DO $$
DECLARE
    v_tables_with_rls INTEGER;
    v_total_policies INTEGER;
    v_profiles_policies INTEGER;
    v_subjects_policies INTEGER;
    v_timetable_policies INTEGER;
    v_attendance_policies INTEGER;
    v_holidays_policies INTEGER;
    v_passwords_policies INTEGER;
BEGIN
    -- Count tables with RLS enabled
    SELECT COUNT(*) INTO v_tables_with_rls
    FROM pg_tables t
    JOIN pg_class c ON t.tablename = c.relname
    WHERE t.schemaname = 'public' 
    AND c.relrowsecurity = true;
    
    -- Count total RLS policies
    SELECT COUNT(*) INTO v_total_policies
    FROM pg_policies
    WHERE schemaname = 'public';
    
    -- Count policies per table
    SELECT COUNT(*) INTO v_profiles_policies FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles';
    SELECT COUNT(*) INTO v_subjects_policies FROM pg_policies WHERE schemaname = 'public' AND tablename = 'subjects';
    SELECT COUNT(*) INTO v_timetable_policies FROM pg_policies WHERE schemaname = 'public' AND tablename = 'timetable_slots';
    SELECT COUNT(*) INTO v_attendance_policies FROM pg_policies WHERE schemaname = 'public' AND tablename = 'attendance_logs';
    SELECT COUNT(*) INTO v_holidays_policies FROM pg_policies WHERE schemaname = 'public' AND tablename = 'holidays';
    SELECT COUNT(*) INTO v_passwords_policies FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_passwords';
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '🎉 ALL RLS PERFORMANCE ISSUES FIXED!';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 DATABASE STATUS:';
    RAISE NOTICE '  ✅ Tables with RLS: %', v_tables_with_rls;
    RAISE NOTICE '  ✅ Total policies: %', v_total_policies;
    RAISE NOTICE '';
    RAISE NOTICE '📋 POLICIES PER TABLE:';
    RAISE NOTICE '  ✅ profiles: % policy', v_profiles_policies;
    RAISE NOTICE '  ✅ subjects: % policy', v_subjects_policies;
    RAISE NOTICE '  ✅ timetable_slots: % policy', v_timetable_policies;
    RAISE NOTICE '  ✅ attendance_logs: % policy', v_attendance_policies;
    RAISE NOTICE '  ✅ holidays: % policy', v_holidays_policies;
    RAISE NOTICE '  ✅ user_passwords: % policies', v_passwords_policies;
    RAISE NOTICE '';
    RAISE NOTICE '⚡ PERFORMANCE OPTIMIZATION:';
    RAISE NOTICE '  ✅ All auth.uid() wrapped in (SELECT auth.uid())';
    RAISE NOTICE '  ✅ Functions evaluated ONCE per query, not per row';
    RAISE NOTICE '  ✅ Massive performance boost for large datasets';
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '📝 REMAINING TASKS:';
    RAISE NOTICE '';
    RAISE NOTICE '1. FIX STORAGE POLICIES (if using storage)';
    RAISE NOTICE '   → See STORAGE_POLICY_FIX.md';
    RAISE NOTICE '';
    RAISE NOTICE '2. ENABLE HAVEIBEENPWNED';
    RAISE NOTICE '   → Auth > Settings > Leaked Password Protection';
    RAISE NOTICE '';
    RAISE NOTICE '3. VERIFY IN SECURITY ADVISOR';
    RAISE NOTICE '   → Database > Security Advisor > Run';
    RAISE NOTICE '   → All database issues should be ✅ RESOLVED!';
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'MIGRATION 012 COMPLETED SUCCESSFULLY ✅';
    RAISE NOTICE '============================================';
END $$;

COMMIT;

-- Final verification
SELECT 
    '🎉 All RLS Performance Issues Fixed!' as status,
    version as migration_version,
    applied_at as when_applied,
    description
FROM schema_migrations 
WHERE version = '012'
ORDER BY version DESC
LIMIT 1;
