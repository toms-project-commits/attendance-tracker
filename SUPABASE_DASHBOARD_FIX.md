# Supabase Dashboard Access Issue Fix

## Problem
You're seeing: "Failed to fetch permissions: Unauthorized. Try refreshing your browser, or reach out to us via a support ticket if the issue persists"

## This is a Supabase Dashboard Session Issue

This error is about accessing the Supabase dashboard itself, not your app. Here's how to fix it:

### Solution 1: Clear Browser Cache & Cookies

1. **Open Browser DevTools**:
   - Press `F12` or right-click → Inspect
   
2. **Clear Site Data**:
   - Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
   - Click **Clear site data** for `supabase.com`
   
3. **Or Clear All Cookies**:
   - Go to browser settings
   - Search for "cookies"
   - Clear cookies for `supabase.com` and `supabase.co`

4. **Refresh and Login Again**:
   - Go to https://supabase.com/dashboard
   - Log in with your credentials

### Solution 2: Try Incognito/Private Mode

1. Open a new Incognito/Private window
2. Go to https://supabase.com/dashboard
3. Log in with your credentials
4. Make the necessary changes

### Solution 3: Try Different Browser

If the above don't work:
- Try Chrome if you're using Firefox
- Try Firefox if you're using Chrome
- Try Edge as an alternative

### Solution 4: Check Your Supabase Account

1. Make sure your Supabase account hasn't been suspended
2. Check if there are any billing issues
3. Verify you have the correct permissions for the project

## After You Can Access Supabase Dashboard

Once you can access the dashboard, you need to:

1. **Go to your project** (`igmzqcydjmmtuavqeeak`)
2. **Navigate to**: Authentication → URL Configuration
3. **Add this redirect URL**:
   ```
   https://bunksafe.in/auth/callback
   ```
4. **Click Save**

## Alternative: Use Supabase CLI

If you still can't access the dashboard, you can update the redirect URL using the Supabase CLI:

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref igmzqcydjmmtuavqeeak

# Update auth config (you'll need to modify the config file)
```

## Still Having Issues?

If none of the above work:
1. Contact Supabase support: https://supabase.com/support
2. Check Supabase status page: https://status.supabase.com/
3. Join Supabase Discord for quick help: https://discord.supabase.com/

## Important Note

This issue is with the Supabase dashboard authentication, NOT with your app's code. The OAuth fix we implemented is correct and will work once you can update the redirect URL in Supabase settings.
