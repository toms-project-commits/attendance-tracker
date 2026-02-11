# Friend Requests Fix - Migration 020

## Problem
Users receiving friend requests could see the notification badge but couldn't see the actual requests or accept/reject them due to RLS (Row Level Security) policy issues.

## Root Causes Identified

1. **Restrictive INSERT policy on friendships table** - Prevented the trigger from creating friendships when requests were accepted
2. **Missing profile viewing permissions** - Users couldn't see profile information of people who sent them friend requests
3. **RLS policies blocking JOIN operations** - The JOIN with profiles table in queries was being blocked by RLS

## Solution

Migration `020_fix_friend_requests.sql` fixes all these issues by:

### 1. Fixing Friendships INSERT Policy
- Removed the overly restrictive `WITH CHECK (false)` policy
- Created a new policy that allows friendship creation when a valid friendship request exists
- This allows the trigger function to properly create bi-directional friendships

### 2. Improving Profile Visibility
- Added policy to allow viewing profiles of users involved in friend requests
- Users can now see profiles of:
  - People who sent them requests
  - People they sent requests to
  - Their existing friends

### 3. Adding Helper View
- Created `friend_requests_with_profiles` view for easier querying
- Pre-joins friendship requests with profile information
- Simplifies frontend queries

### 4. Improved Trigger Function
- Enhanced error handling
- Added logging for debugging
- Ensured proper permissions

## How to Apply the Fix

### Option 1: Supabase Dashboard (Recommended)

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy the entire contents of `database/migrations/020_fix_friend_requests.sql`
5. Paste it into the SQL editor
6. Click **Run** to execute the migration
7. Verify the success message appears in the Results panel

### Option 2: Using Supabase CLI

If you have Supabase CLI installed:

```bash
supabase db push --file database/migrations/020_fix_friend_requests.sql
```

## Verification Steps

After applying the migration:

1. **Test Friend Request Visibility:**
   - Have User A send a friend request to User B
   - Log in as User B
   - Navigate to Friends → Requests (bell icon)
   - You should see the request with User A's username and full name

2. **Test Accept Functionality:**
   - Click "Accept" on a pending request
   - Verify the request disappears from the pending list
   - Check Friends page - the user should now appear in your friends list
   - Check the other user's friends list - you should appear there too (bi-directional)

3. **Test Reject Functionality:**
   - Have someone send you a request
   - Click "Reject" on the request
   - Request should disappear and friendship should not be created

4. **Test Cancel Sent Request:**
   - Send a friend request to someone
   - Go to Requests → Sent tab
   - Click "Cancel Request"
   - Request should be removed

## What Was Fixed

✅ Friend requests now visible to recipients with full profile information  
✅ Accept button creates bi-directional friendships correctly  
✅ Reject button works and updates request status  
✅ Cancel button works for sent requests  
✅ Profile information displays correctly (username, full name, avatar)  
✅ Notification badge shows correct count  
✅ All RLS policies properly configured  
✅ Trigger functions work with proper permissions  

## Technical Details

### Database Changes

**Tables Modified:**
- `friendships` - Updated INSERT policy
- `profiles` - Added friend request viewing policy

**Functions Updated:**
- `handle_friendship_request_update()` - Improved with better error handling

**New Database Objects:**
- View: `friend_requests_with_profiles` - Combines requests with profile data

### RLS Policies Added/Modified

1. **friendships.Allow friendship creation** - Allows inserts when valid request exists
2. **profiles.Users can view profiles for friend requests** - Allows viewing profiles involved in requests
3. **profiles.Public profiles are viewable by username** - Allows public profile searches

## Troubleshooting

If friend requests still don't show up:

1. **Check migration executed successfully:**
   ```sql
   SELECT * FROM schema_migrations WHERE version = '020';
   ```

2. **Verify policies exist:**
   ```sql
   SELECT schemaname, tablename, policyname 
   FROM pg_policies 
   WHERE schemaname = 'public' 
   AND tablename IN ('friendships', 'friendship_requests', 'profiles');
   ```

3. **Check for pending requests:**
   ```sql
   SELECT * FROM friend_requests_with_profiles 
   WHERE recipient_id = auth.uid() AND status = 'pending';
   ```

4. **Clear browser cache and reload the page**

## Support

If you encounter any issues after applying this migration:
1. Check the browser console for errors
2. Check the Supabase logs in the dashboard
3. Verify all steps in the Verification section
4. Report the issue with error logs

---

**Migration Version:** 020  
**Created:** 2026-02-12  
**Status:** Ready to apply
