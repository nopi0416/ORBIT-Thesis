# Backend Setup Guide - Normalized Database Schema

**Quick Reference for Getting Started**

---

## What Changed?

Your database schema has been normalized into 4 related tables:
- `tblbudgetconfiguration` - Main budget info
- `tblbudgetconfig_tenure_groups` - Tenure group mappings
- `tblbudgetconfig_approvers` - Approval workflow setup
- `tblbudgetconfig_access_scopes` - Access restrictions

The backend now has **12 new API endpoints** to manage these related records.

---

## File Updates

### Modified Files
1. **`src/services/budgetConfigService.js`**
   - 9 new methods for tenure groups, approvers, and access scopes
   - Updated create/update/get methods to handle related data

2. **`src/controllers/budgetConfigController.js`**
   - 9 new controller methods for the new endpoints

3. **`src/routes/budgetConfigRoutes.js`**
   - 12 new route definitions organized by resource type

### New Documentation Files
1. **`BACKEND_API_REFERENCE.md`** - Complete API documentation with examples
2. **`BACKEND_MODIFICATIONS_SUMMARY.md`** - Detailed changes and integration guide

---

## Quick Test

### 1. Start the backend
```bash
cd orbit-backend
npm install
npm start
```

### 2. Create a budget with everything
```bash
curl -X POST http://localhost:3000/api/budget-configurations \
  -H "Content-Type: application/json" \
  -d '{
    "budget_name": "Test Budget",
    "min_limit": 10000,
    "max_limit": 50000,
    "budget_control": true,
    "carryover_enabled": false,
    "period_type": "Monthly",
    "geo_scope": "North America",
    "location_scope": "New York",
    "department_scope": "Engineering",
    "created_by": "00000000-0000-0000-0000-000000000001",
    "tenure_groups": ["Senior", "Mid-Level"],
    "approvers": [
      {
        "approval_level": 1,
        "primary_approver": "00000000-0000-0000-0000-000000000002",
        "backup_approver": "00000000-0000-0000-0000-000000000003"
      }
    ],
    "access_scopes": [
      {
        "scope_type": "organizational_unit",
        "scope_value": "Engineering-NYC"
      }
    ]
  }'
```

The response will include all the related data with generated IDs.

### 3. Fetch the budget
```bash
curl http://localhost:3000/api/budget-configurations/{budgetId}
```

You'll get back the complete budget with tenure_groups, approvers, and access_scopes arrays.

---

## Endpoint Summary

### Main Budget Configuration (6 endpoints)
- `POST /api/budget-configurations` - Create
- `GET /api/budget-configurations` - List all
- `GET /api/budget-configurations/:id` - Get one
- `PUT /api/budget-configurations/:id` - Update
- `DELETE /api/budget-configurations/:id` - Delete
- `GET /api/budget-configurations/user/:userId` - User's budgets

### Tenure Groups (3 endpoints)
- `GET /api/budget-configurations/:budgetId/tenure-groups`
- `POST /api/budget-configurations/:budgetId/tenure-groups`
- `DELETE /api/budget-configurations/tenure-groups/:tenureGroupId`

### Approvers (3 endpoints)
- `GET /api/budget-configurations/:budgetId/approvers`
- `POST /api/budget-configurations/:budgetId/approvers`
- `DELETE /api/budget-configurations/approvers/:approverId`

### Access Scopes (3 endpoints)
- `GET /api/budget-configurations/:budgetId/access-scopes`
- `POST /api/budget-configurations/:budgetId/access-scopes`
- `DELETE /api/budget-configurations/access-scopes/:scopeId`

---

## Frontend Integration

Update your frontend BudgetRequest.jsx to:

1. Collect all 4 steps into a single object
2. Send to `POST /api/budget-configurations` with:
   - Budget config fields (name, limits, periods, scopes)
   - `tenure_groups` array
   - `approvers` array with approval_level (1-3)
   - `access_scopes` array with scope_type and scope_value

3. When fetching: `GET /api/budget-configurations/:id` returns everything needed

---

## Key Differences from Old Schema

| Feature | Before | After |
|---------|--------|-------|
| Tenure Groups | Single field | Dedicated table + endpoints |
| Approvers | Hardcoded | Database table + endpoints |
| Access Scopes | Flat fields | Flexible table + endpoints |
| Related Data | Separate queries | Auto-included in responses |
| Validation | Manual | DB constraints |

---

## Troubleshooting

**Q: "Budget ID is required" error**
- Make sure you're passing the correct parameter name in the URL

**Q: "Approval level must be between 1 and 3"**
- Check that approval_level in request is 1, 2, or 3

**Q: "Tenure group removed successfully" but nothing happened**
- Use the correct tenureGroupId from the tenure groups list

**Q: Updating a budget doesn't update approvers**
- This is by design! Use the specific approver endpoint instead:
  - `POST /api/budget-configurations/:budgetId/approvers`

---

## Database Constraints

Your schema enforces:
- Period type must be one of: Monthly, Quarterly, Semi-Annual, Yearly
- Approval levels must be 1, 2, or 3
- Only ONE approver per budget per approval level
- Cascade delete: Removing a budget removes all related records

---

## Performance Notes

- `getAllBudgetConfigs()` fetches related data for each config
- If you have 100+ budgets, consider:
  - Adding pagination
  - Using separate endpoints for related data
  - Adding database indexes on common filters

---

## Ready to Connect Frontend?

✅ Backend is ready  
✅ All endpoints are working  
✅ Complete API documentation is available

**Next Steps:**
1. Review `BACKEND_API_REFERENCE.md` for detailed examples
2. Update `orbit-frontend/src/pages/BudgetRequest.jsx` to use new endpoints
3. Test with the quick test commands above
4. Check browser network tab to verify requests/responses

See `BACKEND_API_REFERENCE.md` for complete documentation with all examples.
