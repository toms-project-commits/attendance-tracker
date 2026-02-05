-- ============================================
-- COMPREHENSIVE PROOF OF ATTENDANCE SETUP
-- Migration 010
-- ============================================
-- This migration ensures all proof-related features are properly configured
-- Checks for existing columns, creates missing ones, and verifies setup
-- ============================================

BEGIN;

-- Record this migration
INSERT INTO schema_migrations (version, description) 
VALUES ('010', 'Comprehensive proof of attendance setup with verification')
ON CONFLICT (version) DO UPDATE SET
  description = EXCLUDED.description,
  applied_at = CURRENT_TIMESTAMP;

-- ============================================
-- PART 1: ENSURE PROOF_URL COLUMN EXISTS
-- ============================================

DO $$
BEGIN
    -- Check and add proof_url column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'attendance_logs' 
        AND column_name = 'proof_url'
    ) THEN
        ALTER TABLE attendance_logs ADD COLUMN proof_url TEXT;
        RAISE NOTICE 'Added proof_url column to attendance_logs';
    ELSE
        RAISE NOTICE 'proof_url column already exists';
    END IF;
END $$;

-- ============================================
-- PART 2: CREATE/UPDATE INDEXES
-- ============================================

-- Index for quick proof lookups
CREATE INDEX IF NOT EXISTS idx_attendance_logs_proof_url 
ON attendance_logs(proof_url) 
WHERE proof_url IS NOT NULL;

-- Index for user + date queries (if not exists)
CREATE INDEX IF NOT EXISTS idx_attendance_logs_user_date 
ON attendance_logs(user_id, date DESC);

-- Index for subject queries
CREATE INDEX IF NOT EXISTS idx_attendance_logs_subject 
ON attendance_logs(subject_id, date DESC);

-- ============================================
-- PART 3: ADD COLUMN COMMENTS
-- ============================================

COMMENT ON COLUMN attendance_logs.proof_url IS 
  'Local proof identifier (format: proof://<timestamp>) for device-stored GPS-watermarked images. ' ||
  'Proofs are stored on user device using Capacitor Filesystem, not in Supabase Storage.';

-- ============================================
-- PART 4: VERIFY RLS POLICIES
-- ============================================

-- Ensure users can only access their own attendance logs
DO $$
BEGIN
    -- Check if RLS is enabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'attendance_logs' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on attendance_logs';
    END IF;

    -- Create basic RLS policies if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'attendance_logs'
        AND policyname = 'Users can view their own attendance'
    ) THEN
        CREATE POLICY "Users can view their own attendance"
        ON attendance_logs FOR SELECT
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'attendance_logs'
        AND policyname = 'Users can insert their own attendance'
    ) THEN
        CREATE POLICY "Users can insert their own attendance"
        ON attendance_logs FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'attendance_logs'
        AND policyname = 'Users can update their own attendance'
    ) THEN
        CREATE POLICY "Users can update their own attendance"
        ON attendance_logs FOR UPDATE
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'attendance_logs'
        AND policyname = 'Users can delete their own attendance'
    ) THEN
        CREATE POLICY "Users can delete their own attendance"
        ON attendance_logs FOR DELETE
        USING (auth.uid() = user_id);
    END IF;
END $$;

-- ============================================
-- PART 5: CREATE HELPER VIEW (OPTIONAL)
-- ============================================

-- Create a view for attendance logs with proof status
CREATE OR REPLACE VIEW attendance_with_proofs AS
SELECT 
    al.*,
    CASE 
        WHEN al.proof_url IS NOT NULL THEN true
        ELSE false
    END as has_proof,
    CASE 
        WHEN al.proof_url LIKE 'proof://%' THEN 'device_storage'
        WHEN al.proof_url LIKE 'http%' THEN 'cloud_storage'
        ELSE 'none'
    END as proof_storage_type
FROM attendance_logs al;

-- Grant access to the view
GRANT SELECT ON attendance_with_proofs TO authenticated;

-- ============================================
-- PART 6: VERIFICATION QUERIES
-- ============================================

DO $$
DECLARE
    v_column_exists BOOLEAN;
    v_index_count INTEGER;
    v_policy_count INTEGER;
    v_rls_enabled BOOLEAN;
    v_proof_count INTEGER;
    v_users_with_proofs INTEGER;
BEGIN
    -- Check if column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'attendance_logs' 
        AND column_name = 'proof_url'
    ) INTO v_column_exists;
    
    -- Count indexes
    SELECT COUNT(*) INTO v_index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'attendance_logs'
    AND indexname LIKE '%proof%';
    
    -- Count RLS policies
    SELECT COUNT(*) INTO v_policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'attendance_logs';
    
    -- Check if RLS is enabled
    SELECT rowsecurity INTO v_rls_enabled
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'attendance_logs';
    
    -- Count existing proofs
    SELECT COUNT(*) INTO v_proof_count
    FROM attendance_logs
    WHERE proof_url IS NOT NULL;
    
    -- Count users with proofs
    SELECT COUNT(DISTINCT user_id) INTO v_users_with_proofs
    FROM attendance_logs
    WHERE proof_url IS NOT NULL;
    
    -- Display results
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'MIGRATION 010 VERIFICATION REPORT';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Table Structure:';
    RAISE NOTICE '  proof_url column: %', CASE WHEN v_column_exists THEN '✓ EXISTS' ELSE '✗ MISSING' END;
    RAISE NOTICE '  Proof-related indexes: %', v_index_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Security:';
    RAISE NOTICE '  RLS enabled: %', CASE WHEN v_rls_enabled THEN '✓ YES' ELSE '✗ NO' END;
    RAISE NOTICE '  RLS policies: % policies active', v_policy_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Current Data:';
    RAISE NOTICE '  Total proofs: %', v_proof_count;
    RAISE NOTICE '  Users with proofs: %', v_users_with_proofs;
    RAISE NOTICE '';
    RAISE NOTICE 'Storage Configuration:';
    RAISE NOTICE '  Proofs stored on: DEVICE (Capacitor Filesystem)';
    RAISE NOTICE '  Cloud storage: NOT USED (saves Supabase quota)';
    RAISE NOTICE '  Format: proof://<timestamp>';
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'MIGRATION 010 COMPLETED SUCCESSFULLY ✓';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '  1. ✓ Database schema ready';
    RAISE NOTICE '  2. ✓ Persistent storage implemented';
    RAISE NOTICE '  3. → Test proof capture on Android device';
    RAISE NOTICE '  4. → Verify proofs persist after app restart';
    RAISE NOTICE '  5. → Test viewing proofs by subject';
    RAISE NOTICE '============================================';
END $$;

COMMIT;

-- Final verification query
SELECT 
    'Migration 010 Complete!' as status,
    version as migration_version,
    applied_at as when_applied,
    description
FROM schema_migrations 
WHERE version = '010';
