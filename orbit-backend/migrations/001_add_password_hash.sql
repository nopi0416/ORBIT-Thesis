-- Migration: Add password_hash column to tblusers
-- This allows for better password security with bcrypt hashing

-- Add password_hash column if it doesn't exist
ALTER TABLE tblusers ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- If password column exists, copy data to password_hash
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tblusers' AND column_name='password') THEN
    UPDATE tblusers SET password_hash = password WHERE password_hash IS NULL;
  END IF;
END $$;
