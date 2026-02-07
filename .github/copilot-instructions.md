# ORBIT Thesis - Copilot Instructions

## Project Overview
**ORBIT** (Organizational Request and Budget Intelligence Tool) is a full-stack budget management and approval workflow system with:
- **Frontend**: React 19 + Vite SPA with role-based access control (requestor, l1, l2, l3, payroll)
- **Backend**: Express.js API with Supabase PostgreSQL database
- **Core Domain**: Budget configuration, request submission, multi-level approval workflows

## Architecture & Data Flow

### Frontend Architecture (orbit-frontend)
- **Framework**: React 19 + Vite (HMR) + React Router v7
- **Styling**: Tailwind CSS + OKLCh color system (CSS variables in [src/styles/App.css](src/styles/App.css))
- **UI Components**: Radix UI-based primitives in [src/components/ui/](src/components/ui/)
- **State**: React Context (`useAuth()` hook) - mock auth; replace with backend API
- **Layout**: [DashboardLayout.jsx](src/layouts/DashboardLayout.jsx) wraps all protected routes with sidebar + role-aware navigation

### Backend Architecture (orbit-backend)
- **Framework**: Express.js (ES modules, port 3001)
- **Database**: Supabase PostgreSQL (via `@supabase/supabase-js`)
- **Routing**: Centralized in [src/routes/index.js](src/routes/index.js)
- **MVC Pattern**: Controllers → Services → Database queries
  - **Controllers** [src/controllers/](src/controllers/) - HTTP request handling, validation
  - **Services** [src/services/](src/services/) - Business logic, database operations
  - **Config** [src/config/](src/config/) - Database client, CORS setup
  - **Middleware** [src/middleware/](src/middleware/) - Auth (JWT stub), error handling
  - **Utils** [src/utils/](src/utils/) - Response helpers, validators

### Data Flow
```
Frontend (React) ─axios→ Backend (Express) ─Supabase→ PostgreSQL
  Approval.jsx         POST /api/budget-configurations    tblbudgetconfiguration
  BudgetRequest.jsx    GET  /api/budget-configurations    
```

### API Routes (Backend)
- **Health Check**: `GET /api/health` → `{ status, message, timestamp }`
- **Budget Configs**: `GET/POST/PUT/DELETE /api/budget-configurations` (filtered by name, period, geo, department)
- **Response Format**: All endpoints use `sendSuccess()` / `sendError()` utilities for consistency
  - Success: `{ success: true, data, message, statusCode }`
  - Error: `{ success: false, error, statusCode }`

## Development Workflow

### Frontend Build & Run (orbit-frontend/)
```bash
npm install
npm run dev       # Vite HMR server on http://localhost:5173
npm build         # Production bundle
npm lint          # ESLint
npm preview       # Preview production build
```

### Backend Build & Run (orbit-backend/)
```bash
npm install
npm start         # Node.js on port 3001 (default)
npm run dev       # Nodemon auto-reload on file changes
# PORT=3002 npm run dev  # Custom port via ENV
```

### Environment Setup (Backend)
Create `orbit-backend/.env`:
```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
PORT=3001
```
- Never commit `.env`; use `.env.example` template
- Database client initialized in [src/config/database.js](src/config/database.js)

### Project Structure
```
orbit-frontend/
  src/
    components/
      ui/              # Radix-based UI primitives (Button, Card, Dialog, etc.)
      AuthGuard.jsx    # Route protection; loading/access denied states
      Sidebar.jsx      # Role-aware navigation
      DemoUserSwitcher.jsx  # Dev-only role switcher
      PageHeader.jsx   # Page title component
    context/
      AuthContext.jsx  # Auth state + mock login (replace with API)
    layouts/
      DashboardLayout.jsx  # Main layout with sidebar + gradient background
    pages/
      Dashboard.jsx    # Home with widgets
      Approval.jsx     # Approval workflow + budget configs (3200+ lines)
      BudgetRequest.jsx  # Budget configuration form
      Organization.jsx # Org structure
      Profile.jsx      # User settings
    routes/
      AppRouter.jsx    # Route definitions
    styles/
      App.css          # Tailwind + OKLCh color system
      index.css        # Global styles

orbit-backend/
  src/
    config/
      database.js      # Supabase client initialization
      cors.js          # CORS configuration
    controllers/
      budgetConfigController.js  # HTTP handlers for budget CRUD
    services/
      budgetConfigService.js     # Database queries + business logic
    middleware/
      auth.js          # JWT token validation (stub)
      errorHandler.js  # Centralized error handling
    routes/
      index.js         # Router setup
      budgetConfigRoutes.js  # Budget endpoints
    utils/
      response.js      # sendSuccess/sendError helpers
      validators.js    # Input validation schemas
    index.js           # Express app setup + middleware
```

## Key Patterns & Conventions

### Frontend Component Pattern
- Use `.jsx` extension for all React components
- Import UI components from `../components/ui` (centralized in `index.js`)
- Example:
  ```jsx
  import { Button } from '../components/ui/button';
  import { useAuth } from '../context/AuthContext';
  ```

### Data & State (Frontend)
- **Auth State**: Always check `useAuth()` for current user role before rendering role-specific content
- **Protected Routes**: Use `AuthGuard` wrapper automatically applied in `DashboardLayout`
- **Mock Data**: Budget configs currently hardcoded in `Approval.jsx` (to be replaced with API calls)
- **Loading**: `AuthGuard` handles loading spinner; pages don't need separate loading logic

### UI Component Usage
- All UI components in `src/components/ui/` and re-exported by `index.js`
- Components use Tailwind utility classes + CSS variables (OKLCh color tokens)
- Dialog/Modal pattern: `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`
- Forms: `Input`, `Label`, `Select`, `Textarea` - all styled consistently
- Styling: Tailwind-first with `cn()` utility for class combinations

### Backend Service Pattern (MVC)
- **Controllers** receive HTTP requests, validate input, delegate to services
- **Services** contain business logic and all database operations
- **Validators** in `utils/validators.js` - check required fields and data types before DB writes
- **Response Utility**: Always use `sendSuccess()` or `sendError()` helpers for consistent API responses
  - Example: `sendSuccess(res, data, 'Budget created', 201)`
  - Example: `sendError(res, 'Missing budget_name', 400)`

### Database Conventions (Supabase PostgreSQL)
- Table names: `tbl{EntityName}` (e.g., `tblbudgetconfiguration`)
- Budget config columns: `budget_name`, `min_limit`, `max_limit`, `period_type`, `geo_scope`, `department_scope`, `created_by`, `created_at`
- All timestamps in ISO format via `new Date().toISOString()`
- Queries use Supabase JS client: `await supabase.from('table').select('*')`
- Filters via `ilike()` (case-insensitive), `eq()`, and chainable query builders

### Routing
- Frontend routes in `AppRouter.jsx` with `DashboardLayout` wrapping protected pages
- Backend routes in `src/routes/index.js` - all under `/api` prefix
- Budget config endpoints: `GET/POST/PUT/DELETE /api/budget-configurations` with query filters

## Critical Files
- **Frontend Auth**: [src/context/AuthContext.jsx](src/context/AuthContext.jsx) - Replace mock `setUser` with real API calls
- **Frontend Layout**: [src/layouts/DashboardLayout.jsx](src/layouts/DashboardLayout.jsx) - Background gradients, sidebar integration
- **Frontend Nav**: [src/components/Sidebar.jsx](src/components/Sidebar.jsx) - Role-aware navigation logic
- **Frontend Colors**: [src/styles/App.css](src/styles/App.css) - OKLCh CSS variables (brand colors)
- **Backend Routes**: [orbit-backend/src/routes/index.js](orbit-backend/src/routes/index.js) - API endpoint setup
- **Backend Controller**: [orbit-backend/src/controllers/budgetConfigController.js](orbit-backend/src/controllers/budgetConfigController.js) - CRUD handlers
- **Backend Service**: [orbit-backend/src/services/budgetConfigService.js](orbit-backend/src/services/budgetConfigService.js) - Database logic
- **Backend DB Config**: [orbit-backend/src/config/database.js](orbit-backend/src/config/database.js) - Supabase client

## External Dependencies
- **Frontend**: React 19, Vite, React Router v7, Tailwind CSS, Radix UI, Axios, Lucide Icons, Recharts, Framer Motion
- **Backend**: Express.js, Supabase JS, dotenv, CORS, Helmet
- **DevTools**: ESLint (frontend), Nodemon (backend auto-reload)

## Common Tasks

### Add a New Budget Endpoint
1. Define route in [orbit-backend/src/routes/budgetConfigRoutes.js](orbit-backend/src/routes/budgetConfigRoutes.js)
2. Create controller method in [orbit-backend/src/controllers/budgetConfigController.js](orbit-backend/src/controllers/budgetConfigController.js)
3. Add service method in [orbit-backend/src/services/budgetConfigService.js](orbit-backend/src/services/budgetConfigService.js) with Supabase query
4. Add validator function in [orbit-backend/src/utils/validators.js](orbit-backend/src/utils/validators.js)
5. Return responses using `sendSuccess()` or `sendError()` utilities

### Connect Frontend to Backend API
1. Replace mock data in `Approval.jsx` with API calls using axios
2. Ensure backend `.env` has `SUPABASE_URL`, `SUPABASE_KEY`, `PORT`
3. Update `AuthContext.jsx` to fetch auth via `/api/auth` endpoint (stub: `authenticateToken`)
4. Frontend runs on `http://localhost:5173`, backend on `http://localhost:3001` - CORS already configured

### Add a New Frontend Page
1. Create component in [src/pages/YourPage.jsx](src/pages/YourPage.jsx)
2. Import UI components: `import { Button, Card } from '../components/ui'`
3. Use `useAuth()` to check user role
4. Add route in [src/routes/AppRouter.jsx](src/routes/AppRouter.jsx) wrapped with `DashboardLayout`
5. Add nav item in [src/components/Sidebar.jsx](src/components/Sidebar.jsx) with role guard

### Change Brand Colors
1. Edit OKLCh values in [src/styles/App.css](src/styles/App.css) `:root` section
2. Color tokens: `--color-primary`, `--color-secondary`, `--color-accent`, etc.
3. Test contrast and role-specific themes

## Testing & Debugging
- **Frontend**: `npm run lint` (ESLint), React DevTools browser extension, Vite HMR auto-reload, demo role switcher in top-right
- **Backend**: `npm run dev` (Nodemon), test endpoints via curl/Postman, check `.env` is present before starting
- **Full Stack**: Frontend http://localhost:5173, Backend http://localhost:3001, Health check: `GET /api/health`

## Notes for AI Agents
- **Auth System**: Mock in place - real JWT/Supabase auth integration needed before production (see `auth.js` stub)
- **Database**: Schema already in Supabase - ensure `tblbudgetconfiguration` table exists with correct columns
- **Frontend Integration**: Budget configs in `Approval.jsx` hardcoded - migrate to API calls to `/api/budget-configurations`
- **Large Components**: `Approval.jsx` is 3200+ lines - consider splitting into sub-components when refactoring
- **No Tests**: Jest/Vitest setup recommended for both frontend and backend reliability
