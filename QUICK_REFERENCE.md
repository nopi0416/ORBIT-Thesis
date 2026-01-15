# 🚀 Frontend-Backend Integration - Quick Reference Card

## Start Here

```bash
# Terminal 1: Start Backend
cd orbit-backend
npm run dev
# → http://localhost:3001

# Terminal 2: Start Frontend  
cd orbit-frontend
npm run dev
# → http://localhost:5173
```

---

## What's Integrated

| Feature | Status | How to Use |
|---------|--------|-----------|
| Load Configurations | ✅ | Go to Budget Config → Configuration List tab |
| Create Configuration | ✅ | Go to Budget Config → Create Configuration tab |
| Filter Configurations | ✅ | Use search/filter dropdowns in list tab |
| View Details | ✅ | Click any configuration card |
| Error Handling | ✅ | Errors show with retry button |
| Loading States | ✅ | Spinner appears during API calls |
| Authentication | ✅ | Automatic token inclusion in headers |

---

## Code Locations

```
Frontend Integration
├── src/pages/BudgetRequest.jsx          ← Main page component
├── src/services/budgetConfigService.js  ← API client (18 functions)
└── src/components/icons.jsx             ← Icons including Loader

Backend API
├── src/routes/budgetConfigRoutes.js     ← 15+ endpoints
├── src/controllers/budgetConfigController.js
└── src/services/budgetConfigService.js

Database
├── budget_configurations table
├── budget_tenure_groups table
├── budget_configuration_approvers table
└── budget_configuration_access_scopes table
```

---

## API Functions Available

```javascript
// Import the service
import budgetConfigService from "../services/budgetConfigService";

// CRUD Operations
await budgetConfigService.createBudgetConfiguration(data, token)
await budgetConfigService.getBudgetConfigurations(filters, token)
await budgetConfigService.getBudgetConfigurationById(id, token)
await budgetConfigService.updateBudgetConfiguration(id, data, token)
await budgetConfigService.deleteBudgetConfiguration(id, token)

// Tenure Groups
await budgetConfigService.getTenureGroups(budgetId, token)
await budgetConfigService.addTenureGroups(budgetId, data, token)
await budgetConfigService.removeTenureGroup(tenureGroupId, token)

// Approvers
await budgetConfigService.getApprovers(budgetId, token)
await budgetConfigService.setApprover(budgetId, data, token)
await budgetConfigService.removeApprover(approverId, token)

// Access Scopes
await budgetConfigService.getAccessScopes(budgetId, token)
await budgetConfigService.addAccessScope(budgetId, data, token)
await budgetConfigService.removeAccessScope(scopeId, token)

// User Specific
await budgetConfigService.getConfigurationsByUser(userId, token)
```

---

## How It Works (Under the Hood)

```
User Action
    ↓
Form Event Handler
    ↓
Call budgetConfigService function
    ↓
Service makes HTTP request with auth token
    ↓
Backend API processes request
    ↓
Database operation
    ↓
Response sent to frontend
    ↓
Update component state
    ↓
UI re-renders with new data
```

---

## Error Messages (What They Mean)

| Message | Cause | Fix |
|---------|-------|-----|
| "Failed to fetch" | Backend not running | Start backend: `npm run dev` |
| "401 Unauthorized" | Invalid/expired token | Re-login to refresh token |
| "404 Not Found" | Configuration doesn't exist | Check ID is correct |
| "400 Bad Request" | Invalid form data | Check form validation |
| "500 Internal Server Error" | Backend error | Check backend logs |

---

## Testing Quick Checklist

- [ ] Backend running on :3001
- [ ] Frontend running on :5173
- [ ] Can load configuration list
- [ ] Can create new configuration
- [ ] New config appears in database
- [ ] Filters work correctly
- [ ] Error message appears when backend stops
- [ ] Retry works after error
- [ ] No console errors

---

## Common Issues

**Problem**: Configurations not loading  
**Solution**: Check backend is running, click Retry

**Problem**: "Cannot find module" error  
**Solution**: Run `npm install` in orbit-frontend

**Problem**: Submit button does nothing  
**Solution**: Check browser console (F12) for errors

**Problem**: "undefined is not a function"  
**Solution**: Restart dev servers, check imports

---

## Files Changed

| File | Changes |
|------|---------|
| `src/pages/BudgetRequest.jsx` | +API integration, +error handling, +loading states |
| `src/services/budgetConfigService.js` | NEW: 18 API functions |
| `src/components/icons.jsx` | +Loader icon |

---

## Configuration Data Format

```javascript
{
  name: "Q1 2025 Bonus",
  period: "quarterly",
  description: "Bonus program",
  countries: ["ph", "sg"],
  locations: ["manila", "singapore"],
  clients: ["PLDT", "Globe"],
  min_limit: 1000,
  max_limit: 10000,
  budget_control_enabled: true,
  budget_control_limit: 50000,
  budget_carryover_enabled: true,
  budget_carryover_percentage: 100,
  tenure_groups: ["0-6months", "6-12months"],
  accessible_ous: ["it-dept", "hr-dept"],
  accessible_child_ous: ["dev-team"]
}
```

---

## Authentication

All API requests include:
```
Authorization: Bearer <user-token>
Content-Type: application/json
```

Token comes from `useAuth()` hook:
```jsx
const { user } = useAuth();
// user.token is included in API calls
```

---

## Loading/Error States

```jsx
// ConfigurationList uses:
const [loading, setLoading] = useState(false);   // Shows spinner
const [error, setError] = useState(null);         // Shows error message
const [configurations, setConfigurations] = useState([]);

// CreateConfiguration uses:
const [isSubmitting, setIsSubmitting] = useState(false);  // Disables button
const [submitError, setSubmitError] = useState(null);     // Shows error
const [submitSuccess, setSubmitSuccess] = useState(false); // Shows success
```

---

## Test Data Available

Existing test configurations in database:
- Q1 2025 Performance Bonus
- Special Awards Program
- Monthly Incentive Program

Use these to test filtering before creating new ones.

---

## Quick API Test (Postman/curl)

```bash
# Get all configurations
curl -H "Authorization: Bearer <token>" \
  http://localhost:3001/api/budget-configurations

# Create configuration
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","period":"monthly"}' \
  http://localhost:3001/api/budget-configurations
```

---

## Next Steps

1. ✅ **Verify**: Ensure both servers running
2. ✅ **Test**: Follow FRONTEND_TESTING_QUICK_START.md
3. ✅ **Extend**: Add edit/delete functionality
4. ✅ **Deploy**: When ready for production

---

## Documentation Files

- `INTEGRATION_README.md` ← This file
- `INTEGRATION_COMPLETE_SUMMARY.md` ← Full summary
- `FRONTEND_API_INTEGRATION_GUIDE.md` ← Detailed guide
- `FRONTEND_TESTING_QUICK_START.md` ← Testing checklist
- `APPROVAL_REQUEST_DATABASE_SETUP_REWARDS_ONLY.md` ← Database schema

---

## Key Concepts

**Service Layer**: Centralized API client (budgetConfigService)  
**State Management**: React hooks (useState, useEffect)  
**Authentication**: Token from AuthContext  
**Error Handling**: Try-catch with user messages  
**Loading States**: Spinners and disabled buttons  

---

## Success = ✅

When this is true: "I can create a budget configuration in the form and see it appear in the database"

---

**Status**: Ready for Testing ✅  
**Updated**: January 5, 2026  
**Next**: Start both servers and test!
