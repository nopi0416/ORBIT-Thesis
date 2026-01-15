# Database Setup Guide - Employee Rewards & Incentives Only

**Focus**: Q1 2025 Employee Rewards Distribution (Bonuses, Incentives, Sign-In Bonuses)  
**NOT Included**: Salary adjustments, deductions, or corrections

---

## Step 1: Insert Test Budget Configuration

This creates a 500,000 PHP budget for Q1 2025 employee rewards and incentives.

```sql
INSERT INTO public.tblbudgetconfiguration (
  budget_id,
  budget_name,
  budget_description,
  budget_owner,
  total_budget,
  budget_currency,
  fiscal_year,
  fiscal_quarter,
  budget_status,
  created_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  'Q1 2025 Employee Rewards & Incentives',
  'Quarterly rewards distribution including performance bonuses, sign-in bonuses, and incentives for Q1 2025',
  'user-budget-owner-uuid'::uuid,
  500000,
  'PHP',
  2025,
  'Q1',
  'active',
  NOW()
);
```

---

## Step 2: Insert Test Approvers

Creates three approval levels for the budget:
- **L1**: Department Manager (John Manager)
- **L2**: Director of Operations (Sarah Director)
- **L3**: VP of Human Resources (David VP)

```sql
INSERT INTO public.tblbudgetapprovalrequestapprovers (
  approver_id,
  budget_id,
  approval_level,
  approval_level_name,
  primary_approver,
  primary_name,
  primary_email,
  primary_title,
  backup_approver,
  backup_name,
  backup_email,
  created_at
) VALUES
(
  '660f9511-f30c-52e5-b827-557766551111'::uuid,
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  1,
  'L1',
  'user-l1-approver-uuid'::uuid,
  'John Manager',
  'john.manager@company.com',
  'Department Manager',
  'user-l1-backup-uuid'::uuid,
  'Jane Assistant Manager',
  'jane.assistant@company.com',
  NOW()
),
(
  '770g0622-g41d-63f6-c938-668877662222'::uuid,
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  2,
  'L2',
  'user-l2-approver-uuid'::uuid,
  'Sarah Director',
  'sarah.director@company.com',
  'Director of Operations',
  'user-l2-backup-uuid'::uuid,
  'Mike Deputy Director',
  'mike.deputy@company.com',
  NOW()
),
(
  '880h1733-h52e-74g7-d049-779988773333'::uuid,
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  3,
  'L3',
  'user-l3-approver-uuid'::uuid,
  'David VP',
  'david.vp@company.com',
  'VP of Human Resources',
  NULL::uuid,
  NULL,
  NULL,
  NOW()
);
```

---

## Step 3: Create Test Approval Request (DRAFT Status)

Creates an approval request for 142,500 PHP in employee rewards.

```sql
INSERT INTO public.tblbudgetapprovalrequests (
  request_id,
  budget_id,
  request_number,
  submitted_by,
  title,
  description,
  total_request_amount,
  currency,
  overall_status,
  submission_status,
  employee_count,
  created_at,
  created_by
) VALUES (
  'a1234567-b89c-12d3-e456-789012345678'::uuid,
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  'REQ-2025-000001',
  'user-requestor-uuid'::uuid,
  'Q1 2025 Employee Rewards Distribution',
  'Q1 2025 employee rewards including performance bonuses, sign-in bonuses, and special incentives for high performers.',
  142500,
  'PHP',
  'draft',
  'pending',
  5,
  NOW(),
  'user-requestor-uuid'::uuid
);
```

---

## Step 4: Add Test Line Items (Rewards Only)

Adds 5 employee rewards:
- **EMP001**: Performance Bonus - 50,000 PHP
- **EMP002**: Sign-In Bonus - 25,000 PHP
- **EMP003**: Performance Bonus - 30,000 PHP
- **EMP004**: Sales Incentive - 20,000 PHP
- **EMP005**: Special Recognition Bonus - 17,500 PHP

```sql
INSERT INTO public.tblbudgetapprovalrequests_line_items (
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
  status,
  notes,
  created_at
) VALUES
(
  'c1111111-1111-1111-1111-111111111111'::uuid,
  'a1234567-b89c-12d3-e456-789012345678'::uuid,
  1,
  'EMP001',
  'Alice Johnson',
  'Engineering',
  'Senior Software Engineer',
  'bonus',
  'Q1 Performance Bonus - Excellent performance on critical projects',
  50000,
  FALSE,
  'pending',
  'Led major system architecture redesign, exceeded expectations',
  NOW()
),
(
  'c2222222-2222-2222-2222-222222222222'::uuid,
  'a1234567-b89c-12d3-e456-789012345678'::uuid,
  2,
  'EMP002',
  'Bob Smith',
  'Engineering',
  'Software Engineer',
  'sign_in_bonus',
  'Q1 Sign-In Bonus - New hire retention incentive',
  25000,
  FALSE,
  'pending',
  'New hire sign-in bonus to encourage retention through year-end',
  NOW()
),
(
  'c3333333-3333-3333-3333-333333333333'::uuid,
  'a1234567-b89c-12d3-e456-789012345678'::uuid,
  3,
  'EMP003',
  'Carol Davis',
  'Marketing',
  'Marketing Manager',
  'bonus',
  'Q1 Performance Bonus - Campaign success reward',
  30000,
  FALSE,
  'pending',
  'Increased marketing engagement by 40%, exceeded KPIs',
  NOW()
),
(
  'c4444444-4444-4444-4444-444444444444'::uuid,
  'a1234567-b89c-12d3-e456-789012345678'::uuid,
  4,
  'EMP004',
  'David Wilson',
  'Sales',
  'Sales Representative',
  'incentive',
  'Sales Performance Incentive - Quota achievement reward',
  20000,
  FALSE,
  'pending',
  'Exceeded quarterly sales target by 25%, top performer this quarter',
  NOW()
),
(
  'c5555555-5555-5555-5555-555555555555'::uuid,
  'a1234567-b89c-12d3-e456-789012345678'::uuid,
  5,
  'EMP005',
  'Eva Martinez',
  'Operations',
  'Operations Coordinator',
  'special_award',
  'Q1 Special Recognition Bonus - Process improvement initiative',
  17500,
  FALSE,
  'pending',
  'Implemented process automation, improved efficiency by 20%',
  NOW()
);
```

---

## Step 5: Submit Request (Optional - Transitions to SUBMITTED)

This transitions the request from DRAFT to SUBMITTED status and creates approval records for all 4 levels (L1, L2, L3, Payroll).

```sql
-- Update request status to submitted
UPDATE public.tblbudgetapprovalrequests 
SET 
  overall_status = 'submitted',
  submission_status = 'approved',
  submitted_date = NOW()
WHERE request_id = 'a1234567-b89c-12d3-e456-789012345678'::uuid;

-- Create approval records for each level
INSERT INTO public.tblbudgetapprovalrequests_approvals (
  approval_id,
  request_id,
  approval_level,
  approval_level_name,
  assigned_to_primary,
  assigned_to_backup,
  status,
  order_index,
  submitted_on_date,
  created_at
) VALUES
(
  'app-l1-11111111-1111-1111-1111-111111111111'::uuid,
  'a1234567-b89c-12d3-e456-789012345678'::uuid,
  1,
  'L1',
  'user-l1-approver-uuid'::uuid,
  'user-l1-backup-uuid'::uuid,
  'pending',
  1,
  NOW(),
  NOW()
),
(
  'app-l2-22222222-2222-2222-2222-222222222222'::uuid,
  'a1234567-b89c-12d3-e456-789012345678'::uuid,
  2,
  'L2',
  'user-l2-approver-uuid'::uuid,
  'user-l2-backup-uuid'::uuid,
  'pending',
  2,
  NOW(),
  NOW()
),
(
  'app-l3-33333333-3333-3333-3333-333333333333'::uuid,
  'a1234567-b89c-12d3-e456-789012345678'::uuid,
  3,
  'L3',
  'user-l3-approver-uuid'::uuid,
  NULL::uuid,
  'pending',
  3,
  NOW(),
  NOW()
),
(
  'app-l4-44444444-4444-4444-4444-444444444444'::uuid,
  'a1234567-b89c-12d3-e456-789012345678'::uuid,
  4,
  'L4',
  'user-payroll-uuid'::uuid,
  NULL::uuid,
  'pending',
  4,
  NOW(),
  NOW()
);

-- Log activity for submission
INSERT INTO public.tblbudgetapprovalrequests_activity_log (
  log_id,
  request_id,
  action_type,
  description,
  performed_by,
  performed_at
) VALUES (
  'activity-submit-1111-1111-1111-111111111111'::uuid,
  'a1234567-b89c-12d3-e456-789012345678'::uuid,
  'submitted',
  'Approval request submitted for review by all approvers',
  'user-requestor-uuid'::uuid,
  NOW()
);
```

---

## Verification Queries

### Check Budget Configuration
```sql
SELECT 
  budget_id,
  budget_name,
  total_budget,
  budget_currency,
  fiscal_year,
  fiscal_quarter,
  budget_status
FROM public.tblbudgetconfiguration
WHERE budget_id = '550e8400-e29b-41d4-a716-446655440000'::uuid;
```

### Check Approvers
```sql
SELECT 
  approver_id,
  approval_level,
  approval_level_name,
  primary_name,
  primary_email,
  primary_title
FROM public.tblbudgetapprovalrequestapprovers
WHERE budget_id = '550e8400-e29b-41d4-a716-446655440000'::uuid
ORDER BY approval_level;
```

### Check Request Status
```sql
SELECT 
  request_id,
  request_number,
  title,
  total_request_amount,
  overall_status,
  employee_count,
  created_at
FROM public.tblbudgetapprovalrequests
WHERE request_id = 'a1234567-b89c-12d3-e456-789012345678'::uuid;
```

### Check Line Items (Rewards Only)
```sql
SELECT 
  line_item_number,
  employee_id,
  employee_name,
  item_type,
  item_description,
  amount,
  status,
  notes
FROM public.tblbudgetapprovalrequests_line_items
WHERE request_id = 'a1234567-b89c-12d3-e456-789012345678'::uuid
ORDER BY item_number;
```

**Expected Output:**
- EMP001: bonus, 50000 PHP
- EMP002: sign_in_bonus, 25000 PHP
- EMP003: bonus, 30000 PHP
- EMP004: incentive, 20000 PHP
- EMP005: special_award, 17500 PHP

### Check Approvals
```sql
SELECT 
  approval_id,
  approval_level,
  approval_level_name,
  status,
  assigned_to_primary,
  order_index
FROM public.tblbudgetapprovalrequests_approvals
WHERE request_id = 'a1234567-b89c-12d3-e456-789012345678'::uuid
ORDER BY approval_level;
```

### Check Activity Log
```sql
SELECT 
  log_id,
  action_type,
  description,
  performed_by,
  performed_at
FROM public.tblbudgetapprovalrequests_activity_log
WHERE request_id = 'a1234567-b89c-12d3-e456-789012345678'::uuid
ORDER BY performed_at;
```

---

## Test Data Summary

| Field | Value |
|-------|-------|
| Budget ID | 550e8400-e29b-41d4-a716-446655440000 |
| Budget Name | Q1 2025 Employee Rewards & Incentives |
| Total Budget | 500,000 PHP |
| Request ID | a1234567-b89c-12d3-e456-789012345678 |
| Request Number | REQ-2025-000001 |
| Total Request Amount | 142,500 PHP |
| Employee Count | 5 |
| Reward Types | bonus, sign_in_bonus, incentive, special_award |

---

## Reward Types Supported

The system now supports the following reward types ONLY (no salary):

| Type | Description | Example |
|------|-------------|---------|
| `bonus` | Performance bonus or annual bonus | Q1 Performance Bonus |
| `incentive` | Sales or goal achievement incentive | Sales Target Incentive |
| `sign_in_bonus` | New hire sign-in bonus | New Hire Retention Bonus |
| `special_award` | Special recognition or award | Process Improvement Award |
| `referral_reward` | Employee referral reward | Referral Bonus |
| `other_reward` | Other types of rewards | Any other non-salary reward |

---

## Cleanup (Remove Test Data)

To reset and remove all test data:

```sql
-- Delete all related records
DELETE FROM public.tblbudgetapprovalrequests_activity_log 
WHERE request_id = 'a1234567-b89c-12d3-e456-789012345678'::uuid;

DELETE FROM public.tblbudgetapprovalrequests_approvals 
WHERE request_id = 'a1234567-b89c-12d3-e456-789012345678'::uuid;

DELETE FROM public.tblbudgetapprovalrequests_line_items 
WHERE request_id = 'a1234567-b89c-12d3-e456-789012345678'::uuid;

DELETE FROM public.tblbudgetapprovalrequests 
WHERE request_id = 'a1234567-b89c-12d3-e456-789012345678'::uuid;

DELETE FROM public.tblbudgetapprovalrequestapprovers 
WHERE budget_id = '550e8400-e29b-41d4-a716-446655440000'::uuid;

DELETE FROM public.tblbudgetconfiguration 
WHERE budget_id = '550e8400-e29b-41d4-a716-446655440000'::uuid;
```

---

## Ready to Test!

Your test database is now set up with:
- ✅ Budget configuration for Q1 2025 rewards
- ✅ 3 approval levels (L1, L2, L3) + Payroll
- ✅ 5 sample employees with different reward types
- ✅ Draft approval request ready for testing

**Next Step**: Use [APPROVAL_REQUEST_QUICK_START.md](./APPROVAL_REQUEST_QUICK_START.md) to test the API endpoints.
