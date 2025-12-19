# ORBIT Backend - Express.js API

Backend server for ORBIT (Organizational Request and Budget Intelligence Tool) built with Express.js and Supabase.

## 📋 Table of Contents

- [Project Structure](#project-structure)
- [Setup Instructions](#setup-instructions)
- [Environment Configuration](#environment-configuration)
- [API Endpoints](#api-endpoints)
- [Database Schema](#database-schema)
- [Development](#development)
- [API Examples](#api-examples)

## 🗂️ Project Structure

```
orbit-backend/
├── src/
│   ├── config/              # Configuration files
│   │   ├── database.js      # Supabase client setup
│   │   └── cors.js          # CORS configuration
│   ├── routes/              # API route definitions
│   │   ├── index.js         # Main router
│   │   └── budgetConfigRoutes.js  # Budget config routes
│   ├── controllers/         # Request handlers
│   │   └── budgetConfigController.js
│   ├── services/            # Business logic
│   │   └── budgetConfigService.js
│   ├── middleware/          # Express middleware
│   │   ├── auth.js          # Authentication middleware
│   │   └── errorHandler.js  # Error handling
│   ├── utils/               # Utility functions
│   │   ├── validators.js    # Input validation
│   │   └── response.js      # Response helpers
│   └── index.js             # Server entry point
├── .env.example             # Environment variables template
├── package.json             # Dependencies
└── README.md               # This file
```

## 🚀 Setup Instructions

### Prerequisites

- Node.js 16+
- npm or yarn
- Supabase account with ORBIT database

### Installation

1. **Install dependencies**

```bash
cd orbit-backend
npm install
```

2. **Create environment file**

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

3. **Configure environment variables**

Edit `.env`:

```env
# Supabase
SUPABASE_URL=your_supabase_url_here
SUPABASE_KEY=your_supabase_key_here

# Server
PORT=3001
NODE_ENV=development

# Frontend
FRONTEND_URL=http://localhost:5173
```

### Running the Server

**Development Mode** (with auto-reload):

```bash
npm run dev
```

**Production Mode**:

```bash
npm start
```

The server will start on `http://localhost:3001`

## 🔧 Environment Configuration

### Variables Required

| Variable | Description | Example |
|----------|-------------|---------|
| `SUPABASE_URL` | Supabase project URL | `https://xxxxx.supabase.co` |
| `SUPABASE_KEY` | Supabase anon key | `eyJhbGciOiJIUzI1NiIs...` |
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment | `development` or `production` |
| `FRONTEND_URL` | Frontend origin for CORS | `http://localhost:5173` |

## 📡 API Endpoints

### Budget Configuration Endpoints

Base path: `/api/budget-configurations`

#### 1. Create Budget Configuration
- **Method**: `POST`
- **Endpoint**: `/`
- **Auth**: Required (with user_id)
- **Request Body**:

```json
{
  "budget_name": "Q1 2024 Performance Bonus",
  "period_type": "Quarterly",
  "min_limit": 1000,
  "max_limit": 10000,
  "budget_control": true,
  "carryover_enabled": false,
  "client_sponsored": false,
  "geo_scope": "Philippines",
  "location_scope": "Manila",
  "department_scope": "IT Department",
  "created_by": "user-uuid-here"
}
```

**Response** (201 Created):

```json
{
  "success": true,
  "message": "Budget configuration created successfully",
  "data": {
    "budget_id": "uuid",
    "budget_name": "Q1 2024 Performance Bonus",
    "period_type": "Quarterly",
    "min_limit": 1000,
    "max_limit": 10000,
    "budget_control": true,
    "carryover_enabled": false,
    "created_by": "user-uuid",
    "created_at": "2024-12-19T10:30:00Z"
  }
}
```

#### 2. Get All Budget Configurations
- **Method**: `GET`
- **Endpoint**: `/`
- **Query Parameters** (optional):
  - `name`: Filter by budget name (partial match)
  - `period`: Filter by period type (Monthly, Quarterly, Semi-Annual, Yearly)
  - `geo`: Filter by geo scope
  - `department`: Filter by department scope

**Response** (200 OK):

```json
{
  "success": true,
  "message": "Budget configurations retrieved successfully",
  "data": [
    {
      "budget_id": "uuid",
      "budget_name": "Q1 2024 Performance Bonus",
      "period_type": "Quarterly",
      ...
    }
  ]
}
```

#### 3. Get Budget Configuration by ID
- **Method**: `GET`
- **Endpoint**: `/:id`
- **Parameters**: `id` (budget_id UUID)

**Response** (200 OK):

```json
{
  "success": true,
  "message": "Budget configuration retrieved successfully",
  "data": {
    "budget_id": "uuid",
    "budget_name": "Q1 2024 Performance Bonus",
    ...
  }
}
```

#### 4. Update Budget Configuration
- **Method**: `PUT`
- **Endpoint**: `/:id`
- **Parameters**: `id` (budget_id UUID)
- **Request Body**: Same as create (all fields optional)

**Response** (200 OK):

```json
{
  "success": true,
  "message": "Budget configuration updated successfully",
  "data": { ... }
}
```

#### 5. Delete Budget Configuration
- **Method**: `DELETE`
- **Endpoint**: `/:id`
- **Parameters**: `id` (budget_id UUID)

**Response** (200 OK):

```json
{
  "success": true,
  "message": "Budget configuration deleted successfully",
  "data": {}
}
```

#### 6. Get Configurations by User
- **Method**: `GET`
- **Endpoint**: `/user/:userId`
- **Parameters**: `userId` (user UUID)

**Response** (200 OK):

```json
{
  "success": true,
  "message": "User budget configurations retrieved successfully",
  "data": [...]
}
```

## 🗄️ Database Schema

### Table: `tblbudgetconfiguration`

```sql
create table public.tblbudgetconfiguration (
  budget_id uuid not null default gen_random_uuid(),
  budget_name text not null,
  min_limit numeric null,
  max_limit numeric null,
  budget_control boolean null default false,
  carryover_enabled boolean null default false,
  client_sponsored boolean null default false,
  period_type text null,
  geo_scope text null,
  location_scope text null,
  department_scope text null,
  created_by uuid not null,
  created_at timestamp with time zone null default now(),
  updated_by uuid null,
  updated_at timestamp with time zone null,
  constraint tblbudgetconfiguration_pkey primary key (budget_id),
  constraint tblbudgetconfiguration_created_by_fkey 
    foreign key (created_by) references tblusers (user_id),
  constraint tblbudgetconfiguration_updated_by_fkey 
    foreign key (updated_by) references tblusers (user_id),
  constraint tblbudgetconfiguration_period_type_check 
    check (period_type = any(array['Monthly'::text, 'Quarterly'::text, 
           'Semi-Annual'::text, 'Yearly'::text]))
)
```

### Field Descriptions

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `budget_id` | UUID | NO | Primary key, auto-generated |
| `budget_name` | TEXT | NO | Name of the budget configuration |
| `min_limit` | NUMERIC | YES | Minimum limit per transaction |
| `max_limit` | NUMERIC | YES | Maximum limit per transaction |
| `budget_control` | BOOLEAN | YES | Enable budget control (default: false) |
| `carryover_enabled` | BOOLEAN | YES | Enable budget carryover (default: false) |
| `client_sponsored` | BOOLEAN | YES | Client-sponsored budget (default: false) |
| `period_type` | TEXT | YES | Period: Monthly, Quarterly, Semi-Annual, Yearly |
| `geo_scope` | TEXT | YES | Geographic scope (e.g., Philippines) |
| `location_scope` | TEXT | YES | Specific location (e.g., Manila) |
| `department_scope` | TEXT | YES | Department scope (e.g., IT Department) |
| `created_by` | UUID | NO | User ID who created this config |
| `created_at` | TIMESTAMP | YES | Creation timestamp |
| `updated_by` | UUID | YES | User ID who last updated |
| `updated_at` | TIMESTAMP | YES | Last update timestamp |

## 🛠️ Development

### Project Architecture

- **Service Layer**: `services/` - Contains business logic and database operations
- **Controller Layer**: `controllers/` - HTTP request handlers
- **Routes Layer**: `routes/` - API endpoint definitions
- **Middleware**: `middleware/` - Authentication, error handling
- **Config**: `config/` - Database and CORS setup
- **Utils**: `utils/` - Validators, response helpers

### Code Style

- Use ES6 modules (`import`/`export`)
- Use async/await for asynchronous operations
- Consistent error handling with try-catch
- Validate all input data
- Return standardized response format

### Adding New Endpoints

1. **Create a service** in `services/` with database logic
2. **Create a controller** in `controllers/` with HTTP handlers
3. **Create routes** in `routes/` with Express Router
4. **Add to main router** in `routes/index.js`

Example:

```javascript
// 1. Service (services/myService.js)
export class MyService {
  static async getData() { ... }
}

// 2. Controller (controllers/myController.js)
export class MyController {
  static async getHandler(req, res) { ... }
}

// 3. Routes (routes/myRoutes.js)
router.get('/', MyController.getHandler);

// 4. Add to main router (routes/index.js)
router.use('/my-endpoint', myRoutes);
```

## 📚 API Examples

### Create Budget Configuration

```bash
curl -X POST http://localhost:3001/api/budget-configurations \
  -H "Content-Type: application/json" \
  -d '{
    "budget_name": "Q1 2024 Performance Bonus",
    "period_type": "Quarterly",
    "min_limit": 1000,
    "max_limit": 10000,
    "budget_control": true,
    "geo_scope": "Philippines",
    "location_scope": "Manila",
    "department_scope": "IT Department",
    "created_by": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

### Get All Budget Configurations

```bash
curl http://localhost:3001/api/budget-configurations
```

### Get with Filters

```bash
curl "http://localhost:3001/api/budget-configurations?period=Quarterly&department=IT%20Department"
```

### Get by ID

```bash
curl http://localhost:3001/api/budget-configurations/550e8400-e29b-41d4-a716-446655440000
```

### Update Budget Configuration

```bash
curl -X PUT http://localhost:3001/api/budget-configurations/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -d '{
    "budget_name": "Q1 2024 Updated Bonus",
    "max_limit": 15000,
    "updated_by": "550e8400-e29b-41d4-a716-446655440001"
  }'
```

### Delete Budget Configuration

```bash
curl -X DELETE http://localhost:3001/api/budget-configurations/550e8400-e29b-41d4-a716-446655440000
```

## 🔐 Security Notes

- All endpoints should validate input data
- Authentication middleware should be implemented for protected endpoints
- Use Supabase Row Level Security (RLS) for additional security
- Never commit `.env` file with real credentials
- Use HTTPS in production
- Implement rate limiting for production

## 📝 Next Steps

1. Implement authentication middleware (validate JWT tokens)
2. Add Approval routes and workflow logic
3. Add Approval history and audit logs
4. Implement Dashboard statistics endpoints
5. Add Organization management endpoints
6. Implement role-based access control (RBAC)
7. Add request validation middleware
8. Add unit and integration tests

## 🤝 Contributing

Follow the existing code structure and style when adding new features. Ensure all endpoints have proper error handling and input validation.

## 📄 License

ISC
