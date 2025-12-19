# Budget Configuration - Database vs Frontend Analysis

## 📊 Field Mapping Analysis

### Frontend Form Fields (BudgetRequest.jsx)

The frontend form collects the following data across 4 steps:

#### Step 1: Setup Configuration
```javascript
formData = {
  budgetName: string,
  period: enum ("monthly", "quarterly", "semi-annually", "yearly"),
  description: string (optional),
  dataControlEnabled: boolean (always true),
  limitMin: number,
  limitMax: number,
  budgetControlEnabled: boolean,
  budgetControlLimit: number,
  budgetCarryoverEnabled: boolean,
  carryoverPercentage: number (0-100),
  accessibleOU: array[string],
  accessibleChildOU: array[string],
}
```

#### Step 2: Country/Geographic Settings
```javascript
formData = {
  countries: array[string],    // Geographic codes
  siteLocation: array[string], // Site locations
  clients: array[string],      // Client codes
  ou: array[string],           // Organizational units
  childOU: array[string],      // Child organizational units
}
```

#### Step 3: Tenure Groups & Approvers
```javascript
formData = {
  selectedTenureGroups: array[string],
  approverL1: string,
  backupApproverL1: string,
  approverL2: string,
  backupApproverL2: string,
  approverL3: string,
  backupApproverL3: string,
}
```

---

## 🔍 Issues & Missing Columns

### ⚠️ MISSING COLUMNS IN DATABASE

The database table `tblbudgetconfiguration` is **missing several important fields** that the frontend collects:

| Frontend Field | Database Column | Status | Impact |
|---|---|---|---|
| `description` | ❌ | MISSING | Budget purpose/context lost |
| `dataControlEnabled` | ❌ | MISSING | Cannot track if data control is active |
| `budgetControlLimit` | ❌ | MISSING | Critical for budget enforcement |
| `budgetCarryoverEnabled` | ❌ | MISSING | Cannot track carryover settings |
| `carryoverPercentage` | ❌ | MISSING | Cannot specify carryover amount |
| `accessibleOU` | ❌ | MISSING | Cannot restrict access to specific OUs |
| `accessibleChildOU` | ❌ | MISSING | Cannot restrict child OU access |
| `siteLocation` | ❌ | MISSING | Site location not stored separately |
| `countries` | ❌ | MISSING | Countries data structure differs |
| `clients` | ❌ | MISSING | Client list not captured |
| `ou` | ❌ | MISSING | Organizational units not stored |
| `childOU` | ❌ | MISSING | Child OUs not stored |
| `selectedTenureGroups` | ❌ | MISSING | Tenure requirements not stored |
| `approverL1` | ❌ | MISSING | L1 approver info missing |
| `backupApproverL1` | ❌ | MISSING | L1 backup approver missing |
| `approverL2` | ❌ | MISSING | L2 approver info missing |
| `backupApproverL2` | ❌ | MISSING | L2 backup approver missing |
| `approverL3` | ❌ | MISSING | L3 approver info missing |
| `backupApproverL3` | ❌ | MISSING | L3 backup approver missing |

### ✅ FIELDS THAT EXIST

| Database Column | Frontend Field | Status | Type |
|---|---|---|---|
| `budget_id` | (auto-generated) | ✅ | UUID |
| `budget_name` | `budgetName` | ✅ | TEXT |
| `min_limit` | `limitMin` | ✅ | NUMERIC |
| `max_limit` | `limitMax` | ✅ | NUMERIC |
| `budget_control` | `budgetControlEnabled` | ⚠️ PARTIAL | BOOLEAN |
| `carryover_enabled` | `budgetCarryoverEnabled` | ⚠️ PARTIAL | BOOLEAN |
| `client_sponsored` | (N/A) | - | BOOLEAN |
| `period_type` | `period` | ✅ | TEXT |
| `geo_scope` | `countries[0]` | ⚠️ PARTIAL | TEXT |
| `location_scope` | `siteLocation[0]` | ⚠️ PARTIAL | TEXT |
| `department_scope` | `ou[0]` | ⚠️ PARTIAL | TEXT |
| `created_by` | (auth) | ✅ | UUID |
| `created_at` | (auto) | ✅ | TIMESTAMP |
| `updated_by` | (auth) | ✅ | UUID |
| `updated_at` | (auto) | ✅ | TIMESTAMP |

---

## 🛠️ RECOMMENDED DATABASE SCHEMA UPDATES

### Option 1: Extend Existing Table (Recommended)

Add new columns to `tblbudgetconfiguration`:

```sql
ALTER TABLE tblbudgetconfiguration ADD COLUMN (
  description TEXT,
  budget_control_limit NUMERIC,
  carryover_percentage NUMERIC DEFAULT 100,
  accessible_ou TEXT[] DEFAULT NULL,
  accessible_child_ou TEXT[] DEFAULT NULL,
  site_location TEXT,
  countries TEXT[],
  clients TEXT[],
  organizational_units TEXT[],
  child_organizational_units TEXT[],
  tenure_groups TEXT[],
  data_control_enabled BOOLEAN DEFAULT true
);
```

### Option 2: Create Related Tables (Better for Scalability)

If you need more flexibility, create related tables:

#### Table: `tblbudgetconfig_approvers`
```sql
CREATE TABLE tblbudgetconfig_approvers (
  approver_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES tblbudgetconfiguration(budget_id),
  approval_level INT NOT NULL (1, 2, or 3),
  primary_approver_id UUID NOT NULL REFERENCES tblusers(user_id),
  backup_approver_id UUID REFERENCES tblusers(user_id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Table: `tblbudgetconfig_tenure_groups`
```sql
CREATE TABLE tblbudgetconfig_tenure_groups (
  config_tenure_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES tblbudgetconfiguration(budget_id),
  tenure_group TEXT NOT NULL (e.g., '0-6months', '6-12months', etc),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Table: `tblbudgetconfig_access_scopes`
```sql
CREATE TABLE tblbudgetconfig_access_scopes (
  scope_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES tblbudgetconfiguration(budget_id),
  scope_type TEXT NOT NULL ('OU', 'CHILD_OU', 'CLIENT', 'LOCATION', 'COUNTRY'),
  scope_value TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 📋 RECOMMENDATION

**Use Option 1 (Extend Table)** for now because:
- ✅ Simpler to implement
- ✅ Faster development
- ✅ Easier backend API changes
- ✅ Suitable for current scale

**Migrate to Option 2** if you need:
- Multiple approvers per level with rotation
- Complex tenure-based rules
- Flexible scope management
- Better audit trail

---

## 🔄 NEXT STEPS

1. **Update Database Schema** - Add missing columns to `tblbudgetconfiguration`
2. **Update Backend** - Modify `BudgetConfigService` to handle new fields
3. **Update Frontend** - Connect form to send all collected data
4. **Update API Validation** - Validate new fields in controllers

### Current Backend Status

The backend is **ready to accept all fields**. It will:
- Accept all data through API
- Store whatever the database schema supports
- Return consistent responses

**However**, if you try to save data for missing columns, those fields will be silently discarded by Supabase.

---

## 📝 Data Structure Notes

### Frontend Arrays vs Database Strings

The frontend stores **arrays** (multi-select):
- `countries: ["ph", "sg"]`
- `clients: ["pldt", "globe"]`
- `ou: ["it-dept", "hr-dept"]`

The database stores **single values**:
- `geo_scope: "Philippines"`
- (no client field)
- `department_scope: "IT Department"`

### Solution

**Option A**: Convert arrays to JSON strings on save
```javascript
// Frontend to Backend
countries: ["ph", "sg"] → JSON.stringify(["ph", "sg"])

// Backend to Frontend
"{\"ph\", \"sg\"}" → JSON.parse() → ["ph", "sg"]
```

**Option B**: Store as PostgreSQL array type
```sql
ALTER TABLE tblbudgetconfiguration ADD COLUMN countries TEXT[]
```

**Option C**: Store as comma-separated strings
```javascript
countries: ["ph", "sg"] → "ph,sg"
```

---

## 🎯 ACTION ITEMS

- [ ] Decide on array vs string storage approach
- [ ] Update database schema with missing columns
- [ ] Update BudgetConfigService to include new fields
- [ ] Update BudgetConfigController validation
- [ ] Update frontend API calls to send all data
- [ ] Test end-to-end flow
- [ ] Update documentation
