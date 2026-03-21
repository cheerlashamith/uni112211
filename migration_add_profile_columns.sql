-- Minimal migration: Add profile columns to users table
-- Safe to run on existing databases

ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS resume_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS github TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE;

-- Set existing users as profile completed
UPDATE users SET profile_completed = TRUE WHERE profile_completed IS NULL OR profile_completed = FALSE;
