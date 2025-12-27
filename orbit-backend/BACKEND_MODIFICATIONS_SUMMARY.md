# Backend Modifications Summary - Database Schema Normalization

**Date:** January 15, 2025  
**Status:** ✅ Complete  
**Database Schema Version:** Normalized with Tenure Groups, Approvers, and Access Scopes

---

## Overview

The ORBIT backend has been successfully modified to accommodate the new normalized database schema. The database now properly separates budget configuration, tenure groups, approvers, and access scopes into dedicated tables with proper foreign key relationships.

---

## Database Schema Improvements

### New Normalized Tables

1. **tblbudgetconfiguration** - Main budget configuration
2. **tblbudgetconfig_tenure_groups** - Tenure group associations (1:N)
3. **tblbudgetconfig_approvers** - Approval workflow configuration (1:N with unique level constraint)
4. **tblbudgetconfig_access_scopes** - Access scope restrictions (1:N)

### Key Features

- ✅ **Cascade Delete**: Deleting a budget configuration automatically removes related records
- ✅ **Unique Constraints**: Only one approver per budget per approval level
- ✅ **Validation**: Approval levels restricted to 1-3
- ✅ **Audit Trails**: All tables include created_by, created_at, updated_by, updated_at
- ✅ **Flexible Access Scopes**: Support for multiple scope types (organizational_unit, cost_center, etc.)

---

## Backend Code Changes

### 1. Service Layer (`src/services/budgetConfigService.js`)

#### New Methods Added:

**Tenure Groups:**
- `getTenureGroupsByBudgetId(budgetId)` - Fetch all tenure groups for a budget
- `addTenureGroups(budgetId, tenureGroups)` - Add multiple tenure groups
- `removeTenureGroup(configTenureId)` - Remove a single tenure group

**Approvers:**
- `getApproversByBudgetId(budgetId)` - Fetch all approvers (sorted by level)
- `setApprover(budgetId, approvalLevel, primaryApprover, backupApprover, createdBy)` - Set/update approver
- `removeApprover(approverId)` - Remove an approver

**Access Scopes:**
- `getAccessScopesByBudgetId(budgetId)` - Fetch all access scopes
- `addAccessScope(budgetId, scopeType, scopeValue, createdBy)` - Add a scope
- `removeAccessScope(scopeId)` - Remove a scope

#### Modified Methods:

- `createBudgetConfig()` - Now handles tenant groups, approvers, and access scopes in transaction
- `getBudgetConfigById()` - Now includes all related data (tenure_groups, approvers, access_scopes)
- `getAllBudgetConfigs()` - Now includes all related data for each config
- `updateBudgetConfig()` - Returns complete config with related data (note: use specific methods to update relations)
- `getConfigsByUser()` - Now includes all related data

### 2. Controller Layer (`src/controllers/budgetConfigController.js`)

#### New Endpoints Added:

**Tenure Groups:**
- `getTenureGroups()` - GET /:budgetId/tenure-groups
- `addTenureGroups()` - POST /:budgetId/tenure-groups
- `removeTenureGroup()` - DELETE /tenure-groups/:tenureGroupId

**Approvers:**
- `getApprovers()` - GET /:budgetId/approvers
- `setApprover()` - POST /:budgetId/approvers
- `removeApprover()` - DELETE /approvers/:approverId

**Access Scopes:**
- `getAccessScopes()` - GET /:budgetId/access-scopes
- `addAccessScope()` - POST /:budgetId/access-scopes
- `removeAccessScope()` - DELETE /access-scopes/:scopeId

All new endpoints include:
- ✅ Input validation
- ✅ Error handling with appropriate HTTP status codes
- ✅ Structured response format (success, data, message)

### 3. Routes (`src/routes/budgetConfigRoutes.js`)

#### New Route Groups:

**Main Budget Configuration (existing routes, no changes):**
```
POST   /                    - Create budget config
GET    /                    - Get all configs (with filters)
GET    /:id                 - Get single config
PUT    /:id                 - Update config
DELETE /:id                 - Delete config
GET    /user/:userId        - Get user's configs
```

**Tenure Groups (new):**
```
GET    /:budgetId/tenure-groups                - List tenure groups
POST   /:budgetId/tenure-groups                - Add tenure groups
DELETE /tenure-groups/:tenureGroupId           - Remove tenure group
```

**Approvers (new):**
```
GET    /:budgetId/approvers                    - List approvers
POST   /:budgetId/approvers                    - Set approver
DELETE /approvers/:approverId                  - Remove approver
```

**Access Scopes (new):**
```
GET    /:budgetId/access-scopes                - List access scopes
POST   /:budgetId/access-scopes                - Add access scope
DELETE /access-scopes/:scopeId                 - Remove access scope
```

---

## API Response Format

All endpoints follow a consistent response format:

**Success Response:**
```json
{
  "success": true,
  "data": {...},
  "message": "Operation successful"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error description",
  "message": "Error message"
}
```

---

## Frontend Integration Guidelines

### Creating a Budget Configuration

When the frontend submits the BudgetRequest form (all 4 steps), it should:

1. Collect all form data including:
   - Budget configuration (name, limits, period, scopes)
   - Tenure groups (array of strings)
   - Approvers (array with approval levels 1-3)
   - Access scopes (array with scope_type and scope_value)

2. Send a single POST request to `/api/budget-configurations` with complete data:
```javascript
const response = await fetch('/api/budget-configurations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    budget_name: "Q1 2025",
    min_limit: 10000,
    max_limit: 100000,
    period_type: "Quarterly",
    // ... other fields
    tenure_groups: ["Senior", "Mid-Level"],
    approvers: [
      { approval_level: 1, primary_approver: "uuid1", backup_approver: "uuid2" },
      { approval_level: 2, primary_approver: "uuid3" }
    ],
    access_scopes: [
      { scope_type: "organizational_unit", scope_value: "Eng-NYC" }
    ]
  })
});
```

3. The response includes the complete configuration with generated UUIDs for all related records.

### Fetching a Budget Configuration

To display a budget configuration with all details:
```javascript
const response = await fetch(`/api/budget-configurations/${budgetId}`);
const config = await response.json();
// config.data contains budget details + tenure_groups + approvers + access_scopes
```

### Updating Budget Configuration

- **Main fields** (name, limits, periods): Use PUT `/budget-configurations/:id`
- **Tenure groups**: Use specific tenure group endpoints
- **Approvers**: Use specific approver endpoints
- **Access scopes**: Use specific scope endpoints

This separation prevents accidental data loss and provides granular control.

---

## Key Implementation Details

### Transaction Handling

The `createBudgetConfig()` method doesn't use explicit transactions (Supabase limitations), but:
- Budget is created first
- If budget creation fails, related records aren't created
- If related record creation fails, the budget still exists (consider cleanup in frontend)

### Data Consistency

- Use cascade deletes: Removing a budget removes all related records
- Approval level uniqueness: Only one approver per budget per level (enforced by DB constraint)
- Validation: All approval levels must be 1-3

### Performance Considerations

- `getAllBudgetConfigs()` fetches related data for each configuration (N+1 queries)
  - Consider pagination if dealing with large datasets
  - Alternative: Use join queries (would require schema changes)

---

## Testing the Backend

### 1. Create a Budget Configuration
```bash
curl -X POST http://localhost:3000/api/budget-configurations \
  -H "Content-Type: application/json" \
  -d '{
    "budget_name": "Test Budget",
    "min_limit": 5000,
    "max_limit": 50000,
    "period_type": "Monthly",
    "created_by": "test-user-uuid",
    "tenure_groups": ["Senior"],
    "approvers": [
      {
        "approval_level": 1,
        "primary_approver": "approver-uuid-1"
      }
    ],
    "access_scopes": [
      {
        "scope_type": "department",
        "scope_value": "Engineering"
      }
    ]
  }'
```

### 2. Fetch the Configuration
```bash
curl http://localhost:3000/api/budget-configurations/{budgetId}
```

### 3. Update an Approver
```bash
curl -X POST http://localhost:3000/api/budget-configurations/{budgetId}/approvers \
  -H "Content-Type: application/json" \
  -d '{
    "approval_level": 2,
    "primary_approver": "new-approver-uuid",
    "backup_approver": "backup-uuid"
  }'
```

---

## Validation Rules

### Budget Configuration
- `budget_name`: Required, string
- `period_type`: Required, must be one of: Monthly, Quarterly, Semi-Annual, Yearly
- `min_limit`, `max_limit`: Optional, numeric
- `created_by`: Required, UUID

### Tenure Groups
- `tenure_group`: Required, string
- Array can be empty but must be array type if provided

### Approvers
- `approval_level`: Required, integer (1-3)
- `primary_approver`: Required, UUID
- `backup_approver`: Optional, UUID
- Unique constraint: Only one approver per (budget_id, approval_level)

### Access Scopes
- `scope_type`: Required, string (e.g., "organizational_unit", "cost_center")
- `scope_value`: Required, string

---

## Error Handling

The backend provides specific error messages for:
- Missing required fields
- Invalid field values (e.g., approval_level > 3)
- Database constraint violations
- Missing resources (404)
- Server errors (500)

All errors include both `error` and `message` fields for clarity.

---

## Migration from Old Schema

If you have existing data in the old schema:

1. No existing data will be affected
2. New budgets created through the API will use the normalized schema
3. For historical data migration, a separate migration script would be needed

---

## Next Steps

1. **Update Frontend**: Modify BudgetRequest form to collect and send related data
2. **Test API**: Use curl or Postman to test all endpoints
3. **Add Authentication**: Ensure auth middleware validates user_id for all endpoints
4. **Performance Optimization**: Consider query optimization if scaling beyond 1000+ budgets
5. **Database Indexes**: Consider adding indexes on frequently queried columns:
   - tblbudgetconfiguration: created_by, period_type
   - tblbudgetconfig_approvers: (budget_id, approval_level)

---

## Support

For questions about the API:
- See `BACKEND_API_REFERENCE.md` for detailed endpoint documentation
- Check controller methods for validation rules
- Review service methods for business logic implementation

All code follows REST conventions and Supabase client patterns for consistency.
