# ORBIT Thesis - Remaining Implementation Tasks

## ✅ COMPLETED

### Budget Configuration (BudgetRequest.jsx)
1. ✅ **Date Input Responsiveness** - Changed from flex items-center to stacked grid layout (grid-cols-1 sm:grid-cols-2)
2. ✅ **Review Description Alignment** - Fixed to align with budget name/period using justify-between
3. ✅ **Affected OUs → All** - Added "→ All" suffix when all children selected
4. ✅ **Review Data Alignment & Size** - Moved Clients, Tenure Groups, Approvers to right side with larger text (text-sm)
5. ✅ **Redirect After Creation** - Added event listener to switch to "list" tab after successful creation

### Approval Management (Approval.jsx)  
6. ✅ **Duplicate Validation Bug Fix** - Removed "Employee not found" error when employee ID is duplicate (keeps only "Duplicate Employee ID")

---

## 🔧 IN PROGRESS / NEEDS COMPLETION

### Critical Bugs
7. **Bulk Upload Table Performance** ⚠️ HIGH PRIORITY
   - **Issue**: Table is very laggy with many rows
   - **Solution**: 
     - Use React.memo for table rows
     - Virtualize table with react-window or react-virtual
     - Debounce validation checks
     - Move validation to Web Worker
   - **File**: `orbit-frontend/src/components/approval/BulkUploadValidation.jsx`

8. **Proceed Button Not Working** ⚠️ CRITICAL
   - **Issue**: Button disabled even when approval_description is filled
   - **Current Logic**: Checks `bulkItems[0]?.approval_description?.trim().length > 0`
   - **Possible Cause**: State update timing or validation logic
   - **Debug Steps**:
     1. Add console.log in canProceed useMemo
     2. Check if bulkItems is updating correctly
     3. Verify approval_description is being set on all items
   - **File**: `orbit-frontend/src/pages/Approval.jsx` line 220-240

9. **Bulk Upload Modal Vertical Centering** 
   - **Issue**: Content centered vertically instead of starting at top
   - **Current**: Dialog uses flex-1 overflow-y-auto
   - **Fix Needed**: Remove any flex items-center in DialogContent wrapper
   - **File**: `orbit-frontend/src/pages/Approval.jsx` around line 1558-1570

### UI Improvements

10. **Department Display in Submit Approval**
    - **Issue**: When config has all departments, should show "Company A → All"
    - **Current**: Shows individual department names
    - **Requirement**: 
      - If all departments selected → show "Parent OU → All"
      - If multiple (>4) → show "Dept1, Dept2, Dept3, Dept4...(+N more)" with hover to show all
    - **File**: `orbit-frontend/src/pages/Approval.jsx` line 1465-1475 (config card display)
    - **Function to modify**: `formatOuPaths()` around line 417-423

11. **Real-time Employee ID Validation** ⏸️ DEFERRED
    - **Issue**: When user changes invalid employee ID to valid one, no automatic lookup
    - **Required**: Add onChange handler to Employee ID input that:
      1. Debounces input (500ms)
      2. Calls getEmployeeByEid API
      3. Updates employeeData and scopeValidation
      4. Re-runs validation
    - **File**: `orbit-frontend/src/components/approval/BulkUploadValidation.jsx` line 115-125

---

## 🎯 MAJOR FEATURES NEEDED

### Data Caching & Pre-loading
12. **Implement Data Caching**
    - **Requirement**: Pre-load and cache all data to speed up page navigation
    - **Approach**:
      - Create global cache context (React Context or Zustand)
      - Cache configurations, approvers, organizations, employee data
      - Implement SWR (stale-while-revalidate) pattern
      - Add background refresh every 30s
    - **Files to Create**:
      - `orbit-frontend/src/context/DataCacheContext.jsx`
      - `orbit-frontend/src/hooks/useCachedData.js`
    - **Files to Modify**:
      - All pages using API calls (Approval.jsx, BudgetRequest.jsx, etc.)

### Approval Request Workflow

13. **Column-Based Workflow Design**
    - **Current**: Row-based workflow status display
    - **Required**: Column-based design showing L1 → L2 → L3 → Payroll vertically
    - **File**: `orbit-frontend/src/pages/Approval.jsx` (approval details modal)
    - **Section**: renderWorkflowSummary around line 855-870

14. **Approval Confirmation Modals**
    - **Requirements**:
      - Confirmation dialog before approve/reject action
      - Success message (auto-close in 5s)
      - Approved requests viewable but not actionable
      - Rejected/completed requests only in History & Logs
    - **Implementation**:
      ```jsx
      const [confirmAction, setConfirmAction] = useState(null); // 'approve' or 'reject'
      const [showConfirm, setShowConfirm] = useState(false);
      const [actionSuccess, setActionSuccess] = useState(false);
      
      // Confirmation Dialog
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogTitle>Confirm {confirmAction === 'approve' ? 'Approval' : 'Rejection'}</DialogTitle>
          <DialogDescription>
            Are you sure you want to {confirmAction} this request?
          </DialogDescription>
          <DialogFooter>
            <Button onClick={() => setShowConfirm(false)}>Cancel</Button>
            <Button onClick={handleConfirmAction}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      // Success Message (auto-close)
      useEffect(() => {
        if (actionSuccess) {
          const timer = setTimeout(() => {
            setActionSuccess(false);
            setDetailsOpen(false);
          }, 5000);
          return () => clearTimeout(timer);
        }
      }, [actionSuccess]);
      ```
    - **File**: `orbit-frontend/src/pages/Approval.jsx` ApprovalRequests component

15. **Auto-Approve L1 if Requester is L1**
    - **Logic**: If L1 approver submits their own request, auto-approve L1 level
    - **Backend**: Check if `requester_id === L1_approver_id` during submission
    - **Frontend**: Show L1 as "Approved (Self-Submitted)" in workflow
    - **Files**:
      - Backend: `orbit-backend/src/services/approvalRequestService.js`
      - Frontend: `orbit-frontend/src/pages/Approval.jsx`

16. **Payroll Workflow Handling**
    - **Current**: Shows "Waiting for approval from..."
    - **Required**: Show "Handled by: [Name] | Action: Approved/Rejected/Completed"
    - **Implementation**: Modify workflow status display for L4/Payroll level
    - **File**: `orbit-frontend/src/pages/Approval.jsx` workflow rendering

17. **Approval Visibility Rules**
    - **Requirements**:
      - Primary + Backup approvers see all requests they're configured for
      - Payroll users see only requests in their parent OU
      - Already-approved requests viewable but actions disabled
    - **Backend Filter**:
      ```sql
      SELECT * FROM tblbudgetapprovalrequests r
      JOIN tblbudgetapprovalrequests_approvals a ON r.request_id = a.request_id
      WHERE (a.assigned_to_primary = $userId OR a.assigned_to_backup = $userId)
      AND (status = 'pending' OR status = 'approved') -- viewable statuses
      ```
    - **Files**:
      - Backend: `orbit-backend/src/services/approvalRequestService.js`
      - Frontend: Disable action buttons if user already approved

18. **Approval Request Details Display**
    - **Issues**:
      - Budget configuration name not showing correctly (shows "BUDGET CONFIGURATION")
      - Background design broken when details modal opens
      - Approval description should be in same panel as uploaded data (but at top)
    - **Fixes Needed**:
      - Use `detailBudgetName` properly from requestConfigDetails
      - Fix dialog background overlay
      - Move approval description field
    - **File**: `orbit-frontend/src/pages/Approval.jsx` details modal around line 1910+

---

## 📝 IMPLEMENTATION PRIORITY

### Phase 1 - Critical Bugs (TODAY)
1. ✅ Duplicate validation bug
2. ⚠️ Proceed button not working
3. ⚠️ Bulk upload table performance
4. ⚠️ Modal vertical alignment

### Phase 2 - UI Polish (THIS WEEK)
5. Department display with "All" and truncation
6. Column-based workflow design
7. Approval confirmation modals
8. Fix approval details display issues

### Phase 3 - Backend Features (NEXT WEEK)
9. Auto-approve L1 logic
10. Approval visibility filtering
11. Payroll workflow handling
12. Data caching system

---

## 🐛 KNOWN ISSUES

1. **Proceed Button**: Users report button stays disabled even with valid data + description
   - **Workaround**: Refresh page and re-upload file
   - **Root Cause**: Likely state synchronization issue between Approval.jsx and BulkUploadValidation.jsx
   - **Fix**: Add console logging to trace state updates

2. **Table Performance**: 50+ rows cause significant lag
   - **Workaround**: Split uploads into smaller batches
   - **Root Cause**: Re-rendering all rows on every validation change
   - **Fix**: Implement virtualization + memoization

3. **Approval Details Background**: Overlay breaks layout
   - **Workaround**: Close and reopen modal
   - **Root Cause**: Conflicting z-index or dialog overlay styling
   - **Fix**: Check DialogContent className and overlay props

---

## 💡 OPTIMIZATION STRATEGIES

### Table Performance
```jsx
// Current: Re-validates all items on every change
const validatedItems = useMemo(() => {
  return bulkItems.map((item, index) => {
    const validation = validateEmployee(item); // Called for ALL items
    // ...
  });
}, [bulkItems, validateEmployee]);

// Optimized: Cache validation results
const [validationCache, setValidationCache] = useState(new Map());

const validatedItems = useMemo(() => {
  return bulkItems.map((item, index) => {
    const cacheKey = `${item.employee_id}-${item.amount}-${item.is_deduction}`;
    if (validationCache.has(cacheKey)) {
      return validationCache.get(cacheKey);
    }
    const validation = validateEmployee(item);
    validationCache.set(cacheKey, validation);
    // ...
  });
}, [bulkItems, validateEmployee, validationCache]);
```

### Data Caching
```jsx
// Global cache context
const DataCacheContext = createContext();

export const DataCacheProvider = ({ children }) => {
  const [cache, setCache] = useState({
    configurations: { data: null, timestamp: null },
    approvers: { data: null, timestamp: null },
    organizations: { data: null, timestamp: null },
  });

  const getCachedData = useCallback((key, fetchFn, ttl = 60000) => {
    const cached = cache[key];
    const now = Date.now();
    
    if (cached.data && cached.timestamp && (now - cached.timestamp) < ttl) {
      return cached.data;
    }
    
    // Fetch fresh data in background
    fetchFn().then(data => {
      setCache(prev => ({
        ...prev,
        [key]: { data, timestamp: now }
      }));
    });
    
    return cached.data; // Return stale data while fetching
  }, [cache]);

  return (
    <DataCacheContext.Provider value={{ cache, getCachedData }}>
      {children}
    </DataCacheContext.Provider>
  );
};
```

---

## 🔍 DEBUGGING CHECKLIST

### Proceed Button Issue
- [ ] Log `bulkItems` array in canProceed useMemo
- [ ] Log `bulkItems[0]?.approval_description` value
- [ ] Check if approval_description is string or undefined
- [ ] Verify setBulkItems is updating all items correctly
- [ ] Test with single item vs multiple items
- [ ] Check if validation is blocking (hasValidItems condition)

### Table Performance
- [ ] Profile component with React DevTools Profiler
- [ ] Count number of re-renders per keystroke
- [ ] Measure validation execution time
- [ ] Check if validateEmployee is memoized
- [ ] Test with 10, 50, 100, 500 rows
- [ ] Monitor memory usage

### Approval Details Display
- [ ] Inspect `detailBudgetName` value in console
- [ ] Check `requestConfigDetails` object structure
- [ ] Verify API response for budget configuration details
- [ ] Test with different budget configurations
- [ ] Check if budget_name vs name field issue

---

## 📦 FILES MODIFIED TODAY

### ✅ Completed
1. `orbit-frontend/src/pages/BudgetRequest.jsx`
   - Date input layout (lines 1798-1825)
   - Review description alignment (line 2369)
   - Review data alignment (lines 2450-2505)
   - Affected OUs → All (lines 1278-1303)
   - Tab switching event (lines 60-68)

2. `orbit-frontend/src/components/approval/BulkUploadValidation.jsx`
   - Duplicate validation fix (lines 18-58)

### ⏸️ Needs Work
3. `orbit-frontend/src/pages/Approval.jsx`
   - canProceed logic (review needed)
   - Department display (not started)
   - Modal alignment (not started)
   - Approval details (not started)
   - Workflow column design (not started)
   - Confirmation modals (not started)

4. `orbit-backend/src/services/approvalRequestService.js`
   - Auto-approve L1 logic (not started)
   - Visibility filtering (not started)

---

## ✨ NEXT IMMEDIATE STEPS

1. **Fix Proceed Button** (30 min)
   - Add console.log debugging
   - Test with different scenarios
   - Fix state synchronization if needed

2. **Fix Modal Alignment** (15 min)
   - Find DialogContent with items-center
   - Remove vertical centering
   - Test with different screen sizes

3. **Implement Table Virtualization** (2-3 hours)
   - Install react-window
   - Wrap table body in FixedSizeList
   - Update row rendering logic
   - Test performance improvement

4. **Department Display Logic** (1 hour)
   - Update formatOuPaths function
   - Add truncation logic
   - Implement hover tooltip
   - Test with various configurations

