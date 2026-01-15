# Real Data Integration - Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                             │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ CreateConfiguration Component                                │  │
│  │                                                               │  │
│  │  • Fetch organizations on mount → useEffect               │  │
│  │  • Fetch approvers on mount → useEffect                  │  │
│  │  • Display in dropdowns/selects                           │  │
│  │  • Store selected IDs in form state                       │  │
│  │  • Send real IDs on form submission                       │  │
│  │                                                               │  │
│  │  State: [organizations, approvers, formData]              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                            ↓ (fetch)      ↓ (POST)                   │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ budgetConfigService.js                                       │  │
│  │                                                               │  │
│  │  getOrganizations(token)                                     │  │
│  │  getOrganizationsByLevel(token)                             │  │
│  │  getAllApprovers(token)                                     │  │
│  │  getApproversByLevel(level, token)                         │  │
│  │  getUserById(userId, token)                                │  │
│  │  createBudgetConfiguration(configData, token)              │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                 ↓ (HTTP)
┌─────────────────────────────────────────────────────────────────────┐
│                      BACKEND (Node.js/Express)                       │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ budgetConfigRoutes.js                                        │  │
│  │                                                               │  │
│  │  GET  /organizations/list/all                              │  │
│  │  GET  /organizations/by-level/list                         │  │
│  │  GET  /approvers/list/all                                  │  │
│  │  GET  /approvers/level/:level                              │  │
│  │  GET  /users/get/:userId                                   │  │
│  │  POST /                                (create budget config)│  │
│  └──────────────────────────────────────────────────────────────┘  │
│                            ↓                                          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ budgetConfigController.js                                    │  │
│  │                                                               │  │
│  │  getOrganizations() → call service                          │  │
│  │  getOrganizationsByLevel() → call service                  │  │
│  │  getAllApprovers() → call service                          │  │
│  │  getApproversByLevel() → call service                      │  │
│  │  getUserById() → call service                              │  │
│  │  createBudgetConfig() → process real data → call service   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                            ↓                                          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ budgetConfigService.js                                       │  │
│  │                                                               │  │
│  │  getAllOrganizations()                                       │  │
│  │  getOrganizationsByLevel()                                  │  │
│  │  getApproversByLevel(level)                                │  │
│  │  getAllApprovers()                                          │  │
│  │  getUserById(userId)                                        │  │
│  │  createBudgetConfig(configData)                            │  │
│  │   ├─ Process approvers                                      │  │
│  │   ├─ Process organizations as scopes                       │  │
│  │   └─ Save to database                                       │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                 ↓ (SQL)
┌─────────────────────────────────────────────────────────────────────┐
│                     DATABASE (PostgreSQL/Supabase)                   │
│                                                                       │
│  ┌─────────────────┐    ┌──────────────────┐  ┌─────────────────┐  │
│  │   tblusers      │    │   tblroles       │  │ tblorganization │  │
│  ├─────────────────┤    ├──────────────────┤  ├─────────────────┤  │
│  │ user_id (PK)    │    │ role_id (PK)     │  │ org_id (PK)     │  │
│  │ email           │    │ role_name        │  │ org_name        │  │
│  │ first_name      │    │ description      │  │ parent_org_id   │  │
│  │ last_name       │    │                  │  │ geo             │  │
│  │ department      │    │ L1_APPROVER      │  │ location        │  │
│  │ status          │    │ L2_APPROVER      │  │                 │  │
│  │                 │    │ L3_APPROVER      │  │ (Hierarchical)  │  │
│  └────────┬────────┘    └──────────────────┘  └─────────────────┘  │
│           │                       ↑                                   │
│           │                       │                                   │
│  ┌────────↓──────────────────────┘─────────────────────────────┐   │
│  │              tbluserroles (Junction)                          │   │
│  ├───────────────────────────────────────────────────────────────┤   │
│  │ user_role_id (PK)                                            │   │
│  │ user_id (FK) → tblusers.user_id                             │   │
│  │ role_id (FK) → tblroles.role_id                             │   │
│  │ is_active                                                     │   │
│  │ assigned_at                                                   │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │  tblbudgetconfiguration & Related Tables                     │   │
│  ├───────────────────────────────────────────────────────────────┤   │
│  │ budget_id, budget_name, period_type, etc.                   │   │
│  │                                                               │   │
│  │ tblbudgetconfig_approvers:                                  │   │
│  │  • approval_level                                            │   │
│  │  • primary_approver (user_id → tblusers)                   │   │
│  │  • backup_approver (user_id → tblusers)                    │   │
│  │                                                               │   │
│  │ tblbudgetconfig_scopes:                                     │   │
│  │  • scope_type (Geo, Location, Client, Organization)       │   │
│  │  • scope_value (UUID or string)                            │   │
│  └───────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow Example

### Scenario: Creating a Budget Configuration

```
1. USER OPENS FORM
   └─ Frontend: CreateConfiguration component mounts
      └─ Call useEffect hooks

2. FETCH DROPDOWN DATA
   └─ Frontend: budgetConfigService.getOrganizations()
      └─ HTTP GET: /api/organizations/list/all
         └─ Backend: BudgetConfigController.getOrganizations()
            └─ Backend: BudgetConfigService.getAllOrganizations()
               └─ DB Query: SELECT * FROM tblorganization
                  └─ Response: [org1, org2, org3, ...]
                     └─ Frontend: setOrganizations(data)
                        └─ Dropdown renders with org options

   └─ Frontend: budgetConfigService.getAllApprovers()
      └─ HTTP GET: /api/approvers/list/all
         └─ Backend: BudgetConfigController.getAllApprovers()
            └─ Backend: BudgetConfigService.getAllApprovers()
               └─ DB Query: JOIN tblusers, tbluserroles, tblroles
                  └─ Filter by role_name IN ('L1_APPROVER', 'L2_APPROVER', 'L3_APPROVER')
                     └─ Response: { L1: [...], L2: [...], L3: [...] }
                        └─ Frontend: setApprovers(data)
                           └─ Dropdowns render with approver options

3. USER SELECTS AND SUBMITS
   └─ Frontend: Collects form data including:
      ├─ selectedOrganizations: ["org_id1", "org_id2"]
      ├─ approver_l1_id: "user_id1"
      ├─ approver_l2_id: "user_id2"
      ├─ approver_l3_id: "user_id3"
      └─ Other budget fields...

4. SEND TO BACKEND
   └─ Frontend: budgetConfigService.createBudgetConfiguration(configData, token)
      └─ HTTP POST: /api/budget-configurations
         └─ Body: { ...configData with real IDs }

5. PROCESS AND SAVE
   └─ Backend: BudgetConfigController.createBudgetConfig()
      └─ Process approver data:
         ├─ Create tblbudgetconfig_approvers records
         ├─ approval_level: 1, primary_approver: user_id1
         ├─ approval_level: 2, primary_approver: user_id2
         └─ approval_level: 3, primary_approver: user_id3

      └─ Process organization data:
         ├─ Create tblbudgetconfig_scopes records
         ├─ scope_type: 'Organization'
         ├─ scope_value: org_id1
         └─ scope_value: org_id2

      └─ Backend: BudgetConfigService.createBudgetConfig()
         └─ INSERT into tblbudgetconfiguration
         └─ INSERT into tblbudgetconfig_approvers (3 records)
         └─ INSERT into tblbudgetconfig_scopes (multiple records)
         └─ Response: { success: true, data: {...} }

6. CONFIRMATION
   └─ Frontend: Receives response
      └─ Success toast: "Budget configuration created successfully!"
      └─ Form resets or navigates away
```

## Table Relationships

```
tblorganization
│
├─ 2 Parent Organizations (Asia Pacific, Europe)
│  └─ 4 Child Organizations (Philippines, Singapore, UK, Germany)
│     └─ 4 Grandchild Organizations (Departments)
└─ (Self-referencing: parent_org_id → org_id)


tblusers (9 records)
│
├─ 3 L1 Approvers
├─ 3 L2 Approvers
└─ 3 L3 Approvers
   │
   └─ tbluserroles (9 records)
      │
      └─ tblroles (predefined)
         ├─ L1_APPROVER
         ├─ L2_APPROVER
         └─ L3_APPROVER


tblbudgetconfiguration
│
├─ tblbudgetconfig_approvers
│  └─ primary_approver (→ tblusers.user_id)
│  └─ backup_approver (→ tblusers.user_id)
│
├─ tblbudgetconfig_scopes
│  ├─ scope_type: 'Organization' → scope_value: org_id
│  ├─ scope_type: 'Geo' → scope_value: geography
│  └─ scope_type: 'Client' → scope_value: client_name
│
├─ tblbudgetconfig_tenure_groups
│  └─ Tenure group associations
│
└─ tblbudgetconfig_budget_tracking
   └─ Budget usage history
```

## API Endpoints Map

```
Organization Endpoints:
  GET /api/organizations/list/all
      └─ Returns: [{ org_id, org_name, parent_org_id, geo, location }]
      └─ Use: Populate organization selects/dropdowns

  GET /api/organizations/by-level/list
      └─ Returns: { "0": [...parents], "1": [...children], "2": [...grandchildren] }
      └─ Use: Build hierarchical tree view

Approver Endpoints:
  GET /api/approvers/list/all
      └─ Returns: { "L1": [...], "L2": [...], "L3": [...] }
      └─ Use: Show all approvers grouped by level

  GET /api/approvers/level/L1
  GET /api/approvers/level/L2
  GET /api/approvers/level/L3
      └─ Returns: [{ user_id, email, first_name, last_name, full_name, role_name }]
      └─ Use: Populate specific level dropdown

User Endpoints:
  GET /api/users/get/{userId}
      └─ Returns: { user_id, email, first_name, last_name, tbluserroles: [...] }
      └─ Use: Get user details when needed

Budget Configuration Endpoints:
  POST /api/budget-configurations
      └─ Body: configData with real IDs
      └─ Returns: Created configuration
      └─ Use: Save budget with real approvers and organizations
```

## Files & Their Roles

```
DATABASE SETUP:
  sql/users_organizations_data.sql
  ├─ INSERT 9 users into tblusers
  ├─ INSERT 9 role assignments into tbluserroles
  └─ INSERT 10 organizations into tblorganization

BACKEND SERVICES:
  src/services/budgetConfigService.js (+5 methods)
  ├─ getAllOrganizations()
  ├─ getOrganizationsByLevel()
  ├─ getApproversByLevel(level)
  ├─ getAllApprovers()
  ├─ getUserById(userId)
  └─ Modified: createBudgetConfig() (process real data)

BACKEND CONTROLLERS:
  src/controllers/budgetConfigController.js (+5 methods)
  ├─ getOrganizations()
  ├─ getOrganizationsByLevel()
  ├─ getApproversByLevel()
  ├─ getAllApprovers()
  ├─ getUserById()
  └─ Modified: createBudgetConfig() (handle real data)

BACKEND ROUTES:
  src/routes/budgetConfigRoutes.js (+5 routes)
  ├─ GET /organizations/list/all
  ├─ GET /organizations/by-level/list
  ├─ GET /approvers/list/all
  ├─ GET /approvers/level/:level
  └─ GET /users/get/:userId

FRONTEND SERVICES:
  src/services/budgetConfigService.js (+5 functions)
  ├─ getOrganizations(token)
  ├─ getOrganizationsByLevel(token)
  ├─ getApproversByLevel(level, token)
  ├─ getAllApprovers(token)
  └─ getUserById(userId, token)

FRONTEND COMPONENTS:
  src/pages/BudgetRequest.jsx (CreateConfiguration)
  ├─ Add: Fetch organizations on mount
  ├─ Add: Fetch approvers on mount
  ├─ Add: Organization select/multiselect
  ├─ Add: L1/L2/L3 Approver selects
  └─ Modify: Form submission (send real IDs)

DOCUMENTATION:
  REAL_DATA_INTEGRATION_SUMMARY.md
  ├─ Complete overview of implementation
  ├─ All API endpoints documented
  ├─ Troubleshooting guide
  └─ Testing procedures

  SETUP_REAL_DATA_GUIDE.md
  ├─ Detailed database setup instructions
  ├─ SQL script execution steps
  ├─ Verification queries
  └─ Integration checklist

  FRONTEND_REAL_DATA_IMPLEMENTATION.md
  ├─ Step-by-step frontend guide
  ├─ Component modifications
  ├─ API integration examples
  └─ Testing checklist

  REAL_DATA_QUICK_START.md
  ├─ Quick reference guide
  ├─ Essential code snippets
  └─ Common issues & fixes
```

## Status Summary

✅ **COMPLETED**
- SQL insert script created (9 users, 10 organizations)
- Backend service methods added (5 new methods)
- Backend controller methods added (5 new endpoints)
- Backend routes registered (5 new routes)
- Frontend service functions added (5 new API calls)
- All backend code verified (no errors)
- All frontend service code verified (no errors)
- Comprehensive documentation created (4 guides)

🔄 **IN PROGRESS - NEXT PHASE**
- Frontend component integration (add dropdowns)
- Frontend form submission (send real IDs)
- Backend form processing (process real approvers/organizations)
- End-to-end testing

⏭️ **FUTURE PHASES**
- Hierarchical org tree view
- Organization search/filter
- Approver search by department
- Department-based approver routing
- User LDAP/AD sync
