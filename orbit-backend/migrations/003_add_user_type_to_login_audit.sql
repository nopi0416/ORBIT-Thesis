-- Migration: Add user_type column to tbllogin_audit
-- Purpose: Track whether login is from admin or regular user
-- Date: 2026-02-17

ALTER TABLE tbllogin_audit
ADD COLUMN IF NOT EXISTS user_type VARCHAR(50) DEFAULT NULL; -- 'admin' or 'user'

COMMENT ON COLUMN tbllogin_audit.user_type IS 'User type - either "admin" or "user" to distinguish between admin and regular user logins';
