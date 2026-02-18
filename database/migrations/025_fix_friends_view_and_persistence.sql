-- ============================================
-- FIX FRIENDS VIEW AND PERSISTENCE BUG
-- Migration 025
-- ============================================
-- Root-cause fix for the friend persistence bug:
--
-- Migration 023 recreated friends_with_profiles and aliased
-- `f.created_at AS friend_since`. The application code, however,
-- queries `.order('created_at', ...)` on this view.
--
-- PostgREST sees no column named `created_at` in the view (only
-- `friend_since`), returns an error, and the friends list shows
-- empty after every fresh login.
--
-- This migration:
--   1. Recreates friends_with_profiles exposing `created_at`
--      directly (no alias) so the existing code works.
--   2. Ensures the unique constraint on friendships(user_id, friend_id)
--      exists — required for ON CONFLICT in the trigger.
--   3. Verifies / recreates the acceptance trigger so bi-directional
--      friendship rows are always created.
--   4. Ensures RLS SELECT policies allow users to read their own rows.
-- ============================================

-- Track migration
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  description TEXT,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO schema_migrations (version, description)
VALUES ('025', 'Fix friends_with_profiles view column alias causing empty friend lists')
ON CONFLICT (version) DO NOTHING;

-- ============================================
-- PART 1: ENSURE UNIQUE CONSTRAINT ON friendships
-- ============================================
-- The trigger uses ON CONFLICT (user_id, friend_id) DO NOTHING,
-- which requires a unique constraint on those two columns.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.friendships'::regclass
      AND contype = 'u'
      AND conname = 'friendships_user_id_friend_id_key'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.friendships'::regclass
      AND contype = 'p'
      AND array_length(conkey, 1) = 2
  ) THEN
    ALTER TABLE public.friendships
      ADD CONSTRAINT friendships_user_id_friend_id_key
      UNIQUE (user_id, friend_id);
    RAISE NOTICE 'Added unique constraint on friendships(user_id, friend_id)';
  ELSE
    RAISE NOTICE 'Unique constraint on friendships(user_id, friend_id) already exists — skipping';
  END IF;
END $$;

-- ============================================
-- PART 2: FIX friends_with_profiles VIEW
-- ============================================
-- Expose `created_at` without aliasing so PostgREST ordering works.

DROP VIEW IF EXISTS public.friends_with_profiles CASCADE;

CREATE VIEW public.friends_with_profiles
WITH (security_invoker = true)
AS
SELECT
  f.id          AS friendship_id,
  f.user_id,
  f.friend_id,
  f.created_at,                         -- no alias — matches what the app orders by
  p.username    AS friend_username,
  p.full_name   AS friend_full_name
FROM public.friendships f
JOIN public.profiles p ON f.friend_id = p.id;

GRANT SELECT ON public.friends_with_profiles TO authenticated;

COMMENT ON VIEW public.friends_with_profiles IS
  'Friends list with profile info. created_at is exposed directly (not aliased) so PostgREST ordering works correctly.';

-- ============================================
-- PART 3: VERIFY / RECREATE ACCEPTANCE TRIGGER
-- ============================================
-- Ensures the trigger that creates bi-directional friendship rows
-- when a request is accepted is present and correct.

CREATE OR REPLACE FUNCTION public.handle_friendship_request_update()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- Insert friendship from requester to recipient
    INSERT INTO public.friendships (user_id, friend_id)
    VALUES (NEW.requester_id, NEW.recipient_id)
    ON CONFLICT (user_id, friend_id) DO NOTHING;

    -- Insert friendship from recipient to requester (bi-directional)
    INSERT INTO public.friendships (user_id, friend_id)
    VALUES (NEW.recipient_id, NEW.requester_id)
    ON CONFLICT (user_id, friend_id) DO NOTHING;

    RAISE NOTICE 'Created bi-directional friendship: % <-> %', NEW.requester_id, NEW.recipient_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Make sure the trigger is attached to the table
DROP TRIGGER IF EXISTS on_friendship_request_update ON public.friendship_requests;

CREATE TRIGGER on_friendship_request_update
  AFTER UPDATE ON public.friendship_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_friendship_request_update();

COMMENT ON FUNCTION public.handle_friendship_request_update() IS
  'Creates bi-directional friendship rows when a friend request is accepted.';

-- ============================================
-- PART 4: ENSURE RLS POLICIES FOR friendships
-- ============================================
-- With SECURITY INVOKER views the RLS on the underlying table applies.
-- Users must be able to SELECT rows where they are user_id.

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- SELECT: each user sees their own rows
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'friendships'
      AND policyname = 'Users can view own friendships'
  ) THEN
    EXECUTE '
      CREATE POLICY "Users can view own friendships"
        ON public.friendships FOR SELECT
        USING (user_id = auth.uid())
    ';
    RAISE NOTICE 'Created SELECT policy on friendships';
  ELSE
    RAISE NOTICE 'SELECT policy on friendships already exists';
  END IF;
END $$;

-- INSERT: users may only insert rows where they are user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'friendships'
      AND policyname = 'Users can insert own friendships'
  ) THEN
    EXECUTE '
      CREATE POLICY "Users can insert own friendships"
        ON public.friendships FOR INSERT
        WITH CHECK (user_id = auth.uid())
    ';
    RAISE NOTICE 'Created INSERT policy on friendships';
  ELSE
    RAISE NOTICE 'INSERT policy on friendships already exists';
  END IF;
END $$;

-- DELETE: users may delete their own friendship rows
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'friendships'
      AND policyname = 'Users can delete own friendships'
  ) THEN
    EXECUTE '
      CREATE POLICY "Users can delete own friendships"
        ON public.friendships FOR DELETE
        USING (user_id = auth.uid())
    ';
    RAISE NOTICE 'Created DELETE policy on friendships';
  ELSE
    RAISE NOTICE 'DELETE policy on friendships already exists';
  END IF;
END $$;

-- ============================================
-- PART 5: VERIFICATION
-- ============================================
DO $$
DECLARE
  v_view_exists BOOLEAN;
  v_trigger_exists BOOLEAN;
  v_unique_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'friends_with_profiles'
  ) INTO v_view_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_friendship_request_update'
  ) INTO v_trigger_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.friendships'::regclass
      AND contype IN ('u','p')
      AND conname LIKE '%user_id_friend_id%'
  ) INTO v_unique_exists;

  RAISE NOTICE '============================================';
  RAISE NOTICE 'MIGRATION 025 RESULTS';
  RAISE NOTICE '============================================';
  RAISE NOTICE '  View friends_with_profiles exists: %', v_view_exists;
  RAISE NOTICE '  Acceptance trigger exists:         %', v_trigger_exists;
  RAISE NOTICE '  Unique constraint exists:          %', v_unique_exists;
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Friend persistence bug fix applied ✅';
  RAISE NOTICE '============================================';
END $$;
