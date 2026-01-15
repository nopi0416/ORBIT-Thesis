# Real Data Integration - Quick Start Guide

## TL;DR - What You Need to Do

### 1. Database Setup (5 minutes)
```
1. Open Supabase or your database client
2. Go to SQL Editor
3. Open: orbit-backend/sql/users_organizations_data.sql
4. Copy and execute all INSERT statements
5. Done! You now have 9 users and 10 organizations
```

### 2. Test Backend (2 minutes)
```bash
# Using Postman or curl:
GET http://localhost:3001/api/organizations/list/all
GET http://localhost:3001/api/approvers/list/all
GET http://localhost:3001/api/approvers/level/L1

# Should all return data if database setup worked
```

### 3. Update Frontend (30 minutes)
Edit: `orbit-frontend/src/pages/BudgetRequest.jsx`

Add to CreateConfiguration component:

**Step A: Add state**
```javascript
const [organizations, setOrganizations] = useState([]);
const [approvers, setApprovers] = useState({ L1: [], L2: [], L3: [] });
const [dataLoading, setDataLoading] = useState(false);
```

**Step B: Add useEffect to fetch data**
```javascript
useEffect(() => {
  const fetchData = async () => {
    try {
      const token = localStorage.getItem('authToken') || '';
      const orgs = await budgetConfigService.getOrganizations(token);
      const apps = await budgetConfigService.getAllApprovers(token);
      setOrganizations(orgs);
      setApprovers(apps);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };
  fetchData();
}, []);
```

**Step C: Add dropdowns in form**
```jsx
{/* Organizations */}
<Select>
  <SelectTrigger>
    <SelectValue placeholder="Select Organization" />
  </SelectTrigger>
  <SelectContent>
    {organizations.map(org => (
      <SelectItem key={org.org_id} value={org.org_id}>
        {org.org_name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>

{/* L1 Approver */}
<Select>
  <SelectTrigger>
    <SelectValue placeholder="Select L1 Approver" />
  </SelectTrigger>
  <SelectContent>
    {approvers.L1?.map(a => (
      <SelectItem key={a.user_id} value={a.user_id}>
        {a.full_name} ({a.email})
      </SelectItem>
    ))}
  </SelectContent>
</Select>

{/* Repeat for L2 and L3 */}
```

**Step D: Update form submission**
```javascript
// In handleSubmit, add to configData:
approver_l1_id: formData.approverL1,
approver_l2_id: formData.approverL2,
approver_l3_id: formData.approverL3,
selected_organizations: formData.selectedOrganizations,
```

### 4. Test Frontend (5 minutes)
1. Go to Budget Configuration → Create Configuration
2. Organizations dropdown should show real organizations
3. Approver dropdowns should show real users with emails
4. Submit and check browser console for data

## What Got Created

### SQL Data
- 9 Users (3 per approval level)
- 10 Organizations (hierarchical)
- All roles automatically assigned

### Backend API Endpoints
```
GET /api/organizations/list/all          → Get all organizations
GET /api/organizations/by-level/list     → Get by hierarchy level
GET /api/approvers/list/all              → Get all approvers by level
GET /api/approvers/level/:level          → Get specific level approvers
GET /api/users/get/:userId               → Get user with roles
```

### Frontend Functions
```javascript
budgetConfigService.getOrganizations(token)
budgetConfigService.getOrganizationsByLevel(token)
budgetConfigService.getAllApprovers(token)
budgetConfigService.getApproversByLevel(level, token)
budgetConfigService.getUserById(userId, token)
```

## Users Created

| Name | Email | Level |
|------|-------|-------|
| John Smith | john.smith@company.com | L1 |
| Sarah Johnson | sarah.johnson@company.com | L1 |
| Michael Brown | michael.brown@company.com | L1 |
| Emily Davis | emily.davis@company.com | L2 |
| Robert Wilson | robert.wilson@company.com | L2 |
| Jennifer Martinez | jennifer.martinez@company.com | L2 |
| David Anderson | david.anderson@company.com | L3 |
| Lisa Taylor | lisa.taylor@company.com | L3 |
| James Thomas | james.thomas@company.com | L3 |

## Organizations Created

```
✓ Asia Pacific Region
  ✓ Philippines Operations
    ✓ Manila IT Department
    ✓ Manila HR Department
  ✓ Singapore Operations
    ✓ Singapore Finance Department
    ✓ Singapore Operations Department

✓ Europe Region
  ✓ UK Operations
    ✓ London IT Department
    ✓ London Finance Department
  ✓ Germany Operations
    ✓ Berlin HR Department
    ✓ Berlin Operations Department
```

## Verification Checklist

- [ ] Database has 9 users (SELECT COUNT(*) FROM tblusers WHERE email LIKE '%@company.com')
- [ ] Database has 10 organizations (SELECT COUNT(*) FROM tblorganization)
- [ ] API returns organizations: GET /api/organizations/list/all
- [ ] API returns approvers: GET /api/approvers/list/all
- [ ] Frontend loads without errors
- [ ] Organizations dropdown shows data
- [ ] Approver dropdowns show data
- [ ] Can create budget configuration with real selections

## Common Issues & Quick Fixes

**Q: No organizations showing in frontend**
A: Check browser console → Network tab → verify API returns 200 and has data

**Q: "approvers.L1 is undefined" error**
A: Make sure useEffect sets approvers state before rendering, add null check:
```javascript
{approvers.L1?.map(...)}  // Use optional chaining
```

**Q: API returns 401 Unauthorized**
A: Check token is valid and sent in Authorization header

**Q: SQL execution fails**
A: Check all UUIDs are valid format, check for duplicate email/employee_id

**Q: Dropdown shows "[object Object]"**
A: Make sure SelectItem has correct value and label structure

## Files to Read for More Details

1. **REAL_DATA_INTEGRATION_SUMMARY.md** - Complete overview
2. **SETUP_REAL_DATA_GUIDE.md** - Detailed database setup
3. **FRONTEND_REAL_DATA_IMPLEMENTATION.md** - Detailed frontend guide
4. **users_organizations_data.sql** - Actual data to insert

## Backend Files Updated

✓ budgetConfigService.js - Added 5 methods
✓ budgetConfigController.js - Added 5 endpoints
✓ budgetConfigRoutes.js - Added 5 routes

## Frontend Files Updated

✓ budgetConfigService.js - Added 5 API functions

## Documentation Files Created

✓ users_organizations_data.sql - SQL data script
✓ SETUP_REAL_DATA_GUIDE.md - Database guide
✓ FRONTEND_REAL_DATA_IMPLEMENTATION.md - Frontend guide
✓ REAL_DATA_INTEGRATION_SUMMARY.md - Complete summary
✓ REAL_DATA_QUICK_START.md - This file

## Next? 

After frontend integration complete:
1. Test end-to-end flow
2. Verify data saves to database correctly
3. Test with different user roles
4. Add hierarchical org display (tree view)
5. Implement org search functionality
