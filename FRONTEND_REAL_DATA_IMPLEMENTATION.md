# Frontend Implementation Guide: Real Organizations and Approvers

## Overview

This guide explains how to integrate real organization and approver data from the backend into the Budget Configuration frontend form.

## Files to Modify

1. `orbit-frontend/src/pages/BudgetRequest.jsx` - CreateConfiguration component
2. `orbit-frontend/src/services/budgetConfigService.js` - Already updated ✓

## Step 1: Update CreateConfiguration Component

The CreateConfiguration component needs to:
1. Fetch organizations and approvers on mount
2. Display them in dropdowns
3. Save their IDs when creating a budget configuration

### Add State Variables

Add these useState hooks at the top of the CreateConfiguration function:

```javascript
// Organization and Approver Data
const [organizations, setOrganizations] = useState([]);
const [approvers, setApprovers] = useState({ L1: [], L2: [], L3: [] });
const [dataLoading, setDataLoading] = useState(false);
const [dataError, setDataError] = useState(null);
```

### Add useEffect to Fetch Data

Add this useEffect hook after the other useEffect hooks:

```javascript
// Fetch organizations and approvers on component mount
useEffect(() => {
  const fetchDropdownData = async () => {
    setDataLoading(true);
    setDataError(null);
    try {
      const token = localStorage.getItem('authToken') || '';
      
      // Fetch organizations
      const orgsData = await budgetConfigService.getOrganizations(token);
      setOrganizations(Array.isArray(orgsData) ? orgsData : []);
      
      // Fetch all approvers grouped by level
      const approversData = await budgetConfigService.getAllApprovers(token);
      setApprovers(approversData || { L1: [], L2: [], L3: [] });
      
    } catch (err) {
      console.error('Error fetching dropdown data:', err);
      setDataError('Failed to load organizations and approvers');
    } finally {
      setDataLoading(false);
    }
  };
  
  fetchDropdownData();
}, []);
```

### Update Form State to Include Real Data

In the formData state, add fields for real data:

```javascript
const [formData, setFormData] = useState({
  // Existing fields
  budgetName: '',
  period: 'monthly',
  minBudget: '',
  maxBudget: '',
  description: '',
  budgetControl: false,
  carryover: false,
  clientSponsored: false,
  
  // NEW: Real data selections
  selectedOrganizations: [],
  approverL1: '', // user_id
  approverL2: '', // user_id
  approverL3: '', // user_id
  approverL1Backup: '',
  approverL2Backup: '',
  approverL3Backup: '',
  
  // Existing tenure and scope fields
  tenureGroups: [],
  siteLocation: [],
  countries: [],
  affectedOUPaths: [],
  accessibleOUPaths: [],
  clients: [],
});
```

### Add Organization Selection Field

Add a MultiSelect for organizations in the form:

```jsx
<div className="space-y-2">
  <Label className="text-white font-semibold">Organizations</Label>
  <MultiSelect
    options={organizations.map(org => ({
      value: org.org_id,
      label: org.org_name,
    }))}
    value={formData.selectedOrganizations}
    onValueChange={(selected) => setFormData({
      ...formData,
      selectedOrganizations: selected,
    })}
    placeholder="Select organizations..."
    className="bg-slate-700 border-gray-300"
  />
</div>
```

### Add Approver Selection Fields

Add selects for each approval level:

```jsx
{/* L1 Approver Selection */}
<div className="space-y-2">
  <Label className="text-white font-semibold">Level 1 Approver (Primary)</Label>
  <Select value={formData.approverL1} onValueChange={(value) => 
    setFormData({ ...formData, approverL1: value })
  }>
    <SelectTrigger className="bg-slate-700 border-gray-300 text-white">
      <SelectValue placeholder="Select L1 Approver" />
    </SelectTrigger>
    <SelectContent className="bg-slate-800">
      {approvers.L1?.map(approver => (
        <SelectItem key={approver.user_id} value={approver.user_id}>
          {approver.full_name} ({approver.email})
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>

{/* L1 Backup Approver */}
<div className="space-y-2">
  <Label className="text-white font-semibold">Level 1 Approver (Backup)</Label>
  <Select value={formData.approverL1Backup} onValueChange={(value) => 
    setFormData({ ...formData, approverL1Backup: value })
  }>
    <SelectTrigger className="bg-slate-700 border-gray-300 text-white">
      <SelectValue placeholder="Select L1 Backup Approver" />
    </SelectTrigger>
    <SelectContent className="bg-slate-800">
      {approvers.L1?.map(approver => (
        <SelectItem key={approver.user_id} value={approver.user_id}>
          {approver.full_name} ({approver.email})
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>

{/* Repeat for L2 and L3 with formData.approverL2, approverL2Backup, approverL3, approverL3Backup */}
```

## Step 2: Update Form Submission

Modify the form submission to include real data:

```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (!formData.budgetName) {
    toast.error('Please enter a budget name');
    return;
  }
  
  try {
    const token = localStorage.getItem('authToken') || '';
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    // Build config data with REAL selections
    const configData = {
      // Budget basics
      budgetName: formData.budgetName,
      budget_description: formData.description,
      period: formData.period,
      min_limit: parseFloat(formData.minBudget) || 0,
      max_limit: parseFloat(formData.maxBudget) || 0,
      budget_control: formData.budgetControl,
      carryover: formData.carryover,
      client_sponsored: formData.clientSponsored,
      
      // REAL APPROVER DATA (now UUIDs instead of names)
      approver_l1_id: formData.approverL1,
      approver_l1_backup_id: formData.approverL1Backup,
      approver_l2_id: formData.approverL2,
      approver_l2_backup_id: formData.approverL2Backup,
      approver_l3_id: formData.approverL3,
      approver_l3_backup_id: formData.approverL3Backup,
      
      // REAL ORGANIZATION DATA
      selected_organizations: formData.selectedOrganizations,
      
      // Scopes and tenure groups
      countries: formData.countries,
      siteLocation: formData.siteLocation,
      affectedOUPaths: formData.affectedOUPaths,
      accessibleOUPaths: formData.accessibleOUPaths,
      clients: formData.clients,
      selectedTenureGroups: formData.tenureGroups,
      
      created_by: user.id,
    };
    
    console.log('Creating budget configuration with:', configData);
    
    const response = await budgetConfigService.createBudgetConfiguration(configData, token);
    
    if (response) {
      toast.success('Budget configuration created successfully!');
      // Reset form or navigate away
      resetForm();
    }
  } catch (error) {
    console.error('Error creating budget configuration:', error);
    toast.error(error.message || 'Failed to create budget configuration');
  }
};
```

## Step 3: Update Backend createBudgetConfig

The backend controller now needs to process real approver and organization data.

In `orbit-backend/src/controllers/budgetConfigController.js`, update the createBudgetConfig method:

```javascript
// Build approvers array from real data
const approvers = [];
if (configData.approver_l1_id) {
  approvers.push({
    approval_level: 1,
    primary_approver: configData.approver_l1_id,
    backup_approver: configData.approver_l1_backup_id || null,
  });
}
if (configData.approver_l2_id) {
  approvers.push({
    approval_level: 2,
    primary_approver: configData.approver_l2_id,
    backup_approver: configData.approver_l2_backup_id || null,
  });
}
if (configData.approver_l3_id) {
  approvers.push({
    approval_level: 3,
    primary_approver: configData.approver_l3_id,
    backup_approver: configData.approver_l3_backup_id || null,
  });
}

// Build organization scopes
const organizationScopes = (configData.selected_organizations || []).map(orgId => ({
  scope_type: 'Organization',
  scope_value: orgId,
}));

// Combine with existing scopes
const access_scopes = [
  ...organizationScopes,
  ...existingScopes, // Geo, Location, Client, etc.
];

// Pass to service
const dbData = {
  // ... existing fields
  approvers: approvers,
  access_scopes: access_scopes,
};
```

## Step 4: Test the Integration

### Test Checklist

- [ ] Frontend loads without errors
- [ ] Organizations dropdown populates with real data
- [ ] Approver dropdowns show real user names and emails
- [ ] Can select organizations and approvers
- [ ] Form submission includes real data IDs
- [ ] Backend receives correct UUIDs for approvers
- [ ] Backend receives correct org_ids for organizations
- [ ] Data is stored correctly in database tables

### Manual Testing Steps

1. **Start the app**: `npm run dev`
2. **Navigate to**: Budget Configuration → Create Configuration
3. **Check organizations dropdown**: Should show list of real organizations
4. **Check approver dropdowns**: Should show real users with emails
5. **Select approvers and organizations**
6. **Submit form and check browser console** for configData
7. **Check backend logs** to verify data received
8. **Query database** to verify saved data

## API Response Examples

### Organizations Response
```json
[
  {
    "org_id": "10000000-0000-0000-0000-000000000001",
    "org_name": "Asia Pacific Region",
    "parent_org_id": null,
    "geo": "Asia",
    "location": "Regional",
    "parent_org_name": null
  },
  {
    "org_id": "20000000-0000-0000-0000-000000000001",
    "org_name": "Philippines Operations",
    "parent_org_id": "10000000-0000-0000-0000-000000000001",
    "geo": "Philippines",
    "location": "Manila",
    "parent_org_name": "Asia Pacific Region"
  }
]
```

### Approvers Response
```json
{
  "L1": [
    {
      "user_id": "550e8400-e29b-41d4-a716-446655440001",
      "employee_id": "EMP001",
      "first_name": "John",
      "last_name": "Smith",
      "email": "john.smith@company.com",
      "full_name": "John Smith",
      "role_name": "L1_APPROVER"
    }
  ],
  "L2": [...],
  "L3": [...]
}
```

## Troubleshooting

### Organizations not showing
- Check browser console for fetch errors
- Verify API endpoint: `GET /api/organizations/list/all`
- Confirm data exists in tblorganization table

### Approvers not showing
- Check browser console for fetch errors
- Verify API endpoint: `GET /api/approvers/list/all`
- Confirm users have correct role assignments in tbluserroles

### Form submission fails
- Check browser console for validation errors
- Verify all required fields are filled
- Check backend logs for processing errors
- Ensure approver user_ids are valid UUIDs

## Next Steps

1. Implement hierarchical organization display (tree view)
2. Add organization search/filter functionality
3. Add approver search by department
4. Implement organization multi-select with parent/child relationships
5. Add organization access control (users can only select their orgs)

## Notes

- User IDs are UUIDs, not names
- Organizations have parent-child relationships (can be displayed as tree)
- Approvers are fetched by role (L1_APPROVER, L2_APPROVER, L3_APPROVER)
- Backup approvers are optional
- All data comes from real database tables (no mock data)
