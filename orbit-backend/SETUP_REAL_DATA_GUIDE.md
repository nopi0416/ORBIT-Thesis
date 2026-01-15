# Setup Real Data: Users, Approvers, and Organizations

## Overview

This guide provides step-by-step instructions to populate your database with real user and organization data that will be used throughout the ORBIT system.

## Database Structure

### Tables Involved
1. **tblusers** - User profiles (employee information)
2. **tbluserroles** - Mapping between users and their assigned roles
3. **tblroles** - Role definitions (L1_APPROVER, L2_APPROVER, L3_APPROVER, etc.)
4. **tblorganization** - Hierarchical organizational structure

### Role IDs (Reference)
```
L1_APPROVER:  502094b0-3511-4839-9c26-ced058e3fa96
L2_APPROVER:  127b09d1-7366-4225-aef9-c10aaa5f61a3
L3_APPROVER:  c0940e24-4506-4322-98f1-3c7646c1519f
REQUESTOR:    2fea9c55-117e-417c-9742-e6db24ff3a99
PAYROLL:      f1879124-4400-4fd6-9dbf-f04cd526cb09
```

## Step 1: Run the SQL Insert Script

1. Open your database client (Supabase, pgAdmin, etc.)
2. Navigate to the SQL editor
3. Open the file: `orbit-backend/sql/users_organizations_data.sql`
4. Copy all INSERT statements (excluding verification queries)
5. Execute the queries in your database

The script will insert:
- **9 Users** (3 for each approval level)
- **10 Organizations** in a hierarchical structure:
  - 2 Parent organizations (Asia Pacific Region, Europe Region)
  - 4 Child organizations (Philippines, Singapore, UK, Germany)
  - 4 Grandchild organizations (various departments)

### SQL Script Details

**Users Created:**

L1 Approvers:
- john.smith@company.com (EMP001)
- sarah.johnson@company.com (EMP002)
- michael.brown@company.com (EMP003)

L2 Approvers:
- emily.davis@company.com (EMP004)
- robert.wilson@company.com (EMP005)
- jennifer.martinez@company.com (EMP006)

L3 Approvers:
- david.anderson@company.com (EMP007)
- lisa.taylor@company.com (EMP008)
- james.thomas@company.com (EMP009)

**Organizations Created:**

```
Asia Pacific Region (Parent)
├── Philippines Operations
│   ├── Manila IT Department
│   └── Manila HR Department
└── Singapore Operations
    ├── Singapore Finance Department
    └── Singapore Operations Department

Europe Region (Parent)
├── UK Operations
│   ├── London IT Department
│   └── London Finance Department
└── Germany Operations
    ├── Berlin HR Department
    └── Berlin Operations Department
```

## Step 2: Verify Data Was Inserted

Run the verification queries at the bottom of the SQL script to confirm:

```sql
-- Check users
SELECT user_id, email, first_name, last_name FROM public.tblusers 
WHERE email LIKE '%@company.com' ORDER BY email;

-- Check user roles
SELECT u.email, r.role_name, ur.is_active FROM public.tblusers u
INNER JOIN public.tbluserroles ur ON u.user_id = ur.user_id
INNER JOIN public.tblroles r ON ur.role_id = r.role_id
ORDER BY r.role_name, u.first_name;

-- Check organizations
SELECT org_id, org_name, parent_org_id, geo, location FROM public.tblorganization 
ORDER BY org_name;
```

## Step 3: Backend API Endpoints Now Available

The following new endpoints are now available in the backend:

### Organizations
```
GET  /api/organizations/list/all
     → Returns: Array of all organizations

GET  /api/organizations/by-level/list
     → Returns: Organizations grouped by hierarchy level
     → Response: { "0": [...], "1": [...], "2": [...] }
```

### Approvers
```
GET  /api/approvers/list/all
     → Returns: All approvers grouped by level
     → Response: { "L1": [...], "L2": [...], "L3": [...] }

GET  /api/approvers/level/:level
     → Example: /api/approvers/level/L1
     → Returns: Array of L1 approvers only
```

### Users
```
GET  /api/users/get/:userId
     → Returns: User details with their assigned roles
```

## Step 4: Update Frontend Service

Add the following methods to `orbit-frontend/src/services/budgetConfigService.js`:

```javascript
// Fetch all organizations
export const getOrganizations = async (token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/organizations/list/all`, {
      method: 'GET',
      headers: getHeaders(token),
    });
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching organizations:', error);
    throw error;
  }
};

// Fetch approvers by level
export const getApproversByLevel = async (level, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/approvers/level/${level}`, {
      method: 'GET',
      headers: getHeaders(token),
    });
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error(`Error fetching ${level} approvers:`, error);
    throw error;
  }
};

// Fetch all approvers
export const getAllApprovers = async (token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/approvers/list/all`, {
      method: 'GET',
      headers: getHeaders(token),
    });
    const data = await response.json();
    return data.data || { L1: [], L2: [], L3: [] };
  } catch (error) {
    console.error('Error fetching approvers:', error);
    throw error;
  }
};
```

## Step 5: Update Frontend Form Component

Modify `orbit-frontend/src/pages/BudgetRequest.jsx` CreateConfiguration component to:

1. Fetch real organizations on component mount
2. Fetch real approvers on component mount
3. Populate dropdowns/selects with real data
4. Save selected organization and approver IDs when creating budget configuration

### Key Changes in CreateConfiguration:

```javascript
useEffect(() => {
  const fetchData = async () => {
    try {
      const token = localStorage.getItem('authToken') || '';
      
      // Fetch organizations
      const orgsData = await budgetConfigService.getOrganizations(token);
      setOrganizations(orgsData);
      
      // Fetch approvers
      const approversData = await budgetConfigService.getAllApprovers(token);
      setApprovers(approversData);
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching data:', err);
      setLoading(false);
    }
  };
  
  fetchData();
}, []);
```

## Step 6: Update Form Submission

When creating a budget configuration, send:

```javascript
const configData = {
  budget_name: formData.budgetName,
  period_type: formData.period,
  min_limit: parseFloat(formData.minBudget),
  max_limit: parseFloat(formData.maxBudget),
  budget_control: formData.budgetControl,
  carryover_enabled: formData.carryover,
  client_sponsored: formData.clientSponsored,
  budget_description: formData.description,
  
  // Real organization selections
  selected_organizations: formData.organizations, // Array of org_ids
  
  // Real approver selections
  approver_l1_id: formData.approverL1,  // user_id
  approver_l2_id: formData.approverL2,  // user_id
  approver_l3_id: formData.approverL3,  // user_id
  
  // Existing fields
  tenure_groups: formData.tenureGroups,
  access_scopes: formData.scopes,
  
  created_by: user.id,
};
```

## Step 7: Update Backend to Save Real Data

Modify `orbit-backend/src/controllers/budgetConfigController.js` createBudgetConfig:

```javascript
// Process real approver data
const approvers = [
  {
    approval_level: 1,
    primary_approver: configData.approver_l1_id,
    backup_approver: configData.approver_l1_backup_id,
  },
  {
    approval_level: 2,
    primary_approver: configData.approver_l2_id,
    backup_approver: configData.approver_l2_backup_id,
  },
  {
    approval_level: 3,
    primary_approver: configData.approver_l3_id,
    backup_approver: configData.approver_l3_backup_id,
  },
];

// Save organizations as access scopes or in a budget_organizations junction table
const orgScopes = (configData.selected_organizations || []).map(orgId => ({
  scope_type: 'Organization',
  scope_value: orgId,
}));
```

## Testing the Integration

1. **Frontend**: Visit Budget Configuration page and create a new configuration
   - Organization dropdown should show: Asia Pacific Region, Europe Region, Philippines Operations, etc.
   - Approver dropdowns should show: John Smith, Sarah Johnson, Michael Brown (for L1), etc.

2. **Backend**: Check that:
   - POST request includes real user IDs (not names)
   - Organizations are stored in access_scopes or organization junction table
   - Approvers are stored with their user UUIDs

3. **Database**: Verify:
   - tblbudgetconfig_approvers has real user IDs
   - tblbudgetconfig_scopes has organization data
   - All relationships are properly linked

## Troubleshooting

### "No approvers found"
- Check that users have been inserted
- Verify tbluserroles entries exist
- Check role names match exactly (case-sensitive)

### "Organizations not loading"
- Verify tblorganization table has data
- Check SQL query syntax in service
- Ensure Supabase credentials are correct

### Foreign Key Errors
- Verify all referenced UUIDs exist
- Check that parent_org_id references valid org_id
- Ensure user_ids exist before inserting into tbluserroles

## Next Steps

1. Test creating a budget configuration with real data
2. Verify approvers can be selected and saved
3. Implement organization hierarchy display in frontend
4. Add organization multi-select functionality
5. Update approval request system to use real approver data

## Additional Notes

- User emails follow format: firstname.lastname@company.com
- Organizations use UUIDs starting with specific patterns for easy testing
- All timestamps default to current time (NOW())
- All users are set to "Active" status by default
- Roles are linked with is_active = TRUE

For more information, see:
- Database schema: Database migration files
- API documentation: Backend README
- Frontend implementation: BudgetRequest.jsx comments
