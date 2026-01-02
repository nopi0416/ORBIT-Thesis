# Approval Request System - Database Schema & Design

**Version:** 1.0  
**Date:** January 2, 2026  
**Status:** Ready for Implementation

---

## Overview

The Approval Request System manages the workflow for submitting budget approval requests and tracking their progression through multiple approval levels. The system supports:

- Multi-level approval workflow (L1 → L2 → L3 → Payroll)
- Self-approval scenarios (requestor is an approver)
- Bulk employee payroll/incentive submissions
- Approval tracking and audit trail
- Budget impact validation
- Status management and notifications

---

## Database Schema Design

### Table 1: tblbudgetapprovalrequests
**Purpose:** Main approval request record  
**Primary Key:** request_id (UUID)

```sql
CREATE TABLE public.tblbudgetapprovalrequests (
  request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Request Basics
  budget_id UUID NOT NULL REFERENCES tblbudgetconfiguration(budget_id),
  request_number VARCHAR(50) NOT NULL UNIQUE, -- e.g., "REQ-2025-001"
  
  -- Request Metadata
  submitted_by UUID NOT NULL, -- User who submitted the request
  submission_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Request Description
  title TEXT NOT NULL, -- e.g., "Q4 Performance Incentives Disbursement"
  description TEXT, -- Detailed description of the request
  
  -- Financial Details
  total_request_amount NUMERIC NOT NULL, -- Total amount requested
  currency VARCHAR(3) DEFAULT 'PHP',
  
  -- Budget Impact
  current_budget_used NUMERIC, -- Amount already allocated from this budget
  remaining_budget NUMERIC, -- Remaining after this request
  will_exceed_budget BOOLEAN DEFAULT FALSE,
  excess_amount NUMERIC, -- If exceeds, how much over
  
  -- Status Tracking
  overall_status VARCHAR(20) DEFAULT 'draft', -- draft, submitted, in_progress, approved, rejected, completed
  submission_status VARCHAR(20) DEFAULT 'pending', -- Separate status for submission completeness
  
  -- Dates
  submitted_date TIMESTAMP WITH TIME ZONE,
  approved_date TIMESTAMP WITH TIME ZONE,
  completed_date TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  attachment_count INTEGER DEFAULT 0,
  employee_count INTEGER DEFAULT 0, -- Number of employees in request
  
  -- Audit Trail
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE,
  updated_by UUID,
  
  CONSTRAINT chk_status CHECK (overall_status IN ('draft', 'submitted', 'in_progress', 'approved', 'rejected', 'completed')),
  CONSTRAINT chk_total_amount CHECK (total_request_amount > 0)
) TABLESPACE pg_default;

CREATE INDEX idx_budgetapprovalrequests_budget_id ON tblbudgetapprovalrequests(budget_id);
CREATE INDEX idx_budgetapprovalrequests_submitted_by ON tblbudgetapprovalrequests(submitted_by);
CREATE INDEX idx_budgetapprovalrequests_status ON tblbudgetapprovalrequests(overall_status);
CREATE INDEX idx_budgetapprovalrequests_submission_date ON tblbudgetapprovalrequests(submission_date DESC);
```

### Table 2: tblbudgetapprovalrequests_line_items
**Purpose:** Individual line items within an approval request  
**Primary Key:** line_item_id (UUID)  
**Use Case:** Employee payroll items, incentives, deductions, etc.

```sql
CREATE TABLE public.tblbudgetapprovalrequests_line_items (
  line_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES tblbudgetapprovalrequests(request_id) ON DELETE CASCADE,
  
  -- Item Reference
  item_number INTEGER NOT NULL, -- Sequential number within request (1, 2, 3...)
  
  -- Employee/Entity Details
  employee_id VARCHAR(50), -- External employee ID
  employee_name VARCHAR(255),
  department VARCHAR(255),
  position VARCHAR(255),
  
  -- Item Details
  item_type VARCHAR(50), -- 'bonus', 'incentive', 'salary_adjustment', 'deduction', etc.
  item_description TEXT,
  
  -- Amount
  amount NUMERIC NOT NULL,
  is_deduction BOOLEAN DEFAULT FALSE, -- TRUE for negative amounts
  
  -- Status & Flags
  status VARCHAR(20) DEFAULT 'pending', -- pending, flagged, approved, rejected
  has_warning BOOLEAN DEFAULT FALSE, -- Flag for unusual items
  warning_reason TEXT, -- Reason for warning
  
  -- Notes
  notes TEXT,
  
  -- Audit Trail
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT chk_item_type CHECK (item_type IN ('bonus', 'incentive', 'salary_adjustment', 'deduction', 'correction', 'other')),
  CONSTRAINT chk_status CHECK (status IN ('pending', 'flagged', 'approved', 'rejected'))
) TABLESPACE pg_default;

CREATE INDEX idx_line_items_request_id ON tblbudgetapprovalrequests_line_items(request_id);
CREATE INDEX idx_line_items_status ON tblbudgetapprovalrequests_line_items(status);
CREATE INDEX idx_line_items_employee_id ON tblbudgetapprovalrequests_line_items(employee_id);
```

### Table 3: tblbudgetapprovalrequests_approvals
**Purpose:** Track approval progress through all levels  
**Primary Key:** approval_id (UUID)

```sql
CREATE TABLE public.tblbudgetapprovalrequests_approvals (
  approval_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES tblbudgetapprovalrequests(request_id) ON DELETE CASCADE,
  
  -- Level Information
  approval_level INTEGER NOT NULL, -- 1 (L1), 2 (L2), 3 (L3), 4 (Payroll)
  approval_level_name VARCHAR(50), -- 'L1', 'L2', 'L3', 'Payroll'
  
  -- Approver Details
  assigned_to_primary UUID, -- Primary approver for this level
  assigned_to_backup UUID, -- Backup approver if primary declines
  
  -- Approval Status
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, escalated
  is_self_request BOOLEAN DEFAULT FALSE, -- TRUE if requestor is the approver
  
  -- Approval Details
  approved_by UUID, -- Who actually approved (could be primary or backup)
  approver_name VARCHAR(255),
  approver_title VARCHAR(255),
  approval_date TIMESTAMP WITH TIME ZONE,
  
  -- Decision Details
  approval_decision VARCHAR(20), -- 'approved', 'rejected', 'conditional'
  approval_notes TEXT, -- Approver's comments
  approval_comment_expanded BOOLEAN DEFAULT FALSE,
  
  -- Conditional Approval
  conditions_applied TEXT, -- Any conditions/modifications
  
  -- Sequencing
  order_index INTEGER, -- Display order
  submitted_on_date TIMESTAMP WITH TIME ZONE,
  
  -- Audit Trail
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT uq_request_level UNIQUE(request_id, approval_level),
  CONSTRAINT chk_approval_level CHECK (approval_level IN (1, 2, 3, 4)),
  CONSTRAINT chk_status CHECK (status IN ('pending', 'approved', 'rejected', 'escalated')),
  CONSTRAINT chk_decision CHECK (approval_decision IN ('approved', 'rejected', 'conditional'))
) TABLESPACE pg_default;

CREATE INDEX idx_approvals_request_id ON tblbudgetapprovalrequests_approvals(request_id);
CREATE INDEX idx_approvals_status ON tblbudgetapprovalrequests_approvals(status);
CREATE INDEX idx_approvals_assigned_to ON tblbudgetapprovalrequests_approvals(assigned_to_primary);
```

### Table 4: tblbudgetapprovalrequests_attachments
**Purpose:** Store references to uploaded files and documents  
**Primary Key:** attachment_id (UUID)

```sql
CREATE TABLE public.tblbudgetapprovalrequests_attachments (
  attachment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES tblbudgetapprovalrequests(request_id) ON DELETE CASCADE,
  
  -- File Details
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(50), -- 'xlsx', 'csv', 'pdf', 'doc', etc.
  file_size_bytes INTEGER,
  
  -- File Storage
  storage_path TEXT, -- Cloud storage path or URL
  storage_provider VARCHAR(50), -- 's3', 'azure', 'gcs', 'local'
  
  -- File Purpose
  file_purpose VARCHAR(50), -- 'employee_data', 'supporting_document', 'approval_evidence'
  
  -- Metadata
  uploaded_by UUID NOT NULL,
  uploaded_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Processing
  is_processed BOOLEAN DEFAULT FALSE,
  processing_status VARCHAR(20), -- 'pending', 'processing', 'completed', 'failed'
  processing_notes TEXT,
  
  CONSTRAINT chk_file_type CHECK (file_type IN ('xlsx', 'csv', 'pdf', 'doc', 'docx', 'xls', 'txt'))
) TABLESPACE pg_default;

CREATE INDEX idx_attachments_request_id ON tblbudgetapprovalrequests_attachments(request_id);
CREATE INDEX idx_attachments_uploaded_by ON tblbudgetapprovalrequests_attachments(uploaded_by);
```

### Table 5: tblbudgetapprovalrequests_activity_log
**Purpose:** Complete audit trail of all actions taken on requests  
**Primary Key:** log_id (UUID)

```sql
CREATE TABLE public.tblbudgetapprovalrequests_activity_log (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES tblbudgetapprovalrequests(request_id) ON DELETE CASCADE,
  
  -- Activity Information
  action_type VARCHAR(50), -- 'created', 'submitted', 'approved', 'rejected', 'escalated', 'commented', 'attachment_added'
  description TEXT,
  
  -- Who & When
  performed_by UUID NOT NULL,
  performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Context
  approval_level INTEGER, -- Which level (if applicable)
  old_value TEXT, -- Previous value (for updates)
  new_value TEXT, -- New value (for updates)
  
  -- Metadata
  ip_address VARCHAR(45),
  user_agent TEXT,
  
  CONSTRAINT chk_action_type CHECK (action_type IN (
    'created', 'submitted', 'approved', 'rejected', 'escalated', 'commented',
    'attachment_added', 'line_item_added', 'line_item_modified', 'budget_updated',
    'status_changed', 'reassigned', 'recalled', 'completed'
  ))
) TABLESPACE pg_default;

CREATE INDEX idx_activity_log_request_id ON tblbudgetapprovalrequests_activity_log(request_id);
CREATE INDEX idx_activity_log_performed_by ON tblbudgetapprovalrequests_activity_log(performed_by);
CREATE INDEX idx_activity_log_performed_at ON tblbudgetapprovalrequests_activity_log(performed_at DESC);
```

### Table 6: tblbudgetapprovalrequests_notifications
**Purpose:** Track notifications sent to approvers and requestors  
**Primary Key:** notification_id (UUID)

```sql
CREATE TABLE public.tblbudgetapprovalrequests_notifications (
  notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES tblbudgetapprovalrequests(request_id) ON DELETE CASCADE,
  
  -- Notification Details
  notification_type VARCHAR(50), -- 'request_submitted', 'awaiting_approval', 'approved', 'rejected'
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) TABLESPACE pg_default;

CREATE INDEX idx_notifications_request_id ON tblbudgetapprovalrequests_notifications(request_id);
CREATE INDEX idx_notifications_recipient_id ON tblbudgetapprovalrequests_notifications(recipient_id);
CREATE INDEX idx_notifications_is_read ON tblbudgetapprovalrequests_notifications(is_read);
```

---

## Data Relationships Diagram

```
┌──────────────────────────────────────┐
│  tblbudgetconfiguration              │
│  (Parent budget config)              │
└──────────┬───────────────────────────┘
           │ 1:N
           │
           ▼
┌──────────────────────────────────────┐
│  tblbudgetapprovalrequests           │  (Main request)
│  - request_id (PK)                   │
│  - budget_id (FK)                    │
│  - title, description                │
│  - total_request_amount              │
│  - overall_status                    │
└──────────┬───────────────────────────┘
           │
    ┌──────┼──────┬──────────┐
    │      │      │          │
    │ 1:N  │ 1:N  │ 1:N      │ 1:N
    │      │      │          │
    ▼      ▼      ▼          ▼
┌─────┐ ┌──────────┐ ┌─────────────┐ ┌──────────────┐
│Line │ │Approvals │ │Attachments  │ │Activity Log  │
│Items│ │(L1-Pay)  │ │(Files/Docs) │ │(Audit Trail) │
└─────┘ └──────────┘ └─────────────┘ └──────────────┘
        │
        │ 1:N
        │
        ▼
  ┌──────────────┐
  │Notifications │
  │(Email/Alert) │
  └──────────────┘
```

---

## Status Flow Diagram

```
MAIN REQUEST STATUS:
┌─────────┐
│  DRAFT  │ (Initial state, not submitted)
└────┬────┘
     │ submit()
     ▼
┌──────────┐
│SUBMITTED │ (All required info collected)
└────┬─────┘
     │ start_approval_workflow()
     ▼
┌────────────┐
│IN_PROGRESS │ (Going through approvals)
└────┬───────┘
     │
  ┌──┴──────┬─────────┐
  │ Approve  │ Reject  │
  ▼          ▼         
┌─────────┐ ┌────────┐
│APPROVED │ │REJECTED│
└────┬────┘ └────────┘
     │
     │ mark_completed()
     ▼
┌──────────┐
│COMPLETED │ (Final state)
└──────────┘

APPROVAL LEVEL STATUS:
pending → approved/rejected/escalated

LINE ITEM STATUS:
pending → flagged/approved/rejected
```

---

## Key Design Decisions

### 1. Approval Workflow Structure
- **Multi-Level Design**: Supports L1 → L2 → L3 → Payroll sequential flow
- **Self-Request Handling**: Flag for when requestor = approver (auto-approve)
- **Backup Approvers**: Support for secondary approval if primary unavailable

### 2. Line Items Table
- **Separated from Main Request**: Allows bulk employee data submission
- **Item Status Tracking**: Each item can be individually flagged or rejected
- **Audit Ready**: Full history of all items and their changes

### 3. Financial Tracking
- **Budget Impact Calculation**: Pre-calculate if request exceeds budget
- **Current Usage Tracking**: Store snapshot of budget usage at submission time
- **Validation Fields**: Enable business logic checks without additional queries

### 4. Audit Trail
- **Comprehensive Logging**: Every action tracked separately
- **Change History**: Store old/new values for updates
- **Timeline Tracking**: Complete history for compliance

### 5. Notification System
- **Read Tracking**: Know when approvers have seen notifications
- **Type-based**: Different notification types for different events
- **Separate from Core**: Won't clutter main request table

### 6. Attachment Management
- **Cloud-Ready**: Support multiple storage providers
- **Processing Status**: Track file processing/parsing
- **Purpose Classification**: Know what each file is for

---

## Indexes Strategy

**Optimized for Common Queries:**

1. **Budget-based queries** → `idx_budgetapprovalrequests_budget_id`
2. **User's requests** → `idx_budgetapprovalrequests_submitted_by`
3. **Status filtering** → `idx_budgetapprovalrequests_status`
4. **Timeline views** → `idx_budgetapprovalrequests_submission_date`
5. **Approval queue** → `idx_approvals_assigned_to + idx_approvals_status`
6. **Activity history** → `idx_activity_log_request_id + idx_activity_log_performed_at`

---

## Constraints & Validations

### Primary Constraints
- Unique request_number ensures no duplicates
- Unique (request_id, approval_level) ensures one approval per level
- Approval level between 1-4 for proper sequencing
- Total amount must be positive

### Business Rules
- Self-request automatically approved
- Sequential approval: can't approve L2 until L1 approved
- Budget validation: warn if exceeds configured limits
- Line item status: can't have all flagged items

### Cascade Behavior
- Delete request → Delete all line items, approvals, attachments, logs, notifications
- Ensures data integrity when request is removed

---

## Performance Considerations

### Query Optimization
- **Average Request Load**: ~50-100 requests per budget per quarter
- **Line Items per Request**: 5-500 employees per submission
- **Approver Queue**: ~10-20 pending requests per approver

### Scalability
- **Partitioning**: Consider partitioning by submission_date for historical data
- **Archiving**: Move completed requests > 1 year to archive table
- **Batch Operations**: Support bulk approvals for efficiency

### Monitoring
- **Request Size Limits**: Reject requests > 50MB uploads
- **Concurrent Submissions**: Handle multiple simultaneous requests
- **API Rate Limits**: Implement per-user request limits

---

## Sample Data Structure

### Request Example
```json
{
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "budget_id": "660f9511-f30c-52e5-b827-557766551111",
  "request_number": "REQ-2025-001234",
  "title": "Q1 2025 Performance Incentives",
  "submitted_by": "user-uuid",
  "total_request_amount": 142500,
  "overall_status": "in_progress",
  "employee_count": 8,
  "current_budget_used": 485000,
  "remaining_budget": 15000,
  "will_exceed_budget": true,
  "excess_amount": 127500
}
```

### Approval Progress Example
```json
{
  "approvals": [
    {
      "approval_level": 1,
      "approval_level_name": "L1",
      "status": "approved",
      "approved_by": "approver-l1-uuid",
      "approver_name": "John Manager",
      "approval_date": "2025-01-02T14:30:00Z",
      "is_self_request": true
    },
    {
      "approval_level": 2,
      "approval_level_name": "L2",
      "status": "approved",
      "approved_by": "approver-l2-uuid",
      "approver_name": "Jane Director",
      "approval_date": "2025-01-02T15:45:00Z"
    },
    {
      "approval_level": 3,
      "approval_level_name": "L3",
      "status": "pending",
      "assigned_to_primary": "approver-l3-uuid"
    },
    {
      "approval_level": 4,
      "approval_level_name": "Payroll",
      "status": "pending"
    }
  ]
}
```

---

## Migration Script (PostgreSQL)

All tables above can be created with a migration script. The complete SQL is ready for implementation.

---

## Next Steps

1. ✅ Database schema designed
2. ⏳ Run migration to create tables
3. ⏳ Implement service layer
4. ⏳ Implement controller layer
5. ⏳ Implement routes
6. ⏳ Test API endpoints
7. ⏳ Connect to frontend
