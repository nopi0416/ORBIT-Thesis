# Bulk Upload - Remaining Implementation Tasks

## ✅ Completed
1. Changed "Parsed" to "Uploaded" label
2. Added termination_date column to table
3. Increased text size from text-xs to text-sm throughout table
4. Fixed modal size (90vw x 85vh)

## 🔄 In Progress - Need Manual Review

### 1. Duplicate Detection Logic
**Location**: `BulkUploadValidation.jsx` - validatedItems useMemo

Need to add:
```javascript
// Check for duplicates
const employeeIdCounts = {};
bulkItems.forEach(item => {
  if (item.employee_id) {
    employeeIdCounts[item.employee_id] = (employeeIdCounts[item.employee_id] || 0) + 1;
  }
});

return bulkItems.map((item, index) => {
  const validation = validateEmployee ? validateEmployee(item) : { valid: true, warnings: [], errors: [] };
  
  // Check if this employee_id appears more than once
  const isDuplicate = item.employee_id && employeeIdCounts[item.employee_id] > 1;
  
  if (isDuplicate) {
    // Find first occurrence
    const firstIndex = bulkItems.findIndex(i => i.employee_id === item.employee_id);
    if (index !== firstIndex) {
      validation.errors.push('Duplicate employee ID');
    }
  }
  
  const hasErrors = validation.errors && validation.errors.length > 0;
  const hasWarnings = validation.warnings && validation.warnings.length > 0;
  
  return {
    ...item,
    index,
    validation,
    isDuplicate: isDuplicate && index !== firstIndex,
    status: hasErrors ? 'invalid' : hasWarnings ? 'warning' : 'valid'
  };
});
```

###  2. Re-validation on Employee ID Change
**Location**: `BulkUploadValidation.jsx` - handleUpdate function

Need to add async employee lookup:
```javascript
const handleUpdate = async (index, field, value) => {
  const updated = [...bulkItems];
  updated[index] = { ...updated[index], [field]: value };
  
  // If employee_id changed, re-fetch employee data
  if (field === 'employee_id' && value.trim()) {
    try {
      const companyId = selectedConfig?.company_id;
      const token = /* get from auth context */;
      const result = await approvalRequestService.getEmployeeByEid(value, companyId, token);
      
      if (result.success && result.data) {
        // Apply same scope validation as bulk upload
        const validation = validateEmployeeScope(result.data);
        updated[index] = {
          ...updated[index],
          employee_name: result.data.name || '',
          position: result.data.position || '',
          department: validation.employeeDepartment || '',
          employeeData: result.data,
          scopeValidation: validation,
        };
      }
    } catch (error) {
      console.error('Error re-fetching employee:', error);
    }
  }
  
  setBulkItems(updated);
};
```

### 3. Fix Vertical Centering
**Location**: `Approval.jsx` - Dialog content div (around line 1800)

Current:
```jsx
<div className={`${
  requestMode === 'bulk' && bulkItems.length > 0
    ? 'px-6 py-4 flex-1 overflow-y-auto flex items-center'
    : 'space-y-4'
}`}>
```

Change to:
```jsx
<div className={`${
  requestMode === 'bulk' && bulkItems.length > 0
    ? 'px-6 py-4 flex-1 overflow-y-auto'
    : 'space-y-4'
}`}>
```

### 4. Disable Proceed Button Logic
**Location**: `Approval.jsx` - Proceed button (around line 1850)

Add computed variable:
```javascript
const canProceed = useMemo(() => {
  if (requestMode === 'individual') {
    return requestDetails.details?.trim().length > 0 && individualRequest.employeeId;
  } else {
    // For bulk: need approval description and at least one valid item
    const hasApprovalDescription = bulkItems[0]?.approval_description?.trim().length > 0;
    const hasValidItems = bulkItems.some(item => {
      const hasEmployeeData = item.employee_id && item.employeeData;
      const hasValidAmount = item.amount && item.amount > 0;
      const isInScope = item.scopeValidation ? item.scopeValidation.isValid : true;
      return hasEmployeeData && hasValidAmount && isInScope;
    });
    return hasApprovalDescription && hasValidItems;
  }
}, [requestMode, requestDetails, individualRequest, bulkItems]);
```

Button:
```jsx
<Button
  type="submit"
  disabled={!canProceed || submitting}
  className="bg-pink-500 hover:bg-pink-600"
>
  {submitting ? 'Submitting...' : 'Proceed'}
</Button>
```

## 🔨 Backend Implementation Required

### Tables Schema Summary
- `tblbudgetapprovalrequests` - Main request record
- `tblbudgetapprovalrequests_line_items` - Individual line items for bulk
- `tblbudgetapprovalrequests_approvals` - Multi-level approval tracking
- `tblbudgetapprovalrequests_activity_log` - Audit trail
- `tblbudgetapprovalrequests_notifications` - Notification queue
- `tblbudgetapprovalrequests_attachments_logs` - File uploads

### Backend Endpoints Needed

#### 1. Submit Individual Request
`POST /api/approval-requests/submit-individual`
```javascript
{
  budget_id: uuid,
  employee_id: string,
  amount: number,
  is_deduction: boolean,
  description: string,
  notes: string
}
```

#### 2. Submit Bulk Request
`POST /api/approval-requests/submit-bulk`
```javascript
{
  budget_id: uuid,
  description: string, // approval_description
  line_items: [{
    employee_id: string,
    employee_name: string,
    department: string,
    position: string,
    amount: number,
    is_deduction: boolean,
    notes: string
  }]
}
```

### Implementation Steps
1. Create service methods in `approvalRequestService.js`
2. Create controller methods in `approvalRequestController.js`  
3. Add routes in `approvalRequestRoutes.js`
4. Implement transaction handling for multi-table inserts
5. Generate request_number (format: AR-YYYYMMDD-XXXX)
6. Initialize approval workflow levels
7. Create activity log entries
8. Queue notifications for approvers

