# Approval Request API - Testing Guide

**Status**: Complete walkthrough for testing the approval workflow  
**Date**: January 2, 2025

---

## Overview

This guide walks you through testing the entire approval request workflow using curl commands. All test data is in `src/utils/testData.js`.

---

## Prerequisites

1. **Backend running**: `npm run dev` (should be on http://localhost:3001)
2. **Database migrated**: Run `001_create_approval_request_tables.sql`
3. **Budget configuration created**: Insert test budget config first
4. **Test data available**: `src/utils/testData.js`

---

## Step 1: Set Up Budget Configuration

Before testing approval requests, ensure a budget configuration exists.

### Create Test Budget Configuration

```bash
curl -X POST http://localhost:3001/api/budget-configurations \
  -H "Authorization: Bearer test-token-requestor" \
  -H "Content-Type: application/json" \
  -d '{
    "budget_name": "Q1 2025 Performance Incentives",
    "budget_description": "Quarterly performance bonus distribution",
    "total_budget": 500000,
    "budget_currency": "PHP",
    "fiscal_year": 2025,
    "fiscal_quarter": "Q1",
    "budget_status": "active"
  }'
```

**Expected Response** (201):
```json
{
  "success": true,
  "message": "Budget configuration created successfully",
  "data": {
    "budget_id": "550e8400-e29b-41d4-a716-446655440000",
    "budget_name": "Q1 2025 Performance Incentives",
    "total_budget": 500000,
    "budget_status": "active"
  }
}
```

**Save the `budget_id` for next steps** (in examples: `550e8400-e29b-41d4-a716-446655440000`)

---

## Step 2: Create Approval Request (DRAFT)

The requestor creates a new approval request in DRAFT status.

```bash
curl -X POST http://localhost:3001/api/approval-requests \
  -H "Authorization: Bearer test-token-requestor" \
  -H "Content-Type: application/json" \
  -d '{
    "budget_id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Q1 2025 Performance Bonus Distribution",
    "description": "Annual performance bonus distribution for top performers in Q1 2025",
    "total_request_amount": 142500
  }'
```

**Expected Response** (201):
```json
{
  "success": true,
  "message": "Approval request created successfully",
  "data": {
    "request_id": "770g0622-g41d-63f6-c938-668877662222",
    "request_number": "REQ-2025-000001",
    "budget_id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Q1 2025 Performance Bonus Distribution",
    "total_request_amount": 142500,
    "overall_status": "draft",
    "employee_count": 0,
    "created_at": "2025-01-02T10:00:00Z"
  }
}
```

**Save the `request_id` for next steps** (in examples: `770g0622-g41d-63f6-c938-668877662222`)

---

## Step 3: Add Line Items (DRAFT)

The requestor adds employee line items to the request while still in DRAFT.

### Add Multiple Items (Bulk)

```bash
curl -X POST http://localhost:3001/api/approval-requests/770g0622-g41d-63f6-c938-668877662222/line-items/bulk \
  -H "Authorization: Bearer test-token-requestor" \
  -H "Content-Type: application/json" \
  -d '{
    "line_items": [
      {
        "employee_id": "EMP001",
        "employee_name": "Alice Johnson",
        "department": "Engineering",
        "position": "Senior Software Engineer",
        "item_type": "bonus",
        "amount": 50000,
        "notes": "Led major system architecture redesign"
      },
      {
        "employee_id": "EMP002",
        "employee_name": "Bob Smith",
        "department": "Engineering",
        "position": "Software Engineer",
        "item_type": "bonus",
        "amount": 25000,
        "notes": "Completed critical bug fixes"
      },
      {
        "employee_id": "EMP003",
        "employee_name": "Carol Davis",
        "department": "Marketing",
        "position": "Marketing Manager",
        "item_type": "bonus",
        "amount": 30000,
        "notes": "Increased marketing engagement by 40%"
      },
      {
        "employee_id": "EMP004",
        "employee_name": "David Wilson",
        "department": "Sales",
        "position": "Sales Representative",
        "item_type": "incentive",
        "amount": 20000,
        "notes": "Exceeded quarterly sales target by 25%"
      },
      {
        "employee_id": "EMP005",
        "employee_name": "Eva Martinez",
        "department": "Operations",
        "position": "Operations Coordinator",
        "item_type": "bonus",
        "amount": 17500,
        "notes": "Improved process efficiency by 20%"
      }
    ]
  }'
```

**Expected Response** (201):
```json
{
  "success": true,
  "message": "5 line items added successfully",
  "data": [
    {
      "line_item_id": "880h1733-h52e-74g7-d049-779988773333",
      "item_number": 1,
      "employee_name": "Alice Johnson",
      "amount": 50000,
      "status": "pending"
    },
    // ... more items
  ]
}
```

---

## Step 4: Verify Line Items

Check that all line items were added correctly.

```bash
curl -X GET http://localhost:3001/api/approval-requests/770g0622-g41d-63f6-c938-668877662222/line-items \
  -H "Authorization: Bearer test-token-requestor"
```

**Expected Response** (200):
```json
{
  "success": true,
  "message": "Line items retrieved",
  "data": [
    {
      "line_item_id": "880h1733-h52e-74g7-d049-779988773333",
      "item_number": 1,
      "employee_id": "EMP001",
      "employee_name": "Alice Johnson",
      "amount": 50000,
      "status": "pending"
    },
    // ... 4 more items
  ]
}
```

---

## Step 5: Submit Approval Request

The requestor submits the request. This transitions it from DRAFT to SUBMITTED and initializes the approval workflow (creates approval records for all levels).

```bash
curl -X POST http://localhost:3001/api/approval-requests/770g0622-g41d-63f6-c938-668877662222/submit \
  -H "Authorization: Bearer test-token-requestor" \
  -H "Content-Type: application/json"
```

**Expected Response** (200):
```json
{
  "success": true,
  "message": "Approval request submitted successfully",
  "data": {
    "request_id": "770g0622-g41d-63f6-c938-668877662222",
    "overall_status": "submitted",
    "submission_status": "completed",
    "submitted_date": "2025-01-02T11:00:00Z"
  }
}
```

**At this point**:
- ✅ Request is locked from editing
- ✅ Approval records created for L1, L2, L3, Payroll
- ✅ L1 approver notified (will appear in their queue)

---

## Step 6: L1 Approver Reviews Request

The L1 approver gets their approval queue and reviews the request.

### Get Pending Approvals for L1

```bash
curl -X GET http://localhost:3001/api/approval-requests/my-approvals/pending \
  -H "Authorization: Bearer test-token-l1-approver"
```

**Expected Response** (200):
```json
{
  "success": true,
  "message": "Pending approvals retrieved",
  "data": [
    {
      "approval_id": "990i2844-i63f-85h8-e150-880099884444",
      "request_id": "770g0622-g41d-63f6-c938-668877662222",
      "approval_level": 1,
      "approval_level_name": "L1",
      "request_number": "REQ-2025-000001",
      "title": "Q1 2025 Performance Bonus Distribution",
      "status": "pending",
      "is_self_request": false
    }
  ]
}
```

### Get Full Request Details

```bash
curl -X GET http://localhost:3001/api/approval-requests/770g0622-g41d-63f6-c938-668877662222 \
  -H "Authorization: Bearer test-token-l1-approver"
```

**Expected Response** (200):
```json
{
  "success": true,
  "message": "Approval request retrieved",
  "data": {
    "request_id": "770g0622-g41d-63f6-c938-668877662222",
    "request_number": "REQ-2025-000001",
    "title": "Q1 2025 Performance Bonus Distribution",
    "total_request_amount": 142500,
    "overall_status": "submitted",
    "employee_count": 5,
    "line_items": [
      { "employee_id": "EMP001", "employee_name": "Alice Johnson", "amount": 50000, ... },
      // ... more items
    ],
    "approvals": [
      {
        "approval_level": 1,
        "approval_level_name": "L1",
        "status": "pending",
        "assigned_to_primary": "user-l1-approver-uuid"
      },
      {
        "approval_level": 2,
        "approval_level_name": "L2",
        "status": "pending"
      }
      // ... more levels
    ]
  }
}
```

---

## Step 7: L1 Approves Request

The L1 approver approves the request.

```bash
curl -X POST http://localhost:3001/api/approval-requests/770g0622-g41d-63f6-c938-668877662222/approvals/approve \
  -H "Authorization: Bearer test-token-l1-approver" \
  -H "Content-Type: application/json" \
  -d '{
    "approval_level": 1,
    "approver_name": "John Manager",
    "approver_title": "Department Manager",
    "approval_notes": "All requested amounts align with departmental budget and performance metrics. Approved.",
    "conditions_applied": null
  }'
```

**Expected Response** (200):
```json
{
  "success": true,
  "message": "Request approved at level 1",
  "data": {
    "approval_id": "990i2844-i63f-85h8-e150-880099884444",
    "status": "approved",
    "approval_level": 1,
    "approval_date": "2025-01-02T11:30:00Z"
  }
}
```

**At this point**:
- ✅ L1 approval complete
- ✅ L2 approver is now notified
- ✅ Request status transitions to "in_progress"

---

## Step 8: L2 Approver Reviews & Approves

### Get L2's Pending Approvals

```bash
curl -X GET http://localhost:3001/api/approval-requests/my-approvals/pending \
  -H "Authorization: Bearer test-token-l2-approver"
```

### L2 Approves (with conditions)

```bash
curl -X POST http://localhost:3001/api/approval-requests/770g0622-g41d-63f6-c938-668877662222/approvals/approve \
  -H "Authorization: Bearer test-token-l2-approver" \
  -H "Content-Type: application/json" \
  -d '{
    "approval_level": 2,
    "approver_name": "Sarah Director",
    "approver_title": "Director of Operations",
    "approval_notes": "Budget allocation is appropriate. Recommending processing within 2 weeks.",
    "conditions_applied": "Quarterly review of payment timing required"
  }'
```

**Expected Response** (200):
```json
{
  "success": true,
  "message": "Request approved at level 2",
  "data": {
    "approval_id": "aa0j3955-j74g-96i9-f261-991200995555",
    "status": "approved",
    "approval_level": 2,
    "conditions_applied": "Quarterly review of payment timing required"
  }
}
```

---

## Step 9: L3 Approver Reviews & Approves

### L3 Approves

```bash
curl -X POST http://localhost:3001/api/approval-requests/770g0622-g41d-63f6-c938-668877662222/approvals/approve \
  -H "Authorization: Bearer test-token-l3-approver" \
  -H "Content-Type: application/json" \
  -d '{
    "approval_level": 3,
    "approver_name": "David VP",
    "approver_title": "VP of Human Resources",
    "approval_notes": "Final approval granted. All compliance requirements met.",
    "conditions_applied": null
  }'
```

---

## Step 10: Payroll Final Processing

The Payroll approver does final review and approval (Level 4).

```bash
curl -X POST http://localhost:3001/api/approval-requests/770g0622-g41d-63f6-c938-668877662222/approvals/approve \
  -H "Authorization: Bearer test-token-payroll" \
  -H "Content-Type: application/json" \
  -d '{
    "approval_level": 4,
    "approver_name": "Payroll Admin",
    "approval_notes": "Request processed in payroll system. Payments scheduled for 2025-01-15.",
    "conditions_applied": null
  }'
```

**Expected Response** (200):
```json
{
  "success": true,
  "message": "Request approved at level 4",
  "data": {
    "approval_id": "bb1k4066-k85h-a7j0-g372-aa2311aa6666",
    "status": "approved",
    "approval_level": 4
  }
}
```

**At this point**:
- ✅ All approval levels complete
- ✅ Request status transitions to "APPROVED"
- ✅ Ready for payroll processing

---

## Step 11: Get Final Request Status

View the complete approval trail and final status.

```bash
curl -X GET http://localhost:3001/api/approval-requests/770g0622-g41d-63f6-c938-668877662222 \
  -H "Authorization: Bearer test-token-requestor"
```

**Expected Response** (200):
```json
{
  "success": true,
  "message": "Approval request retrieved",
  "data": {
    "request_id": "770g0622-g41d-63f6-c938-668877662222",
    "request_number": "REQ-2025-000001",
    "overall_status": "approved",
    "approvals": [
      {
        "approval_level": 1,
        "approval_level_name": "L1",
        "status": "approved",
        "approved_by": "user-l1-approver-uuid",
        "approver_name": "John Manager",
        "approval_date": "2025-01-02T11:30:00Z",
        "approval_notes": "All requested amounts align with departmental budget..."
      },
      {
        "approval_level": 2,
        "approval_level_name": "L2",
        "status": "approved",
        "approved_by": "user-l2-approver-uuid",
        "approver_name": "Sarah Director",
        "approval_date": "2025-01-02T12:15:00Z",
        "conditions_applied": "Quarterly review of payment timing required"
      },
      {
        "approval_level": 3,
        "approval_level_name": "L3",
        "status": "approved",
        "approved_by": "user-l3-approver-uuid",
        "approver_name": "David VP",
        "approval_date": "2025-01-02T13:00:00Z"
      },
      {
        "approval_level": 4,
        "approval_level_name": "Payroll",
        "status": "approved",
        "approved_by": "user-payroll-uuid",
        "approval_date": "2025-01-02T13:45:00Z"
      }
    ],
    "activity_log": [
      {
        "action_type": "created",
        "performed_by": "user-requestor-uuid",
        "performed_at": "2025-01-02T10:00:00Z"
      },
      {
        "action_type": "line_item_added",
        "performed_by": "user-requestor-uuid",
        "performed_at": "2025-01-02T10:30:00Z"
      },
      {
        "action_type": "submitted",
        "performed_by": "user-requestor-uuid",
        "performed_at": "2025-01-02T11:00:00Z"
      },
      {
        "action_type": "approved",
        "performed_by": "user-l1-approver-uuid",
        "performed_at": "2025-01-02T11:30:00Z",
        "description": "Approved at level 1"
      },
      // ... more activity
    ]
  }
}
```

---

## Alternative Scenario: Rejection & Resubmission

Instead of approving at any level, an approver can reject. Here's how:

### L1 Rejects Request

```bash
curl -X POST http://localhost:3001/api/approval-requests/770g0622-g41d-63f6-c938-668877662222/approvals/reject \
  -H "Authorization: Bearer test-token-l1-approver" \
  -H "Content-Type: application/json" \
  -d '{
    "approval_level": 1,
    "approver_name": "John Manager",
    "rejection_reason": "Budget allocation exceeds departmental limits for this quarter. Please revise amounts and resubmit."
  }'
```

**Expected Response** (200):
```json
{
  "success": true,
  "message": "Request rejected at level 1",
  "data": {
    "approval_id": "990i2844-i63f-85h8-e150-880099884444",
    "status": "rejected"
  }
}
```

### Request Status After Rejection

Request status becomes "rejected":
```bash
curl -X GET http://localhost:3001/api/approval-requests/770g0622-g41d-63f6-c938-668877662222 \
  -H "Authorization: Bearer test-token-requestor"
```

Response shows:
```json
{
  "overall_status": "rejected",
  "approvals": [
    {
      "approval_level": 1,
      "status": "rejected",
      "approval_decision": "rejected",
      "approval_notes": "Budget allocation exceeds departmental limits..."
    }
  ]
}
```

### Requestor Corrects & Resubmits

Requestor can edit the request and resubmit:

```bash
curl -X PUT http://localhost:3001/api/approval-requests/770g0622-g41d-63f6-c938-668877662222 \
  -H "Authorization: Bearer test-token-requestor" \
  -H "Content-Type: application/json" \
  -d '{
    "total_request_amount": 100000
  }'
```

Then resubmit:
```bash
curl -X POST http://localhost:3001/api/approval-requests/770g0622-g41d-63f6-c938-668877662222/submit \
  -H "Authorization: Bearer test-token-requestor"
```

Workflow restarts from L1 approval.

---

## Testing Activity Log

View the complete timeline of all actions:

```bash
curl -X GET http://localhost:3001/api/approval-requests/770g0622-g41d-63f6-c938-668877662222/activity \
  -H "Authorization: Bearer test-token-requestor"
```

**Shows**:
- Request created
- Line items added
- Request submitted
- Each approval decision
- Timestamps for each action
- User who performed each action

---

## Quick Reference Table

| Step | Endpoint | Method | Status Transition |
|------|----------|--------|-------------------|
| 1 | POST /api/approval-requests | POST | DRAFT |
| 2 | POST /api/approval-requests/:id/line-items/bulk | POST | DRAFT |
| 3 | POST /api/approval-requests/:id/submit | POST | DRAFT → SUBMITTED |
| 4 | GET /my-approvals/pending | GET | - |
| 5 | POST /api/approval-requests/:id/approvals/approve | POST (L1) | SUBMITTED → IN_PROGRESS |
| 6 | POST /api/approval-requests/:id/approvals/approve | POST (L2) | IN_PROGRESS |
| 7 | POST /api/approval-requests/:id/approvals/approve | POST (L3) | IN_PROGRESS |
| 8 | POST /api/approval-requests/:id/approvals/approve | POST (L4) | IN_PROGRESS → APPROVED |

---

## Environment Setup for Testing

To use the test tokens in the examples, ensure your backend auth middleware allows test tokens:

**Option 1: Mock Auth for Testing**
```javascript
// In src/middleware/auth.js
if (req.headers.authorization === 'Bearer test-token-requestor') {
  req.user = { id: 'user-requestor-uuid', role: 'requestor' };
}
if (req.headers.authorization === 'Bearer test-token-l1-approver') {
  req.user = { id: 'user-l1-approver-uuid', role: 'l1' };
}
// ... etc
```

**Option 2: Use Real JWT Tokens**
- Generate real JWT tokens with proper claims
- Include user_id and role in token payload

---

## Common Test Scenarios

### Scenario 1: Happy Path (All Approvals)
- Create → Submit → L1 Approve → L2 Approve → L3 Approve → Payroll Approve → COMPLETED

### Scenario 2: Rejection & Resubmission
- Create → Submit → L1 Reject → Edit → Submit → Approval chain continues

### Scenario 3: Self-Request
- Requestor is also L1 Approver
- Auto-approve L1 or flag for review
- Continue through L2, L3, Payroll

### Scenario 4: Conditional Approval
- L2 Approves with conditions
- Payroll reviews conditions before final processing
- All recorded in audit trail

---

## Troubleshooting

**Issue**: "Budget configuration not found"
- Solution: Create budget config first with correct budget_id

**Issue**: "Approval level mismatch"
- Solution: Ensure you're approving levels 1, 2, 3, 4 in order

**Issue**: "Request not in draft status"
- Solution: Can only edit before submission

**Issue**: "Approval already exists"
- Solution: Each request_id + approval_level combination is unique

---

## Next Steps

After successful testing:
1. ✅ Verify all endpoints work
2. → Integrate with frontend (Approval.jsx)
3. → Replace test tokens with real JWT
4. → Test with actual user roles
5. → Deploy to staging
6. → Deploy to production

