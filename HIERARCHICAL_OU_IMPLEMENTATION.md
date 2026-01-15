# Budget Configuration - Hierarchical OU Structure Implementation

## Changes Summary

### Database Changes (User-Initiated)
1. **Removed columns from `tblbudgetconfiguration`**:
   - ❌ `geo_scope`
   - ❌ `location_scope`
   - ❌ `department_scope`

2. **Renamed table**:
   - ❌ `tblbudgetconfig_access_scopes`
   - ✅ `tblbudgetconfig_scopes`

### Backend Changes

#### 1. Service Layer (`src/services/budgetConfigService.js`)
- **Removed** destructuring of `geo_scope`, `location_scope`, `department_scope` from configData
- **Updated** main budget configuration insert to NOT include scope columns
- **Updated** table reference from `tblbudgetconfig_access_scopes` to `tblbudgetconfig_scopes`
- **Enhanced** `buildAccessScopesFromConfig()` to create **5 scope types**:
  1. **Geo** - Geographic scopes (countries)
  2. **Location** - Site locations
  3. **Affected_OU** - Parent OUs, Child OUs, and Grandchild OUs affected by budget
  4. **Access_OU** - OUs that can access this configuration
  5. **Client** - Client codes

#### 2. Controller Layer (`src/controllers/budgetConfigController.js`)
- **Removed** geo_scope, location_scope, department_scope from dbData object
- **Updated** logging to show hierarchical OU structure
- **Enhanced** buildAccessScopesFromConfig call to pass hierarchical OU data
- **Added** support for `selectedChildOU` and `selectedGrandchildOU`

### Frontend Changes

#### 1. Form State (`src/pages/BudgetRequest.jsx`)
Added new form fields:
```javascript
ou: [],                   // Parent OU (affected)
selectedChildOU: [],      // Child OUs (affected) - checkboxes
selectedGrandchildOU: []  // Grandchild OUs (affected) - checkboxes
accessibleChildOU: []     // Child OUs that can access
```

#### 2. OU Selection UI
**Hierarchical Structure with Checkboxes**:

```
Step 2: Country & Geographic Settings
├─ Parent OU Selection (Dropdown)
│  └─ IT Department
│  └─ HR Department
│  └─ Finance Department
│  └─ Operations
│  └─ Customer Service
│
├─ Child OU Selection (Checkboxes - appears after parent OU selected)
│  ☐ Development Team
│  ☐ QA Team
│  ☐ Support Team
│  ☐ Infrastructure
│  ☐ Security
│
└─ Grandchild OU Selection (Checkboxes - appears after child OU selected)
   For each selected child OU:
   ├─ Under: Development Team
   │  ☐ Team A
   │  ☐ Team B
   │  ☐ Team C
   ├─ Under: QA Team
   │  ☐ Team A
   │  ☐ Team B
   │  ☐ Team C
```

**Features**:
- ✅ Hierarchical display with visual nesting (border-left styling)
- ✅ Checkboxes for multi-select child and grandchild OUs
- ✅ Conditional rendering (appears only when parent/child selected)
- ✅ Color-coded labels (pink for section headers)
- ✅ Consistent with existing checkbox styling (blue border, slate background)

### Data Flow

#### Frontend → Backend
```
formData = {
  ou: ["it-dept"],                                    // Parent OU
  selectedChildOU: ["dev-team", "qa-team"],           // Selected child OUs
  selectedGrandchildOU: ["dev-team-team-a", "qa-team-team-b"], // Selected grandchild OUs
  accessibleOU: ["hr-dept"],                          // Who can access
  accessibleChildOU: ["finance-dept-team-a"],        // Child OUs with access
  countries: ["ph", "sg"],
  siteLocation: ["metro-manila"],
  clients: ["pldt"],
}
```

#### Backend Processing
```
1. buildAccessScopesFromConfig() creates individual scope records:
   
   [
     // Geo Scopes
     { scope_type: "Geo", scope_value: "ph" },
     { scope_type: "Geo", scope_value: "sg" },
     
     // Location Scopes
     { scope_type: "Location", scope_value: "metro-manila" },
     
     // Affected_OU Scopes (all 3 levels)
     { scope_type: "Affected_OU", scope_value: "it-dept" },               // Parent
     { scope_type: "Affected_OU", scope_value: "dev-team" },             // Child
     { scope_type: "Affected_OU", scope_value: "qa-team" },              // Child
     { scope_type: "Affected_OU", scope_value: "dev-team-team-a" },      // Grandchild
     { scope_type: "Affected_OU", scope_value: "qa-team-team-b" },       // Grandchild
     
     // Access_OU Scopes
     { scope_type: "Access_OU", scope_value: "hr-dept" },                // Parent
     { scope_type: "Access_OU", scope_value: "finance-dept-team-a" },    // Child
     
     // Client Scopes
     { scope_type: "Client", scope_value: "pldt" },
   ]

2. Insert into tblbudgetconfig_scopes with created_by timestamp
```

#### Database Result
```
tblbudgetconfig_scopes:
- id: 1, budget_id: XXX, scope_type: "Geo", scope_value: "ph"
- id: 2, budget_id: XXX, scope_type: "Geo", scope_value: "sg"
- id: 3, budget_id: XXX, scope_type: "Location", scope_value: "metro-manila"
- id: 4, budget_id: XXX, scope_type: "Affected_OU", scope_value: "it-dept"
- id: 5, budget_id: XXX, scope_type: "Affected_OU", scope_value: "dev-team"
- id: 6, budget_id: XXX, scope_type: "Affected_OU", scope_value: "qa-team"
- id: 7, budget_id: XXX, scope_type: "Affected_OU", scope_value: "dev-team-team-a"
- id: 8, budget_id: XXX, scope_type: "Affected_OU", scope_value: "qa-team-team-b"
- id: 9, budget_id: XXX, scope_type: "Access_OU", scope_value: "hr-dept"
- id: 10, budget_id: XXX, scope_type: "Access_OU", scope_value: "finance-dept-team-a"
- id: 11, budget_id: XXX, scope_type: "Client", scope_value: "pldt"

Total: 11 scope records created from 1 budget configuration
```

## Files Modified

### Backend
1. **src/services/budgetConfigService.js**
   - Removed scope parameters from createBudgetConfig
   - Updated table name references
   - Enhanced buildAccessScopesFromConfig with 5 scope types
   - Added support for hierarchical OU arrays

2. **src/controllers/budgetConfigController.js**
   - Removed scope columns from dbData
   - Updated logging
   - Added selectedChildOU and selectedGrandchildOU handling

### Frontend
1. **src/pages/BudgetRequest.jsx**
   - Added selectedChildOU and selectedGrandchildOU to form state
   - Added hierarchical OU selection UI with checkboxes
   - Updated API request payload
   - Updated form reset logic

## Testing Checklist

- [ ] Create budget configuration with:
  - [ ] Parent OU selected (e.g., "it-dept")
  - [ ] Multiple child OUs selected (e.g., "dev-team", "qa-team")
  - [ ] Multiple grandchild OUs selected (e.g., "dev-team-team-a")
  - [ ] Countries and site locations
  - [ ] Clients
  - [ ] Accessible OUs at multiple levels

- [ ] Verify database:
  - [ ] tblbudgetconfiguration has NO geo_scope, location_scope, department_scope
  - [ ] tblbudgetconfig_scopes contains all scope records
  - [ ] Exactly 5 scope types: Geo, Location, Affected_OU, Access_OU, Client
  - [ ] Each OU level stored separately (parent, child, grandchild as individual rows)

- [ ] Verify UI:
  - [ ] Child OU checkboxes appear only after parent selected
  - [ ] Grandchild OU checkboxes appear only after child selected
  - [ ] Hierarchical visual structure with borders/indentation
  - [ ] Multiple selections work correctly

## Scope Type Reference

| Scope Type | Source | Purpose | Example |
|-----------|--------|---------|---------|
| **Geo** | countries | Geographic/country restrictions | "ph", "sg" |
| **Location** | siteLocation | Site location restrictions | "metro-manila", "cebu" |
| **Affected_OU** | ou, selectedChildOU, selectedGrandchildOU | OUs affected by budget (3 levels) | "it-dept", "dev-team", "dev-team-team-a" |
| **Access_OU** | accessibleOU, accessibleChildOU | OUs that can access config (2 levels) | "hr-dept", "finance-dept-team-a" |
| **Client** | clients | Client codes | "pldt", "globe" |

## Future Enhancements

1. **Dynamic OU Loading**: Load available child/grandchild OUs from backend based on parent selection
2. **OU Metadata**: Store OU description, manager, cost center with scope records
3. **Scope Visualization**: Add UI to view all scopes and their relationships
4. **Scope Validation**: Ensure selected child OUs belong to selected parent OU
5. **Bulk Operations**: Select/deselect all child OUs at once
