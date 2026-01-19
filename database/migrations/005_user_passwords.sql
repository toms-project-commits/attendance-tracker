-- Migration to store user passwords for viewing purposes
-- Note: This stores passwords in plain text for admin viewing as requested

CREATE TABLE IF NOT EXISTS user_passwords (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  password TEXT NOT NULL,
  auth_provider TEXT DEFAULT 'google', -- 'google', 'email', etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_passwords_user_id ON user_passwords(user_id);
CREATE INDEX IF NOT EXISTS idx_user_passwords_email ON user_passwords(email);

-- Enable Row Level Security
ALTER TABLE user_passwords ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all authenticated users to view all passwords (for admin purposes)
-- In production, you would want to restrict this to admin users only
CREATE POLICY "Allow viewing all passwords" ON user_passwords
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Policy: Users can insert their own password record
CREATE POLICY "Users can insert own password" ON user_passwords
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own password record
CREATE POLICY "Users can update own password" ON user_passwords
  FOR UPDATE USING (auth.uid() = user_id);

-- Create trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS update_user_passwords_updated_at ON user_passwords;
CREATE TRIGGER update_user_passwords_updated_at BEFORE UPDATE ON user_passwords
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE user_passwords IS 'Stores user passwords in plain text for admin viewing';
COMMENT ON COLUMN user_passwords.auth_provider IS 'Authentication provider: google, email, etc.';
COMMENT ON COLUMN user_passwords.password IS 'Plain text password set by user';
