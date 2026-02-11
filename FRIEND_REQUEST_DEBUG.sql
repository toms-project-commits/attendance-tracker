-- ============================================
-- FRIEND REQUEST DEBUG QUERIES
-- Run these in Supabase SQL Editor to diagnose issues
-- ============================================

-- 1. Check if migrations 020 and 021 were applied
SELECT * FROM schema_migrations WHERE version IN ('020', '021') ORDER BY version;

-- 2. Check all existing friendship_requests
SELECT 
  id,
  requester_id,
  recipient_id,
  status,
  created_at
FROM friendship_requests
ORDER BY created_at DESC;

-- 3. Check received requests for current user
SELECT 
  fr.id,
  fr.requester_id,
  fr.recipient_id,
  fr.status,
  fr.created_at
FROM friendship_requests fr
WHERE fr.recipient_id = auth.uid()
  AND fr.status = 'pending';

-- 4. Test the friend_requests_with_profiles view (used by the app)
SELECT * FROM friend_requests_with_profiles
WHERE recipient_id = auth.uid() AND status = 'pending';

-- 5. Test the friends_with_profiles view (used by friends list)
SELECT * FROM friends_with_profiles
WHERE user_id = auth.uid();

-- 6. Check if profiles are visible
SELECT id, username, full_name 
FROM profiles 
WHERE username IS NOT NULL
LIMIT 5;

-- 7. Check RLS policies on all friend-related tables
SELECT 
  tablename, 
  policyname, 
  cmd
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'friendship_requests', 'friendships')
ORDER BY tablename, policyname;

-- 8. Check request counts by status
SELECT 
  status,
  COUNT(*) as count
FROM friendship_requests
WHERE recipient_id = auth.uid()
GROUP BY status;

-- 9. Verify the friends_with_profiles view has friendship_id column
SELECT column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'friends_with_profiles'
ORDER BY ordinal_position;
