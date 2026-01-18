-- Add username field to profiles table
-- This migration adds a unique username that users cannot change

-- Add username column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT;

-- Create unique index on username (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_unique ON profiles(LOWER(username));

-- Add index for faster username lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- Add constraint to ensure username follows rules
-- Username must be 3-20 characters, alphanumeric and underscores only
ALTER TABLE profiles ADD CONSTRAINT username_format 
CHECK (username ~ '^[a-zA-Z0-9_]{3,20}$');

-- Note: After running this migration, users will be prompted to set their username
-- during the setup process. Once set, it cannot be changed.
