# Backend Update Summary - Budget Configuration Normalized Schema

## 🎯 Changes Made

### 1. **Scope Field Mapping** (Controller)
The backend now properly maps frontend scope data to the three tables:

#### Scope Data Mapping
```
Frontend Field          Database Field              Table
─────────────────────────────────────────────────────────────
countries[]         →  geo_scope (comma-separated)  tblbudgetconfiguration
siteLocation[]      →  location_scope (comma-separated) tblbudgetconfiguration
ou[] (affected)     →  department_scope (comma-separated) tblbudgetconfiguration

countries[]         →  COUNTRY rows               tblbudgetconfig_access_scopes
siteLocation[]      →  LOCATION rows              tblbudgetconfig_access_scopes
ou[] (affected)     →  DEPARTMENT rows            tblbudgetconfig_access_scopes
accessibleOU[]      →  ACCESSIBLE_OU rows         tblbudgetconfig_access_scopes
clients[]           →  CLIENT rows                tblbudgetconfig_access_scopes
```

**IMPORTANT**: `department_scope` uses `ou` (affected organizational units), **NOT** `accessibleOU`
- `ou` = The OU affected by the budget configuration
- `accessibleOU` = Who has access to the budget (stored as ACCESSIBLE_OU scope type)

### 2. **Approvers Data Structure** (Controller Helper)
Converts frontend L1, L2, L3 approver data to database format:

```javascript
Frontend Input:
{
  approverL1: "user-id-1",
  backupApproverL1: "user-id-2",
  approverL2: "user-id-3",
  backupApproverL2: "user-id-4",
  approverL3: "user-id-5",
  backupApproverL3: "user-id-6",
}

Database Output (tblbudgetconfig_approvers):
[
  { approval_level: 1, primary_approver: "user-id-1", backup_approver: "user-id-2" },
  { approval_level: 2, primary_approver: "user-id-3", backup_approver: "user-id-4" },
  { approval_level: 3, primary_approver: "user-id-5", backup_approver: "user-id-6" },
]
```

### 3. **Tenure Groups** (Service)
Frontend tenure group array is stored in `tblbudgetconfig_tenure_groups`:

```javascript
Frontend Input:
selectedTenureGroups: ["0-6months", "6-12months", "2-5years"]

Database Output (tblbudgetconfig_tenure_groups):
[
  { budget_id: "...", tenure_group: "0-6months" },
  { budget_id: "...", tenure_group: "6-12months" },
  { budget_id: "...", tenure_group: "2-5years" },
]
```

### 4. **Access Scopes** (Service)
All scope data is normalized in `tblbudgetconfig_access_scopes` with `scope_type` and `scope_value`:

```javascript
Example records:
[
  { budget_id: "...", scope_type: "COUNTRY", scope_value: "ph" },
  { budget_id: "...", scope_type: "COUNTRY", scope_value: "sg" },
  { budget_id: "...", scope_type: "LOCATION", scope_value: "Metro Manila" },
  { budget_id: "...", scope_type: "LOCATION", scope_value: "Cebu" },
  { budget_id: "...", scope_type: "DEPARTMENT", scope_value: "it-dept" },
  { budget_id: "...", scope_type: "ACCESSIBLE_OU", scope_value: "hr-dept" },
  { budget_id: "...", scope_type: "CLIENT", scope_value: "pldt" },
]
```

## 📊 Data Flow Diagram

```
Frontend BudgetRequest.jsx (formData)
    ↓
HTTP POST /api/budget-configurations {budgetName, period, approverL1, ...}
    ↓
BudgetConfigController.createBudgetConfig()
    ├─→ validateBudgetConfig() ✓
    ├─→ validateScopeFields() ✓
    ├─→ buildApproversFromConfig() → approvers[]
    ├─→ buildAccessScopesFromConfig() → access_scopes[]
    ├─→ Convert camelCase → snake_case
    │
    ↓
BudgetConfigService.createBudgetConfig(dbData)
    ├─→ INSERT INTO tblbudgetconfiguration
    │   (budget_id, budget_name, geo_scope, location_scope, department_scope, ...)
    │
    ├─→ INSERT INTO tblbudgetconfig_tenure_groups (tenure_groups[])
    │
    ├─→ INSERT INTO tblbudgetconfig_approvers (approvers[])
    │
    ├─→ INSERT INTO tblbudgetconfig_access_scopes (access_scopes[])
    │
    └─→ SELECT with all relations for complete response
```

## 🔄 Database Operations

### Step 1: Main Configuration
```sql
INSERT INTO tblbudgetconfiguration (
  budget_name, min_limit, max_limit, budget_control, carryover_enabled,
  period_type, geo_scope, location_scope, department_scope, description, created_by
)
VALUES (...)
```

### Step 2: Tenure Groups
```sql
INSERT INTO tblbudgetconfig_tenure_groups (budget_id, tenure_group)
VALUES 
  (budget_id, 'tenure-value-1'),
  (budget_id, 'tenure-value-2'),
  ...
```

### Step 3: Approvers
```sql
INSERT INTO tblbudgetconfig_approvers (
  budget_id, approval_level, primary_approver, backup_approver, created_by
)
VALUES 
  (budget_id, 1, 'approver-id-1', 'backup-id-1', created_by),
  (budget_id, 2, 'approver-id-2', 'backup-id-2', created_by),
  ...
```

### Step 4: Access Scopes
```sql
INSERT INTO tblbudgetconfig_access_scopes (
  budget_id, scope_type, scope_value, created_by
)
VALUES 
  (budget_id, 'COUNTRY', 'ph', created_by),
  (budget_id, 'LOCATION', 'Metro Manila', created_by),
  (budget_id, 'DEPARTMENT', 'it-dept', created_by),
  ...
```

## ✅ Features Implemented

- ✅ Proper scope field separation (geo, location, department)
- ✅ Distinguishes between affected OU (`ou`) and accessible OU (`accessibleOU`)
- ✅ Normalizes approvers (L1, L2, L3) with approval levels
- ✅ Stores tenure groups in dedicated table
- ✅ Stores all scopes in normalized `access_scopes` table
- ✅ Converts frontend camelCase to database snake_case
- ✅ Builds complete data structure before insertion
- ✅ Transactional approach (all or nothing)
- ✅ Proper error handling and validation

## 🧪 Testing the Integration

### Test Data
```javascript
const testConfig = {
  budgetName: "Q1 2024 Performance Bonus",
  period: "Monthly",
  description: "For all employee performance bonuses in Q1",
  minLimit: 1000,
  maxLimit: 50000,
  budgetControlEnabled: true,
  budgetControlLimit: 100000,
  budgetCarryoverEnabled: true,
  carryoverPercentage: 50,
  countries: ["ph", "sg"],           // geo_scope
  siteLocation: ["Metro Manila", "Singapore Central"],  // location_scope
  ou: ["it-dept", "hr-dept"],        // department_scope (affected)
  accessibleOU: ["it-dept"],         // Who can access
  clients: ["pldt", "globe"],
  selectedTenureGroups: ["0-6months", "6-12months"],
  approverL1: "approver-1-uuid",
  backupApproverL1: "backup-1-uuid",
  approverL2: "approver-2-uuid",
  approverL3: "approver-3-uuid",
};
```

### Expected Database Result
- **tblbudgetconfiguration**: 1 record with geo_scope, location_scope, department_scope
- **tblbudgetconfig_tenure_groups**: 2 records
- **tblbudgetconfig_approvers**: 3 records (L1, L2, L3)
- **tblbudgetconfig_access_scopes**: 7+ records (2 countries + 2 locations + 2 departments + 1 accessible_ou + 2 clients)

## 📝 Notes

- System user UUID: `00000000-0000-0000-0000-000000000000` (used when no auth token)
- All arrays are converted to comma-separated strings in main table for quick filtering
- Detailed relationships stored in normalized tables for complex queries
- Service automatically fetches all related data when retrieving configurations
