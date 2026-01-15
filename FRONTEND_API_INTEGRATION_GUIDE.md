# Frontend-Backend API Integration Guide

## Overview
This document describes the complete integration of the ORBIT frontend with the backend API for budget configuration management. The frontend now uses real API calls for all CRUD operations instead of mock data.

## Integration Status

### ✅ Completed
- [x] API Service Layer created (`src/services/budgetConfigService.js`)
- [x] BudgetRequest.jsx imports and uses API service
- [x] ConfigurationList component fetches real data from backend
- [x] CreateConfiguration component submits to backend
- [x] Error handling and loading states added
- [x] Token-based authentication integrated
- [x] UI icons updated (Loader icon added)

### 📋 Architecture Changes

#### Before (Mock Data)
```jsx
const mockConfigurations = [{ ... }, { ... }]; // Hardcoded data in component

function ConfigurationList() {
  const [filteredConfigurations] = useState(mockConfigurations); // Static mock data
  // Display mock data only
}
```

#### After (API Integration)
```jsx
function ConfigurationList() {
  const { user } = useAuth(); // Get auth token
  const [configurations, setConfigurations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch real data from API
  useEffect(() => {
    const fetchConfigurations = async () => {
      try {
        const data = await budgetConfigService.getBudgetConfigurations({}, user?.token);
        setConfigurations(data);
      } catch (err) {
        setError(err.message);
      }
    };
    
    if (user?.token) fetchConfigurations();
  }, [user?.token]);

  // Display real data with loading/error states
}
```

## Key Changes Made

### 1. **BudgetRequest.jsx Changes**

#### Imports Added
```jsx
import { useEffect } from "react"; // For useEffect in components
import { budgetConfigService } from "../services/budgetConfigService"; // API service
import { Loader } from "../components/icons"; // Loading spinner icon
```

#### ConfigurationList Component
**Changes:**
- Removed hardcoded `mockConfigurations` array
- Added state variables: `configurations`, `loading`, `error`
- Added `useEffect` hook to fetch data on mount
- Added loading spinner display
- Added error message display with retry button
- Filters now work on real API data instead of mock data

**Flow:**
1. Component mounts
2. `useEffect` runs and calls `budgetConfigService.getBudgetConfigurations()`
3. Sets loading state while API call is in progress
4. On success: updates `configurations` state
5. On error: displays error message with retry option
6. Component re-renders with real data or error state

#### CreateConfiguration Component
**Changes:**
- Added `useAuth()` hook to get user token
- Added state variables: `isSubmitting`, `submitError`, `submitSuccess`
- Replaced mock `handleSubmit` with real API call
- Updated `handleSubmit` to:
  1. Prepare configuration data in correct format
  2. Call `budgetConfigService.createBudgetConfiguration()`
  3. Handle success (show message, reset form)
  4. Handle errors (display error message)
- Added loading state to submit button
- Added error/success message cards at top of form

**Form Data Mapping:**
```jsx
// Frontend form field → API field
{
  budgetName → name
  period → period
  description → description
  countries → countries
  siteLocation → locations
  clients → clients
  ou → organizational_units
  childOU → child_organizational_units
  limitMin → min_limit
  limitMax → max_limit
  budgetControlEnabled → budget_control_enabled
  budgetControlLimit → budget_control_limit
  budgetCarryoverEnabled → budget_carryover_enabled
  carryoverPercentage → budget_carryover_percentage
  selectedTenureGroups → tenure_groups
  accessibleOU → accessible_ous
  accessibleChildOU → accessible_child_ous
}
```

### 2. **API Service Layer** (`src/services/budgetConfigService.js`)

**18 Functions Exported:**

#### CRUD Operations (5 functions)
- `createBudgetConfiguration(configData, token)` - POST
- `getBudgetConfigurations(filters, token)` - GET all
- `getBudgetConfigurationById(budgetId, token)` - GET single
- `updateBudgetConfiguration(budgetId, updateData, token)` - PUT
- `deleteBudgetConfiguration(budgetId, token)` - DELETE

#### User-Specific (1 function)
- `getConfigurationsByUser(userId, token)` - GET user configurations

#### Tenure Groups (3 functions)
- `getTenureGroups(budgetId, token)` - GET tenure groups
- `addTenureGroups(budgetId, groupsData, token)` - POST tenure groups
- `removeTenureGroup(tenureGroupId, token)` - DELETE tenure group

#### Approvers (3 functions)
- `getApprovers(budgetId, token)` - GET approvers
- `setApprover(budgetId, approverData, token)` - POST approver
- `removeApprover(approverId, token)` - DELETE approver

#### Access Scopes (3 functions)
- `getAccessScopes(budgetId, token)` - GET access scopes
- `addAccessScope(budgetId, scopeData, token)` - POST access scope
- `removeAccessScope(scopeId, token)` - DELETE access scope

## Usage Examples

### Example 1: Fetch Configurations
```jsx
import { budgetConfigService } from "../services/budgetConfigService";
import { useAuth } from "../context/AuthContext";

function MyComponent() {
  const { user } = useAuth();
  const [configurations, setConfigurations] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await budgetConfigService.getBudgetConfigurations({}, user?.token);
        setConfigurations(data);
      } catch (err) {
        console.error("Error:", err.message);
      }
    };

    if (user?.token) fetchData();
  }, [user?.token]);

  return (
    <div>
      {configurations.map(config => (
        <div key={config.id}>{config.name}</div>
      ))}
    </div>
  );
}
```

### Example 2: Create Configuration
```jsx
const configData = {
  name: "Q1 2025 Bonus Budget",
  period: "quarterly",
  countries: ["ph", "sg"],
  locations: ["manila", "singapore"],
  min_limit: 1000,
  max_limit: 10000,
  budget_control_enabled: true,
  budget_control_limit: 50000,
};

try {
  const result = await budgetConfigService.createBudgetConfiguration(configData, user?.token);
  console.log("Created:", result);
} catch (err) {
  console.error("Error:", err.message);
}
```

### Example 3: Update Configuration
```jsx
const updateData = {
  name: "Updated Budget Name",
  budget_control_limit: 75000,
};

try {
  const result = await budgetConfigService.updateBudgetConfiguration(budgetId, updateData, user?.token);
  console.log("Updated:", result);
} catch (err) {
  console.error("Error:", err.message);
}
```

### Example 4: Delete Configuration
```jsx
try {
  await budgetConfigService.deleteBudgetConfiguration(budgetId, user?.token);
  console.log("Deleted successfully");
} catch (err) {
  console.error("Error:", err.message);
}
```

## Testing the Integration

### Prerequisites
1. Backend running on `http://localhost:3001`
   ```bash
   cd orbit-backend
   npm install
   npm run dev
   ```

2. Frontend running on `http://localhost:5173`
   ```bash
   cd orbit-frontend
   npm install
   npm run dev
   ```

### Test Scenarios

#### Test 1: Load Configurations
1. Navigate to Budget Configuration page
2. Click "Configuration List" tab
3. **Expected**: List loads with spinner, then shows configurations from database
4. **Error Case**: If backend is down, shows error message with retry button

#### Test 2: Create Configuration
1. Navigate to Budget Configuration page
2. Click "Create Configuration" tab
3. Fill in all 4 steps:
   - Step 1: Budget name, period, limits
   - Step 2: Countries, locations, clients
   - Step 3: Tenure groups, approvers
   - Step 4: Review all settings
4. Click "Create Configuration"
5. **Expected**: 
   - Submit button shows "Creating..." with spinner
   - Success message appears
   - Form resets
   - Configuration appears in Configuration List

#### Test 3: Filter Configurations
1. Load Configuration List
2. Use search/filter fields:
   - Search by name
   - Filter by Geo
   - Filter by Location
   - Filter by Organization
3. **Expected**: List filters in real-time from fetched data

#### Test 4: View Configuration Details
1. Click on any configuration in the list
2. Modal opens with three tabs:
   - Details: Configuration information
   - History: Budget usage over time
   - Logs: Request history
3. **Expected**: Modal displays all information correctly

#### Test 5: Error Handling
1. Stop backend server
2. Try to load configurations or create a new one
3. **Expected**: Error message displays with helpful text
4. Start backend again
5. Click "Retry" button
6. **Expected**: Data loads successfully

### Database Verification

After creating a configuration, verify in database:
```sql
-- Check if configuration was created
SELECT * FROM budget_configurations 
WHERE name = 'Your Budget Name';

-- Check tenure groups
SELECT * FROM budget_tenure_groups 
WHERE budget_id = <id>;

-- Check approvers
SELECT * FROM budget_configuration_approvers 
WHERE budget_id = <id>;

-- Check access scopes
SELECT * FROM budget_configuration_access_scopes 
WHERE budget_id = <id>;
```

## API Error Handling

The service layer provides consistent error handling:

```jsx
try {
  const data = await budgetConfigService.getBudgetConfigurations({}, token);
} catch (err) {
  // err.message contains user-friendly error message
  // err.statusCode contains HTTP status code if available
  // err.details contains additional error information
}
```

**Common Errors:**
- `401 Unauthorized` - Token missing or invalid
- `400 Bad Request` - Invalid data format
- `404 Not Found` - Configuration not found
- `500 Internal Server Error` - Server error (check backend logs)

## Performance Considerations

1. **Data Fetching**
   - Configurations fetched on component mount
   - Loading state prevents UI flicker
   - Error state allows retry without page refresh

2. **Form Submission**
   - Submit button disabled while submitting
   - Prevents duplicate submissions
   - Loading spinner provides user feedback

3. **Filtering**
   - Client-side filtering on fetched data
   - No additional API calls needed
   - Fast user experience

## Token Management

The integration automatically handles authentication tokens:

1. User logs in via AuthContext
2. Token stored in localStorage
3. Token passed to all API requests via headers:
   ```
   Authorization: Bearer <token>
   ```
4. On API error due to invalid token, user should be redirected to login

## Future Enhancements

1. **Edit Configuration** - Implement update functionality in UI
2. **Delete Configuration** - Add delete button with confirmation
3. **Batch Operations** - Create/update multiple configs
4. **Real-time Updates** - WebSocket for live data updates
5. **Offline Mode** - Cache configurations locally
6. **Advanced Filtering** - Backend-powered filter options
7. **Export/Import** - CSV/JSON export and import
8. **Pagination** - For large configuration lists
9. **Search** - Full-text search across configurations
10. **Audit Trail** - View who made changes and when

## Troubleshooting

### Issue: "Cannot find module budgetConfigService"
**Solution**: Ensure file exists at `src/services/budgetConfigService.js`

### Issue: "user?.token is undefined"
**Solution**: Ensure user is logged in and AuthContext is properly set up

### Issue: "Configuration data not loading"
**Solution**: 
1. Check backend is running on localhost:3001
2. Check browser console for error messages
3. Check backend logs for database errors
4. Verify authentication token is valid

### Issue: "Submit button does nothing"
**Solution**:
1. Open browser console to see error messages
2. Check if backend API is accessible
3. Verify form data is valid
4. Check network tab to see API request/response

### Issue: "Error: Failed to fetch"
**Solution**:
1. This usually means backend is not running
2. Start backend: `cd orbit-backend && npm run dev`
3. Ensure backend is listening on port 3001

## File Summary

| File | Type | Status | Purpose |
|------|------|--------|---------|
| `src/pages/BudgetRequest.jsx` | Component | ✅ Updated | Main page with list and create forms |
| `src/services/budgetConfigService.js` | Service | ✅ Created | API client for all budget endpoints |
| `src/context/AuthContext.jsx` | Context | ✅ Ready | Provides user and token for auth |
| `src/components/icons.jsx` | Icons | ✅ Updated | Added Loader icon for spinners |
| Backend API | REST API | ✅ Running | http://localhost:3001/api |

## Next Steps

1. **Test the integration** - Follow test scenarios above
2. **Verify data persists** - Check database after creating configs
3. **Implement edit functionality** - Add update button to configurations
4. **Add delete functionality** - Add delete button with confirmation
5. **Add validation** - Form validation before API submission
6. **User feedback** - Toast notifications for all operations
7. **Documentation** - Update API docs with response examples

## Contact & Support

For issues or questions about the integration:
1. Check browser console for error messages
2. Check backend logs for API errors
3. Verify authentication token is present
4. Ensure both frontend and backend are running
5. Review this guide for common issues
