# ORBIT Thesis - Copilot Instructions

## Project Overview
**ORBIT** (Organizational Request and Budget Intelligence Tool) is a full-stack budget management and approval workflow system.

| Component | Tech Stack | Port | Status |
|-----------|-----------|------|--------|
| **Frontend** | React 19 + Vite + React Router v7 | 5173 | ✅ Active |
| **Backend** | Express.js (ES modules) + Supabase PostgreSQL | 3001 | ✅ Active |
| **Auth** | JWT + bcrypt + OTP (email-based) | — | ✅ Full implementation |
| **Real-time** | WebSocket Server | 3002 | ✅ Implemented |
| **Admin** | Multi-role dashboard (requestor, L1-L3, payroll, admin) | — | ✅ Full RBAC |

**Core Features**: Budget configuration, multi-level approval workflows, organizational hierarchy (OU) management, user management, vendor rewards tracking.

## Quick Start

### Frontend
```bash
cd orbit-frontend
npm install
npm run dev          # http://localhost:5173
npm build            # Production build
npm lint             # ESLint
```

### Backend
```bash
cd orbit-backend
npm install
npm run dev          # Nodemon auto-reload (http://localhost:3001)
npm start            # Production
# PORT=3002 npm run dev  # Custom port via ENV
```

**Environment Setup** - Create `orbit-backend/.env`:
```
SUPABASE_URL=your_url
SUPABASE_KEY=your_anon_key
JWT_SECRET=your_secret_key
PORT=3001
```

## Architecture Overview

### Frontend Structure (orbit-frontend/src)
```
components/         # Radix UI-based + Tailwind
├── ui/             # Button, Card, Dialog, Input, etc.
├── Sidebar.jsx     # Role-aware navigation
├── DemoUserSwitcher.jsx  # Dev role switcher
└── AuthGuard.jsx   # Route protection
context/            # AuthContext - JWT + localStorage
layouts/
├── DashboardLayout.jsx   # Protected route wrapper + gradient bg
pages/
├── Login.jsx, ForgotPassword.jsx, SecurityQuestions.jsx, etc.
├── Dashboard.jsx, BudgetRequest.jsx, Approval.jsx, Organization.jsx, Profile.jsx
└── admin/          # AdminDashboard, AdminOUManagement, AdminUserManagement, AdminLogs
routes/
└── AppRouter.jsx   # React Router v7 routes
services/           # API integration
├── budgetConfigService.js
├── approvalRequestService.js
└── realtimeService.js  # WebSocket client
styles/
├── App.css          # Tailwind + OKLCh color tokens
└── index.css        # Global styles
```

### Backend Structure (orbit-backend/src)
```
config/
├── database.js       # Supabase client
├── cors.js           # CORS middleware
└── email.js          # Email service (Nodemailer)
controllers/          # HTTP request handlers
├── authController.js
├── budgetConfigController.js
└── approvalRequestController.js
services/             # Business logic + DB queries
├── authService.js    # Registration, login, OTP, password reset
├── budgetConfigService.js
└── approvalRequestService.js
middleware/
├── auth.js           # JWT verification
├── errorHandler.js   # Central error handling
├── httpsEnforcement.js  # HTTPS redirect (prod only)
└── rateLimiter.js    # Rate limiting (login: 3/15min, OTP: 3/1min)
routes/
├── index.js          # Route assembly
├── authRoutes.js     # Auth endpoints (/auth/*)
├── budgetConfigRoutes.js  # Budget endpoints
└── approvalRequestRoutes.js  # Approval endpoints
realtime/
└── websocketServer.js  # WebSocket upgrades + broadcasting
utils/
├── response.js       # sendSuccess/sendError helpers
├── authValidators.js # Password strength, email format
└── userMapping.js    # User UUID ↔ email lookups
migrations/           # Database migration scripts
seeds/                # Seed data
```

## Key Data Models

### Core Tables (Supabase PostgreSQL)
| Table | Purpose | Key Columns |
|-------|---------|------------|
| `tblusers` | Regular users | id, email, password_hash, first_name, last_name, role, department, is_active, created_at |
| `tbladminusers` | Admin users | (similar to tblusers) |
| `tblorganizationalunits` | Organization hierarchy | id, ou_name, parent_id, status, user_count, created_at |
| `tblbudgetconfiguration` | Budget rules | budget_id, budget_name, min_limit, max_limit, budget_control, currency, pay_cycle, geo, location, access_ou, affected_ou, tenure_group, created_by, created_at |
| `tblbudgetconfig_approvers` | Multi-level approvers | id, budget_id, approval_level, primary_approver (uuid), backup_approver, created_at |
| `tblbudgetconfig_tenure_groups` | Budget tenure rules | (budget-specific tenure filtering) |
| `tblapprovalrequests` | User budget requests | request_id, user_id, budget_id, amount, status (pending/approved/rejected), submitted_at, approved_at |
| `tblsupporttickets` | Support requests | id, user_id, subject, description, status, created_at |

## Authentication Flow

### Multi-Level Login Process
1. **User Login** → `POST /auth/login` (email + password)
   - Validate password against `password_hash` (bcrypt)
   - Generate OTP (6-digit), store in `otp_tokens` table
   - Send OTP via email (Nodemailer)

2. **OTP Verification** → `POST /auth/complete-login` (email + otp)
   - Validate OTP against database (1-time use)
   - Generate JWT token (24-hour expiry)
   - Return user object + token
   - Token stored in localStorage: `localStorage.authToken`

3. **Session Restoration** → `AuthContext` on app load
   - Check localStorage for `authToken`
   - If present, auto-restore user session
   - All protected routes wrapped with `<AuthGuard requireAuth>`

### Additional Auth Features
- **OTP Rate Limiting**: 3 attempts per 1 minute
- **Login Rate Limiting**: 3 attempts per 15 minutes
- **Password Reset**: Security questions → email link → password change
- **First-Time Login**: New users set password on first login
- **Password Expiry**: 90 days, enforced at login

## API Routes

### Authentication (`/api/auth/`)
```
POST   /auth/register           Create new user account
POST   /auth/login              Initiate login (generates OTP)
POST   /auth/complete-login     Verify OTP + return JWT
POST   /auth/forgot-password    Start password reset flow
POST   /auth/reset-password     Complete password reset
POST   /auth/change-password    Change password (auth required)
POST   /auth/first-time-password  Set password on first login
POST   /auth/verify-token       Validate JWT token
POST   /auth/verify-otp         Standalone OTP verification
POST   /auth/resend-otp         Resend OTP to email
POST   /auth/security-questions Save security questions
POST   /auth/verify-security-answers  Verify security answers
GET    /auth/user/:userId       Get user details
POST   /auth/support-ticket     Create support request
POST   /auth/user-agreement     Accept user agreement
```

### Budget Config (`/api/budget-configurations/`)
```
GET    /                        List all configs (filters: name, period, geo, department)
POST   /                        Create config + approvers + tenure groups
GET    /:budgetId               Get config details
PUT    /:budgetId               Update config
DELETE /:budgetId               Delete config
GET    /:budgetId/approvers     Get approvers for config
POST   /:budgetId/approvers     Add/update approver
```

### Approval Requests (`/api/approval-requests/`)
```
GET    /                        List requests (filters: user, status, budget)
POST   /                        Submit budget request
GET    /:requestId              Get request details
PUT    /:requestId              Update request status (approval workflow)
POST   /:requestId/approve      Approve request (L1/L2/L3)
POST   /:requestId/reject       Reject request
```

### Health Check
```
GET    /api/health              { status, message, timestamp }
```

**Response Format** (all endpoints):
- Success: `{ success: true, data, message, statusCode: 200 }`
- Error: `{ success: false, error, statusCode: 400|500 }`

## Code Patterns & Conventions

### 🔑 Frontend Patterns

#### Component Structure
```jsx
// All React components use .jsx extension
// Import UI components from centralized index
import { Button, Card, Dialog, DialogContent } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

export default function MyPage() {
  const { user } = useAuth();  // Always check user role
  
  // Protected routes automatically wrapped by DashboardLayout + AuthGuard
  // No need to handle loading/auth checks manually
  return (
    <Card>
      {user?.role === 'admin' && <AdminSection />}
    </Card>
  );
}
```

#### API Calls Pattern (Frontend Services)
```javascript
// orbit-frontend/src/services/budgetConfigService.js
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

export const budgetConfigService = {
  listConfigs: async (filters = {}) => {
    const response = await axios.get(`${API_URL}/budget-configurations`, {
      params: filters  // name, period, geo, department
    });
    return response.data;  // { success, data, message }
  },
  
  createConfig: async (configData) => {
    const response = await axios.post(`${API_URL}/budget-configurations`, configData);
    return response.data;
  }
};
```

#### State & Auth
- **AuthContext** ([orbit-frontend/src/context/AuthContext.jsx](orbit-frontend/src/context/AuthContext.jsx)): Provides `useAuth()` hook
- User object stored in `localStorage.authUser` and `localStorage.authToken`
- Auto-restoration on page refresh via useEffect in AuthContext
- No need for manual session management on protected pages

#### Styling
- Tailwind-first utility classes
- OKLCh color tokens defined in [src/styles/App.css](src/styles/App.css)
- Example: `className="bg-primary text-white px-4 py-2 rounded"`
- Use `cn()` utility for conditional classes: `cn('px-4', isActive && 'bg-blue-500')`

### 🛡️ Backend Patterns

#### Controller Pattern
```javascript
// Controllers validate input, delegate to services
// orbit-backend/src/controllers/budgetConfigController.js
import { BudgetConfigService } from '../services/budgetConfigService.js';
import { sendSuccess, sendError } from '../utils/response.js';

export class BudgetConfigController {
  static async createBudgetConfig(req, res) {
    try {
      const { budget_name, min_limit, max_limit } = req.body;
      
      // Validate required fields
      if (!budget_name) {
        return sendError(res, 'Missing budget_name', 400);
      }
      
      // Delegate to service
      const result = await BudgetConfigService.createBudgetConfig({
        ...req.body,
        created_by: req.user.id  // From auth middleware
      });
      
      return sendSuccess(res, result.data, 'Budget created', 201);
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }
}
```

#### Service Pattern (Database Operations)
```javascript
// Services contain ALL business logic & DB queries
// orbit-backend/src/services/budgetConfigService.js
import supabase from '../config/database.js';

export class BudgetConfigService {
  static async createBudgetConfig(configData) {
    try {
      // Insert main config
      const { data: budgetData } = await supabase
        .from('tblbudgetconfiguration')
        .insert([{ ...configData }])
        .select();
      
      const budget_id = budgetData[0].budget_id;
      
      // Insert related approvers if provided
      if (configData.approvers?.length > 0) {
        await supabase
          .from('tblbudgetconfig_approvers')
          .insert(
            configData.approvers.map(a => ({
              budget_id,
              approval_level: a.approval_level,
              primary_approver: a.primary_approver
            }))
          );
      }
      
      // Return complete config with approvers
      return { success: true, data: budgetData[0] };
    } catch (error) {
      throw error;
    }
  }
}
```

#### Middleware Chain
```javascript
// orbit-backend/src/index.js
app.use(enforceHTTPS);        // Redirect HTTP→HTTPS (prod)
app.use(securityHeaders);     // Security headers
app.use(helmet());            // Helmet security
app.use(corsMiddleware);      // CORS config
app.use(apiLimiter);          // Global rate limiting
app.use(express.json());      // Body parsing
app.use('/api', apiRoutes);   // API routes
app.use(errorHandler);        // Error handler (last)
```

#### Supabase Query Pattern
```javascript
// Supabase JS client chaining patterns
const { data, error } = await supabase
  .from('tblusers')
  .select('id, email, role')  // Only select needed columns
  .eq('email', email)         // WHERE email = email
  .ilike('name', 'john%')     // Case-insensitive LIKE
  .order('created_at', { ascending: false })
  .limit(10)
  .single();  // Expect single row, throws if none/multiple

if (error) throw error;
```

#### Response Helpers (Consistency)
```javascript
// All endpoints use these helpers for consistency
import { sendSuccess, sendError } from '../utils/response.js';

// Success response
return sendSuccess(res, { id: 123, name: 'Budget' }, 'Created', 201);
// Returns: { success: true, data: {...}, message: 'Created', statusCode: 201 }

// Error response  
return sendError(res, 'Invalid email', 400);
// Returns: { success: false, error: 'Invalid email', statusCode: 400 }
```

### 🔐 Authentication Implementation

#### JWT Token Handling
```javascript
// Backend generates JWT (24-hour expiry)
const token = jwt.sign(
  { userId: user.id, email: user.email, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '24h' }
);

// Frontend stores: localStorage.authToken
// Frontend uses: Authorization: Bearer <token> in axios headers
axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
```

#### Password Security
```javascript
// bcrypt hashing with salt rounds = 12
const hashedPassword = await bcrypt.hash(password, 12);

// Verification
const isMatch = await bcrypt.compare(password, storedHash);
```

#### OTP Flow
```javascript
// Backend generates 6-digit OTP, stores with expiry (5 minutes)
// Sends via email (Nodemailer configured in config/email.js)
// Frontend submits OTP → Backend verifies + deletes OTP token
// Rate limiting enforced: 3 attempts per 1 minute
```

## Common Development Tasks

### Add a New Backend Endpoint
1. Create route handler in [orbit-backend/src/routes/budgetConfigRoutes.js](orbit-backend/src/routes/budgetConfigRoutes.js)
   ```javascript
   router.post('/custom-action', BudgetConfigController.customAction);
   ```
2. Add controller method in [orbit-backend/src/controllers/budgetConfigController.js](orbit-backend/src/controllers/budgetConfigController.js)
   ```javascript
   static async customAction(req, res) {
     // Validate, delegate to service, return with sendSuccess/sendError
   }
   ```
3. Add service method in [orbit-backend/src/services/budgetConfigService.js](orbit-backend/src/services/budgetConfigService.js)
   ```javascript
   static async customAction(data) {
     // Supabase queries here
     const { data: result } = await supabase.from('table').insert(...);
     return result;
   }
   ```
4. Add validators in [orbit-backend/src/utils/authValidators.js](orbit-backend/src/utils/authValidators.js) if needed

### Add a New Frontend Page
1. Create component in [orbit-frontend/src/pages/YourPage.jsx](orbit-frontend/src/pages/)
   ```jsx
   import { useAuth } from '../context/AuthContext';
   import { Button } from '../components/ui';
   
   export default function YourPage() {
     const { user } = useAuth();
     return <div>Your content here</div>;
   }
   ```
2. Add route in [orbit-frontend/src/routes/AppRouter.jsx](orbit-frontend/src/routes/AppRouter.jsx)
   ```jsx
   <Route path="/your-page" element={<DashboardLayout><YourPage /></DashboardLayout>} />
   ```
3. Add nav item in [orbit-frontend/src/components/Sidebar.jsx](orbit-frontend/src/components/Sidebar.jsx)
   ```jsx
   {user?.role === 'admin' && <NavItem to="/your-page" label="Your Page" />}
   ```

### Connect API Call in Frontend
```javascript
// In a React component
import { budgetConfigService } from '../services/budgetConfigService';

const MyComponent = () => {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    (async () => {
      setLoading(true);
      const response = await budgetConfigService.listConfigs();
      if (response.success) {
        setConfigs(response.data);
      }
      setLoading(false);
    })();
  }, []);
  
  return <div>{/* Render configs */}</div>;
};
```

### Debug Authentication Issues
```javascript
// Frontend: Check localStorage
console.log(localStorage.authToken);      // JWT token
console.log(localStorage.authUser);       // User object JSON

// Backend: Check JWT middleware
// Middleware extracts token from Authorization header
// If missing/invalid → 401 error (see auth.js)
```

### Change Brand Colors
1. Edit OKLCh values in [orbit-frontend/src/styles/App.css](orbit-frontend/src/styles/App.css)
2. Color tokens: `--color-primary`, `--color-secondary`, `--color-accent` in `:root`
3. Gradients use oklch() with opacity: `oklch(0.42 0.30 330 / 0.4)`
4. Large blurred glows in [DashboardLayout.jsx](orbit-frontend/src/layouts/DashboardLayout.jsx) (pink, yellow, etc.)

## Critical Files Reference

| File | Purpose | Key Patterns |
|------|---------|-------------|
| [orbit-frontend/src/context/AuthContext.jsx](orbit-frontend/src/context/AuthContext.jsx) | Auth state management, localStorage persistence | useAuth() hook, token refresh, session restore |
| [orbit-frontend/src/routes/AppRouter.jsx](orbit-frontend/src/routes/AppRouter.jsx) | Frontend routing | Protected routes + DashboardLayout wrapper |
| [orbit-frontend/src/layouts/DashboardLayout.jsx](orbit-frontend/src/layouts/DashboardLayout.jsx) | Main layout with sidebar + gradients | AuthGuard check, Sidebar navigation, background glows |
| [orbit-frontend/src/components/Sidebar.jsx](orbit-frontend/src/components/Sidebar.jsx) | Role-aware navigation menu | Role checks, active link highlighting |
| [orbit-backend/src/index.js](orbit-backend/src/index.js) | Express app setup, middleware chain | Security headers, CORS, rate limiting |
| [orbit-backend/src/routes/index.js](orbit-backend/src/routes/index.js) | Main route assembly | Auth, budget, approval route mounting |
| [orbit-backend/src/config/database.js](orbit-backend/src/config/database.js) | Supabase client initialization | Connection pooling, error handling |
| [orbit-backend/src/middleware/auth.js](orbit-backend/src/middleware/auth.js) | JWT token verification | Token extraction, validation, user injection |
| [orbit-backend/src/middleware/rateLimiter.js](orbit-backend/src/middleware/rateLimiter.js) | Rate limiting configuration | loginLimiter, otpLimiter, passwordResetLimiter |
| [orbit-backend/src/services/authService.js](orbit-backend/src/services/authService.js) | Auth business logic (1146 lines) | Register, login, OTP, password reset, JWT generation |
| [orbit-backend/src/services/budgetConfigService.js](orbit-backend/src/services/budgetConfigService.js) | Budget CRUD + approvers (1361 lines) | Complex Supabase queries with relationships |
| [orbit-frontend/src/pages/admin/AdminOUManagement.jsx](orbit-frontend/src/pages/admin/AdminOUManagement.jsx) | Organizational unit hierarchy UI | Tree view, expand/collapse, hierarchical OUs |

## Technology Stack

### Frontend
- **React 19** (hooks, context API)
- **Vite 7.x** (HMR, fast builds)
- **React Router v7** (client-side routing)
- **Tailwind CSS 3.4** (utility-first styling) + **OKLCh color system**
- **Radix UI** (accessible component primitives)
- **Axios** (HTTP client)
- **Lucide Icons** (icon library)
- **Recharts** (data visualization)
- **Framer Motion** (animations)
- **xlsx** (Excel file handling)

### Backend
- **Express.js 4.18** (HTTP framework)
- **Supabase JS** (PostgreSQL client)
- **bcrypt 6.0** (password hashing)
- **jsonwebtoken 9.0** (JWT signing/verification)
- **nodemailer 7.0** (email transport)
- **express-rate-limit 8.2** (rate limiting)
- **helmet 7.1** (security headers)
- **ws 8.18** (WebSocket server)
- **dotenv 16.3** (environment variables)
- **nodemon 3.0** (dev auto-reload)

## Important Project Conventions

1. **Naming**: 
   - React components: PascalCase (MyComponent.jsx)
   - Services/utilities: camelCase (userService.js)
   - Database tables: tbl{PascalCase} (tblbudgetconfiguration)

2. **Error Handling**:
   - Frontend: axios error handling + user-friendly messages
   - Backend: sendError() helpers for consistent response format
   - All errors logged to console in development

3. **Validation**:
   - Frontend: Basic format checking (email, required fields)
   - Backend: Comprehensive validation before DB operations
   - Validators in [orbit-backend/src/utils/authValidators.js](orbit-backend/src/utils/authValidators.js)

4. **Rate Limiting**:
   - Login: 3 attempts per 15 minutes
   - OTP verification: 3 attempts per 1 minute
   - Password reset: 3 attempts per 30 minutes
   - Configured in [orbit-backend/src/middleware/rateLimiter.js](orbit-backend/src/middleware/rateLimiter.js)

5. **Timestamps**:
   - All timestamps in ISO format: `new Date().toISOString()`
   - Stored UTC in database, converted client-side if needed

## Debugging & Testing

### Frontend
- **Dev Tools**: React DevTools browser extension, Vite dev overlay
- **Network**: Browser console → Network tab to inspect API calls
- **Mock Data**: Demo role switcher (top-right corner) for testing different roles
- **HMR**: Changes reflect instantly with Vite hot reload
- **Lint**: `npm run lint` to check ESLint errors

### Backend
- **Nodemon**: Auto-restarts on file changes (`npm run dev`)
- **Logging**: Console logs prefixed with `[OPERATION]` for tracing
- **Endpoints**: Test with curl/Postman during development
- **Database**: Check Supabase dashboard for real-time data inspection
- **Rate Limiting**: X-RateLimit-* headers in responses

### Full-Stack Verification
```bash
# Terminal 1: Frontend
cd orbit-frontend && npm run dev     # http://localhost:5173

# Terminal 2: Backend
cd orbit-backend && npm run dev      # http://localhost:3001

# Terminal 3: Test health check
curl http://localhost:3001/api/health  # Should return OK
```

## Known Limitations & Future Work

- **Email Setup**: Nodemailer configured but needs valid SMTP credentials (see [orbit-backend/src/config/email.js](orbit-backend/src/config/email.js))
- **WebSocket**: Infrastructure ready but not yet integrated with UI
- **Tests**: No automated tests; Jest/Vitest setup recommended
- **Approval Routing**: L1/L2/L3 hierarchy rules in database but frontend routing incomplete
- **OU Hierarchy**: AdminOUManagement component has mock data; needs Supabase integration
