# Approval Request Implementation Guide

## Overview
This guide covers the complete approval request workflow system implementation, database schema, service layer, API endpoints, and integration with the React frontend.

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Database Schema](#database-schema)
3. [Service Layer](#service-layer)
4. [Controller Layer](#controller-layer)
5. [API Routes](#api-routes)
6. [Frontend Integration](#frontend-integration)
7. [Approval Workflow Logic](#approval-workflow-logic)
8. [Self-Request Handling](#self-request-handling)
9. [Budget Validation](#budget-validation)
10. [Testing](#testing)
11. [Deployment Checklist](#deployment-checklist)

---

## System Architecture

### Component Overview
```
┌─────────────────────────────────────────────────────────────────┐
│                      React Frontend                              │
│  (Approval.jsx - 3213 lines with submit/approval/tracking UI)   │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP Requests
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│                    API Routes Layer                              │
│  approvalRequestRoutes.js (15 endpoints)                        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│                  Controller Layer                                │
│  approvalRequestController.js (16 methods)                      │
│  - Input validation                                              │
│  - Response formatting                                           │
│  - Error handling                                                │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│                  Service Layer                                   │
│  approvalRequestService.js (20+ methods)                        │
│  - CRUD operations                                               │
│  - Business logic                                                │
│  - Status transitions                                            │
│  - Approval workflow management                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│              Database Layer (Supabase PostgreSQL)                │
│  - tblbudgetapprovalrequests                                     │
│  - tblbudgetapprovalrequests_line_items                          │
│  - tblbudgetapprovalrequests_approvals                           │
│  - tblbudgetapprovalrequests_attachments                         │
│  - tblbudgetapprovalrequests_activity_log                        │
│  - tblbudgetapprovalrequests_notifications                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Table 1: tblbudgetapprovalrequests
Main approval request record.

**Columns**:
```sql
- request_id (UUID, PK)
- request_number (VARCHAR, UNIQUE) - REQ-2025-000001
- budget_id (UUID, FK to tblbudgetconfiguration)
- submitted_by (UUID, FK to users)
- created_by (UUID, FK to users)
- title (VARCHAR, NOT NULL)
- description (TEXT)
- total_request_amount (DECIMAL, CHECK > 0)
- overall_status (ENUM: draft, submitted, in_progress, approved, rejected, completed)
- submission_status (ENUM: incomplete, completed)
- employee_count (INTEGER, DEFAULT 0)
- attachment_count (INTEGER, DEFAULT 0)
- current_budget_used (DECIMAL)
- remaining_budget (DECIMAL)
- will_exceed_budget (BOOLEAN)
- excess_amount (DECIMAL)
- submission_date (TIMESTAMP)
- approved_date (TIMESTAMP)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- updated_by (UUID)
```

**Indexes**:
```sql
CREATE INDEX idx_budget_id ON tblbudgetapprovalrequests(budget_id);
CREATE INDEX idx_submitted_by ON tblbudgetapprovalrequests(submitted_by);
CREATE INDEX idx_overall_status ON tblbudgetapprovalrequests(overall_status);
CREATE INDEX idx_submission_date ON tblbudgetapprovalrequests(submission_date DESC);
```

---

### Table 2: tblbudgetapprovalrequests_line_items
Individual line items (employee payroll/incentives).

**Columns**:
```sql
- line_item_id (UUID, PK)
- request_id (UUID, FK to tblbudgetapprovalrequests) - CASCADE DELETE
- item_number (INTEGER)
- employee_id (VARCHAR, NOT NULL)
- employee_name (VARCHAR, NOT NULL)
- department (VARCHAR)
- position (VARCHAR)
- item_type (ENUM: bonus, incentive, salary_adjustment, deduction, correction, other)
- item_description (TEXT)
- amount (DECIMAL, NOT NULL)
- is_deduction (BOOLEAN)
- status (ENUM: pending, flagged, approved, rejected, DEFAULT 'pending')
- has_warning (BOOLEAN, DEFAULT false)
- warning_reason (TEXT)
- notes (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

**Indexes**:
```sql
CREATE INDEX idx_line_request_id ON tblbudgetapprovalrequests_line_items(request_id);
CREATE INDEX idx_line_item_type ON tblbudgetapprovalrequests_line_items(item_type);
CREATE INDEX idx_line_status ON tblbudgetapprovalrequests_line_items(status);
```

---

### Table 3: tblbudgetapprovalrequests_approvals
Approval tracking for each level.

**Columns**:
```sql
- approval_id (UUID, PK)
- request_id (UUID, FK to tblbudgetapprovalrequests) - CASCADE DELETE
- approval_level (INTEGER, 1-4)
- approval_level_name (VARCHAR: L1, L2, L3, Payroll)
- assigned_to_primary (UUID, FK to users)
- assigned_to_backup (UUID, FK to users, NULLABLE)
- status (ENUM: pending, approved, rejected, escalated, DEFAULT 'pending')
- is_self_request (BOOLEAN, DEFAULT false)
- approved_by (UUID, NULLABLE)
- approver_name (VARCHAR)
- approver_title (VARCHAR)
- approval_date (TIMESTAMP)
- approval_decision (ENUM: pending, approved, rejected)
- approval_notes (TEXT)
- conditions_applied (TEXT)
- order_index (INTEGER) - for sequential ordering
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

**Constraints**:
```sql
CONSTRAINT unique_request_approval_level UNIQUE(request_id, approval_level)
CHECK (approval_level >= 1 AND approval_level <= 4)
```

**Indexes**:
```sql
CREATE INDEX idx_approval_request_id ON tblbudgetapprovalrequests_approvals(request_id);
CREATE INDEX idx_approval_assigned_to ON tblbudgetapprovalrequests_approvals(assigned_to_primary);
CREATE INDEX idx_approval_status ON tblbudgetapprovalrequests_approvals(status);
```

---

### Table 4: tblbudgetapprovalrequests_attachments
File uploads and supporting documents.

**Columns**:
```sql
- attachment_id (UUID, PK)
- request_id (UUID, FK to tblbudgetapprovalrequests) - CASCADE DELETE
- file_name (VARCHAR, NOT NULL)
- file_type (VARCHAR) - MIME type
- file_size_bytes (INTEGER)
- storage_path (VARCHAR, NOT NULL)
- storage_provider (ENUM: s3, azure, gcs, local)
- file_purpose (ENUM: employee_data, supporting_document, approval_evidence)
- uploaded_by (UUID, FK to users)
- uploaded_date (TIMESTAMP)
- is_processed (BOOLEAN, DEFAULT false)
- processing_status (VARCHAR)
- created_at (TIMESTAMP)
```

**Indexes**:
```sql
CREATE INDEX idx_attachment_request_id ON tblbudgetapprovalrequests_attachments(request_id);
CREATE INDEX idx_attachment_purpose ON tblbudgetapprovalrequests_attachments(file_purpose);
```

---

### Table 5: tblbudgetapprovalrequests_activity_log
Complete audit trail.

**Columns**:
```sql
- log_id (UUID, PK)
- request_id (UUID, FK to tblbudgetapprovalrequests) - CASCADE DELETE
- action_type (VARCHAR) - created, submitted, approved, rejected, escalated, commented, attachment_added, etc
- description (TEXT)
- performed_by (UUID, FK to users)
- performed_at (TIMESTAMP)
- approval_level (INTEGER, NULLABLE)
- old_value (TEXT)
- new_value (TEXT)
- ip_address (VARCHAR)
- user_agent (TEXT)
- created_at (TIMESTAMP)
```

**Indexes**:
```sql
CREATE INDEX idx_activity_request_id ON tblbudgetapprovalrequests_activity_log(request_id);
CREATE INDEX idx_activity_action_type ON tblbudgetapprovalrequests_activity_log(action_type);
CREATE INDEX idx_activity_performed_at ON tblbudgetapprovalrequests_activity_log(performed_at DESC);
```

---

### Table 6: tblbudgetapprovalrequests_notifications
Notifications sent to approvers and requestors.

**Columns**:
```sql
- notification_id (UUID, PK)
- request_id (UUID, FK to tblbudgetapprovalrequests) - CASCADE DELETE
- notification_type (VARCHAR) - request_submitted, awaiting_approval, approved, rejected, etc
- title (VARCHAR)
- message (TEXT)
- recipient_id (UUID, FK to users)
- recipient_email (VARCHAR)
- is_sent (BOOLEAN, DEFAULT false)
- sent_date (TIMESTAMP)
- is_read (BOOLEAN, DEFAULT false)
- read_date (TIMESTAMP)
- related_approval_level (INTEGER, NULLABLE)
- created_at (TIMESTAMP)
```

**Indexes**:
```sql
CREATE INDEX idx_notification_recipient ON tblbudgetapprovalrequests_notifications(recipient_id);
CREATE INDEX idx_notification_is_read ON tblbudgetapprovalrequests_notifications(is_read);
CREATE INDEX idx_notification_created_at ON tblbudgetapprovalrequests_notifications(created_at DESC);
```

---

## Service Layer

### ApprovalRequestService

**Location**: `src/services/approvalRequestService.js`

**Key Methods**:

#### 1. createApprovalRequest(requestData)
Creates new approval request in DRAFT status.
```javascript
const result = await ApprovalRequestService.createApprovalRequest({
  budget_id: 'uuid',
  title: 'Q4 Performance Bonus',
  description: 'Annual performance bonus',
  total_request_amount: 50000,
  submitted_by: 'user-uuid',
  created_by: 'user-uuid'
});
```

#### 2. getApprovalRequestById(requestId)
Fetches complete request with all related data.
```javascript
const result = await ApprovalRequestService.getApprovalRequestById('request-uuid');
// Returns: { data: { request, line_items, approvals, attachments, activity_log } }
```

#### 3. submitApprovalRequest(requestId, submittedBy)
Transitions request from DRAFT to SUBMITTED and initializes approval levels.
```javascript
const result = await ApprovalRequestService.submitApprovalRequest('request-uuid', 'user-uuid');
```

#### 4. addLineItemsBulk(requestId, lineItems, createdBy)
Adds multiple line items at once (bulk import).
```javascript
const result = await ApprovalRequestService.addLineItemsBulk(
  'request-uuid',
  [
    {
      employee_id: 'E001',
      employee_name: 'John Smith',
      department: 'Engineering',
      position: 'Senior Engineer',
      item_type: 'bonus',
      amount: 5000,
      notes: 'Q4 bonus'
    },
    // ... more items
  ],
  'user-uuid'
);
```

#### 5. approveRequestAtLevel(requestId, approvalLevel, approvalData)
Approves request at specific level.
```javascript
const result = await ApprovalRequestService.approveRequestAtLevel(
  'request-uuid',
  1,
  {
    approved_by: 'user-uuid',
    approver_name: 'Jane Doe',
    approver_title: 'Department Manager',
    approval_notes: 'Approved',
    conditions_applied: 'Annual review required'
  }
);
```

#### 6. rejectRequestAtLevel(requestId, approvalLevel, rejectionData)
Rejects request at specific level.
```javascript
const result = await ApprovalRequestService.rejectRequestAtLevel(
  'request-uuid',
  1,
  {
    rejected_by: 'user-uuid',
    approver_name: 'Jane Doe',
    rejection_reason: 'Exceeds budget limit'
  }
);
```

#### 7. getPendingApprovalsForUser(userId)
Gets all pending approvals for a user.
```javascript
const result = await ApprovalRequestService.getPendingApprovalsForUser('user-uuid');
// Returns: { data: [approval1, approval2, ...] }
```

---

## Controller Layer

### ApprovalRequestController

**Location**: `src/controllers/approvalRequestController.js`

**Responsibilities**:
- Input validation
- Request/response formatting
- Error handling
- HTTP status codes

**Key Methods**:
- `createApprovalRequest(req, res)` - POST /api/approval-requests
- `getApprovalRequest(req, res)` - GET /api/approval-requests/:id
- `getAllApprovalRequests(req, res)` - GET /api/approval-requests
- `updateApprovalRequest(req, res)` - PUT /api/approval-requests/:id
- `submitApprovalRequest(req, res)` - POST /api/approval-requests/:id/submit
- `approveRequest(req, res)` - POST /api/approval-requests/:id/approvals/approve
- `rejectRequest(req, res)` - POST /api/approval-requests/:id/approvals/reject
- `addLineItemsBulk(req, res)` - POST /api/approval-requests/:id/line-items/bulk
- `getPendingApprovals(req, res)` - GET /api/approval-requests/my-approvals/pending

---

## API Routes

### Available Endpoints

**Main Request Endpoints**:
- `POST /api/approval-requests` - Create new request
- `GET /api/approval-requests` - List all requests
- `GET /api/approval-requests/:id` - Get specific request
- `PUT /api/approval-requests/:id` - Update request
- `POST /api/approval-requests/:id/submit` - Submit request
- `DELETE /api/approval-requests/:id` - Delete request

**Line Items**:
- `POST /api/approval-requests/:id/line-items` - Add single item
- `POST /api/approval-requests/:id/line-items/bulk` - Add multiple items
- `GET /api/approval-requests/:id/line-items` - Get line items

**Approvals**:
- `GET /api/approval-requests/:id/approvals` - Get approvals
- `POST /api/approval-requests/:id/approvals/approve` - Approve
- `POST /api/approval-requests/:id/approvals/reject` - Reject
- `GET /api/approval-requests/my-approvals/pending` - Get user's pending

**Attachments**:
- `POST /api/approval-requests/:id/attachments` - Add attachment
- `GET /api/approval-requests/:id/attachments` - Get attachments

**Activity**:
- `GET /api/approval-requests/:id/activity` - Get activity log

---

## Frontend Integration

### React Components to Update/Create

#### 1. Approval.jsx (Already exists)
Main component for approval workflows.

**Update needed**:
- Replace hardcoded budget configs with API call to `/api/budget-configurations`
- Use new API endpoints for submission and approval
- Connect to ApprovalRequestService via HTTP client

**Key integrations**:
```javascript
// Create new request
const createRequest = async (budgetId, title, amount) => {
  const response = await axios.post('/api/approval-requests', {
    budget_id: budgetId,
    title,
    total_request_amount: amount
  });
  return response.data;
};

// Add line items
const addLineItems = async (requestId, items) => {
  const response = await axios.post(
    `/api/approval-requests/${requestId}/line-items/bulk`,
    { line_items: items }
  );
  return response.data;
};

// Submit request
const submitRequest = async (requestId) => {
  const response = await axios.post(
    `/api/approval-requests/${requestId}/submit`
  );
  return response.data;
};

// Get request with all data
const fetchRequest = async (requestId) => {
  const response = await axios.get(`/api/approval-requests/${requestId}`);
  return response.data;
};

// Get pending approvals for user
const getPendingApprovals = async () => {
  const response = await axios.get('/api/approval-requests/my-approvals/pending');
  return response.data;
};

// Approve at level
const approveRequest = async (requestId, approvalLevel, notes) => {
  const response = await axios.post(
    `/api/approval-requests/${requestId}/approvals/approve`,
    {
      approval_level: approvalLevel,
      approver_name: currentUser.name,
      approval_notes: notes
    }
  );
  return response.data;
};

// Reject at level
const rejectRequest = async (requestId, approvalLevel, reason) => {
  const response = await axios.post(
    `/api/approval-requests/${requestId}/approvals/reject`,
    {
      approval_level: approvalLevel,
      rejection_reason: reason
    }
  );
  return response.data;
};
```

#### 2. ApprovalRequestService.jsx (New - Optional)
Custom React hook for approval request operations.

```javascript
import { useState } from 'react';
import axios from 'axios';

export function useApprovalRequests() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createRequest = async (data) => {
    setLoading(true);
    try {
      const response = await axios.post('/api/approval-requests', data);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const submitRequest = async (requestId) => {
    setLoading(true);
    try {
      const response = await axios.post(
        `/api/approval-requests/${requestId}/submit`
      );
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ... other methods

  return { createRequest, submitRequest, loading, error };
}
```

---

## Approval Workflow Logic

### Status Transitions

```
┌─────────────────────────────────────────────────────────────────┐
│                    Request Lifecycle                             │
└─────────────────────────────────────────────────────────────────┘

DRAFT (Initial)
  ├── User can edit all fields
  ├── User can add/remove line items
  ├── User can add attachments
  ├── Submit triggers approval workflow
  └── Transitions to: SUBMITTED

SUBMITTED
  ├── Requestor locked from editing
  ├── L1 approver receives notification
  ├── Transitions to: IN_PROGRESS (when first approval received)
  ├── OR transitions to: REJECTED (if L1 rejects)
  └── OR stays SUBMITTED (awaiting first approval)

IN_PROGRESS
  ├── Current level approver reviews
  ├── If approved: moves to next level OR final approval
  ├── If rejected: returns to requestor, status = REJECTED
  ├── Requestor can see progress
  └── Each level notified when ready

APPROVED (All levels complete)
  ├── All approval levels have approved
  ├── Request ready for payroll processing
  ├── Transitions to: COMPLETED (when payroll processes)
  └── Activity log locked for audit trail

REJECTED
  ├── Rejected at any level
  ├── Returns to requestor with rejection reason
  ├── Requestor can edit and resubmit
  ├── Resubmission starts workflow over at L1
  └── Activity maintains historical record

COMPLETED
  ├── Payroll has processed
  ├── Final status
  ├── No further changes allowed
  └── Full audit trail preserved
```

### Business Logic Rules

1. **Sequential Approvals**: Each level must approve before next level is notified
2. **Budget Validation**: Check remaining budget before submission
3. **Self-Requests**: Flag when requestor is approver at a level
4. **Rejection Handling**: Resubmission clears previous rejections
5. **Activity Logging**: Every action recorded with timestamp and user
6. **Notifications**: Auto-send to next level approver

---

## Self-Request Handling

### Detection
```javascript
// In submitApprovalRequest, after initializing approvals:
if (approver.primary_approver === request.submitted_by) {
  // This is a self-request
  is_self_request = true;
}
```

### Processing Options

**Option 1: Auto-Approve**
```javascript
if (is_self_request && policy.auto_approve_self_requests) {
  // Automatically approve at this level
  await approveRequestAtLevel(requestId, level, {
    approved_by: requestor_id,
    auto_approved: true
  });
  // Move to next level
}
```

**Option 2: Flag for Review**
```javascript
if (is_self_request && policy.flag_self_requests) {
  // Keep pending, notify backup approver
  await notifyBackupApprover(approval_record);
}
```

### UI Indicators
- Show "Self-Request" badge in approval queue
- Highlight in yellow or different color
- Allow backup approver to take action
- Log self-approval in activity trail

---

## Budget Validation

### Pre-Submission Check
```javascript
async function validateBudget(requestId) {
  const request = await getRequest(requestId);
  const budget = await getBudgetConfig(request.budget_id);
  
  const used = calculateBudgetUsed(budget.budget_id);
  const available = budget.total_budget - used;
  
  if (request.total_request_amount > available) {
    return {
      valid: false,
      message: 'Exceeds available budget',
      available,
      requested: request.total_request_amount,
      excess: request.total_request_amount - available
    };
  }
  
  return { valid: true };
}
```

### Budget Impact Tracking
```javascript
// Store in tblbudgetapprovalrequests:
{
  current_budget_used: 32000,
  remaining_budget: 18000,
  will_exceed_budget: true,
  excess_amount: 5000
}
```

### Display to Requestor
- Show available budget before submission
- Warn if request exceeds available
- Show impact on budget utilization
- Allow approval override if authorized

---

## Testing

### Unit Tests (Service Layer)
```javascript
describe('ApprovalRequestService', () => {
  describe('createApprovalRequest', () => {
    it('should create request in DRAFT status', async () => {
      const result = await ApprovalRequestService.createApprovalRequest({
        budget_id: 'test-budget',
        title: 'Test Request',
        total_request_amount: 10000
      });
      
      expect(result.success).toBe(true);
      expect(result.data.overall_status).toBe('draft');
    });
  });

  describe('submitApprovalRequest', () => {
    it('should initialize approval workflow', async () => {
      const result = await ApprovalRequestService.submitApprovalRequest(requestId);
      
      expect(result.success).toBe(true);
      expect(result.data.overall_status).toBe('submitted');
    });
  });

  describe('approveRequestAtLevel', () => {
    it('should update approval status', async () => {
      const result = await ApprovalRequestService.approveRequestAtLevel(
        requestId,
        1,
        approvalData
      );
      
      expect(result.success).toBe(true);
      expect(result.data.status).toBe('approved');
    });

    it('should move to next level when all previous levels approved', async () => {
      // Approve L1, L2, L3
      // Check that request is ready for Payroll
    });
  });

  describe('initializeApprovalWorkflow', () => {
    it('should create approval records for all levels', async () => {
      const result = await ApprovalRequestService.initializeApprovalWorkflow(requestId);
      
      expect(result.success).toBe(true);
      // Verify 4 approval records created
    });
  });
});
```

### Integration Tests
```javascript
describe('Approval Workflow Integration', () => {
  it('should complete full approval chain', async () => {
    // Create request
    const createResult = await createRequest(budgetData);
    const requestId = createResult.data.request_id;

    // Add line items
    await addLineItems(requestId, employeeData);

    // Submit
    await submitRequest(requestId);

    // Approve L1
    await approveAtLevel(requestId, 1, l1ApprovalData);

    // Approve L2
    await approveAtLevel(requestId, 2, l2ApprovalData);

    // Verify status transitions
    const finalRequest = await getRequest(requestId);
    expect(finalRequest.data.overall_status).toBe('approved');
  });
});
```

### API Tests (curl examples)
```bash
# Create request
curl -X POST http://localhost:3001/api/approval-requests \
  -H "Authorization: Bearer token" \
  -d '{...}'

# Add line items
curl -X POST http://localhost:3001/api/approval-requests/:id/line-items/bulk \
  -H "Authorization: Bearer token" \
  -d '{...}'

# Submit
curl -X POST http://localhost:3001/api/approval-requests/:id/submit \
  -H "Authorization: Bearer token"

# Approve
curl -X POST http://localhost:3001/api/approval-requests/:id/approvals/approve \
  -H "Authorization: Bearer token" \
  -d '{...}'
```

---

## Deployment Checklist

### Pre-Deployment
- [ ] Run all unit tests
- [ ] Run integration tests
- [ ] Test API endpoints with Postman/curl
- [ ] Verify database connections
- [ ] Check environment variables
- [ ] Review error handling
- [ ] Validate input validation
- [ ] Check CORS settings
- [ ] Review authentication middleware
- [ ] Verify database indexes created
- [ ] Test file uploads to storage provider
- [ ] Verify notification service (if implemented)

### Database Migration
- [ ] Backup current database
- [ ] Run migration script `001_create_approval_request_tables.sql`
- [ ] Verify all tables created
- [ ] Verify all indexes created
- [ ] Verify all constraints in place
- [ ] Verify foreign key relationships
- [ ] Test cascade delete behavior

### Deployment
- [ ] Deploy backend code to server
- [ ] Verify environment variables set
- [ ] Test API endpoints on production
- [ ] Monitor logs for errors
- [ ] Test with sample data
- [ ] Verify database connections
- [ ] Check file upload functionality
- [ ] Test approval notifications

### Post-Deployment
- [ ] Monitor error logs
- [ ] Verify database performance
- [ ] Check API response times
- [ ] Monitor file upload handling
- [ ] Verify audit logging
- [ ] Get stakeholder feedback
- [ ] Document any issues
- [ ] Plan for next features

### Performance Optimization
- [ ] Add pagination for large lists
- [ ] Implement caching for read operations
- [ ] Monitor database query performance
- [ ] Add database statistics collection
- [ ] Consider query optimization
- [ ] Plan for archival of old requests

---

## Next Steps

1. **Implement Notification Service**
   - Email notifications to approvers
   - In-app notifications dashboard
   - SMS notifications (optional)

2. **Add File Upload Handler**
   - Integrate with storage provider (S3, Azure)
   - Validate file types
   - Scan for malware
   - Archive processed files

3. **Implement Payroll Integration**
   - Export approved requests to payroll system
   - Automatic processing
   - Payment scheduling

4. **Add Reporting**
   - Approval metrics dashboard
   - Processing time analytics
   - Budget utilization reports
   - Approval rate by approver

5. **Implement Audit Trail Export**
   - Export activity log
   - Generate compliance reports
   - Archive historical data

---

## Troubleshooting

### Request stuck in SUBMITTED status
- Check if L1 approver assigned
- Verify approver user record exists
- Check notification delivery
- Review activity log

### Budget validation error
- Verify budget_id is correct
- Check budget remaining calculation
- Review current_budget_used calculation
- Verify total_budget in config

### Approval level not advancing
- Check status of current approval
- Verify all required fields filled
- Check order_index values
- Review activity log for errors

### Line items not saving
- Validate item amounts
- Check employee_id format
- Verify request_id exists
- Review request status (draft required)

---

## Support & Documentation

For additional information, refer to:
- [API_REFERENCE_APPROVAL_REQUESTS.md](./API_REFERENCE_APPROVAL_REQUESTS.md)
- [APPROVAL_REQUEST_DATABASE_DESIGN.md](./APPROVAL_REQUEST_DATABASE_DESIGN.md)
- [Backend Setup Guide](./QUICKSTART.md)

