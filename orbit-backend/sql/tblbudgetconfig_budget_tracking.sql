-- Create Budget Tracking Table for Monitoring Budget Usage and Approvals
-- This table stores period-based budget tracking data including used amounts and approval counts

CREATE TABLE IF NOT EXISTS tblbudgetconfig_budget_tracking (
  tracking_id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  budget_id BIGINT NOT NULL REFERENCES tblbudgetconfiguration(budget_id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_label VARCHAR(50) NOT NULL,  -- e.g., "October 2024", "Q1 2024"
  total_budget DECIMAL(15, 2) NOT NULL DEFAULT 0,
  budget_used DECIMAL(15, 2) NOT NULL DEFAULT 0,
  budget_remaining DECIMAL(15, 2) GENERATED ALWAYS AS (total_budget - budget_used) STORED,
  budget_carryover DECIMAL(15, 2) DEFAULT 0,
  approval_count_total INT DEFAULT 0,
  approval_count_approved INT DEFAULT 0,
  approval_count_rejected INT DEFAULT 0,
  approval_count_pending INT DEFAULT 0,
  last_updated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_budget_tracking_budget_id ON tblbudgetconfig_budget_tracking(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_tracking_period ON tblbudgetconfig_budget_tracking(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_budget_tracking_created_at ON tblbudgetconfig_budget_tracking(created_at DESC);

-- Add trigger to update last_updated_at on any update
CREATE OR REPLACE FUNCTION update_budget_tracking_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER budget_tracking_update_timestamp
BEFORE UPDATE ON tblbudgetconfig_budget_tracking
FOR EACH ROW
EXECUTE FUNCTION update_budget_tracking_timestamp();
