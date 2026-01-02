# Testing Setup Complete - Quick Start Guide

**Status**: Ready for API Testing  
**Date**: January 2, 2025

---

## 🚀 Quick Start (5 minutes)

### Option 1: Test via API (Recommended)

**Step 1: Insert Test Budget Config**
```bash
curl -X POST http://localhost:3001/api/budget-configurations \
  -H "Authorization: Bearer test-token-requestor" \
  -H "Content-Type: application/json" \
  -d '{
    "budget_name": "Q1 2025 Performance Incentives",
    "budget_description": "Test budget for approval testing",
    "total_budget": 500000,
    "budget_currency": "PHP",
    "fiscal_year": 2025,
    "fiscal_quarter": "Q1",
    "budget_status": "active"
  }'
```

Save the returned `budget_id`.

**Step 2: Create Approval Request**
```bash
curl -X POST http://localhost:3001/api/approval-requests \
  -H "Authorization: Bearer test-token-requestor" \
  -H "Content-Type: application/json" \
  -d '{
    "budget_id": "YOUR_BUDGET_ID_HERE",
    "title": "Q1 Performance Bonus",
    "description": "Test approval request",
    "total_request_amount": 142500
  }'
```

Save the returned `request_id`.

**Step 3: Add Line Items**
```bash
curl -X POST http://localhost:3001/api/approval-requests/YOUR_REQUEST_ID_HERE/line-items/bulk \
  -H "Authorization: Bearer test-token-requestor" \
  -H "Content-Type: application/json" \
  -d '{
    "line_items": [
      {
        "employee_id": "EMP001",
        "employee_name": "Alice Johnson",
        "department": "Engineering",
        "position": "Senior Engineer",
        "item_type": "bonus",
        "amount": 50000,
        "notes": "Q1 Performance"
      },
      {
        "employee_id": "EMP002",
        "employee_name": "Bob Smith",
        "department": "Marketing",
        "position": "Manager",
        "item_type": "bonus",
        "amount": 30000,
        "notes": "Q1 Performance"
      },
      {
        "employee_id": "EMP003",
        "employee_name": "Carol Davis",
        "department": "Sales",
        "position": "Rep",
        "item_type": "incentive",
        "amount": 25000,
        "notes": "Q1 Sales"
      },
      {
        "employee_id": "EMP004",
        "employee_name": "David Lee",
        "department": "Operations",
        "position": "Coordinator",
        "item_type": "bonus",
        "amount": 20000,
        "notes": "Q1 Performance"
      },
      {
        "employee_id": "EMP005",
        "employee_name": "Eva Martinez",
        "department": "Finance",
        "position": "Analyst",
        "item_type": "bonus",
        "amount": 17500,
        "notes": "Q1 Performance"
      }
    ]
  }'
```

**Step 4: Submit Request**
```bash
curl -X POST http://localhost:3001/api/approval-requests/YOUR_REQUEST_ID_HERE/submit \
  -H "Authorization: Bearer test-token-requestor"
```

**Step 5: L1 Approves**
```bash
curl -X POST http://localhost:3001/api/approval-requests/YOUR_REQUEST_ID_HERE/approvals/approve \
  -H "Authorization: Bearer test-token-l1-approver" \
  -H "Content-Type: application/json" \
  -d '{
    "approval_level": 1,
    "approver_name": "John Manager",
    "approver_title": "Manager",
    "approval_notes": "Approved"
  }'
```

**Step 6: L2 Approves**
```bash
curl -X POST http://localhost:3001/api/approval-requests/YOUR_REQUEST_ID_HERE/approvals/approve \
  -H "Authorization: Bearer test-token-l2-approver" \
  -H "Content-Type: application/json" \
  -d '{
    "approval_level": 2,
    "approver_name": "Sarah Director",
    "approver_title": "Director",
    "approval_notes": "Approved"
  }'
```

**Step 7: L3 Approves**
```bash
curl -X POST http://localhost:3001/api/approval-requests/YOUR_REQUEST_ID_HERE/approvals/approve \
  -H "Authorization: Bearer test-token-l3-approver" \
  -H "Content-Type: application/json" \
  -d '{
    "approval_level": 3,
    "approver_name": "David VP",
    "approver_title": "VP",
    "approval_notes": "Approved"
  }'
```

**Step 8: Payroll Approves**
```bash
curl -X POST http://localhost:3001/api/approval-requests/YOUR_REQUEST_ID_HERE/approvals/approve \
  -H "Authorization: Bearer test-token-payroll" \
  -H "Content-Type: application/json" \
  -d '{
    "approval_level": 4,
    "approver_name": "Payroll Admin",
    "approval_notes": "Processed"
  }'
```

**Step 9: View Final Status**
```bash
curl -X GET http://localhost:3001/api/approval-requests/YOUR_REQUEST_ID_HERE \
  -H "Authorization: Bearer test-token-requestor"
```

✅ **Complete!** Request should show `overall_status: "approved"` with all 4 approval levels complete.

---

### Option 2: Direct Database Insert (Faster)

See [APPROVAL_REQUEST_DATABASE_SETUP.md](./APPROVAL_REQUEST_DATABASE_SETUP.md) for SQL commands to insert test data directly.

---

## 📖 Detailed Documentation

| Document | Purpose |
|----------|---------|
| [APPROVAL_REQUEST_TESTING_GUIDE.md](./APPROVAL_REQUEST_TESTING_GUIDE.md) | Complete step-by-step testing with detailed explanations |
| [APPROVAL_REQUEST_DATABASE_SETUP.md](./APPROVAL_REQUEST_DATABASE_SETUP.md) | SQL commands to set up test data directly |
| [API_REFERENCE_APPROVAL_REQUESTS.md](./API_REFERENCE_APPROVAL_REQUESTS.md) | API endpoint reference |
| [APPROVAL_REQUEST_IMPLEMENTATION_GUIDE.md](./APPROVAL_REQUEST_IMPLEMENTATION_GUIDE.md) | Implementation details and patterns |
| [src/utils/testData.js](./src/utils/testData.js) | Test data constants in JavaScript |

---

## 🔍 What to Test

### Basic Workflow
- ✅ Create request
- ✅ Add line items
- ✅ Submit for approval
- ✅ L1 approves
- ✅ L2 approves
- ✅ L3 approves
- ✅ Payroll approves
- ✅ Final status shows "approved"

### Advanced Features
- ✅ View pending approvals in queue
- ✅ View full request with all related data
- ✅ View activity log with all actions
- ✅ Test rejection & resubmission
- ✅ Test conditional approvals
- ✅ Verify line items persist
- ✅ Verify approvals sequential

---

## 🐛 Troubleshooting

### "Budget not found"
→ Create budget config first (Step 1)

### "Request not found"  
→ Use correct request_id from Step 2

### "Approval level mismatch"
→ Approve levels 1, 2, 3, 4 in order

### "Auth token invalid"
→ Backend auth middleware needs test token support

---

## 🎯 Expected Results

### After Submission
```json
{
  "overall_status": "submitted",
  "employee_count": 5,
  "approvals": [
    { "approval_level": 1, "status": "pending" },
    { "approval_level": 2, "status": "pending" },
    { "approval_level": 3, "status": "pending" },
    { "approval_level": 4, "status": "pending" }
  ]
}
```

### After All Approvals
```json
{
  "overall_status": "approved",
  "approvals": [
    { "approval_level": 1, "status": "approved", "approver_name": "John Manager" },
    { "approval_level": 2, "status": "approved", "approver_name": "Sarah Director" },
    { "approval_level": 3, "status": "approved", "approver_name": "David VP" },
    { "approval_level": 4, "status": "approved", "approver_name": "Payroll Admin" }
  ],
  "activity_log": [
    { "action_type": "created", "performed_by": "requestor" },
    { "action_type": "line_item_added", "performed_by": "requestor" },
    { "action_type": "submitted", "performed_by": "requestor" },
    { "action_type": "approved", "performed_by": "l1", "approval_level": 1 },
    { "action_type": "approved", "performed_by": "l2", "approval_level": 2 },
    { "action_type": "approved", "performed_by": "l3", "approval_level": 3 },
    { "action_type": "approved", "performed_by": "payroll", "approval_level": 4 }
  ]
}
```

---

## ✅ Completion Checklist

- [ ] Backend running on http://localhost:3001
- [ ] Database tables created (migration executed)
- [ ] Budget configuration created
- [ ] Approval request created
- [ ] Line items added
- [ ] Request submitted
- [ ] L1 approved
- [ ] L2 approved
- [ ] L3 approved
- [ ] Payroll approved
- [ ] Final status shows "approved"
- [ ] Activity log shows all actions
- [ ] API responding correctly

---

## 🚀 Next Steps

1. **Complete testing** using one of the options above
2. **Review test results** to ensure workflow works
3. **Test edge cases** (rejection, resubmission, etc.)
4. **Integrate with frontend** - Update Approval.jsx to use API
5. **Test end-to-end** with UI
6. **Deploy to production**

---

## Support

For detailed information:
- API endpoints → [API_REFERENCE_APPROVAL_REQUESTS.md](./API_REFERENCE_APPROVAL_REQUESTS.md)
- Step-by-step guide → [APPROVAL_REQUEST_TESTING_GUIDE.md](./APPROVAL_REQUEST_TESTING_GUIDE.md)
- Database setup → [APPROVAL_REQUEST_DATABASE_SETUP.md](./APPROVAL_REQUEST_DATABASE_SETUP.md)
- Architecture → [APPROVAL_REQUEST_IMPLEMENTATION_GUIDE.md](./APPROVAL_REQUEST_IMPLEMENTATION_GUIDE.md)

---

## Test Data Summary

**Budget**: Q1 2025 Performance Incentives (500,000 PHP)  
**Request**: 142,500 PHP for 5 employees  
**Approvers**: L1 (Manager), L2 (Director), L3 (VP), L4 (Payroll)  
**Expected Duration**: ~10 minutes for complete workflow

