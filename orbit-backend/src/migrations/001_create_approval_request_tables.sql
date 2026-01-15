-- =============================================================================
-- ORBIT Approval Request System - Database Migration
-- =============================================================================
-- Creates all tables for the approval request workflow system
-- Version: 1.0
-- Date: 2025-01-02
-- =============================================================================

-- Table 1: Main Approval Request
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.tblbudgetapprovalrequests (
  request_id UUID NOT NULL DEFAULT gen_random_uuid(),
  
  -- Request Basics
  budget_id UUID NOT NULL,
  request_number VARCHAR(50) NOT NULL UNIQUE,
  
  -- Request Metadata
  submitted_by UUID NOT NULL,
  submission_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Request Description
  title TEXT NOT NULL,
  description TEXT,
  
  -- Financial Details
  total_request_amount NUMERIC NOT NULL,
  currency VARCHAR(3) DEFAULT 'PHP',
  
  -- Budget Impact
  current_budget_used NUMERIC,
  remaining_budget NUMERIC,
  will_exceed_budget BOOLEAN DEFAULT FALSE,
  excess_amount NUMERIC,
  
  -- Status Tracking
  overall_status VARCHAR(20) DEFAULT 'draft',
  submission_status VARCHAR(20) DEFAULT 'pending',
  
  -- Dates
  submitted_date TIMESTAMP WITH TIME ZONE,
  approved_date TIMESTAMP WITH TIME ZONE,
  completed_date TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  attachment_count INTEGER DEFAULT 0,
  employee_count INTEGER DEFAULT 0,
  
  -- Audit Trail
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE,
  updated_by UUID,
  
  CONSTRAINT tblbudgetapprovalrequests_pkey PRIMARY KEY (request_id),
  CONSTRAINT tblbudgetapprovalrequests_budget_id_fkey FOREIGN KEY (budget_id) 
    REFERENCES public.tblbudgetconfiguration(budget_id) ON DELETE CASCADE,
  CONSTRAINT chk_status CHECK (overall_status IN ('draft', 'submitted', 'in_progress', 'approved', 'rejected', 'completed')),
  CONSTRAINT chk_total_amount CHECK (total_request_amount > 0)
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_budgetapprovalrequests_budget_id ON public.tblbudgetapprovalrequests(budget_id);
CREATE INDEX IF NOT EXISTS idx_budgetapprovalrequests_submitted_by ON public.tblbudgetapprovalrequests(submitted_by);
CREATE INDEX IF NOT EXISTS idx_budgetapprovalrequests_status ON public.tblbudgetapprovalrequests(overall_status);
CREATE INDEX IF NOT EXISTS idx_budgetapprovalrequests_submission_date ON public.tblbudgetapprovalrequests(submission_date DESC);

-- Table 2: Line Items
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.tblbudgetapprovalrequests_line_items (
  line_item_id UUID NOT NULL DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL,
  
  -- Item Reference
  item_number INTEGER NOT NULL,
  
  -- Employee/Entity Details
  employee_id VARCHAR(50),
  employee_name VARCHAR(255),
  department VARCHAR(255),
  position VARCHAR(255),
  
  -- Item Details
  item_type VARCHAR(50),
  item_description TEXT,
  
  -- Amount
  amount NUMERIC NOT NULL,
  is_deduction BOOLEAN DEFAULT FALSE,
  
  -- Status & Flags
  status VARCHAR(20) DEFAULT 'pending',
  has_warning BOOLEAN DEFAULT FALSE,
  warning_reason TEXT,
  
  -- Notes
  notes TEXT,
  
  -- Audit Trail
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT tblbudgetapprovalrequests_line_items_pkey PRIMARY KEY (line_item_id),
  CONSTRAINT tblbudgetapprovalrequests_line_items_request_id_fkey FOREIGN KEY (request_id) 
    REFERENCES public.tblbudgetapprovalrequests(request_id) ON DELETE CASCADE,
  CONSTRAINT chk_item_type CHECK (item_type IN ('bonus', 'incentive', 'sign_in_bonus', 'special_award', 'referral_reward', 'other_reward')),
  CONSTRAINT chk_line_item_status CHECK (status IN ('pending', 'flagged', 'approved', 'rejected'))
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_line_items_request_id ON public.tblbudgetapprovalrequests_line_items(request_id);
CREATE INDEX IF NOT EXISTS idx_line_items_status ON public.tblbudgetapprovalrequests_line_items(status);
CREATE INDEX IF NOT EXISTS idx_line_items_employee_id ON public.tblbudgetapprovalrequests_line_items(employee_id);

-- Table 3: Approvals
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.tblbudgetapprovalrequests_approvals (
  approval_id UUID NOT NULL DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL,
  
  -- Level Information
  approval_level INTEGER NOT NULL,
  approval_level_name VARCHAR(50),
  
  -- Approver Details
  assigned_to_primary UUID,
  assigned_to_backup UUID,
  
  -- Approval Status
  status VARCHAR(20) DEFAULT 'pending',
  is_self_request BOOLEAN DEFAULT FALSE,
  
  -- Approval Details
  approved_by UUID,
  approver_name VARCHAR(255),
  approver_title VARCHAR(255),
  approval_date TIMESTAMP WITH TIME ZONE,
  
  -- Decision Details
  approval_decision VARCHAR(20),
  approval_notes TEXT,
  approval_comment_expanded BOOLEAN DEFAULT FALSE,
  
  -- Conditional Approval
  conditions_applied TEXT,
  
  -- Sequencing
  order_index INTEGER,
  submitted_on_date TIMESTAMP WITH TIME ZONE,
  
  -- Audit Trail
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT tblbudgetapprovalrequests_approvals_pkey PRIMARY KEY (approval_id),
  CONSTRAINT tblbudgetapprovalrequests_approvals_request_id_fkey FOREIGN KEY (request_id) 
    REFERENCES public.tblbudgetapprovalrequests(request_id) ON DELETE CASCADE,
  CONSTRAINT uq_request_level UNIQUE(request_id, approval_level),
  CONSTRAINT chk_approval_level CHECK (approval_level IN (1, 2, 3, 4)),
  CONSTRAINT chk_approval_status CHECK (status IN ('pending', 'approved', 'rejected', 'escalated')),
  CONSTRAINT chk_approval_decision CHECK (approval_decision IN ('approved', 'rejected', 'conditional'))
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_approvals_request_id ON public.tblbudgetapprovalrequests_approvals(request_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON public.tblbudgetapprovalrequests_approvals(status);
CREATE INDEX IF NOT EXISTS idx_approvals_assigned_to ON public.tblbudgetapprovalrequests_approvals(assigned_to_primary);

-- Table 4: Attachments
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.tblbudgetapprovalrequests_attachments (
  attachment_id UUID NOT NULL DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL,
  
  -- File Details
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(50),
  file_size_bytes INTEGER,
  
  -- File Storage
  storage_path TEXT,
  storage_provider VARCHAR(50),
  
  -- File Purpose
  file_purpose VARCHAR(50),
  
  -- Metadata
  uploaded_by UUID NOT NULL,
  uploaded_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Processing
  is_processed BOOLEAN DEFAULT FALSE,
  processing_status VARCHAR(20),
  processing_notes TEXT,
  
  CONSTRAINT tblbudgetapprovalrequests_attachments_pkey PRIMARY KEY (attachment_id),
  CONSTRAINT tblbudgetapprovalrequests_attachments_request_id_fkey FOREIGN KEY (request_id) 
    REFERENCES public.tblbudgetapprovalrequests(request_id) ON DELETE CASCADE,
  CONSTRAINT chk_file_type CHECK (file_type IN ('xlsx', 'csv', 'pdf', 'doc', 'docx', 'xls', 'txt'))
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_attachments_request_id ON public.tblbudgetapprovalrequests_attachments(request_id);
CREATE INDEX IF NOT EXISTS idx_attachments_uploaded_by ON public.tblbudgetapprovalrequests_attachments(uploaded_by);

-- Table 5: Activity Log
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.tblbudgetapprovalrequests_activity_log (
  log_id UUID NOT NULL DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL,
  
  -- Activity Information
  action_type VARCHAR(50),
  description TEXT,
  
  -- Who & When
  performed_by UUID NOT NULL,
  performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Context
  approval_level INTEGER,
  old_value TEXT,
  new_value TEXT,
  
  -- Metadata
  ip_address VARCHAR(45),
  user_agent TEXT,
  
  CONSTRAINT tblbudgetapprovalrequests_activity_log_pkey PRIMARY KEY (log_id),
  CONSTRAINT tblbudgetapprovalrequests_activity_log_request_id_fkey FOREIGN KEY (request_id) 
    REFERENCES public.tblbudgetapprovalrequests(request_id) ON DELETE CASCADE,
  CONSTRAINT chk_action_type CHECK (action_type IN (
    'created', 'submitted', 'approved', 'rejected', 'escalated', 'commented',
    'attachment_added', 'line_item_added', 'line_item_modified', 'budget_updated',
    'status_changed', 'reassigned', 'recalled', 'completed'
  ))
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_activity_log_request_id ON public.tblbudgetapprovalrequests_activity_log(request_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_performed_by ON public.tblbudgetapprovalrequests_activity_log(performed_by);
CREATE INDEX IF NOT EXISTS idx_activity_log_performed_at ON public.tblbudgetapprovalrequests_activity_log(performed_at DESC);

-- Table 6: Notifications
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.tblbudgetapprovalrequests_notifications (
  notification_id UUID NOT NULL DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL,
  
  -- Notification Details
  notification_type VARCHAR(50),
  title VARCHAR(255),
  message TEXT,
  
  -- Recipient
  recipient_id UUID NOT NULL,
  recipient_email VARCHAR(255),
  
  -- Status
  is_sent BOOLEAN DEFAULT FALSE,
  sent_date TIMESTAMP WITH TIME ZONE,
  is_read BOOLEAN DEFAULT FALSE,
  read_date TIMESTAMP WITH TIME ZONE,
  
  -- Related Context
  related_approval_level INTEGER,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT tblbudgetapprovalrequests_notifications_pkey PRIMARY KEY (notification_id),
  CONSTRAINT tblbudgetapprovalrequests_notifications_request_id_fkey FOREIGN KEY (request_id) 
    REFERENCES public.tblbudgetapprovalrequests(request_id) ON DELETE CASCADE
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_notifications_request_id ON public.tblbudgetapprovalrequests_notifications(request_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON public.tblbudgetapprovalrequests_notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.tblbudgetapprovalrequests_notifications(is_read);

-- =============================================================================
-- End of Migration Script
-- =============================================================================
-- Summary: Created 6 tables for approval request management
-- - tblbudgetapprovalrequests (main requests)
-- - tblbudgetapprovalrequests_line_items (employee data)
-- - tblbudgetapprovalrequests_approvals (approval workflow)
-- - tblbudgetapprovalrequests_attachments (file uploads)
-- - tblbudgetapprovalrequests_activity_log (audit trail)
-- - tblbudgetapprovalrequests_notifications (email/alerts)
-- =============================================================================
