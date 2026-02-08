-- ============================================
-- TERMS ACCEPTANCE TRACKING MIGRATION
-- ============================================
-- Adds terms_accepted_at column to profiles table
-- Tracks when users accept Terms & Conditions and Privacy Policy
-- IDEMPOTENT: Safe to run multiple times
-- ============================================

-- ============================================
-- PART 1: ADD TERMS ACCEPTANCE COLUMN
-- ============================================

-- Add terms_accepted_at column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;

-- ============================================
-- PART 2: ADD INDEX FOR PERFORMANCE
-- ============================================

-- Add index for faster lookups of users who haven't accepted terms
CREATE INDEX IF NOT EXISTS idx_profiles_terms_accepted 
  ON profiles(terms_accepted_at) 
  WHERE terms_accepted_at IS NULL;

-- ============================================
-- PART 3: ADD HELPFUL COMMENT
-- ============================================

COMMENT ON COLUMN profiles.terms_accepted_at IS 'Timestamp when user accepted Terms & Conditions and Privacy Policy';

-- ============================================
-- PART 4: VERIFICATION
-- ============================================

DO $$
DECLARE
    v_total_profiles INTEGER;
    v_accepted_terms INTEGER;
    v_pending_terms INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total_profiles FROM profiles;
    SELECT COUNT(*) INTO v_accepted_terms FROM profiles WHERE terms_accepted_at IS NOT NULL;
    SELECT COUNT(*) INTO v_pending_terms FROM profiles WHERE terms_accepted_at IS NULL;
    
    RAISE NOTICE '============================================';
    RAISE NOTICE 'TERMS ACCEPTANCE MIGRATION COMPLETED ✅';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Profile Statistics:';
    RAISE NOTICE '  - Total Profiles: %', v_total_profiles;
    RAISE NOTICE '  - Accepted Terms: %', v_accepted_terms;
    RAISE NOTICE '  - Pending Acceptance: %', v_pending_terms;
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Features Enabled:';
    RAISE NOTICE '  ✅ Terms acceptance tracking';
    RAISE NOTICE '  ✅ Timestamp stored on acceptance';
    RAISE NOTICE '  ✅ Index for pending users';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Note: Existing users will need to accept terms on next login';
    RAISE NOTICE '============================================';
END $$;
