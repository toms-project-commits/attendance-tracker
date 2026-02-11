-- ============================================
-- ALLOW FRIENDS TO VIEW EACH OTHER'S ATTENDANCE DATA
-- Migration 022
-- ============================================
-- Adds RLS policies so friends can view each other's:
-- - subjects
-- - timetable_slots
-- - holidays
-- - attendance_logs
-- This fixes the "100% attendance" bug on friend analytics
-- ============================================

-- Record this migration
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  description TEXT,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO schema_migrations (version, description) 
VALUES ('022', 'Allow friends to view each others attendance data')
ON CONFLICT (version) DO NOTHING;

-- ============================================
-- PART 1: SUBJECTS TABLE RLS
-- ============================================

-- Allow users to view their friends' subjects
CREATE POLICY "Users can view friends subjects"
  ON public.subjects FOR SELECT
  USING (
    user_id IN (
      SELECT friend_id FROM public.friendships 
      WHERE user_id = auth.uid()
    )
  );

COMMENT ON POLICY "Users can view friends subjects" ON public.subjects IS 
  'Allows viewing subjects of users you are friends with';

-- ============================================
-- PART 2: TIMETABLE_SLOTS TABLE RLS
-- ============================================

-- Allow users to view their friends' timetable slots
CREATE POLICY "Users can view friends timetable"
  ON public.timetable_slots FOR SELECT
  USING (
    user_id IN (
      SELECT friend_id FROM public.friendships 
      WHERE user_id = auth.uid()
    )
  );

COMMENT ON POLICY "Users can view friends timetable" ON public.timetable_slots IS 
  'Allows viewing timetable slots of users you are friends with';

-- ============================================
-- PART 3: HOLIDAYS TABLE RLS
-- ============================================

-- Allow users to view their friends' holidays
CREATE POLICY "Users can view friends holidays"
  ON public.holidays FOR SELECT
  USING (
    user_id IN (
      SELECT friend_id FROM public.friendships 
      WHERE user_id = auth.uid()
    )
  );

COMMENT ON POLICY "Users can view friends holidays" ON public.holidays IS 
  'Allows viewing holidays of users you are friends with';

-- ============================================
-- PART 4: ATTENDANCE_LOGS TABLE RLS
-- ============================================

-- Allow users to view their friends' attendance logs
CREATE POLICY "Users can view friends attendance logs"
  ON public.attendance_logs FOR SELECT
  USING (
    user_id IN (
      SELECT friend_id FROM public.friendships 
      WHERE user_id = auth.uid()
    )
  );

COMMENT ON POLICY "Users can view friends attendance logs" ON public.attendance_logs IS 
  'Allows viewing attendance logs of users you are friends with';

-- ============================================
-- PART 5: VERIFICATION
-- ============================================

DO $$
DECLARE
    v_policies_count INTEGER;
BEGIN
    -- Count new policies created
    SELECT COUNT(*) INTO v_policies_count
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND policyname LIKE '%friends%'
      AND tablename IN ('subjects', 'timetable_slots', 'holidays', 'attendance_logs');
    
    RAISE NOTICE '============================================';
    RAISE NOTICE 'MIGRATION 022 COMPLETED SUCCESSFULLY ✅';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Added % friend-viewing policies', v_policies_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Fixed:';
    RAISE NOTICE '  ✅ Friends can now view each others subjects';
    RAISE NOTICE '  ✅ Friends can now view each others timetable';
    RAISE NOTICE '  ✅ Friends can now view each others holidays';
    RAISE NOTICE '  ✅ Friends can now view each others attendance logs';
    RAISE NOTICE '';
    RAISE NOTICE 'Result:';
    RAISE NOTICE '  ✅ Friend attendance will show correct percentages';
    RAISE NOTICE '  ✅ No more incorrect 100%% attendance displays';
    RAISE NOTICE '============================================';
END $$;
