# Approval Request Testing - Database Setup

**Purpose**: Insert test data directly into database for manual testing  
**Date**: January 2, 2025

---

## Prerequisites

- Supabase PostgreSQL database with approval request tables created
- SQL migration executed: `001_create_approval_request_tables.sql`
- Access to Supabase SQL editor or psql client

---

## Step 1: Insert Test Budget Configuration

Before creating approval requests, insert a test budget configuration:

```sql
-- Insert test budget configuration
INSERT INTO tblbudgetconfiguration (
  budget_id,
  budget_name,
  budget_description,
  budget_owner,
  total_budget,
  budget_currency,
  fiscal_year,
  fiscal_quarter,
  budget_status,
  created_by,
  created_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000'::UUID,
  'Q1 2025 Performance Incentives',
  'Quarterly performance bonus distribution for Q1 2025',
  'user-budget-owner-uuid',
  500000,
  'PHP',
  2025,
  'Q1',
  'active',
  'user-budget-owner-uuid',
  NOW()
);
```

---

## Step 2: Insert Test Approvers

Link approvers to the budget configuration:

```sql
-- Insert L1 Approver
INSERT INTO tblbudgetconfig_approvers (
  budget_id,
  approval_level,
  primary_approver,
  primary_name,
  primary_email,
  primary_title,
  backup_approver,
  backup_name,
  backup_email,
  backup_title,
  created_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000'::UUID,
  1,
  'user-l1-approver-uuid',
  'John Manager',
  'john.manager@company.com',
  'Department Manager',
  'user-l1-backup-uuid',
  'Jane Assistant Manager',
  'jane.assistant@company.com',
  'Assistant Manager',
  NOW()
);

-- Insert L2 Approver
INSERT INTO tblbudgetconfig_approvers (
  budget_id,
  approval_level,
  primary_approver,
  primary_name,
  primary_email,
  primary_title,
  backup_approver,
  backup_name,
  backup_email,
  backup_title,
  created_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000'::UUID,
  2,
  'user-l2-approver-uuid',
  'Sarah Director',
  'sarah.director@company.com',
  'Director of Operations',
  'user-l2-backup-uuid',
  'Mike Deputy Director',
  'mike.deputy@company.com',
  'Deputy Director',
  NOW()
);

-- Insert L3 Approver
INSERT INTO tblbudgetconfig_approvers (
  budget_id,
  approval_level,
  primary_approver,
  primary_name,
  primary_email,
  primary_title,
  backup_approver,
  backup_name,
  backup_email,
  backup_title,
  created_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000'::UUID,
  3,
  'user-l3-approver-uuid',
  'David VP',
  'david.vp@company.com',
  'VP of Human Resources',
  NULL,
  NULL,
  NULL,
  NULL,
  NOW()
);
```

---

## Step 3: Create Test Approval Request

```sql
-- Insert test approval request (DRAFT status)
INSERT INTO tblbudgetapprovalrequests (
  request_id,
  budget_id,
  request_number,
  submitted_by,
  created_by,
  title,
  description,
  total_request_amount,
  overall_status,
  submission_status,
  created_at
) VALUES (
  '770g0622-g41d-63f6-c938-668877662222'::UUID,
  '550e8400-e29b-41d4-a716-446655440000'::UUID,
  'REQ-2025-000001',
  'user-requestor-uuid',
  'user-requestor-uuid',
  'Q1 2025 Performance Bonus Distribution',
  'Annual performance bonus distribution for top performers in Q1 2025. Based on quarterly review scores and departmental goals.',
  142500,
  'draft',
  'incomplete',
  NOW()
);
```

---

## Step 4: Add Test Line Items

```sql
-- Insert test line items
INSERT INTO tblbudgetapprovalrequests_line_items (
  line_item_id,
  request_id,
  item_number,
  employee_id,
  employee_name,
  department,
  position,
  item_type,
  item_description,
  amount,
  is_deduction,
  notes,
  created_at
) VALUES
  ('880h1733-h52e-74g7-d049-779988773333'::UUID, '770g0622-g41d-63f6-c938-668877662222'::UUID, 1, 'EMP001', 'Alice Johnson', 'Engineering', 'Senior Software Engineer', 'bonus', 'Q1 Performance Bonus - Excellent', 50000, false, 'Led major system architecture redesign', NOW()),
  ('880h1733-h52e-74g7-d049-779988773334'::UUID, '770g0622-g41d-63f6-c938-668877662222'::UUID, 2, 'EMP002', 'Bob Smith', 'Engineering', 'Software Engineer', 'bonus', 'Q1 Performance Bonus - Good', 25000, false, 'Completed critical bug fixes and feature implementation', NOW()),
  ('880h1733-h52e-74g7-d049-779988773335'::UUID, '770g0622-g41d-63f6-c938-668877662222'::UUID, 3, 'EMP003', 'Carol Davis', 'Marketing', 'Marketing Manager', 'bonus', 'Q1 Performance Bonus - Excellent', 30000, false, 'Increased marketing engagement by 40%', NOW()),
  ('880h1733-h52e-74g7-d049-779988773336'::UUID, '770g0622-g41d-63f6-c938-668877662222'::UUID, 4, 'EMP004', 'David Wilson', 'Sales', 'Sales Representative', 'incentive', 'Sales Performance Incentive', 20000, false, 'Exceeded quarterly sales target by 25%', NOW()),
  ('880h1733-h52e-74g7-d049-779988773337'::UUID, '770g0622-g41d-63f6-c938-668877662222'::UUID, 5, 'EMP005', 'Eva Martinez', 'Operations', 'Operations Coordinator', 'bonus', 'Q1 Performance Bonus - Good', 17500, false, 'Improved process efficiency by 20%', NOW());
```

---

## Step 5: Submit the Request (Optional)

To test the approval workflow, transition the request to SUBMITTED:

```sql
-- Update request to SUBMITTED status
UPDATE tblbudgetapprovalrequests
SET 
  overall_status = 'submitted',
  submission_status = 'completed',
  submitted_date = NOW(),
  employee_count = 5,
  updated_at = NOW(),
  updated_by = 'user-requestor-uuid'
WHERE request_id = '770g0622-g41d-63f6-c938-668877662222'::UUID;

-- Create approval records for all levels
INSERT INTO tblbudgetapprovalrequests_approvals (
  approval_id,
  request_id,
  approval_level,
  approval_level_name,
  assigned_to_primary,
  assigned_to_backup,
  status,
  order_index,
  created_at
) VALUES
  ('990i2844-i63f-85h8-e150-880099884444'::UUID, '770g0622-g41d-63f6-c938-668877662222'::UUID, 1, 'L1', 'user-l1-approver-uuid', 'user-l1-backup-uuid', 'pending', 1, NOW()),
  ('aa0j3955-j74g-96i9-f261-991200995555'::UUID, '770g0622-g41d-63f6-c938-668877662222'::UUID, 2, 'L2', 'user-l2-approver-uuid', 'user-l2-backup-uuid', 'pending', 2, NOW()),
  ('bb1k4066-k85h-a7j0-g372-aa2311aa6666'::UUID, '770g0622-g41d-63f6-c938-668877662222'::UUID, 3, 'L3', 'user-l3-approver-uuid', NULL, 'pending', 3, NOW()),
  ('cc2l5177-l96i-b8k1-h483-bb3422bb7777'::UUID, '770g0622-g41d-63f6-c938-668877662222'::UUID, 4, 'Payroll', 'user-payroll-uuid', NULL, 'pending', 4, NOW());

-- Log the submission action
INSERT INTO tblbudgetapprovalrequests_activity_log (
  log_id,
  request_id,
  action_type,
  description,
  performed_by,
  performed_at
) VALUES (
  '1a1m6288-m07j-c9l2-i594-cc4433cc8888'::UUID,
  '770g0622-g41d-63f6-c938-668877662222'::UUID,
  'submitted',
  'Request submitted for approval workflow',
  'user-requestor-uuid',
  NOW()
);
```

---

## Step 6: Simulate L1 Approval

To test the approval workflow:

```sql
-- Update L1 approval record
UPDATE tblbudgetapprovalrequests_approvals
SET 
  status = 'approved',
  approved_by = 'user-l1-approver-uuid',
  approver_name = 'John Manager',
  approver_title = 'Department Manager',
  approval_decision = 'approved',
  approval_notes = 'All requested amounts align with departmental budget and performance metrics. Approved.',
  approval_date = NOW(),
  updated_at = NOW()
WHERE request_id = '770g0622-g41d-63f6-c938-668877662222'::UUID 
  AND approval_level = 1;

-- Update main request to in_progress
UPDATE tblbudgetapprovalrequests
SET 
  overall_status = 'in_progress',
  updated_at = NOW()
WHERE request_id = '770g0622-g41d-63f6-c938-668877662222'::UUID;

-- Log the approval
INSERT INTO tblbudgetapprovalrequests_activity_log (
  request_id,
  action_type,
  description,
  performed_by,
  approval_level,
  performed_at
) VALUES (
  '770g0622-g41d-63f6-c938-668877662222'::UUID,
  'approved',
  'Approved at level 1',
  'user-l1-approver-uuid',
  1,
  NOW()
);
```

---

## Verification Queries

### Check Budget Configuration
```sql
SELECT * FROM tblbudgetconfiguration 
WHERE budget_id = '550e8400-e29b-41d4-a716-446655440000'::UUID;
```

### Check Approval Request
```sql
SELECT * FROM tblbudgetapprovalrequests 
WHERE request_id = '770g0622-g41d-63f6-c938-668877662222'::UUID;
```

### Check Line Items
```sql
SELECT * FROM tblbudgetapprovalrequests_line_items 
WHERE request_id = '770g0622-g41d-63f6-c938-668877662222'::UUID
ORDER BY item_number;
```

### Check Approvals
```sql
SELECT 
  approval_level,
  approval_level_name,
  status,
  approved_by,
  approval_date
FROM tblbudgetapprovalrequests_approvals 
WHERE request_id = '770g0622-g41d-63f6-c938-668877662222'::UUID
ORDER BY approval_level;
```

### Check Activity Log
```sql
SELECT 
  action_type,
  description,
  performed_by,
  performed_at
FROM tblbudgetapprovalrequests_activity_log 
WHERE request_id = '770g0622-g41d-63f6-c938-668877662222'::UUID
ORDER BY performed_at DESC;
```

---

## Summary of Test Data IDs

Save these for API testing:

| Item | UUID |
|------|------|
| Budget Config | 550e8400-e29b-41d4-a716-446655440000 |
| Approval Request | 770g0622-g41d-63f6-c938-668877662222 |
| L1 Approver | user-l1-approver-uuid |
| L2 Approver | user-l2-approver-uuid |
| L3 Approver | user-l3-approver-uuid |
| Payroll User | user-payroll-uuid |
| Requestor | user-requestor-uuid |

---

## Quick Commands

### Delete All Test Data (if needed)
```sql
-- Delete in order of foreign key dependencies
DELETE FROM tblbudgetapprovalrequests_notifications 
WHERE request_id = '770g0622-g41d-63f6-c938-668877662222'::UUID;

DELETE FROM tblbudgetapprovalrequests_activity_log 
WHERE request_id = '770g0622-g41d-63f6-c938-668877662222'::UUID;

DELETE FROM tblbudgetapprovalrequests_attachments 
WHERE request_id = '770g0622-g41d-63f6-c938-668877662222'::UUID;

DELETE FROM tblbudgetapprovalrequests_approvals 
WHERE request_id = '770g0622-g41d-63f6-c938-668877662222'::UUID;

DELETE FROM tblbudgetapprovalrequests_line_items 
WHERE request_id = '770g0622-g41d-63f6-c938-668877662222'::UUID;

DELETE FROM tblbudgetapprovalrequests 
WHERE request_id = '770g0622-g41d-63f6-c938-668877662222'::UUID;

-- Delete budget config and approvers
DELETE FROM tblbudgetconfig_approvers 
WHERE budget_id = '550e8400-e29b-41d4-a716-446655440000'::UUID;

DELETE FROM tblbudgetconfiguration 
WHERE budget_id = '550e8400-e29b-41d4-a716-446655440000'::UUID;
```

---

## Next Steps

1. ✅ Insert test data into database
2. → Use curl commands from APPROVAL_REQUEST_TESTING_GUIDE.md
3. → Test all API endpoints
4. → Verify approval workflow
5. → Test rejection & resubmission
6. → Verify activity logging

