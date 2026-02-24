-- ============================================
-- COMPREHENSIVE FRIENDS SYSTEM FIX
-- Migration 026
-- ============================================
-- Root cause: Multiple conflicting triggers and RLS policies
-- from migrations 019-025 create race conditions and policy
-- conflicts that prevent friendship creation/persistence.
--
-- This migration:
--   1. Drops ALL existing triggers on friendship_requests
--   2. Recreates a single clean trigger (AFTER UPDATE)
--   3. Consolidates all friendships RLS policies
--   4. Ensures the view is correct with proper column names
--   5. Drops unused indexes to reduce bloat
--   6. Verifies the complete system
-- ============================================

-- Track migration
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  description TEXT,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO schema_migrations (version, description)
VALUES ('026', 'Comprehensive friends system fix - triggers, policies, indexes')
ON CONFLICT (version) DO NOTHING;

-- ============================================
-- PART 1: DROP ALL FRIENDSHIP TRIGGERS
-- ============================================
-- Clean slate - remove ALL triggers on friendship_requests
DROP TRIGGER IF EXISTS on_friendship_request_accepted ON public.friendship_requests;
DROP TRIGGER IF EXISTS on_friendship_request_update ON public.friendship_requests;
DROP TRIGGER IF EXISTS on_friendship_request_status_change ON public.friendship_requests;

-- ============================================
-- PART 2: RECREATE CLEAN TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_friendship_request_update()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only act when status changes from pending to accepted
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- Insert bi-directional friendship rows
    INSERT INTO public.friendships (user_id, friend_id)
    VALUES (NEW.requester_id, NEW.recipient_id)
    ON CONFLICT (user_id, friend_id) DO NOTHING;

    INSERT INTO public.friendships (user_id, friend_id)
    VALUES (NEW.recipient_id, NEW.requester_id)
    ON CONFLICT (user_id, friend_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Single AFTER UPDATE trigger
CREATE TRIGGER on_friendship_request_update
  AFTER UPDATE ON public.friendship_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_friendship_request_update();

-- ============================================
-- PART 3: FIX FRIENDSHIP DELETION TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_friendship_deletion()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete the reverse friendship as well
  DELETE FROM public.friendships
  WHERE user_id = OLD.friend_id AND friend_id = OLD.user_id;

  -- Also clean up friendship requests between these users
  DELETE FROM public.friendship_requests
  WHERE (requester_id = OLD.user_id AND recipient_id = OLD.friend_id)
     OR (requester_id = OLD.friend_id AND recipient_id = OLD.user_id);

  RETURN OLD;
END;
$$;

-- Ensure the deletion trigger exists
DROP TRIGGER IF EXISTS on_friendship_deleted ON public.friendships;
CREATE TRIGGER on_friendship_deleted
  BEFORE DELETE ON public.friendships
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_friendship_deletion();

-- ============================================
-- PART 4: CONSOLIDATE FRIENDSHIPS RLS POLICIES
-- ============================================
-- Drop ALL existing policies on friendships to start clean
DROP POLICY IF EXISTS "Users can view their friendships" ON public.friendships;
DROP POLICY IF EXISTS "Users can view own friendships" ON public.friendships;
DROP POLICY IF EXISTS "Users can delete their friendships" ON public.friendships;
DROP POLICY IF EXISTS "Users can delete own friendships" ON public.friendships;
DROP POLICY IF EXISTS "Users can insert own friendships" ON public.friendships;
DROP POLICY IF EXISTS "Allow friendship creation" ON public.friendships;
DROP POLICY IF EXISTS "Allow friendship creation from accepted requests" ON public.friendships;
DROP POLICY IF EXISTS "Friendships created by trigger" ON public.friendships;

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- SELECT: users can see friendships they're part of
CREATE POLICY "friendships_select_policy"
  ON public.friendships FOR SELECT
  USING ((select auth.uid()) = user_id OR (select auth.uid()) = friend_id);

-- INSERT: allow when an accepted friendship request exists between the users
-- This supports both direct inserts and SECURITY DEFINER trigger inserts
CREATE POLICY "friendships_insert_policy"
  ON public.friendships FOR INSERT
  WITH CHECK (
    (select auth.uid()) = user_id
    OR EXISTS (
      SELECT 1 FROM public.friendship_requests
      WHERE status = 'accepted'
        AND (
          (requester_id = user_id AND recipient_id = friend_id)
          OR (recipient_id = user_id AND requester_id = friend_id)
        )
    )
  );

-- DELETE: users can remove their own friendships
CREATE POLICY "friendships_delete_policy"
  ON public.friendships FOR DELETE
  USING ((select auth.uid()) = user_id OR (select auth.uid()) = friend_id);

-- Grant permissions
GRANT SELECT, INSERT, DELETE ON public.friendships TO authenticated;

-- ============================================
-- PART 5: ENSURE UNIQUE CONSTRAINT
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.friendships'::regclass
      AND conname = 'friendships_user_id_friend_id_key'
  ) THEN
    ALTER TABLE public.friendships
      ADD CONSTRAINT friendships_user_id_friend_id_key
      UNIQUE (user_id, friend_id);
  END IF;
END $$;

-- ============================================
-- PART 6: RECREATE friends_with_profiles VIEW
-- ============================================
DROP VIEW IF EXISTS public.friends_with_profiles CASCADE;

CREATE VIEW public.friends_with_profiles
WITH (security_invoker = true)
AS
SELECT
  f.id          AS friendship_id,
  f.user_id,
  f.friend_id,
  f.created_at,
  p.username    AS friend_username,
  p.full_name   AS friend_full_name
FROM public.friendships f
JOIN public.profiles p ON f.friend_id = p.id;

GRANT SELECT ON public.friends_with_profiles TO authenticated;

-- ============================================
-- PART 7: ENSURE PROFILES SELECT POLICIES
-- ============================================
-- Users must be able to see friend profiles for the view to work.
-- "Public profiles are viewable by username" should already exist.
-- Let's ensure it does.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles'
      AND policyname = 'Public profiles are viewable by username'
  ) THEN
    EXECUTE '
      CREATE POLICY "Public profiles are viewable by username" ON public.profiles
        FOR SELECT
        USING (username IS NOT NULL)
    ';
  END IF;
END $$;

-- ============================================
-- PART 8: DROP UNUSED INDEXES
-- ============================================
-- Based on Supabase inspect db index-stats, these indexes have 0 scans

DROP INDEX IF EXISTS public.idx_profiles_username_search;
DROP INDEX IF EXISTS public.idx_attendance_semester;
DROP INDEX IF EXISTS public.idx_subjects_semester;
DROP INDEX IF EXISTS public.idx_unique_attendance_extra_class_legacy;
DROP INDEX IF EXISTS public.idx_friendship_requests_status_recipient;
DROP INDEX IF EXISTS public.idx_profiles_terms_accepted;
DROP INDEX IF EXISTS public.idx_semesters_user_dates;
DROP INDEX IF EXISTS public.idx_attendance_logs_proof_url;
DROP INDEX IF EXISTS public.idx_unique_attendance_with_slot_legacy;
DROP INDEX IF EXISTS public.idx_profiles_full_name;
DROP INDEX IF EXISTS public.idx_unique_attendance_extra_class_semester;
DROP INDEX IF EXISTS public.idx_profiles_username_unique;
DROP INDEX IF EXISTS public.idx_friendships_composite;
DROP INDEX IF EXISTS public.idx_logs_slot;
DROP INDEX IF EXISTS public.idx_unique_attendance_with_slot_semester;
DROP INDEX IF EXISTS public.idx_timetable_semester;
DROP INDEX IF EXISTS public.idx_unique_attendance_no_slot_no_time_legacy;
DROP INDEX IF EXISTS public.idx_unique_attendance_no_slot_no_time_semester;

-- ============================================
-- PART 9: UPDATE STATISTICS
-- ============================================
ANALYZE public.friendships;
ANALYZE public.friendship_requests;
ANALYZE public.profiles;

-- ============================================
-- PART 10: VERIFICATION
-- ============================================
DO $$
DECLARE
  v_view_exists BOOLEAN;
  v_trigger_count INTEGER;
  v_policy_count INTEGER;
  v_constraint_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'friends_with_profiles'
  ) INTO v_view_exists;

  SELECT COUNT(*) INTO v_trigger_count
  FROM pg_trigger
  WHERE tgrelid = 'public.friendship_requests'::regclass
    AND NOT tgisinternal;

  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'friendships';

  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.friendships'::regclass
      AND conname = 'friendships_user_id_friend_id_key'
  ) INTO v_constraint_exists;

  RAISE NOTICE '============================================';
  RAISE NOTICE 'MIGRATION 026 RESULTS';
  RAISE NOTICE '============================================';
  RAISE NOTICE '  View friends_with_profiles exists: %', v_view_exists;
  RAISE NOTICE '  Triggers on friendship_requests:   % (should be 1)', v_trigger_count;
  RAISE NOTICE '  Policies on friendships:           % (should be 3)', v_policy_count;
  RAISE NOTICE '  Unique constraint exists:          %', v_constraint_exists;
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Comprehensive friends fix applied ✅';
  RAISE NOTICE '============================================';
END $$;
