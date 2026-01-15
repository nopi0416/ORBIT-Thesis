# 🔧 Budget Configuration - 400 Error Fix

## Issue Fixed

**Error**: 400 Bad Request when creating budget configuration  
**Cause**: Form data field names didn't match backend validator expectations  
**Status**: ✅ **FIXED**

---

## What Was Changed

### 1. **Better Error Messages** (`budgetConfigService.js`)
- Now displays actual validation errors from backend
- Shows error details in a readable format
- Helps identify exactly what field is wrong

### 2. **Correct Field Names** (`BudgetRequest.jsx`)
Changed form data mapping to match backend expectations:

```javascript
// OLD (Wrong)
name: formData.budgetName,          // ❌ Backend expects: budgetName
budget_control_enabled: ...         // ❌ Backend expects: budget_control
budget_carryover_enabled: ...       // ❌ Backend expects: budget_carryover

// NEW (Correct)
budgetName: formData.budgetName,    // ✅ Matches backend
budget_control: ...,                // ✅ Matches backend
budget_carryover: ...,              // ✅ Matches backend
```

### 3. **Required Scope Fields** (`BudgetRequest.jsx`)
Backend requires at least ONE of these fields:
- `geo_scope` (countries selected)
- `location_scope` (locations selected)
- `department_scope` (departments/OU selected)

Now the form includes all three and validates that at least one is filled:

```javascript
// At least one scope field must be provided
if (!configData.geo_scope && !configData.location_scope && !configData.department_scope) {
  setSubmitError("Please select at least one of: Country, Location, or Department");
  return;
}
```

### 4. **Period Capitalization**
Backend expects period with proper capitalization:
- Form sends: `"monthly"` 
- Now converts to: `"Monthly"`

---

## How to Test the Fix

### Step 1: Refresh Frontend
The changes are automatically loaded when you refresh your browser.

### Step 2: Try Creating Configuration Again

1. Navigate to Budget Configuration → Create Configuration
2. Fill in all required fields:
   - **Step 1**: 
     - Budget Name: "Test Q1 2025" (required)
     - Period: "Monthly" (required)
     - Min Limit: "1000" (required)
     - Max Limit: "10000" (required)
   
   - **Step 2** (At least ONE of these):
     - Country: Select "Philippines"
     - OR Location: Select "Metro Manila"  
     - OR Department: Select "IT Department"
   
   - **Step 3**:
     - Select tenure groups (optional)
     - Select approvers (optional)
   
   - **Step 4**: Review and Create

3. Click "Create Configuration"

### Expected Results

✅ **Success**: 
- Success message appears
- Configuration saved to database
- Form resets
- Can see new config in list

❌ **Still Error**:
- Now shows specific error message
- Example: "Period must be one of: Monthly, Quarterly, Semi-Annual, Yearly"
- Follow the error message to fix the issue

---

## Common Issues & Solutions

### Error: "Please select at least one of: Country, Location, or Department"
**Cause**: You didn't select any scope fields  
**Fix**: Go back to Step 2 and select at least one value from:
- Country dropdown
- Location dropdown  
- Department/OU dropdown

### Error: "Budget name is required"
**Cause**: Budget Name field is empty  
**Fix**: Go back to Step 1 and enter a budget name

### Error: "Period must be one of: Monthly, Quarterly, Semi-Annual, Yearly"
**Cause**: Invalid period selected  
**Fix**: Go back to Step 1 and select a valid period from dropdown

### Error: "Min limit cannot exceed max limit"
**Cause**: Minimum limit is greater than maximum limit  
**Fix**: Go back to Step 1 and ensure Min Limit < Max Limit

### Error: "Budget limit is required when control is enabled"
**Cause**: Budget Control is enabled but no limit specified  
**Fix**: Go back to Step 1 and enter a budget control limit, or disable budget control

---

## How to Check Backend Validation

If you get an error you don't understand, check the backend validator at:  
`orbit-backend/src/utils/validators.js`

This file shows all the validation rules the backend enforces.

---

## Field Mapping Reference

### What Backend Actually Expects:

```javascript
{
  budgetName: "string",              // Required: Budget configuration name
  period: "Monthly|Quarterly|...",   // Required: Must be capitalized
  min_limit: number,                 // Minimum reward amount
  max_limit: number,                 // Maximum reward amount
  budget_control: boolean,           // Is budget control enabled?
  budgetControlLimit: number,        // If control enabled, max budget
  budget_carryover: boolean,         // Is carryover enabled?
  carryoverPercentage: number,       // Percentage to carry over
  
  // At least ONE of these REQUIRED:
  geo_scope: "country1,country2",    // Comma-separated countries
  location_scope: "loc1,loc2",       // Comma-separated locations
  department_scope: "dept1,dept2",   // Comma-separated departments
  
  // Optional:
  description: "string",
  clients: "client1,client2",
  organizational_units: ["ou1", "ou2"],
  child_organizational_units: ["cou1"],
  tenure_groups: ["0-6months", "6-12months"],
  accessible_ous: ["ou1"],
  accessible_child_ous: ["cou1"],
}
```

---

## Debug Mode - Check What's Being Sent

To see exactly what data is being sent to the backend:

1. Open Browser DevTools (F12)
2. Go to Network tab
3. Try creating a configuration
4. Click on the POST request to `budget-configurations`
5. Go to "Request" tab
6. View the JSON body being sent

Compare it with the "Field Mapping Reference" above to ensure all fields match.

---

## Next Steps

1. ✅ Refresh your browser
2. ✅ Try creating a configuration again
3. ✅ If it works: Verify data in database
4. ✅ If it fails: Note the error message and fix the issue

---

## Success Indicators

You'll know it's fixed when:
- ✅ Form submits without errors
- ✅ Success message appears
- ✅ Configuration appears in list
- ✅ Can see it in database: `SELECT * FROM budget_configurations;`

---

## Still Having Issues?

### Check These:

1. **Browser Console** (F12)
   - Should show the actual validation error from backend
   - Example: `Error: {"budgetName":"Budget name is required"}`

2. **Backend Logs**
   - Check terminal where backend is running
   - Should show detailed error messages

3. **Network Tab** (F12 → Network)
   - See the exact request and response
   - Verify request body has correct field names

4. **Database**
   - Verify backend is connected to database
   - Check if previous configs were created successfully

---

## File Changes Summary

| File | Changes |
|------|---------|
| `src/services/budgetConfigService.js` | Improved error message handling |
| `src/pages/BudgetRequest.jsx` | Fixed form data field names and mapping |

---

**Status**: ✅ **FIXED AND READY TO TEST**

Try creating a configuration now! The error messages will be much clearer if there are any issues.
