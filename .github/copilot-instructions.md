# ORBIT Thesis - Copilot Instructions

## Big Picture
- This repo is a two-app setup: `orbit-frontend` (React + Vite) and `orbit-backend` (Express + Supabase).
- Frontend talks to backend REST on `http://localhost:3001/api`; backend also upgrades WebSocket connections on `/ws` from the same HTTP server.
- Core domains are auth (OTP + JWT), budget configuration, approval workflow, admin management, and AI insights.
- API composition is centralized in `orbit-backend/src/routes/index.js` (`/auth`, `/budget-configurations`, `/approval-requests`, `/admin`, `/ai`).

## Dev Workflow (what actually works here)
- Frontend: `cd orbit-frontend && npm run dev` (Vite default `5173`).
- Backend: `cd orbit-backend && npm run dev` (nodemon on `3001` by default).
- Health check: `GET /api/health` from `orbit-backend/src/index.js`.
- Backend `npm test` is a placeholder; rely on targeted endpoint/UI validation instead of expecting a test suite.

## Environment & External Dependencies
- Required backend envs: `SUPABASE_URL`, `SUPABASE_KEY`, `JWT_SECRET`.
- Frequently used optional envs: `PORT`, `FRONTEND_URL`, `EMAIL_USER`, `EMAIL_PASSWORD`, `OPENROUTER_API_KEY`, `SUPABASE_URL2`, `SUPABASE_KEY2`.
- Env usage references: `orbit-backend/src/config/database.js`, `orbit-backend/src/config/cors.js`, `orbit-backend/src/config/email.js`, `orbit-backend/src/services/aiInsightsService.js`.

## Backend Patterns (follow these)
- Keep the `route -> controller -> service` split:
  - Routes: request mapping/auth middleware
  - Controllers: request validation + HTTP shaping
  - Services: Supabase queries and business logic
- Use shared response helpers from `orbit-backend/src/utils/response.js` (`sendSuccess` / `sendError`) for consistency.
- Most approval endpoints are nested resources under `/api/approval-requests/:id/*` (line-items, approvals, attachments, activity).
- Real-time updates are emitted via `broadcast(...)` from `orbit-backend/src/realtime/websocketServer.js` (e.g., approval state changes).

## Frontend Patterns (follow these)
- App composition is `BrowserRouter` + `AuthProvider` + `ToastProvider` in `orbit-frontend/src/App.jsx`.
- Auth/session source of truth is `orbit-frontend/src/context/AuthContext.jsx`:
  - login is OTP-based (`/auth/login` then `/auth/complete-login`)
  - session uses `localStorage` keys like `authToken` and `authUser`
- Route structure is in `orbit-frontend/src/routes/AppRouter.jsx`; admin gating uses role string checks (`includes('admin')`).
- Sidebar navigation is role-aware in `orbit-frontend/src/components/Sidebar.jsx`; update routes and sidebar together.

## Project-Specific Conventions
- Frontend services currently mix `fetch` and `axios`; keep the existing style of the file you edit (don’t refactor globally unless asked).
- API base URL is hardcoded in service files as `http://localhost:3001/api`; keep this consistent with existing services.
- Backend auth/rate limiting/security middleware order in `orbit-backend/src/index.js` is intentional; avoid reordering casually.
- AI insights endpoints require auth (`/api/ai/insights`, `/api/ai/insights/latest`, `/api/ai/metrics`) and depend on OpenRouter when configured.

## When Adding Features
- Backend feature: update route + controller + service together, and preserve helper-based response shape.
- Frontend feature: wire page route in `AppRouter.jsx`, role visibility in `Sidebar.jsx`, and API calls in `src/services/*`.
- If touching approval workflow, check both REST handlers and WebSocket event emissions to avoid stale dashboard states.
