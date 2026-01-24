# ORBIT Thesis - Copilot Instructions

## Project Overview
**ORBIT** (Organizational Request and Budget Intelligence Tool) is a full-stack budget management and approval workflow application. **Frontend**: React 19 + Vite SPA with role-based UI. **Backend**: Express.js + Supabase (PostgreSQL) for API and data persistence. **Database**: Normalized schema with budget configs, approval requests, tenure groups, approvers, and organizational units (OUs).

---

## Architecture Overview

### Data Flow
```
Frontend (React Router) → API Service (fetch) → Backend Express → Supabase
  ↓
BudgetRequest.jsx → budgetConfigService.js → POST /api/budget-configurations
  ↓
BudgetConfigController → BudgetConfigService → Supabase tblbudgetconfiguration
```

### Three-Layer Backend Architecture
1. **Routes** (`src/routes/`) - Express router definitions; handle endpoint registration
2. **Controllers** (`src/controllers/`) - Parse requests, validate input, call services
3. **Services** (`src/services/`) - Database operations, business logic, data transformation

Example: `POST /api/budget-configurations` → Controller validates → Service inserts to Supabase → Returns created budget_id

---

## Frontend Architecture (React + Vite)

### Component Hierarchy
```
App.jsx (BrowserRouter)
└─ AuthProvider
   └─ AppRouter
      └─ DashboardLayout (gradient background, protected)
         ├─ Sidebar (role-aware nav)
         ├─ DemoUserSwitcher (dev tool)
         └─ Page (Dashboard, Approval, BudgetRequest, Organization, Profile)
```

### Key Frontend Files
| File | Purpose |
|------|---------|
| `src/context/AuthContext.jsx` | Global auth state; mock user system (roles: requestor, l1, l2, l3, payroll) |
| `src/services/budgetConfigService.js` | API client for budget CRUD; calls `http://localhost:3001/api` |
| `src/components/ui/` | Radix UI-based primitives (Button, Dialog, Select, Input, etc.) |
| `src/pages/BudgetRequest.jsx` | Budget config form; calls service to POST config data |
| `src/styles/App.css` | OKLCh color system (CSS variables); Tailwind directives |
| `src/layouts/DashboardLayout.jsx` | Layout wrapper with gradient overlays |

---

## Backend Architecture (Express + Supabase)

### Three-Tier Pattern
```javascript
// 1. Route: Register endpoint
router.post('/budget-configurations', BudgetConfigController.createBudgetConfig);

// 2. Controller: Validate & orchestrate
export class BudgetConfigController {
  static async createBudgetConfig(req, res) {
    const validation = validateBudgetConfig(req.body);
    const result = await BudgetConfigService.createBudgetConfig(dbData);
    sendSuccess(res, result.data, message, 201);
  }
}

// 3. Service: Execute DB operations
export class BudgetConfigService {
  static async createBudgetConfig(configData) {
    const { data: budgetData } = await supabase
      .from('tblbudgetconfiguration')
      .insert([{ budget_name, min_limit, ... }])
      .select();
    // Insert related tenure_groups, approvers, access_scopes to normalized tables
  }
}
```

### Key Backend Files
| File | Purpose |
|------|---------|
| `src/index.js` | Express app setup; middleware (helmet, cors, bodyParser); mounts routes |
| `src/config/database.js` | Supabase client initialization; exports `supabase` |
| `src/config/cors.js` | CORS middleware; allows `http://localhost:5173` |
| `src/controllers/budgetConfigController.js` | Budget CRUD handlers; validates input; orchestrates service calls |
| `src/services/budgetConfigService.js` | Database layer; inserts to main table + normalized tables (tenure_groups, approvers, access_scopes) |
| `src/utils/validators.js` | Input validation rules for budget configs |
| `src/utils/response.js` | Helper functions `sendSuccess()`, `sendError()` for consistent JSON responses |
| `src/middleware/errorHandler.js` | Global error handler; logs errors; returns error response |

### Database Schema (Supabase PostgreSQL)
```sql
-- Main table
tblbudgetconfiguration (budget_id, budget_name, min_limit, max_limit, period_type, ...)

-- Normalized relationships
tblbudgetconfig_tenure_groups (budget_id, tenure_group)
tblbudgetconfig_approvers (budget_id, approval_level, primary_approver, backup_approver)
tblbudgetconfig_access_scopes (budget_id, geo_scope, location_scope, ou_path, ...)
```

---

## Development Workflow

### Frontend (Vite)
```bash
cd orbit-frontend
npm install
npm run dev          # Runs on http://localhost:5173 with HMR
npm run build        # Production build
npm run lint         # ESLint check
```

### Backend (Express)
```bash
cd orbit-backend
npm install
cp .env.example .env # Add SUPABASE_URL, SUPABASE_KEY, etc.
npm run dev          # Runs on http://localhost:3001 with nodemon (auto-reload)
npm start            # Production mode
```

### Health Check
```bash
curl http://localhost:3001/api/health  # Returns { status: 'OK', timestamp }
```

---

## Key Patterns & Conventions

### Frontend: API Service Pattern
```javascript
// src/services/budgetConfigService.js
const API_BASE_URL = 'http://localhost:3001/api';

const getHeaders = (token) => ({
  'Content-Type': 'application/json',
  ...(token && { 'Authorization': `Bearer ${token}` }),
});

export const createBudgetConfiguration = async (configData, token) => {
  const response = await fetch(`${API_BASE_URL}/budget-configurations`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(configData),
  });
  if (!response.ok) throw new Error(data.error);
  return data.data;
};
```

### Frontend: Component Data Fetching
```jsx
// In BudgetRequest.jsx
import { createBudgetConfiguration } from '../services/budgetConfigService';
import { useAuth } from '../context/AuthContext';

export default function BudgetRequestPage() {
  const { user } = useAuth();
  
  const handleCreateConfig = async (formData) => {
    try {
      const result = await createBudgetConfiguration(formData, localStorage.getItem('authToken'));
      console.log('Budget created:', result.budget_id);
    } catch (error) {
      console.error('Error:', error.message);
    }
  };
}
```

### Backend: Service Helper Methods
```javascript
// In BudgetConfigService
static buildAccessScopesFromConfig(geoArray, locationArray, configData) {
  // Transforms frontend multi-select data into normalized database records
  return scopeRecords;
}

static buildApproversFromConfig(configData) {
  // Converts approver form fields (approverL1, approverL2, etc.) into array of approver objects
  return approverRecords;
}
```

### Backend: Validation Pattern
```javascript
// In validators.js
export function validateBudgetConfig(data) {
  const errors = {};
  if (!data.budgetName) errors.budgetName = 'Budget name required';
  if (!data.period) errors.period = 'Period required';
  return { isValid: Object.keys(errors).length === 0, errors };
}

// In controller
const validation = validateBudgetConfig(configData);
if (!validation.isValid) return sendError(res, validation.errors, 400);
```

### Frontend: Component Pattern
- All components use `.jsx` extension
- Import UI from `../components/ui` (exported by `index.js`)
- Use `useAuth()` for role-based rendering
- Example:
  ```jsx
  import { Button } from '../components/ui/button';
  import { useAuth } from '../context/AuthContext';
  
  export default function MyPage() {
    const { user } = useAuth();
    if (user?.role !== 'l1') return null;
    return <Button>Approve</Button>;
  }
  ```

### Styling (Frontend)
- **Primary approach**: Tailwind utility classes (`flex`, `gap-4`, `text-lg`)
- **Colors**: CSS variables in `src/styles/App.css` (OKLCh notation)
  - `--color-primary`: `oklch(0.55 0.22 250)` (vibrant blue)
  - `--color-accent`: `oklch(0.65 0.28 340)` (hot pink)
- **Combining classes**: Use `cn()` utility: `cn("base", isActive && "highlight")`

### Error Handling (Backend)
```javascript
// All services wrap DB calls in try-catch
try {
  const { data, error } = await supabase.from('table').insert(...);
  if (error) throw error;
  return { success: true, data };
} catch (error) {
  console.error('Error details:', error);
  return { success: false, error: error.message };
}

// Controllers check success before sending response
const result = await Service.method();
if (!result.success) return sendError(res, result.error, 400);
sendSuccess(res, result.data, message, 201);
```

---

## Critical Developer Workflows

### Add New Budget Config Field
1. **Frontend**: Add form field in `BudgetRequest.jsx`; include in `formData` object
2. **Frontend Service**: Update `createBudgetConfiguration()` to pass new field
3. **Backend Validator**: Add validation rule in `validators.js`
4. **Backend Controller**: Log new field; extract to database format (e.g., `budgetName` → `budget_name`)
5. **Backend Service**: Insert field into `tblbudgetconfiguration` table
6. **Database**: Ensure column exists in Supabase table; run migration if needed

### Add New API Endpoint
1. **Backend Route**: Register in `src/routes/approvalRequestRoutes.js` (or create new route file)
   ```javascript
   router.post('/approval-requests', ApprovalRequestController.create);
   ```
2. **Backend Controller**: Create handler method; validate input; call service
3. **Backend Service**: Implement DB logic using Supabase client
4. **Frontend Service**: Create fetch function in `src/services/` directory
5. **Frontend Page**: Import service; call on event (e.g., button click)

### Fix Data Not Displaying on Frontend
1. **Check Network Tab**: Verify API call is being made; check response status
2. **Check Backend Logs**: Look for validation errors or DB errors (see console output when running `npm run dev`)
3. **Verify Supabase Table**: Ensure data exists; check column names match backend insert fields
4. **Check Frontend Service**: Verify response parsing (e.g., `data.data` vs `data.records`)
5. **Check React State**: Use React DevTools to inspect component state; verify data is being set

---

## Environment Setup

### Frontend `.env` (if needed in future)
```env
VITE_API_BASE_URL=http://localhost:3001/api
VITE_AUTH_TOKEN_KEY=authToken
```

### Backend `.env` (REQUIRED for local dev)
```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIs...
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

---

## Notes for AI Agents

**Current State:**
- Frontend auth is mock (hardcoded roles); real integration requires backend auth endpoint
- No JWT verification in backend; add `verifyToken` middleware before production
- Approval request system exists but needs full CRUD implementation
- Large pages (BudgetRequest ~2200 lines) need component decomposition

**Common Gotchas:**
- Frontend calls `localhost:3001`; backend CORS must allow `localhost:5173`
- Supabase client requires URL and API key; missing credentials cause runtime errors
- Database field names use `snake_case` (backend) while frontend form uses `camelCase`; ensure mapping in controller
- Normalized schema requires inserting to multiple tables; service handles this but verify all inserts succeed

**Testing Locally:**
1. Start backend: `cd orbit-backend && npm run dev` (port 3001)
2. Start frontend: `cd orbit-frontend && npm run dev` (port 5173)
3. Test budget creation: Fill form in BudgetRequest page; check browser Network tab for POST request
4. Verify in Supabase: Log into Supabase dashboard; check `tblbudgetconfiguration` for inserted row
