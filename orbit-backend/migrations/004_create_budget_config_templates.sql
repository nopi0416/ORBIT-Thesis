-- Budget Configuration Templates
-- Stores reusable form templates for Create Configuration autofill

CREATE TABLE IF NOT EXISTS tblbudgetconfigurationtemplates (
  template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name VARCHAR(120) NOT NULL,
  template_payload JSONB NOT NULL,
  created_by UUID NOT NULL,
  org_id UUID NULL,
  is_shared BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_budget_template_created_by
    FOREIGN KEY (created_by)
    REFERENCES tblusers(user_id)
    ON DELETE CASCADE,

  CONSTRAINT chk_template_name_not_blank
    CHECK (length(trim(template_name)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_budget_templates_created_by
  ON tblbudgetconfigurationtemplates (created_by, is_active, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_budget_templates_org_id
  ON tblbudgetconfigurationtemplates (org_id, is_active);

CREATE UNIQUE INDEX IF NOT EXISTS ux_budget_templates_user_name_active
  ON tblbudgetconfigurationtemplates (created_by, lower(template_name), is_active);

-- Optional helper trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION set_budget_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_budget_templates_updated_at ON tblbudgetconfigurationtemplates;
CREATE TRIGGER trg_budget_templates_updated_at
BEFORE UPDATE ON tblbudgetconfigurationtemplates
FOR EACH ROW
EXECUTE FUNCTION set_budget_template_updated_at();
