# ORBIT Backend - Developer Guide

This document explains the backend architecture and how it aligns with the frontend structure.

## 🎯 Backend Philosophy

The backend follows a **layered architecture pattern**:

```
HTTP Request
    ↓
Routes (API endpoint definition)
    ↓
Controller (Request validation & response)
    ↓
Service (Business logic & database operations)
    ↓
Database (Supabase)
```

This separation ensures:
- ✅ Testability (each layer can be tested independently)
- ✅ Maintainability (changes in one layer don't break others)
- ✅ Reusability (services can be called from multiple controllers)
- ✅ Scalability (easy to add new features)

---

## 📁 Layer Explanations

### 1. Routes Layer (`src/routes/`)

**Responsibility**: Define API endpoints and HTTP methods

**File**: `budgetConfigRoutes.js`

```javascript
router.post('/', BudgetConfigController.createBudgetConfig);
router.get('/', BudgetConfigController.getAllBudgetConfigs);
router.get('/:id', BudgetConfigController.getBudgetConfigById);
```

**When to add**: Whenever you add a new API endpoint

---

### 2. Controller Layer (`src/controllers/`)

**Responsibility**: Handle HTTP requests and responses

**File**: `budgetConfigController.js`

```javascript
static async createBudgetConfig(req, res) {
  // 1. Validate input
  const validation = validateBudgetConfig(req.body);
  
  // 2. Call service
  const result = await BudgetConfigService.createBudgetConfig(configData);
  
  // 3. Send response
  sendSuccess(res, result.data, "Success", 201);
}
```

**Responsibilities**:
- Validate incoming request data
- Call appropriate service methods
- Handle errors gracefully
- Send standardized responses

**When to add**: Whenever you add a new HTTP handler

---

### 3. Service Layer (`src/services/`)

**Responsibility**: Business logic and database operations

**File**: `budgetConfigService.js`

```javascript
static async createBudgetConfig(configData) {
  // 1. Prepare data
  // 2. Call Supabase
  const { data, error } = await supabase
    .from('tblbudgetconfiguration')
    .insert([{ ... }])
    .select();
  
  // 3. Return result
  return { success: true, data: data[0] };
}
```

**Responsibilities**:
- Pure database operations
- Business logic processing
- Error handling and logging
- Return consistent result format

**When to add**: Whenever you need new database operations

---

### 4. Configuration Layer (`src/config/`)

**Responsibility**: Setup and configuration for external services

**Files**:
- `database.js` - Supabase client initialization
- `cors.js` - CORS settings

**When to modify**: When setting up new external services or changing configurations

---

### 5. Middleware Layer (`src/middleware/`)

**Responsibility**: Cross-cutting concerns that apply to multiple routes

**Files**:
- `auth.js` - Authentication & authorization
- `errorHandler.js` - Global error handling

**When to add**: When you need to apply logic across multiple routes

---

### 6. Utils Layer (`src/utils/`)

**Responsibility**: Helper functions and utilities

**Files**:
- `validators.js` - Input validation functions
- `response.js` - Response formatting helpers

**When to add**: When you have reusable utility functions

---

## 🔄 Complete Request Flow Example

### Creating a Budget Configuration

```
1. Frontend sends POST /api/budget-configurations
   {
     "budget_name": "Q1 Bonus",
     "period_type": "Quarterly",
     ...
   }

2. Server receives request → budgetConfigRoutes.js
   → Matches POST / route

3. Route handler → BudgetConfigController.createBudgetConfig()
   → Validates input using validators.validateBudgetConfig()
   → Calls BudgetConfigService.createBudgetConfig()

4. Service → BudgetConfigService
   → Inserts data into Supabase
   → Returns { success: true, data: {...} }

5. Controller → BudgetConfigController
   → Receives result from service
   → Calls sendSuccess(res, data)

6. Response sent to Frontend
   {
     "success": true,
     "message": "Budget configuration created successfully",
     "data": { budget_id, budget_name, ... }
   }
```

---

## 📊 Adding New Features

### Example: Add "Approval" Feature

#### Step 1: Create Service (`src/services/approvalService.js`)

```javascript
export class ApprovalService {
  static async createApproval(approvalData) {
    // Database logic here
    const { data, error } = await supabase
      .from('tblapprovals')
      .insert([approvalData])
      .select();
    
    return { success: !error, data, error };
  }
  
  static async getApprovalsByBudgetId(budgetId) {
    // Database logic here
  }
}
```

#### Step 2: Create Controller (`src/controllers/approvalController.js`)

```javascript
export class ApprovalController {
  static async createApproval(req, res) {
    try {
      const validation = validateApproval(req.body);
      if (!validation.isValid) return sendError(res, validation.errors);
      
      const result = await ApprovalService.createApproval(req.body);
      if (!result.success) return sendError(res, result.error);
      
      sendSuccess(res, result.data, "Approval created", 201);
    } catch (error) {
      sendError(res, error.message, 500);
    }
  }
}
```

#### Step 3: Create Routes (`src/routes/approvalRoutes.js`)

```javascript
import { Router } from 'express';
import { ApprovalController } from '../controllers/approvalController.js';

const router = Router();

router.post('/', ApprovalController.createApproval);
router.get('/:budgetId', ApprovalController.getApprovalsByBudgetId);

export default router;
```

#### Step 4: Register Routes (`src/routes/index.js`)

```javascript
import approvalRoutes from './approvalRoutes.js';

router.use('/approvals', approvalRoutes);
```

Done! Your new feature is integrated.

---

## 🧪 Testing Endpoints

### Using cURL

```bash
# Create
curl -X POST http://localhost:3001/api/budget-configurations \
  -H "Content-Type: application/json" \
  -d '{"budget_name": "Test", "period_type": "Monthly", ...}'

# Read
curl http://localhost:3001/api/budget-configurations

# Update
curl -X PUT http://localhost:3001/api/budget-configurations/uuid \
  -H "Content-Type: application/json" \
  -d '{"budget_name": "Updated"}'

# Delete
curl -X DELETE http://localhost:3001/api/budget-configurations/uuid
```

### Using Postman

1. Import API endpoints
2. Create environment variables for `BACKEND_URL` and `BUDGET_ID`
3. Test each endpoint
4. Verify request/response bodies

---

## 📋 Checklist for Adding New Endpoints

- [ ] Create Service method in `src/services/`
- [ ] Create Controller method in `src/controllers/`
- [ ] Create Routes file in `src/routes/`
- [ ] Register routes in `src/routes/index.js`
- [ ] Add input validators in `src/utils/validators.js`
- [ ] Test with cURL or Postman
- [ ] Update API documentation in README.md
- [ ] Add error handling and logging

---

## 🔐 Security Best Practices

### Authentication

Currently disabled. To implement:

```javascript
// middleware/auth.js
export const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  
  // Verify JWT with Supabase or other provider
  // Set req.user = decoded_token
  
  next();
};

// In routes
router.post('/', authenticateToken, Controller.method);
```

### Input Validation

Always validate in controller before calling service:

```javascript
const validation = validateBudgetConfig(req.body);
if (!validation.isValid) {
  return sendError(res, validation.errors, 400);
}
```

### Error Handling

Use consistent error responses:

```javascript
sendError(res, "User not found", 404);
// Returns:
// {
//   "success": false,
//   "error": "User not found"
// }
```

---

## 📊 Response Format Standards

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { /* actual data */ }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message"
}
```

---

## 🚀 Deployment Considerations

### Environment Variables
- Never commit `.env` with real credentials
- Use `.env.example` as template
- Set production values in deployment platform

### Production Setup
```bash
NODE_ENV=production
PORT=3001
SUPABASE_URL=production_url
SUPABASE_KEY=production_key
FRONTEND_URL=https://yourdomain.com
```

### Database Migrations
- Version control your schema changes
- Test migrations on staging first
- Keep rollback plan ready

---

## 📚 Related Documentation

- [README.md](./README.md) - Full API documentation
- [DATABASE_ANALYSIS.md](./DATABASE_ANALYSIS.md) - Schema issues and solutions
- [QUICKSTART.md](./QUICKSTART.md) - Quick setup guide
- [Frontend Copilot Instructions](../copilot-instructions.md) - Frontend architecture

---

## 🎓 Learning Resources

### Express.js Patterns
- Route handling with Router
- Middleware composition
- Error handling

### Supabase
- Query operations (insert, select, update, delete)
- Row Level Security
- Real-time subscriptions

### API Design
- RESTful principles
- Proper HTTP status codes
- Consistent response format

---

## 💡 Tips & Tricks

### Debugging
```javascript
// Add logging to service
console.log('Creating budget:', configData);
const { data, error } = await supabase...
if (error) console.error('DB Error:', error);
```

### Common Issues

**Supabase connection fails**
- Check SUPABASE_URL and SUPABASE_KEY
- Verify Supabase project is active
- Check network connectivity

**Route not found**
- Ensure route is registered in `src/routes/index.js`
- Check HTTP method (GET, POST, PUT, DELETE)
- Verify path format

**Validation errors**
- Check validator function in utils/validators.js
- Ensure frontend sends required fields
- Log validation errors for debugging

---

## 🔄 Next Development Tasks

1. Implement JWT authentication in middleware
2. Add Approval workflow endpoints
3. Add Dashboard statistics endpoints
4. Implement role-based access control
5. Add audit logging
6. Write unit tests
7. Add API rate limiting
8. Setup CI/CD pipeline

---

**Happy coding! 🚀**

For questions, refer to the code examples and always follow the layered architecture pattern.
