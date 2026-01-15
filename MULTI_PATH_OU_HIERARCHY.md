# Multi-Path Hierarchical OU System

## Overview

The updated ORBIT system now supports **multiple independent hierarchical organizational unit (OU) structures** with arbitrary depth. Instead of a single parent-child-grandchild tree, users can create multiple "roots" (parent OUs), each with their own deep hierarchies.

## Key Features

### 1. **Multiple Independent Paths**

Users can define multiple separate OU hierarchies in a single budget configuration:

```
Path 1: IT-Dept → Dev-Team → Dev-Team-A
Path 2: IT-Dept → QA-Team → QA-Team-B → QA-Team-B-1
Path 3: HR-Dept → HR-Finance
```

Each path is stored as a **single row** in `tblbudgetconfig_scopes` with the complete hierarchy embedded.

### 2. **Arbitrary Depth Support**

Hierarchies can go as deep as needed:

```
Parent → Child → Grandchild → Great-Grandchild → Great-Great-Grandchild → ...
```

The system handles any number of levels automatically.

### 3. **Two Separate OU Types**

- **Affected OUs**: Organizational units affected by this budget
- **Access OUs**: Which organizational units have access to this budget configuration

Both support the same multi-path hierarchical structure.

## Frontend Implementation

### Form State

```jsx
const [formData, setFormData] = useState({
  // Multiple hierarchical paths format
  // Each path is an array of OU values: [parent, child, grandchild, ...]
  affectedOUPaths: [
    ["it-dept", "dev-team", "dev-team-a"],
    ["it-dept", "qa-team"],
    ["hr-dept", "hr-finance"]
  ],
  
  // Same structure for access OUs
  accessibleOUPaths: [
    ["it-access", "dev-access"],
    ["hr-access"]
  ],
  
  // Other fields...
  clientSponsored: false, // NEW: Checkbox in Budget Control
  clients: [], // NOW: Multi-select with checkboxes
});
```

### UI Components

**Path Builder Pattern:**

1. **Add Root OU**: Dropdown to select parent OU
   - Creates new path: `["it-dept"]`
   
2. **Add Child Level**: Select dropdown appears for each path
   - Extends path: `["it-dept", "dev-team"]`
   
3. **Add Deeper Levels**: Can continue adding levels indefinitely
   - Further extends: `["it-dept", "dev-team", "dev-team-a"]`
   
4. **Remove Path**: Delete button to remove entire path

5. **Visual Hierarchy**: 
   - Pink border (left) for Affected OUs
   - Blue border (left) for Access OUs
   - Indentation shows hierarchy levels
   - Path display: `"IT-Dept > Dev-Team > Dev-Team-A"`

### Client Multi-Select

Clients now use `MultiSelect` component with checkboxes:

```jsx
<MultiSelect
  options={[
    { value: "pldt", label: "PLDT" },
    { value: "globe", label: "Globe Telecom" },
    // ...
  ]}
  selected={formData.clients}
  onChange={(selected) => updateField("clients", selected)}
  hasAllOption={true}
/>
```

### Client Sponsored Checkbox

Added to **Budget Control** section when enabled:

```jsx
{formData.budgetControlEnabled && (
  <div className="flex items-center space-x-2">
    <Checkbox
      id="clientSponsored"
      checked={formData.clientSponsored}
      onCheckedChange={(checked) => updateField("clientSponsored", checked)}
      className="border-blue-400 bg-slate-600"
    />
    <Label htmlFor="clientSponsored">Client Sponsored</Label>
  </div>
)}
```

## Backend Implementation

### API Request Format

Frontend sends hierarchical paths as arrays:

```json
{
  "budgetName": "Q1 2025 IT Budget",
  "affectedOUPaths": [
    ["it-dept", "dev-team", "dev-team-a"],
    ["it-dept", "qa-team", "qa-team-b", "qa-team-b-1"],
    ["hr-dept", "hr-finance"]
  ],
  "accessibleOUPaths": [
    ["it-access", "dev-access"],
    ["hr-access"]
  ],
  "countries": ["PH", "SG"],
  "siteLocation": ["Manila", "Bangkok"],
  "clients": ["pldt", "globe"],
  "clientSponsored": true,
  "selectedTenureGroups": ["0-6months", "6-12months"],
  "approverL1": "john-smith",
  "backupApproverL1": "jane-doe"
}
```

### Database Storage Format

Each path stored in `tblbudgetconfig_scopes` as a single row with JSON value:

**Affected OUs Example:**

```
Row 1:
  scope_type: "Affected_OU"
  scope_value: {
    "path": ["it-dept", "dev-team", "dev-team-a"],
    "depth": 3,
    "parent": "it-dept"
  }

Row 2:
  scope_type: "Affected_OU"
  scope_value: {
    "path": ["it-dept", "qa-team", "qa-team-b", "qa-team-b-1"],
    "depth": 4,
    "parent": "it-dept"
  }

Row 3:
  scope_type: "Affected_OU"
  scope_value: {
    "path": ["hr-dept", "hr-finance"],
    "depth": 2,
    "parent": "hr-dept"
  }
```

**Access OUs Example:**

```
Row 4:
  scope_type: "Access_OU"
  scope_value: {
    "path": ["it-access", "dev-access"],
    "depth": 2,
    "parent": "it-access"
  }

Row 5:
  scope_type: "Access_OU"
  scope_value: {
    "path": ["hr-access"],
    "depth": 1,
    "parent": "hr-access"
  }
```

### Helper Function Update

`BudgetConfigService.buildAccessScopesFromConfig()`:

```javascript
static buildAccessScopesFromConfig(geoScopeArray, locationScopeArray, configData) {
  const scopes = [];

  // ... Geo and Location scopes ...

  // AFFECTED_OU - Process each path independently
  if (configData.affectedOUPaths && Array.isArray(configData.affectedOUPaths)) {
    configData.affectedOUPaths.forEach((path) => {
      if (Array.isArray(path) && path.length > 0) {
        scopes.push({
          scope_type: 'Affected_OU',
          scope_value: JSON.stringify({
            path: path,           // Full hierarchy array
            depth: path.length,   // Number of levels
            parent: path[0]       // Root level for queries
          }),
        });
      }
    });
  }

  // ACCESS_OU - Same pattern
  if (configData.accessibleOUPaths && Array.isArray(configData.accessibleOUPaths)) {
    configData.accessibleOUPaths.forEach((path) => {
      if (Array.isArray(path) && path.length > 0) {
        scopes.push({
          scope_type: 'Access_OU',
          scope_value: JSON.stringify({
            path: path,
            depth: path.length,
            parent: path[0]
          }),
        });
      }
    });
  }

  // ... Client scopes ...
  return scopes;
}
```

## Data Flow

### Frontend → Backend

```
User Interface
    ↓
BudgetRequest.jsx Form State
    ├─ affectedOUPaths: [["it-dept", "dev-team"], ...]
    ├─ accessibleOUPaths: [["it-access"], ...]
    ├─ clientSponsored: true
    └─ clients: ["pldt", "globe"]
    ↓
handleSubmit() prepares configData
    ↓
budgetConfigService.createBudgetConfiguration(configData)
    ↓
POST /api/budgetconfig
```

### Backend Processing

```
budgetConfigController.createBudgetConfig()
    ↓
Build scope arrays from request
    ↓
buildAccessScopesFromConfig(
  geoScopeArray,
  locationScopeArray,
  { affectedOUPaths, accessibleOUPaths, clients, ... }
)
    ↓
Returns scopes array with individual Affected_OU, Access_OU, Geo, Location, Client rows
    ↓
BudgetConfigService.createBudgetConfig(dbData)
    ↓
Insert into tblbudgetconfiguration (main config)
    ↓
Insert into tblbudgetconfig_scopes (all scope records)
    ↓
Insert into tblbudgetconfig_tenure_groups (tenure mappings)
    ↓
Insert into tblbudgetconfig_approvers (approval hierarchy)
```

## Database Schema

### tblbudgetconfiguration
```sql
budget_id, budget_name, min_limit, max_limit, budget_control, 
budget_control_limit, carryover_enabled, carryover_percentage,
client_sponsored, period_type, description, created_by, created_at
```

### tblbudgetconfig_scopes
```sql
scope_id, budget_id, scope_type, scope_value, created_by, created_at

-- scope_type values:
-- 'Geo' - Geographic restrictions
-- 'Location' - Site location restrictions  
-- 'Affected_OU' - Hierarchical OUs affected by budget (one row per path)
-- 'Access_OU' - Hierarchical OUs with access (one row per path)
-- 'Client' - Client code restrictions
```

## Example Configurations

### Example 1: IT Budget with Multiple Teams

```json
{
  "budgetName": "Q1 2025 IT Operations",
  "affectedOUPaths": [
    ["it-dept", "dev-team", "dev-team-frontend"],
    ["it-dept", "dev-team", "dev-team-backend"],
    ["it-dept", "qa-team", "qa-automation"],
    ["it-dept", "infrastructure"]
  ],
  "accessibleOUPaths": [
    ["it-director", "it-manager-dev"],
    ["it-director", "it-manager-qa"],
    ["finance-cfo"]
  ],
  "countries": ["PH"],
  "siteLocation": ["Manila"],
  "clients": ["pldt", "globe"],
  "clientSponsored": false
}
```

**Database Result:**
- 4 Affected_OU rows (one per path)
- 3 Access_OU rows (one per path)
- 1 Geo row
- 1 Location row
- 2 Client rows
- **Total: 11 scope records**

### Example 2: HR Budget with Deep Hierarchy

```json
{
  "budgetName": "2025 HR Compensation Budget",
  "affectedOUPaths": [
    ["hr-dept", "recruitment", "recruitment-apac", "recruitment-apac-ph"],
    ["hr-dept", "compensation", "compensation-payroll", "compensation-payroll-processing", "compensation-payroll-processing-manila"]
  ],
  "accessibleOUPaths": [
    ["hr-director"],
    ["cfo"]
  ],
  "countries": ["PH", "SG", "MY"],
  "siteLocation": ["Manila", "Singapore", "Kuala Lumpur"],
  "clients": ["converge"],
  "clientSponsored": true
}
```

**Database Result:**
- 2 Affected_OU rows (with depths 4 and 5)
- 2 Access_OU rows (with depths 1 and 1)
- 3 Geo rows
- 3 Location rows
- 1 Client row
- **Total: 12 scope records**

## Querying Hierarchical Data

### Find all budgets for a specific OU

```sql
SELECT bc.budget_id, bc.budget_name, bcs.scope_value
FROM tblbudgetconfiguration bc
JOIN tblbudgetconfig_scopes bcs ON bc.budget_id = bcs.budget_id
WHERE bcs.scope_type = 'Affected_OU'
  AND bcs.scope_value::jsonb ->> 'parent' = 'it-dept';
```

### Find all OUs under a parent

```sql
SELECT bc.budget_id, bc.budget_name, bcs.scope_value
FROM tblbudgetconfiguration bc
JOIN tblbudgetconfig_scopes bcs ON bc.budget_id = bcs.budget_id
WHERE bcs.scope_type = 'Affected_OU'
  AND bcs.scope_value::jsonb @> '{"parent": "it-dept"}';
```

### Find all budgets accessible by a specific OU

```sql
SELECT bc.budget_id, bc.budget_name, bcs.scope_value
FROM tblbudgetconfiguration bc
JOIN tblbudgetconfig_scopes bcs ON bc.budget_id = bcs.budget_id
WHERE bcs.scope_type = 'Access_OU'
  AND bcs.scope_value::jsonb @> '{"parent": "hr-director"}';
```

### Check if OU path exists in budget

```sql
SELECT bc.budget_id, bc.budget_name
FROM tblbudgetconfiguration bc
JOIN tblbudgetconfig_scopes bcs ON bc.budget_id = bcs.budget_id
WHERE bcs.scope_type = 'Affected_OU'
  AND bcs.scope_value::jsonb -> 'path' @> '"it-dept"'
  AND bcs.scope_value::jsonb -> 'path' @> '"dev-team"';
```

## Benefits of Multi-Path System

✅ **Flexibility**: Support any organizational structure without redesign  
✅ **Scalability**: Handle unlimited depth without database changes  
✅ **Clarity**: Each path clearly shows complete hierarchy  
✅ **Queryability**: JSON fields enable powerful PostgreSQL queries  
✅ **Single Row per Path**: Clean data normalization  
✅ **Metadata**: Depth and parent information aids queries  
✅ **Multiple Roots**: No limit on number of independent hierarchies  

## Migration Notes

If migrating from old single-parent format:

```javascript
// Old format (deprecated)
{
  ou: ["it-dept"],
  selectedChildOU: ["dev-team", "qa-team"],
  selectedGrandchildOU: ["dev-team-a"]
}

// New format (multi-path)
{
  affectedOUPaths: [
    ["it-dept", "dev-team", "dev-team-a"],
    ["it-dept", "qa-team"]
  ]
}
```

Add migration script to transform old data to new format.

## Testing Checklist

- [ ] Create budget with single OU path (1 level)
- [ ] Create budget with multiple OU paths
- [ ] Create budget with deep hierarchy (5+ levels)
- [ ] Mix deep and shallow hierarchies in one budget
- [ ] Verify all paths stored correctly in database
- [ ] Verify Affected_OU and Access_OU separate correctly
- [ ] Test multi-select client dropdown
- [ ] Test client-sponsored checkbox visibility
- [ ] Verify form resets properly after submission
- [ ] Test query examples above with actual database

## Future Enhancements

1. **OU Search**: Auto-suggest OU values from database
2. **OU Validation**: Check if OU path exists in master OU list
3. **Tree Visualization**: Show hierarchies as interactive trees
4. **Path Templates**: Save/load common OU configurations as templates
5. **Bulk Operations**: Import multiple budgets from CSV with paths
6. **Reporting**: Report which OUs are affected/accessible across budgets
7. **Conflict Detection**: Alert if paths overlap with existing budgets

