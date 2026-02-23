-- Migration: Add account lockout tracking columns
-- Purpose: Support account lockout after failed login attempts
-- Date: 2026-02-17

-- Add lockout columns to tblusers table
ALTER TABLE tblusers
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS account_locked_until TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add lockout columns to tbladminusers table
ALTER TABLE tbladminusers
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS account_locked_until TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN tblusers.failed_login_attempts IS 'Tracks the number of failed login attempts. Resets to 0 on successful login.';
COMMENT ON COLUMN tblusers.account_locked_until IS 'Timestamp until which the account is locked. NULL if account is not locked.';
COMMENT ON COLUMN tbladminusers.failed_login_attempts IS 'Tracks the number of failed login attempts. Resets to 0 on successful login.';
COMMENT ON COLUMN tbladminusers.account_locked_until IS 'Timestamp until which the account is locked. NULL if account is not locked.';
