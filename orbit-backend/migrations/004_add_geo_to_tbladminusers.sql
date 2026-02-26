-- Migration: Add geo assignment support to admin accounts
-- Purpose: Allow Company Admin profiles to carry explicit geo scope
-- Date: 2026-02-26

ALTER TABLE tbladminusers
ADD COLUMN IF NOT EXISTS geo_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_tbladminusers_geo'
      AND table_name = 'tbladminusers'
  ) THEN
    ALTER TABLE tbladminusers
    ADD CONSTRAINT fk_tbladminusers_geo
    FOREIGN KEY (geo_id) REFERENCES tblgeo(geo_id)
    ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tbladminusers_geo_id ON tbladminusers(geo_id);
