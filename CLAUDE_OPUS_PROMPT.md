# Prompt for Claude Opus - Friend Request RLS Issue

## Problem Statement

I have a Next.js attendance tracking app with a friend request system. The notification badge correctly shows "1 pending request", but when the user navigates to the friend requests page (`/friends/requests`), it displays "No pending requests" - the list is empty.

### Symptoms:
- ✅ Notification badge count query works (shows correct number)
- ❌ Detailed list query returns empty array
- ✅ Database has the pending request record
- ❌ The JOIN with profiles table is not returning data

## Technical Context

### Database Structure

**Tables:**
1. `friendship_requests` - stores friend requests
   - `id` (UUID)
   - `requester_id` (UUID, references auth.users)
   - `recipient_id` (UUID, references auth.users)
   - `status` (TEXT: 'pending', 'accepted', 'rejected')
   - `created_at`, `updated_at` (TIMESTAMPTZ)

2. `profiles` - stores user profile information
   - `id` (UUID, references auth.users)
   - `username` (TEXT)
   - `full_name` (TEXT)
   - `created_at`, `updated_at` (TIMESTAMPTZ)

3. `friendships` - stores accepted friendships (bi-directional)
   - `id` (UUID)
   - `user_id` (UUID)
   - `friend_id` (UUID)
   - `created_at` (TIMESTAMPTZ)

### Frontend Code (app/friends/requests/page.tsx)

The component makes these Supabase queries:

**Count query (WORKS):**
```typescript
const { count } = await supabase
  .from('friendship_requests')
  .select('*', { count: 'exact', head: true })
  .eq('recipient_id', user.id)
  .eq('status', 'pending');
```

**Detailed query (DOESN'T WORK - returns empty):**
```typescript
const { data: received, error } = await supabase
  .from('friendship_requests')
  .select(`
    id,
    requester_id,
    recipient_id,
    created_at,
    status,
    requester:profiles!friendship_requests_requester_id_fkey(username, full_name)
  `)
  .eq('recipient_id', user.id)
  .eq('status', 'pending')
  .order('created_at', { ascending: false });
```

### Current RLS Policies

**On `friendship_requests`:**
```sql
-- Users can view requests they sent or received
CREATE POLICY "Users can view their own friendship requests"
  ON public.friendship_requests FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = recipient_id);
```

**On `profiles`:**
```sql
-- Own profile
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (id = (SELECT auth.uid()));

-- Public profiles with username
CREATE POLICY "Public profiles are viewable by username" ON profiles
  FOR SELECT USING (username IS NOT NULL);

-- Profiles for friend requests
CREATE POLICY "Users can view profiles for friend requests" ON profiles
  FOR SELECT
  USING (
    id IN (
      SELECT requester_id FROM public.friendship_requests 
      WHERE recipient_id = (SELECT auth.uid())
    )
    OR id IN (
      SELECT recipient_id FROM public.friendship_requests 
      WHERE requester_id = (SELECT auth.uid())
    )
    OR id IN (
      SELECT friend_id FROM public.friendships 
      WHERE user_id = (SELECT auth.uid())
    )
  );
```

### Migration Files Applied

1. `019_shared_attendance_system.sql` - Created the friendship tables and initial RLS
2. `020_fix_friend_requests.sql` - Attempted to fix RLS policies (but issue persists)

## What I Need From You

Please analyze this issue and provide:

1. **Root Cause Analysis**: Why is the JOIN query failing while the count query succeeds?

2. **Diagnostic Queries**: SQL queries I can run in Supabase SQL Editor to verify the exact issue with RLS policies

3. **Definitive Fix**: A complete SQL migration that will:
   - Fix the RLS policies so JOIN queries work
   - Ensure profile data is visible in friend request queries
   - Handle foreign key constraints properly
   - Not break existing functionality

4. **Verification Steps**: How to test that the fix works

## Additional Context

- Using Supabase PostgreSQL database
- Row Level Security (RLS) is enabled on all tables
- The app uses `@supabase/supabase-js` client
- Foreign key constraints exist: `friendship_requests_requester_id_fkey` and `friendship_requests_recipient_id_fkey`
- Multiple RLS policies may exist on profiles table from previous migrations

## Debug Information Available

Run these queries and share results:

```sql
-- 1. Check all RLS policies on profiles
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'profiles';

-- 2. Test the problematic query directly
SELECT 
  fr.id,
  fr.requester_id,
  fr.recipient_id,
  requester.username,
  requester.full_name
FROM friendship_requests fr
LEFT JOIN profiles requester ON fr.requester_id = requester.id
WHERE fr.recipient_id = auth.uid() AND fr.status = 'pending';

-- 3. Check if profiles are visible at all
SELECT id, username FROM profiles LIMIT 5;
```

## Expected Outcome

After applying your fix:
- User should see pending friend requests with requester's username and full_name
- Accept/Reject buttons should work
- No other functionality should be broken
- The solution should be production-ready and secure

Please provide a comprehensive solution with clear explanations of what was wrong and how you fixed it.
