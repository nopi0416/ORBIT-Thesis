# ORBIT Thesis - Copilot Instructions

## Big Picture
- Main runtime apps are `orbit-frontend` (React + Vite) and `orbit-backend` (Express + Supabase).
- `v0/` and `v0-OU/` are separate Next.js prototypes; do not change them unless the task explicitly targets them.
- Backend API composition is centralized in `orbit-backend/src/routes/index.js` with domain routes: `/auth`, `/budget-configurations`, `/approval-requests`, `/admin`, `/ai`.
- Frontend calls REST via `VITE_API_URL || '/api'` and receives realtime updates over `/ws` (`orbit-frontend/src/services/realtimeService.js`).
- Core business flows: OTP auth + JWT session, budget configuration, approval workflow, admin user management, and AI insights.

## Dev Workflow (verified)
- Backend dev server: `cd orbit-backend && npm run dev` (nodemon, default port `3001`).
- Frontend dev server: `cd orbit-frontend && npm run dev` (Vite port `5173`).
- Frontend proxy is already wired in `orbit-frontend/vite.config.js`: `/api -> http://localhost:3001`, `/ws -> ws://localhost:3001`.
- Health endpoint: `GET /api/health` (`orbit-backend/src/index.js`).
- Backend `npm test` is a placeholder; validate with focused API/UI flows instead of expecting automated test coverage.

## Environment & Integrations
- Required backend env: `SUPABASE_URL`, `SUPABASE_KEY`, `JWT_SECRET` (`orbit-backend/src/config/database.js`, `orbit-backend/src/middleware/auth.js`).
- Optional/feature envs: `PORT`, `FRONTEND_URL` (CORS allowlist), `EMAIL_USER`, `EMAIL_PASSWORD`, `OPENROUTER_API_KEY`, `SUPABASE_URL2`, `SUPABASE_KEY2`.
- External integrations: Supabase (`@supabase/supabase-js`), Gmail SMTP via Nodemailer (`orbit-backend/src/config/email.js`), OpenRouter for AI (`orbit-backend/src/services/aiInsightsService.js`).

## Backend Conventions
- Preserve `route -> controller -> service` layering; examples: `src/routes/budgetConfigRoutes.js`, `src/controllers/budgetConfigController.js`, `src/services/budgetConfigService.js`.
- Keep response shape consistent using `sendSuccess` / `sendError` from `orbit-backend/src/utils/response.js`.
- Most approval workflow endpoints are nested under `/api/approval-requests/:id/*` (line-items, approvals, attachments, activity).
- Realtime changes are broadcast from controllers via `broadcast(...)` (`approvalRequestController`, `budgetConfigController`) through `src/realtime/websocketServer.js`.
- Middleware order in `orbit-backend/src/index.js` is deliberate (HTTPS/security headers/helmet/CORS/parser/routes/error handler); avoid reordering unless required.

## Frontend Conventions
- App root composition is `BrowserRouter` + `AuthProvider` + `ToastProvider` in `orbit-frontend/src/App.jsx`.
- Auth/session source of truth is `orbit-frontend/src/context/AuthContext.jsx` (OTP login flow, token verification, localStorage keys `authToken` and `authUser`).
- Role gating is string-based (`includes('admin')`) in `src/routes/AppRouter.jsx` and `src/components/Sidebar.jsx`.
- API service modules mainly use `fetch` in `src/services/*`; `AuthContext` uses `axios`. Follow the style already used in the file you edit.

## High-Impact Edit Rules
- Backend feature work usually requires coordinated updates in route + controller + service (not only one layer).
- Frontend feature work usually requires coordinated updates in route map (`AppRouter.jsx`), navigation (`Sidebar.jsx`), and relevant `src/services/*` calls.
- For approval/budget state transitions, check both REST behavior and websocket event emission/consumption to prevent stale dashboards.
