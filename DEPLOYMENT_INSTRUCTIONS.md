# Deployment Instructions - Username System Upgrade

## ⚠️ IMPORTANT: Database Migration Required

Before the new username feature will work, you MUST run the database migration on your Supabase instance.

## Step 1: Run Database Migration

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project: `attendance-tracker`

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "+ New query"

3. **Copy and Execute Migration**
   - Copy the entire contents of `database/migrations/002_add_username.sql`
   - Paste into the SQL editor
   - Click "Run" or press `Ctrl + Enter`

4. **Verify Migration Success**
   - You should see: "Success. No rows returned"
   - Check the "Table Editor" → "profiles" table
   - Verify that the `username` column now exists

### Migration SQL (for reference)
```sql
-- Add username column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT;

-- Create unique index on username (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_unique ON profiles(LOWER(username));

-- Add index for faster username lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- Add constraint to ensure username follows rules
ALTER TABLE profiles ADD CONSTRAINT username_format 
CHECK (username ~ '^[a-zA-Z0-9_]{3,20}$');
```

## Step 2: Deploy Application Updates

The code changes have already been pushed to GitHub. If you're using automatic deployment (Vercel, Netlify, etc.), the changes should deploy automatically.

### Manual Deployment (if needed)
```bash
# Pull latest changes
git pull origin main

# Install dependencies (if any were added)
npm install

# Build the application
npm run build

# Start the application
npm start
```

## Step 3: Test the Username System

### For New Users
1. Sign up with a new account
2. You'll be redirected to the setup page
3. Choose a username (3-20 characters, alphanumeric + underscore)
4. The system will check availability in real-time
5. Complete setup and verify username appears on dashboard

### For Existing Users
1. Log in to your account
2. If you don't have a username, you'll be prompted to set one
3. Once set, your username cannot be changed
4. Verify username appears on dashboard instead of email

### Test Cases to Verify

✅ **Username Validation**
- Try username with less than 3 characters → Should show error
- Try username with more than 20 characters → Should show error
- Try username with special characters → Should show error
- Try valid username → Should show green checkmark

✅ **Uniqueness**
- Create username "test_user"
- Try creating another account with "test_user" → Should be taken
- Try "TEST_USER" → Should also be taken (case-insensitive)
- Try "test_user2" → Should be available

✅ **Permanence**
- Set a username
- Try to go back to setup page and change it → Should be prevented
- Verify database constraint prevents changes

✅ **Display**
- Check dashboard welcome message shows username
- Verify username is used instead of email-derived name

## Step 4: Rollback (if needed)

If you encounter issues, you can rollback the changes:

### Rollback Database
```sql
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS username_format;
DROP INDEX IF EXISTS idx_profiles_username_unique;
DROP INDEX IF EXISTS idx_profiles_username;
ALTER TABLE profiles DROP COLUMN IF EXISTS username;
```

### Rollback Code
```bash
git revert HEAD
git push origin main
```

## Troubleshooting

### Issue: Migration fails with "relation already exists"
**Solution**: The migration is already applied. No action needed.

### Issue: Username not showing on dashboard
**Solution**: 
1. Clear browser cache
2. Log out and log back in
3. Verify the database migration was successful
4. Check browser console for errors

### Issue: "Username taken" but user doesn't exist
**Solution**: 
1. Check Supabase Table Editor → profiles → username column
2. Query: `SELECT username FROM profiles WHERE LOWER(username) = 'your_username'`
3. If ghost entry exists, contact support or manually delete

### Issue: Can't set username during setup
**Solution**:
1. Check network tab for errors
2. Verify Supabase connection is working
3. Check if unique index is created: `\d profiles` in SQL editor
4. Try a different username (current one may be taken)

## Performance Notes

The migration adds indexes that improve performance:
- `idx_profiles_username_unique`: Ensures fast uniqueness checks
- `idx_profiles_username`: Speeds up username lookups

No significant performance impact expected.

## Data Migration for Existing Users

Existing users without usernames:
- Will be prompted to create one on next login/setup visit
- Cannot proceed without setting a username
- Once set, it's permanent

## Security Considerations

✅ **Implemented Security Measures**:
- Database-level constraints prevent invalid usernames
- Case-insensitive uniqueness prevents confusion
- Server-side validation prevents bypassing client checks
- Input sanitization prevents SQL injection
- Usernames are stored in lowercase for consistency

## Support

If you encounter any issues:
1. Check this deployment guide
2. Review `UPGRADE_NOTES.md` for technical details
3. Check Supabase logs for database errors
4. Review browser console for frontend errors

---

## Summary Checklist

Before marking deployment as complete:

- [ ] Database migration executed successfully
- [ ] Application deployed with latest code
- [ ] New user signup tested with username creation
- [ ] Username uniqueness tested
- [ ] Username display verified on dashboard
- [ ] Existing users can set username
- [ ] Username change prevention verified

---

**Deployment Date**: January 18, 2026  
**Version**: 1.1.0  
**Feature**: Unique Username System

🎉 **Upgrade Complete!** Your attendance tracker now has a robust user identification system.
