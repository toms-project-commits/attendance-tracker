-- ============================================
-- ENHANCED PROFILES TABLE MIGRATION
-- ============================================
-- Creates comprehensive profiles table with RLS and auto-trigger
-- Supports the User Profile Page feature
-- IDEMPOTENT: Safe to run multiple times
-- ============================================

-- ============================================
-- PART 1: ENHANCE PROFILES TABLE
-- ============================================

-- Add any missing columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================
-- PART 2: DROP OLD CONSTRAINTS
-- ============================================

-- Drop existing constraints to recreate them properly
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS username_format;
DROP INDEX IF EXISTS idx_profiles_username_unique;
DROP INDEX IF EXISTS idx_profiles_username;
DROP INDEX IF EXISTS idx_profiles_full_name;

-- ============================================
-- PART 3: ADD PROPER CONSTRAINTS
-- ============================================

-- Username validation: 3-20 characters, alphanumeric and underscores only, lowercase
ALTER TABLE profiles ADD CONSTRAINT username_format 
  CHECK (username IS NULL OR username ~ '^[a-z0-9_]{3,20}$');

-- Create unique index on lowercase username
CREATE UNIQUE INDEX idx_profiles_username_unique 
  ON profiles(LOWER(username)) 
  WHERE username IS NOT NULL;

-- Add regular index for faster lookups
CREATE INDEX idx_profiles_username ON profiles(username) WHERE username IS NOT NULL;

-- Add index for full_name searches
CREATE INDEX idx_profiles_full_name ON profiles(full_name) WHERE full_name IS NOT NULL;

-- ============================================
-- PART 4: CREATE/UPDATE AUTO-PROFILE TRIGGER
-- ============================================

-- Function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION handle_new_user_profile()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Create profile entry for new user
  INSERT INTO public.profiles (id, created_at, updated_at)
  VALUES (NEW.id, NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Drop old trigger if exists and create new one
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_profile();

-- ============================================
-- PART 5: CREATE UPDATED_AT TRIGGER
-- ============================================

-- Ensure updated_at trigger function exists
CREATE OR REPLACE FUNCTION update_profiles_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Drop old trigger if exists and create new one
DROP TRIGGER IF EXISTS set_profiles_updated_at ON profiles;
CREATE TRIGGER set_profiles_updated_at 
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_profiles_updated_at();

-- ============================================
-- PART 6: CONFIGURE ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users manage their own profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view other profiles by username" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by username" ON profiles;

-- Policy 1: Users can SELECT their own profile
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy 2: Users can UPDATE their own profile
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy 3: Users can INSERT their own profile (for manual creation)
CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Policy 4: Users can view other profiles by username (for Bunk Buddy searches)
CREATE POLICY "Public profiles are viewable by username" ON profiles
  FOR SELECT
  USING (username IS NOT NULL);

-- ============================================
-- PART 7: ADD HELPFUL COMMENTS
-- ============================================

COMMENT ON TABLE profiles IS 'User profiles with personal information and settings';
COMMENT ON COLUMN profiles.id IS 'User ID (references auth.users)';
COMMENT ON COLUMN profiles.username IS 'Unique username (3-20 chars, lowercase alphanumeric + underscore)';
COMMENT ON COLUMN profiles.full_name IS 'User''s full name';
COMMENT ON COLUMN profiles.created_at IS 'When the profile was created';
COMMENT ON COLUMN profiles.updated_at IS 'When the profile was last updated';

-- ============================================
-- PART 8: BACKFILL EXISTING DATA
-- ============================================

-- Ensure all existing users have profile entries
INSERT INTO profiles (id, created_at, updated_at)
SELECT 
  id,
  COALESCE(created_at, NOW()),
  COALESCE(updated_at, NOW())
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Update NULL timestamps
UPDATE profiles 
SET created_at = NOW() 
WHERE created_at IS NULL;

UPDATE profiles 
SET updated_at = NOW() 
WHERE updated_at IS NULL;

-- ============================================
-- PART 9: VERIFICATION
-- ============================================

DO $$
DECLARE
    v_profiles_count INTEGER;
    v_with_username INTEGER;
    v_with_fullname INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_profiles_count FROM profiles;
    SELECT COUNT(*) INTO v_with_username FROM profiles WHERE username IS NOT NULL;
    SELECT COUNT(*) INTO v_with_fullname FROM profiles WHERE full_name IS NOT NULL;
    
    RAISE NOTICE '============================================';
    RAISE NOTICE 'PROFILES TABLE MIGRATION COMPLETED ✅';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Profile Statistics:';
    RAISE NOTICE '  - Total Profiles: %', v_profiles_count;
    RAISE NOTICE '  - With Username: %', v_with_username;
    RAISE NOTICE '  - With Full Name: %', v_with_fullname;
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Features Enabled:';
    RAISE NOTICE '  ✅ Auto-profile creation on signup';
    RAISE NOTICE '  ✅ Username uniqueness (case-insensitive)';
    RAISE NOTICE '  ✅ Row Level Security policies';
    RAISE NOTICE '  ✅ Public profile viewing by username (Bunk Buddy support)';
    RAISE NOTICE '  ✅ Auto-update timestamps';
    RAISE NOTICE '  ✅ No avatar columns (Letter Avatar only)';
    RAISE NOTICE '============================================';
END $$;
