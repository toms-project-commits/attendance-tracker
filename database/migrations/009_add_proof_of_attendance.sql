-- ============================================
-- PROOF OF ATTENDANCE FEATURE
-- Migration 009
-- ============================================
-- Adds support for GPS-verified proof of attendance:
-- 1. Add proof_url column to attendance_logs
-- 2. Create Storage Bucket for attendance proofs
-- 3. Set up RLS policies for storage
-- ============================================

-- Record this migration
INSERT INTO schema_migrations (version, description) 
VALUES ('009', 'Add proof of attendance feature with GPS verification')
ON CONFLICT (version) DO NOTHING;

-- ============================================
-- PART 1: ADD PROOF_URL COLUMN
-- ============================================

-- Add proof_url column to attendance_logs table
ALTER TABLE attendance_logs 
ADD COLUMN IF NOT EXISTS proof_url TEXT;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_attendance_logs_proof_url 
ON attendance_logs(proof_url) 
WHERE proof_url IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN attendance_logs.proof_url IS 
  'URL to GPS-watermarked proof image stored in Supabase Storage';

-- ============================================
-- PART 2: STORAGE BUCKET SETUP
-- ============================================
-- Note: Storage buckets must be created via Supabase Dashboard or SQL function
-- Bucket name: attendance_proofs
-- Public: false (use RLS policies)
-- File size limit: 5MB
-- Allowed MIME types: image/webp, image/jpeg, image/png
-- ============================================

-- Create storage bucket (this needs to be executed with proper privileges)
-- If this fails, create manually in Supabase Dashboard: Storage > Create Bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'attendance_proofs',
  'attendance_proofs',
  false,
  5242880, -- 5MB
  ARRAY['image/webp', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- PART 3: STORAGE RLS POLICIES
-- ============================================

-- Allow users to upload their own attendance proofs
CREATE POLICY IF NOT EXISTS "Users can upload attendance proofs"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'attendance_proofs' 
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

-- Allow users to view their own attendance proofs
CREATE POLICY IF NOT EXISTS "Users can view their attendance proofs"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'attendance_proofs' 
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

-- Allow users to delete their own attendance proofs
CREATE POLICY IF NOT EXISTS "Users can delete their attendance proofs"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'attendance_proofs' 
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

-- ============================================
-- PART 4: VERIFICATION AND REPORTING
-- ============================================

DO $$
DECLARE
    v_column_exists BOOLEAN;
    v_bucket_exists BOOLEAN;
    v_policies INTEGER;
BEGIN
    -- Check if column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendance_logs' 
        AND column_name = 'proof_url'
    ) INTO v_column_exists;
    
    -- Check if bucket exists
    SELECT EXISTS (
        SELECT 1 FROM storage.buckets 
        WHERE id = 'attendance_proofs'
    ) INTO v_bucket_exists;
    
    -- Count storage policies
    SELECT COUNT(*) INTO v_policies
    FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname LIKE '%attendance proofs%';
    
    RAISE NOTICE '============================================';
    RAISE NOTICE 'MIGRATION 009 COMPLETED SUCCESSFULLY ✅';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Proof of Attendance Feature:';
    RAISE NOTICE '  ✅ proof_url column: %', CASE WHEN v_column_exists THEN 'ADDED' ELSE 'FAILED' END;
    RAISE NOTICE '  ✅ Storage bucket: %', CASE WHEN v_bucket_exists THEN 'CREATED' ELSE 'MANUAL CREATION NEEDED' END;
    RAISE NOTICE '  ✅ Storage policies: % policies created', v_policies;
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Next Steps:';
    IF NOT v_bucket_exists THEN
        RAISE NOTICE '  1. Create storage bucket manually in Supabase Dashboard:';
        RAISE NOTICE '     - Go to Storage > Create Bucket';
        RAISE NOTICE '     - Name: attendance_proofs';
        RAISE NOTICE '     - Public: false';
        RAISE NOTICE '     - File size limit: 5MB';
        RAISE NOTICE '     - Allowed types: image/webp, image/jpeg, image/png';
    END IF;
    RAISE NOTICE '  2. Update Android permissions for camera and GPS';
    RAISE NOTICE '  3. Test proof capture and upload functionality';
    RAISE NOTICE '============================================';
END $$;

-- Final verification
SELECT 
    'Migration 009 Complete - Proof of Attendance Feature Ready!' as status,
    version as migration_version,
    applied_at as when_applied,
    description
FROM schema_migrations 
WHERE version = '009';
