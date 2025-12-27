# Backend Architecture Overview - Normalized Schema

## Database Schema Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                  tblbudgetconfiguration                         │
├─────────────────────────────────────────────────────────────────┤
│ PK: budget_id (UUID)                                            │
│ • budget_name                                                   │
│ • min_limit, max_limit                                          │
│ • budget_control, carryover_enabled, client_sponsored          │
│ • period_type (Monthly|Quarterly|Semi-Annual|Yearly)           │
│ • geo_scope, location_scope, department_scope                  │
│ • created_by (UUID), created_at                                │
│ • updated_by (UUID), updated_at                                │
└──────────────────────────┬──────────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │   Tenure     │ │  Approvers   │ │Access Scopes │
    │   Groups     │ │              │ │              │
    │ (1:Many)     │ │  (1:Many)    │ │  (1:Many)    │
    └──────────────┘ └──────────────┘ └──────────────┘
         │                 │                 │
         ▼                 ▼                 ▼
    tblbudgetconfig  tblbudgetconfig  tblbudgetconfig
    _tenure_groups   _approvers       _access_scopes
```

## Service Layer Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│              BudgetConfigService                                 │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Budget Configuration Methods:                                  │
│  ├─ createBudgetConfig()      → Creates all related records     │
│  ├─ getAllBudgetConfigs()     → Includes related data           │
│  ├─ getBudgetConfigById()     → Returns complete config        │
│  ├─ updateBudgetConfig()      → Main fields only               │
│  ├─ deleteBudgetConfig()      → Cascade deletes relations      │
│  └─ getConfigsByUser()        → User's budgets with relations  │
│                                                                  │
│  Tenure Groups Methods:                                         │
│  ├─ getTenureGroupsByBudgetId()                                │
│  ├─ addTenureGroups()                                          │
│  └─ removeTenureGroup()                                        │
│                                                                  │
│  Approvers Methods:                                            │
│  ├─ getApproversByBudgetId()                                   │
│  ├─ setApprover()  → Create or update (upsert)                │
│  └─ removeApprover()                                           │
│                                                                  │
│  Access Scopes Methods:                                        │
│  ├─ getAccessScopesByBudgetId()                                │
│  ├─ addAccessScope()                                           │
│  └─ removeAccessScope()                                        │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Controller Layer Architecture

```
┌────────────────────────────────────────────────────────────────┐
│           BudgetConfigController                               │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  6 Main Endpoints:                                            │
│  ├─ createBudgetConfig()      (POST)                         │
│  ├─ getAllBudgetConfigs()     (GET with filters)             │
│  ├─ getBudgetConfigById()     (GET :id)                      │
│  ├─ updateBudgetConfig()      (PUT :id)                      │
│  ├─ deleteBudgetConfig()      (DELETE :id)                   │
│  └─ getConfigsByUser()        (GET /user/:userId)            │
│                                                                │
│  3 Tenure Group Endpoints:                                   │
│  ├─ getTenureGroups()                                        │
│  ├─ addTenureGroups()                                        │
│  └─ removeTenureGroup()                                      │
│                                                                │
│  3 Approver Endpoints:                                       │
│  ├─ getApprovers()                                           │
│  ├─ setApprover()                                            │
│  └─ removeApprover()                                         │
│                                                                │
│  3 Access Scope Endpoints:                                   │
│  ├─ getAccessScopes()                                        │
│  ├─ addAccessScope()                                         │
│  └─ removeAccessScope()                                      │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

## Data Flow: Creating a Budget

```
Frontend
  │
  ├─ Collect: Budget name, limits, periods, tenure groups, approvers, scopes
  │
  └─→ POST /api/budget-configurations
       │
       ▼
BudgetConfigController.createBudgetConfig()
       │
       ├─ Validate input
       │
       └─→ Call BudgetConfigService.createBudgetConfig()
            │
            ├─→ INSERT into tblbudgetconfiguration
            │   └─ Returns budget_id
            │
            ├─→ INSERT into tblbudgetconfig_tenure_groups (if provided)
            │   └─ Links to budget_id
            │
            ├─→ INSERT into tblbudgetconfig_approvers (if provided)
            │   └─ Links to budget_id, validates approval_level 1-3
            │
            └─→ INSERT into tblbudgetconfig_access_scopes (if provided)
                └─ Links to budget_id
            │
            ▼
      Fetch complete config with getBudgetConfigById()
            │
            ├─→ SELECT * FROM tblbudgetconfiguration WHERE budget_id
            ├─→ SELECT * FROM tblbudgetconfig_tenure_groups
            ├─→ SELECT * FROM tblbudgetconfig_approvers
            └─→ SELECT * FROM tblbudgetconfig_access_scopes
                     │
                     ▼
Response to Frontend
{
  "success": true,
  "data": {
    "budget_id": "...",
    "budget_name": "...",
    "tenure_groups": [...],
    "approvers": [...],
    "access_scopes": [...]
  }
}
```

## Data Flow: Fetching a Budget

```
Frontend
  │
  └─→ GET /api/budget-configurations/:budgetId
       │
       ▼
BudgetConfigController.getBudgetConfigById()
       │
       └─→ Call BudgetConfigService.getBudgetConfigById()
            │
            ├─→ SELECT FROM tblbudgetconfiguration
            │
            ├─→ Parallel: getTenureGroupsByBudgetId()
            │             getApproversByBudgetId()
            │             getAccessScopesByBudgetId()
            │
            └─→ Combine results
                     │
                     ▼
Response to Frontend
{
  "success": true,
  "data": {
    ...budget fields...
    "tenure_groups": [
      { "config_tenure_id": "...", "tenure_group": "Senior" },
      { "config_tenure_id": "...", "tenure_group": "Mid-Level" }
    ],
    "approvers": [
      {
        "approver_id": "...",
        "approval_level": 1,
        "primary_approver": "...",
        "backup_approver": "..."
      }
    ],
    "access_scopes": [
      {
        "scope_id": "...",
        "scope_type": "organizational_unit",
        "scope_value": "Eng-NYC"
      }
    ]
  }
}
```

## HTTP Verb Mapping

```
BUDGET CONFIGURATION
├─ POST   /                   → Create
├─ GET    /                   → List all (with filters)
├─ GET    /:id                → Get one
├─ PUT    /:id                → Update
├─ DELETE /:id                → Delete
└─ GET    /user/:userId       → User's budgets

TENURE GROUPS
├─ GET    /:budgetId/tenure-groups      → List
├─ POST   /:budgetId/tenure-groups      → Add
└─ DELETE /tenure-groups/:id            → Remove

APPROVERS
├─ GET    /:budgetId/approvers          → List (sorted by level)
├─ POST   /:budgetId/approvers          → Set/Update
└─ DELETE /approvers/:id                → Remove

ACCESS SCOPES
├─ GET    /:budgetId/access-scopes      → List
├─ POST   /:budgetId/access-scopes      → Add
└─ DELETE /access-scopes/:id            → Remove
```

## Error Response Flow

```
Request → Controller
            │
            ├─ Input validation fails
            │  └─ sendError(res, "Field X is required", 400)
            │
            ├─ Service call fails
            │  └─ sendError(res, error.message, 400)
            │
            ├─ Resource not found
            │  └─ sendError(res, "Not found", 404)
            │
            └─ Server error
               └─ sendError(res, error.message, 500)

Response:
{
  "success": false,
  "error": "Detailed error message",
  "message": "User-friendly message"
}
```

## Unique Constraints & Validations

```
Database Level:
├─ tblbudgetconfiguration.period_type
│  └─ Must be: Monthly | Quarterly | Semi-Annual | Yearly
│
└─ tblbudgetconfig_approvers
   ├─ Unique constraint: (budget_id, approval_level)
   │  └─ Only ONE approver per budget per level
   │
   └─ Check constraint: approval_level BETWEEN 1 AND 3
      └─ Only levels 1, 2, or 3 allowed

Application Level:
├─ Budget name: Required, non-empty string
├─ Created by: Required UUID
├─ Tenure groups: Optional, array of strings
├─ Approvers: Optional, array with required approval_level
├─ Access scopes: Optional, array with scope_type and scope_value
└─ Period type: Required, validated against enum
```

## Cascade Delete Behavior

```
DELETE FROM tblbudgetconfiguration WHERE budget_id = 'X'
             │
             ├─ AUTOMATICALLY DELETE FROM tblbudgetconfig_tenure_groups
             │  WHERE budget_id = 'X'
             │
             ├─ AUTOMATICALLY DELETE FROM tblbudgetconfig_approvers
             │  WHERE budget_id = 'X'
             │
             └─ AUTOMATICALLY DELETE FROM tblbudgetconfig_access_scopes
                WHERE budget_id = 'X'
```

## Feature Comparison

### Before Normalization
```
tblbudgetconfiguration
├─ Single flat table
├─ All data in one record
├─ Limited flexibility
├─ Duplicate data
└─ Hard to manage relationships
```

### After Normalization
```
tblbudgetconfiguration (Main table)
├─ tblbudgetconfig_tenure_groups (1:Many)
├─ tblbudgetconfig_approvers (1:Many with constraints)
├─ tblbudgetconfig_access_scopes (1:Many with flexibility)
├─ Proper relationships
├─ Cascade delete
├─ Unique constraints
└─ Query flexibility
```

## Performance Characteristics

```
Operation              | Complexity | Notes
───────────────────────┼────────────┼──────────────────────────────
Create budget          | O(1)       | 4 INSERT statements
Get budget with all    | O(n)       | 4 SELECT statements (n=related)
Update budget main     | O(1)       | 1 UPDATE + 3 SELECTs for response
Delete budget          | O(1)       | Cascade delete handles cleanup
Add tenure group       | O(1)       | 1 INSERT
Update approver        | O(1)       | 1 UPDATE or INSERT
Add access scope       | O(1)       | 1 INSERT
───────────────────────┴────────────┴──────────────────────────────

Scale Considerations:
- List all budgets: O(n*m) where n=budgets, m=avg relations per budget
- Consider pagination for 100+ budgets
- Consider JOIN queries for large datasets
```

## Integration Points

```
Frontend (React)
       ↓
API Layer (Fetch/Axios)
       ↓
Routes (Express Router)
       ↓
Controller (Request handling)
       ↓
Service (Business logic)
       ↓
Supabase Client (SQL operations)
       ↓
PostgreSQL Database
```

## File Structure

```
orbit-backend/
├── src/
│   ├── services/
│   │   └── budgetConfigService.js      ← 15 methods total
│   │
│   ├── controllers/
│   │   └── budgetConfigController.js   ← 15 endpoints total
│   │
│   └── routes/
│       └── budgetConfigRoutes.js       ← 15 routes organized by resource
│
└── Documentation/
    ├── BACKEND_API_REFERENCE.md        ← Complete API docs
    ├── BACKEND_MODIFICATIONS_SUMMARY.md ← What changed & why
    ├── SETUP_GUIDE_NORMALIZED_SCHEMA.md ← Quick start guide
    └── DATABASE_ANALYSIS.md             ← Field mapping analysis
```
