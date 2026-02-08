-- Migration 017: Drop user_passwords table
-- This removes the security liability of plain-text password storage
-- All password management is now handled exclusively by Supabase Auth

-- Drop all RLS policies on user_passwords table
DROP POLICY IF EXISTS "Allow viewing all passwords" ON user_passwords;
DROP POLICY IF EXISTS "Users can insert own password" ON user_passwords;
DROP POLICY IF EXISTS "Users can update own password" ON user_passwords;
DROP POLICY IF EXISTS "Users can delete own password" ON user_passwords;

-- Drop all indexes on user_passwords table
DROP INDEX IF EXISTS idx_user_passwords_user_id;
DROP INDEX IF EXISTS idx_user_passwords_email;

-- Drop triggers on user_passwords table
DROP TRIGGER IF EXISTS update_user_passwords_updated_at ON user_passwords;

-- Drop the user_passwords table completely
DROP TABLE IF EXISTS user_passwords CASCADE;

-- Add comment documenting the security improvement
COMMENT ON DATABASE postgres IS 'user_passwords table removed in migration 017 for security compliance - all auth now handled by Supabase Auth';

-- Verification query (uncomment to run after migration):
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_passwords';
-- Expected result: 0 rows (table should not exist)
