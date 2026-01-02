# Approval Request API Reference

## Overview
The Approval Request API manages the complete workflow for submitting and tracking budget approval requests through multiple approval levels (L1, L2, L3, Payroll). This API integrates with the Budget Configuration system to ensure requests are tied to specific budget configurations.

## Table of Contents
1. [Core Concepts](#core-concepts)
2. [Status Transitions](#status-transitions)
3. [API Endpoints](#api-endpoints)
4. [Request/Response Examples](#requestresponse-examples)
5. [Error Codes](#error-codes)
6. [Workflow Scenarios](#workflow-scenarios)

---

## Core Concepts

### Approval Levels
The system uses 4 approval levels sequentially:
- **Level 1 (L1)**: Initial reviewer/manager approval
- **Level 2 (L2)**: Director or department head approval
- **Level 3 (L3)**: VP or executive approval
- **Level 4 (Payroll)**: Payroll/Finance final approval

Each level must approve before the next level is notified.

### Request Status States
- **draft**: Initial state, can be edited before submission
- **submitted**: Submitted for workflow, awaiting first approval
- **in_progress**: Currently at an approval level
- **approved**: All levels approved successfully
- **rejected**: Rejected at any level
- **completed**: Completed and processed in payroll

### Line Items
Individual entries within an approval request representing:
- Employee bonuses
- Salary adjustments
- Deductions
- Incentives
- Corrections

### Self-Requests
When the requestor is also an approver at a level, the `is_self_request` flag is set. These can be auto-approved or flagged for review depending on policy.

---

## Status Transitions

```
DRAFT ──submit──> SUBMITTED ──> IN_PROGRESS ──> APPROVED ──> COMPLETED
                                     │
                                   REJECTED
                                     │
                                   DRAFT (if resubmitted)

Approval Flow:
PENDING ──approve──> APPROVED
   │
   └──reject──> REJECTED
```

---

## API Endpoints

### 1. Create Approval Request

**Endpoint**: `POST /api/approval-requests`

Creates a new approval request in DRAFT status.

**Required Authentication**: Yes

**Request Body**:
```json
{
  "budget_id": "uuid-of-budget-config",
  "title": "Q4 Performance Bonus",
  "description": "Annual performance bonus distribution for Q4",
  "total_request_amount": 50000
}
```

**Response** (201):
```json
{
  "success": true,
  "message": "Approval request created successfully",
  "data": {
    "request_id": "uuid",
    "request_number": "REQ-2025-000001",
    "budget_id": "uuid",
    "title": "Q4 Performance Bonus",
    "description": "Annual performance bonus distribution for Q4",
    "total_request_amount": 50000,
    "overall_status": "draft",
    "submission_status": "incomplete",
    "employee_count": 0,
    "attachment_count": 0,
    "created_by": "user-uuid",
    "submitted_by": "user-uuid",
    "created_at": "2025-01-02T10:30:00Z"
  }
}
```

---

### 2. Get Approval Request

**Endpoint**: `GET /api/approval-requests/:id`

Retrieves complete approval request including all related data.

**Required Authentication**: Yes

**Response** (200):
```json
{
  "success": true,
  "message": "Approval request retrieved",
  "data": {
    "request_id": "uuid",
    "request_number": "REQ-2025-000001",
    "budget_id": "uuid",
    "title": "Q4 Performance Bonus",
    "total_request_amount": 50000,
    "overall_status": "in_progress",
    "submission_status": "completed",
    "employee_count": 15,
    "attachment_count": 2,
    "current_budget_used": 32000,
    "remaining_budget": 18000,
    "will_exceed_budget": false,
    "submitted_date": "2025-01-02T10:30:00Z",
    "created_at": "2025-01-02T09:00:00Z",
    "updated_at": "2025-01-02T10:30:00Z",
    "line_items": [
      {
        "line_item_id": "uuid",
        "item_number": 1,
        "employee_id": "E001",
        "employee_name": "John Smith",
        "department": "Engineering",
        "position": "Senior Engineer",
        "item_type": "bonus",
        "amount": 5000,
        "is_deduction": false,
        "status": "approved",
        "has_warning": false,
        "notes": "Q4 performance bonus"
      }
    ],
    "approvals": [
      {
        "approval_id": "uuid",
        "approval_level": 1,
        "approval_level_name": "L1",
        "assigned_to_primary": "manager-uuid",
        "assigned_to_backup": "manager-backup-uuid",
        "status": "approved",
        "is_self_request": false,
        "approved_by": "manager-uuid",
        "approver_name": "Jane Doe",
        "approval_date": "2025-01-02T11:00:00Z",
        "approval_notes": "Approved"
      },
      {
        "approval_id": "uuid",
        "approval_level": 2,
        "approval_level_name": "L2",
        "assigned_to_primary": "director-uuid",
        "status": "pending",
        "is_self_request": false
      }
    ],
    "attachments": [],
    "activity_log": []
  }
}
```

---

### 3. Get All Approval Requests

**Endpoint**: `GET /api/approval-requests`

Lists all approval requests with optional filtering.

**Required Authentication**: Yes

**Query Parameters**:
- `budget_id`: Filter by budget configuration (optional)
- `status`: Filter by status: draft, submitted, in_progress, approved, rejected (optional)
- `submitted_by`: Filter by submitter user ID (optional)
- `search`: Search in request number and title (optional)

**Example**: `GET /api/approval-requests?status=pending&budget_id=uuid`

**Response** (200):
```json
{
  "success": true,
  "message": "Approval requests retrieved",
  "data": [
    {
      "request_id": "uuid",
      "request_number": "REQ-2025-000001",
      "budget_id": "uuid",
      "title": "Q4 Performance Bonus",
      "total_request_amount": 50000,
      "overall_status": "in_progress",
      "employee_count": 15,
      "attachment_count": 2,
      "submitted_date": "2025-01-02T10:30:00Z"
    },
    {
      "request_id": "uuid",
      "request_number": "REQ-2025-000002",
      "budget_id": "uuid",
      "title": "Monthly Incentive",
      "total_request_amount": 25000,
      "overall_status": "draft",
      "employee_count": 0,
      "submitted_date": null
    }
  ]
}
```

---

### 4. Update Approval Request

**Endpoint**: `PUT /api/approval-requests/:id`

Updates approval request details (title, description, amounts, etc).

**Required Authentication**: Yes

**Request Body** (all fields optional):
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "total_request_amount": 55000
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Approval request updated successfully",
  "data": { }
}
```

---

### 5. Submit Approval Request

**Endpoint**: `POST /api/approval-requests/:id/submit`

Transitions request from DRAFT to SUBMITTED and initializes the approval workflow.

**Required Authentication**: Yes

**Request Body**: Empty

**Response** (200):
```json
{
  "success": true,
  "message": "Approval request submitted successfully",
  "data": {
    "request_id": "uuid",
    "overall_status": "submitted",
    "submission_status": "completed",
    "submitted_date": "2025-01-02T10:30:00Z"
  }
}
```

**Note**: Submitting a request will:
1. Change status from draft to submitted
2. Create approval records for each level
3. Notify L1 approver
4. Lock the request from further editing

---

## Line Items API

### 6. Add Single Line Item

**Endpoint**: `POST /api/approval-requests/:id/line-items`

Adds a single line item to the request.

**Required Authentication**: Yes

**Request Body**:
```json
{
  "item_number": 1,
  "employee_id": "E001",
  "employee_name": "John Smith",
  "department": "Engineering",
  "position": "Senior Engineer",
  "item_type": "bonus",
  "item_description": "Q4 performance bonus",
  "amount": 5000,
  "is_deduction": false,
  "notes": "Exceeds expectations"
}
```

**Response** (201):
```json
{
  "success": true,
  "message": "Line item added successfully",
  "data": {
    "line_item_id": "uuid",
    "request_id": "uuid",
    "item_number": 1,
    "employee_id": "E001",
    "employee_name": "John Smith",
    "amount": 5000,
    "status": "pending"
  }
}
```

---

### 7. Add Line Items (Bulk)

**Endpoint**: `POST /api/approval-requests/:id/line-items/bulk`

Adds multiple line items at once (from file import).

**Required Authentication**: Yes

**Request Body**:
```json
{
  "line_items": [
    {
      "employee_id": "E001",
      "employee_name": "John Smith",
      "department": "Engineering",
      "position": "Senior Engineer",
      "item_type": "bonus",
      "amount": 5000,
      "notes": "Q4 bonus"
    },
    {
      "employee_id": "E002",
      "employee_name": "Jane Doe",
      "department": "Marketing",
      "position": "Marketing Manager",
      "item_type": "salary_adjustment",
      "amount": 3000,
      "notes": "Promotion adjustment"
    }
  ]
}
```

**Response** (201):
```json
{
  "success": true,
  "message": "15 line items added successfully",
  "data": [
    { "line_item_id": "uuid", "item_number": 1, "employee_name": "John Smith", "amount": 5000 },
    { "line_item_id": "uuid", "item_number": 2, "employee_name": "Jane Doe", "amount": 3000 }
  ]
}
```

---

### 8. Get Line Items

**Endpoint**: `GET /api/approval-requests/:id/line-items`

Gets all line items for an approval request.

**Required Authentication**: Yes

**Response** (200):
```json
{
  "success": true,
  "message": "Line items retrieved",
  "data": [
    {
      "line_item_id": "uuid",
      "request_id": "uuid",
      "item_number": 1,
      "employee_id": "E001",
      "employee_name": "John Smith",
      "department": "Engineering",
      "position": "Senior Engineer",
      "item_type": "bonus",
      "amount": 5000,
      "is_deduction": false,
      "status": "pending",
      "has_warning": false,
      "notes": "Q4 performance bonus"
    }
  ]
}
```

---

## Approval Workflow API

### 9. Get Approvals for Request

**Endpoint**: `GET /api/approval-requests/:id/approvals`

Gets approval status and details for all levels.

**Required Authentication**: Yes

**Response** (200):
```json
{
  "success": true,
  "message": "Approvals retrieved",
  "data": [
    {
      "approval_id": "uuid",
      "request_id": "uuid",
      "approval_level": 1,
      "approval_level_name": "L1",
      "assigned_to_primary": "manager-uuid",
      "assigned_to_backup": "manager-backup-uuid",
      "status": "approved",
      "is_self_request": false,
      "approved_by": "manager-uuid",
      "approver_name": "Jane Doe",
      "approver_title": "Department Manager",
      "approval_date": "2025-01-02T11:00:00Z",
      "approval_decision": "approved",
      "approval_notes": "Approved with recommendation to monitor",
      "conditions_applied": "Annual review required"
    },
    {
      "approval_id": "uuid",
      "request_id": "uuid",
      "approval_level": 2,
      "approval_level_name": "L2",
      "assigned_to_primary": "director-uuid",
      "status": "pending",
      "is_self_request": false
    }
  ]
}
```

---

### 10. Approve Request at Level

**Endpoint**: `POST /api/approval-requests/:id/approvals/approve`

Approves request at a specific approval level.

**Required Authentication**: Yes

**Request Body**:
```json
{
  "approval_level": 1,
  "approver_name": "Jane Doe",
  "approver_title": "Department Manager",
  "approval_notes": "Approved. Budget allocation is appropriate.",
  "conditions_applied": "Quarterly review required"
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Request approved at level 1",
  "data": {
    "approval_id": "uuid",
    "status": "approved",
    "approval_date": "2025-01-02T11:00:00Z",
    "approval_level": 1
  }
}
```

**Behavior**:
- Updates approval record with approved status
- Sets approval_date and approver_name
- If all levels approved, changes request status to "approved"
- Notifies next level approver
- Logs activity

---

### 11. Reject Request at Level

**Endpoint**: `POST /api/approval-requests/:id/approvals/reject`

Rejects request at a specific approval level.

**Required Authentication**: Yes

**Request Body**:
```json
{
  "approval_level": 1,
  "approver_name": "Jane Doe",
  "rejection_reason": "Budget allocation exceeds departmental limits. Please revise and resubmit."
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Request rejected at level 1",
  "data": {
    "approval_id": "uuid",
    "status": "rejected",
    "approval_date": "2025-01-02T11:00:00Z"
  }
}
```

**Behavior**:
- Updates approval record with rejected status
- Changes request status to "rejected"
- Notifies requestor
- Request must be resubmitted after correction
- Logs activity with rejection reason

---

## Attachments API

### 12. Add Attachment

**Endpoint**: `POST /api/approval-requests/:id/attachments`

Adds a file attachment to the approval request.

**Required Authentication**: Yes

**Request Body**:
```json
{
  "file_name": "employee_data.xlsx",
  "file_type": "application/vnd.ms-excel",
  "file_size_bytes": 15360,
  "storage_path": "s3://bucket/approvals/req-001/employee_data.xlsx",
  "storage_provider": "s3",
  "file_purpose": "employee_data"
}
```

**Response** (201):
```json
{
  "success": true,
  "message": "Attachment added successfully",
  "data": {
    "attachment_id": "uuid",
    "file_name": "employee_data.xlsx",
    "storage_path": "s3://bucket/approvals/req-001/employee_data.xlsx",
    "uploaded_date": "2025-01-02T10:30:00Z"
  }
}
```

**File Purposes**:
- `employee_data`: Employee data spreadsheet (XLSX, CSV)
- `supporting_document`: Supporting PDF or document
- `approval_evidence`: Evidence for approval decision

---

### 13. Get Attachments

**Endpoint**: `GET /api/approval-requests/:id/attachments`

Gets all attachments for an approval request.

**Required Authentication**: Yes

**Response** (200):
```json
{
  "success": true,
  "message": "Attachments retrieved",
  "data": [
    {
      "attachment_id": "uuid",
      "file_name": "employee_data.xlsx",
      "file_type": "application/vnd.ms-excel",
      "file_size_bytes": 15360,
      "storage_path": "s3://bucket/approvals/req-001/employee_data.xlsx",
      "storage_provider": "s3",
      "file_purpose": "employee_data",
      "uploaded_by": "user-uuid",
      "uploaded_date": "2025-01-02T10:30:00Z"
    }
  ]
}
```

---

## Activity & Audit API

### 14. Get Activity Log

**Endpoint**: `GET /api/approval-requests/:id/activity`

Gets complete activity log and audit trail for a request.

**Required Authentication**: Yes

**Response** (200):
```json
{
  "success": true,
  "message": "Activity log retrieved",
  "data": [
    {
      "log_id": "uuid",
      "action_type": "created",
      "description": "",
      "performed_by": "user-uuid",
      "performed_at": "2025-01-02T09:00:00Z"
    },
    {
      "log_id": "uuid",
      "action_type": "submitted",
      "description": "",
      "performed_by": "user-uuid",
      "performed_at": "2025-01-02T10:30:00Z"
    },
    {
      "log_id": "uuid",
      "action_type": "approved",
      "description": "Approved at level 1",
      "performed_by": "manager-uuid",
      "performed_at": "2025-01-02T11:00:00Z",
      "approval_level": 1
    },
    {
      "log_id": "uuid",
      "action_type": "line_item_added",
      "description": "",
      "performed_by": "user-uuid",
      "performed_at": "2025-01-02T10:45:00Z"
    },
    {
      "log_id": "uuid",
      "action_type": "attachment_added",
      "description": "",
      "performed_by": "user-uuid",
      "performed_at": "2025-01-02T10:50:00Z"
    }
  ]
}
```

**Action Types**:
- `created`: Request created
- `submitted`: Request submitted
- `approved`: Request approved at level
- `rejected`: Request rejected
- `escalated`: Request escalated
- `commented`: Comment added
- `line_item_added`: Line items added
- `attachment_added`: Attachment added
- `status_changed`: Status changed

---

## User Approval Queue

### 15. Get Pending Approvals for User

**Endpoint**: `GET /api/approval-requests/my-approvals/pending`

Gets all pending approvals assigned to the current user.

**Required Authentication**: Yes

**Response** (200):
```json
{
  "success": true,
  "message": "Pending approvals retrieved",
  "data": [
    {
      "approval_id": "uuid",
      "request_id": "uuid",
      "approval_level": 1,
      "approval_level_name": "L1",
      "request_number": "REQ-2025-000001",
      "title": "Q4 Performance Bonus",
      "assigned_to_primary": "user-uuid",
      "status": "pending",
      "is_self_request": false,
      "created_at": "2025-01-02T09:00:00Z"
    },
    {
      "approval_id": "uuid",
      "request_id": "uuid",
      "approval_level": 2,
      "approval_level_name": "L2",
      "request_number": "REQ-2025-000002",
      "title": "Monthly Incentive",
      "assigned_to_primary": "user-uuid",
      "status": "pending",
      "is_self_request": true,
      "created_at": "2025-01-02T10:00:00Z"
    }
  ]
}
```

---

### 16. Delete Approval Request

**Endpoint**: `DELETE /api/approval-requests/:id`

Deletes an approval request (typically only allowed in DRAFT status).

**Required Authentication**: Yes

**Response** (200):
```json
{
  "success": true,
  "message": "Approval request deleted successfully"
}
```

---

## Request/Response Examples

### Example 1: Complete Approval Workflow

#### Step 1: Create Request
```bash
curl -X POST http://localhost:3001/api/approval-requests \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{
    "budget_id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Q4 Performance Bonus",
    "description": "Annual performance bonus distribution",
    "total_request_amount": 50000
  }'
```

#### Step 2: Add Line Items
```bash
curl -X POST http://localhost:3001/api/approval-requests/request-uuid/line-items/bulk \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{
    "line_items": [
      {
        "employee_id": "E001",
        "employee_name": "John Smith",
        "department": "Engineering",
        "position": "Senior Engineer",
        "item_type": "bonus",
        "amount": 5000
      },
      {
        "employee_id": "E002",
        "employee_name": "Jane Doe",
        "department": "Marketing",
        "position": "Marketing Manager",
        "item_type": "bonus",
        "amount": 3000
      }
    ]
  }'
```

#### Step 3: Submit Request
```bash
curl -X POST http://localhost:3001/api/approval-requests/request-uuid/submit \
  -H "Authorization: Bearer token"
```

#### Step 4: Get Pending Approvals
```bash
curl -X GET http://localhost:3001/api/approval-requests/my-approvals/pending \
  -H "Authorization: Bearer token"
```

#### Step 5: Approve at Level 1
```bash
curl -X POST http://localhost:3001/api/approval-requests/request-uuid/approvals/approve \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{
    "approval_level": 1,
    "approver_name": "Jane Doe",
    "approver_title": "Department Manager",
    "approval_notes": "Approved"
  }'
```

#### Step 6: Get Request Status
```bash
curl -X GET http://localhost:3001/api/approval-requests/request-uuid \
  -H "Authorization: Bearer token"
```

---

## Error Codes

| Code | Status | Message | Explanation |
|------|--------|---------|-------------|
| 201 | Created | Success | Request created successfully |
| 200 | OK | Success | Operation completed successfully |
| 400 | Bad Request | Missing required fields | Request validation failed |
| 401 | Unauthorized | Missing or invalid token | Authentication failed |
| 403 | Forbidden | Insufficient permissions | User lacks required permissions |
| 404 | Not Found | Request not found | Approval request ID doesn't exist |
| 409 | Conflict | Request already at this status | Status transition invalid |
| 422 | Unprocessable Entity | Invalid data | Data validation failed |
| 500 | Server Error | Database error | Internal server error |

### Common Errors

**Missing Required Fields**
```json
{
  "success": false,
  "message": "Missing required fields: budget_id, title, total_request_amount"
}
```

**Request Not Found**
```json
{
  "success": false,
  "message": "Approval request not found"
}
```

**Exceeds Budget**
```json
{
  "success": false,
  "message": "Total request amount exceeds available budget",
  "data": {
    "total_amount": 55000,
    "budget_available": 50000,
    "excess": 5000
  }
}
```

**Invalid Status Transition**
```json
{
  "success": false,
  "message": "Cannot approve completed request"
}
```

---

## Workflow Scenarios

### Scenario 1: Standard Approval Chain
```
Requestor creates DRAFT
    ↓
Requestor adds line items and attachments
    ↓
Requestor submits → Status: SUBMITTED
    ↓
L1 Manager reviews → APPROVED at Level 1
    ↓
L2 Director reviews → APPROVED at Level 2
    ↓
L3 VP reviews → APPROVED at Level 3
    ↓
Payroll reviews → APPROVED at Level 4 → Overall Status: APPROVED
    ↓
Payroll processes → Status: COMPLETED
```

### Scenario 2: Rejection & Resubmission
```
Request submitted → L1 Manager reviews
    ↓
L1 Manager REJECTS with reason
    ↓
Request status: REJECTED
    ↓
Requestor corrects request in DRAFT mode
    ↓
Requestor resubmits
    ↓
Approval workflow restarts from L1
```

### Scenario 3: Self-Request
```
When requestor is also L1 approver:
    ↓
Request submitted → L1 approval created with is_self_request: true
    ↓
Can auto-approve or flag for review (depends on company policy)
    ↓
If auto-approved: moves directly to L2
    ↓
If flagged: requires manual approval from backup approver
```

### Scenario 4: Conditional Approval
```
L2 Director approves with conditions
    ↓
conditions_applied: "Annual salary review required by Q1"
    ↓
Request continues through workflow
    ↓
Activity log records condition
    ↓
Payroll reviews condition before final processing
```

---

## Integration Notes

### With Budget Configuration
- Each approval request links to a specific budget configuration (budget_id FK)
- Approval levels inherited from budget configuration approvers
- Budget impact validated against available budget

### With Authentication
- All endpoints require valid Bearer token
- User ID extracted from token for audit logging
- Role-based access control applied at controller level

### Activity Logging
- Every action automatically logged in activity_log table
- Includes timestamp, user, action type, and description
- Enables complete audit trail for compliance

### Notifications
- Approval request submitted → L1 approver notified
- Request approved at level → Next level approver notified
- Request rejected → Requestor notified with reason

---

## Rate Limiting
- Not currently implemented
- Recommended: 1000 requests per hour per user

---

## Pagination
- Not currently implemented
- Recommended: Implement for getAllApprovalRequests when list exceeds 1000 items

---

## API Versioning
- Current version: v1
- Base URL: `/api/approval-requests` (implicit v1)
- Future versions: `/api/v2/approval-requests`

