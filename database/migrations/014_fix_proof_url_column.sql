-- ============================================
-- FIX PROOF_URL COLUMN
-- Migration 014
-- ============================================
-- Ensures proof_url column exists in attendance_logs table
-- Fixes schema cache issues
-- ============================================

-- Record this migration
INSERT INTO schema_migrations (version, description) 
VALUES ('014', 'Fix proof_url column in attendance_logs')
ON CONFLICT (version) DO NOTHING;

-- Ensure proof_url column exists
DO $$ 
BEGIN
    -- Add proof_url column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendance_logs' 
        AND column_name = 'proof_url'
    ) THEN
        ALTER TABLE attendance_logs 
        ADD COLUMN proof_url TEXT;
        
        RAISE NOTICE 'Added proof_url column to attendance_logs';
    ELSE
        RAISE NOTICE 'proof_url column already exists';
    END IF;
END $$;

-- Add index for faster queries if not exists
CREATE INDEX IF NOT EXISTS idx_attendance_logs_proof_url 
ON attendance_logs(proof_url) 
WHERE proof_url IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN attendance_logs.proof_url IS 
  'URL or identifier for GPS-watermarked proof image';

-- Verify the column exists
DO $$
DECLARE
    v_column_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendance_logs' 
        AND column_name = 'proof_url'
    ) INTO v_column_exists;
    
    IF v_column_exists THEN
        RAISE NOTICE '============================================';
        RAISE NOTICE 'MIGRATION 014 COMPLETED SUCCESSFULLY ✅';
        RAISE NOTICE '============================================';
        RAISE NOTICE 'proof_url column is now available in attendance_logs';
        RAISE NOTICE '============================================';
    ELSE
        RAISE EXCEPTION 'Failed to add proof_url column';
    END IF;
END $$;
