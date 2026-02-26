-- Migration: Deprecate tbladminusers.is_active in favor of status
-- Purpose: Normalize admin account lifecycle state into status
-- Date: 2026-02-26

ALTER TABLE tbladminusers
ADD COLUMN IF NOT EXISTS status VARCHAR(50);

UPDATE tbladminusers
SET status = CASE
  WHEN status IS NOT NULL AND btrim(status) <> '' THEN status
  WHEN account_locked_until IS NOT NULL AND account_locked_until > NOW() THEN 'Locked'
  WHEN is_active = false THEN 'Deactivated'
  ELSE 'Active'
END;

ALTER TABLE tbladminusers
ALTER COLUMN status SET DEFAULT 'Active';

UPDATE tbladminusers
SET status = 'Active'
WHERE status IS NULL OR btrim(status) = '';

CREATE INDEX IF NOT EXISTS idx_tbladminusers_status ON tbladminusers(status);
