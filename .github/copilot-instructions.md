# ORBIT Thesis - Copilot Instructions

## Project Overview
**ORBIT** (Organizational Request and Budget Intelligence Tool) is a React-based budget management and approval workflow application. The frontend is a Vite + React SPA with role-based access control (requestor, l1, l2, l3, payroll).

## Architecture & Data Flow

### App Structure
- **Framework**: React 19 + Vite (HMR enabled) + React Router v7
- **Styling**: Tailwind CSS + OKLCh color system (stored in `src/styles/App.css`)
- **UI Library**: Custom Radix UI-based components in `src/components/ui/`
- **State Management**: React Context (`AuthContext` in `src/context/AuthContext.jsx`)

### Core Component Hierarchy
```
App.jsx (BrowserRouter wrapper)
  └─ AuthProvider (context wraps all routes)
      └─ AppRouter (defines all routes)
          └─ DashboardLayout (protected routes)
              ├─ Sidebar (collapsible, role-aware navigation)
              ├─ DemoUserSwitcher (dev-only role switcher)
              └─ Page Component (Dashboard, Approval, BudgetRequest, Organization, Profile)
```

### Authentication & Authorization
- **Context**: `useAuth()` hook provides `{ user, setUser, login, logout, loading }`
- **Current**: Mock user system with hardcoded roles - replace with API when ready
- **Protection**: `AuthGuard` component blocks unauthenticated access; wraps all protected routes
- **Roles**: `'requestor'`, `'l1'`, `'l2'`, `'l3'`, `'payroll'` - passed to `Sidebar` for conditional nav items
- **Storage**: Auth token cleared via `localStorage.removeItem('authToken')` on logout

### Color System (OKLCh)
All colors defined as CSS variables in `src/styles/App.css` using oklch() notation:
- **Primary**: Vibrant blue (`oklch(0.55 0.22 250)`)
- **Secondary**: Coral/salmon (`oklch(0.7 0.15 25)`)
- **Accent**: Hot pink (`oklch(0.65 0.28 340)`)
- **Warning**: Yellow (`oklch(0.85 0.18 85)`)
- **Background**: Off-white (`oklch(0.98 0.002 264)`)

Background uses gradient overlays with blur effects in `DashboardLayout` for visual depth.

## Development Workflow

### Build & Run
```bash
# Install dependencies
npm install

# Development server with HMR
npm run dev       # Runs on http://localhost:5173

# Production build
npm build

# Lint code
npm lint          # ESLint with React plugin rules

# Preview production build
npm preview
```

### Project Structure
```
orbit-frontend/
  src/
    components/
      ui/              # Radix-based UI primitives (Button, Card, Dialog, etc.)
      AuthGuard.jsx    # Protects routes; shows loading/access denied states
      Sidebar.jsx      # Role-aware collapsible navigation
      DemoUserSwitcher.jsx  # Dev tool to switch roles
      PageHeader.jsx   # Reusable page title component
      icons.jsx        # Lucide icon re-exports
    context/
      AuthContext.jsx  # Global auth state + mock login/logout
    layouts/
      DashboardLayout.jsx  # Main layout wrapping protected pages
    pages/
      Dashboard.jsx    # Home page with widgets/overview
      Approval.jsx     # Approval workflow (3200+ lines, centralized budget configs)
      BudgetRequest.jsx  # Budget configuration form
      Organization.jsx # Org structure management
      Profile.jsx      # User profile & settings
    routes/
      AppRouter.jsx    # Route definitions with layout wrapping
    styles/
      App.css          # Tailwind directives + CSS variables (OKLCh)
      index.css        # Global styles
    utils/
      cn.js            # classname utility (clsx-style)
      types.js         # Type constants/definitions
    context/
      AuthContext.jsx  # Auth state & mock data
```

## Key Patterns & Conventions

### Component Pattern
- Use `.jsx` extension for all React components
- Import UI components from `../components/ui` (centralized in `index.js`)
- Example:
  ```jsx
  import { Button } from '../components/ui/button';
  import { useAuth } from '../context/AuthContext';
  ```

### Data & State
- **Mock Data**: In `Approval.jsx`, budget configs hardcoded in `budgetConfigurations` object (lines ~40+)
- **Auth State**: Always check `useAuth()` for current user role before rendering role-specific content
- **Loading**: `AuthGuard` handles loading spinner; pages don't need separate loading logic

### UI Component Usage
- All UI components are in `src/components/ui/` and re-exported by `index.js`
- Components use Tailwind utility classes + CSS variables
- Dialog/Modal pattern: Use `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription` from `dialog.jsx`
- Forms: Use `Input`, `Label`, `Select`, `Textarea` - all styled consistently

### Styling Approach
- Tailwind-first: Use utility classes (`flex`, `gap-4`, `text-lg`, etc.)
- Color tokens: Reference CSS variables (`text-primary`, `bg-secondary`, `border-border`)
- Custom styles via `cn()` utility when combining classes: `cn("base-class", isActive && "active-class")`
- Gradient backgrounds: Use inline `style` prop with oklch gradient strings

### Routing
- Routes defined in `AppRouter.jsx` with DashboardLayout wrapping
- Protected routes automatically wrapped with `AuthGuard` inside `DashboardLayout`
- Navigation via React Router `useNavigate()` or `<Link>` components
- Demo role switcher in top-right for testing different role permissions

## Critical Files
- `src/context/AuthContext.jsx` - Auth state; replace mock `setUser` with real API
- `src/layouts/DashboardLayout.jsx` - Layout structure; background gradients configured here
- `src/components/Sidebar.jsx` - Navigation logic; add/remove items per role
- `src/styles/App.css` - Color theme; update oklch values to change brand colors
- `src/pages/Approval.jsx` - Largest page; contains budget workflow logic

## External Dependencies
- **React Router**: Navigation & route protection
- **Axios**: HTTP client (imported but may not be actively used yet)
- **Lucide React**: Icon library (imported as `components/icons.jsx`)
- **Recharts**: Charts/graphs (available for dashboard)
- **Framer Motion**: Animations (available, minimal usage)
- **Radix UI**: Headless UI primitives (Dialog, Select, Dropdown)
- **Tailwind CSS**: Utility CSS framework

## Common Tasks

### Add a New Page
1. Create component in `src/pages/YourPage.jsx`
2. Import UI components from `../components/ui/`
3. Use `useAuth()` to access user role
4. Add route in `AppRouter.jsx` wrapped with `DashboardLayout`
5. Add navigation item in `Sidebar.jsx` if visible to certain roles

### Update Auth System
1. Replace mock user in `AuthContext.jsx` `useEffect` with API call
2. Update `login()` function to call backend endpoint
3. Store token in `localStorage` or secure cookie
4. Update `AuthGuard` if needed for new loading/error states

### Add UI Component
1. Create in `src/components/ui/ComponentName.jsx` based on Radix UI pattern
2. Export from `src/components/ui/index.js`
3. Use Tailwind + CSS variables for styling
4. Import in pages via `../components/ui/component-name`

### Change Brand Colors
1. Update oklch values in `src/styles/App.css` (`:root` section)
2. Ensure sufficient contrast for accessibility
3. Test with different role/theme states

## Testing & Debugging
- ESLint configured: `npm run lint`
- React DevTools browser extension recommended
- Vite HMR updates components instantly on save
- Demo user switcher in top-right for quick role testing
- Check browser console for mock API warnings

## Notes for AI Agents
- Mock auth system in place—real API integration needed before production
- Budget configs in `Approval.jsx` are centralized; consider moving to a data file if scaling
- Large Approval page (3200 lines) may need refactoring into sub-components
- No database integration yet; all data in-memory
- No tests configured—Jest/Vitest setup recommended for reliability
