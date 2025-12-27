# Backend API Reference - Budget Configuration

This document provides complete API reference for the budget configuration endpoints after the database schema normalization.

## Base URL
```
http://localhost:3000/api
```

---

## 1. Budget Configuration Endpoints

### 1.1 Create Budget Configuration
**POST** `/budget-configurations`

Creates a new budget configuration with related tenure groups, approvers, and access scopes.

**Request Body:**
```json
{
  "budget_name": "Q1 2025 Operations",
  "min_limit": 10000,
  "max_limit": 100000,
  "budget_control": true,
  "carryover_enabled": true,
  "client_sponsored": false,
  "period_type": "Quarterly",
  "geo_scope": "North America",
  "location_scope": "New York",
  "department_scope": "Engineering",
  "created_by": "user-uuid-here",
  "tenure_groups": ["Senior", "Mid-Level", "Junior"],
  "approvers": [
    {
      "approval_level": 1,
      "primary_approver": "approver-1-uuid",
      "backup_approver": "backup-1-uuid"
    },
    {
      "approval_level": 2,
      "primary_approver": "approver-2-uuid",
      "backup_approver": null
    }
  ],
  "access_scopes": [
    {
      "scope_type": "organizational_unit",
      "scope_value": "Engineering-NYC"
    },
    {
      "scope_type": "cost_center",
      "scope_value": "CC-12345"
    }
  ]
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "budget_id": "123e4567-e89b-12d3-a456-426614174000",
    "budget_name": "Q1 2025 Operations",
    "min_limit": "10000",
    "max_limit": "100000",
    "budget_control": true,
    "carryover_enabled": true,
    "client_sponsored": false,
    "period_type": "Quarterly",
    "geo_scope": "North America",
    "location_scope": "New York",
    "department_scope": "Engineering",
    "created_by": "user-uuid-here",
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": null,
    "tenure_groups": [
      {
        "config_tenure_id": "tenure-uuid-1",
        "budget_id": "123e4567-e89b-12d3-a456-426614174000",
        "tenure_group": "Senior",
        "created_at": "2025-01-15T10:30:00Z"
      }
    ],
    "approvers": [
      {
        "approver_id": "approver-uuid-1",
        "budget_id": "123e4567-e89b-12d3-a456-426614174000",
        "approval_level": 1,
        "primary_approver": "approver-1-uuid",
        "backup_approver": "backup-1-uuid",
        "created_at": "2025-01-15T10:30:00Z"
      }
    ],
    "access_scopes": [
      {
        "scope_id": "scope-uuid-1",
        "budget_id": "123e4567-e89b-12d3-a456-426614174000",
        "scope_type": "organizational_unit",
        "scope_value": "Engineering-NYC",
        "created_at": "2025-01-15T10:30:00Z"
      }
    ]
  },
  "message": "Budget configuration created successfully"
}
```

---

### 1.2 Get All Budget Configurations
**GET** `/budget-configurations`

Retrieves all budget configurations with optional filters.

**Query Parameters:**
- `name` (optional): Filter by budget name (partial match)
- `period` (optional): Filter by period type (Monthly, Quarterly, Semi-Annual, Yearly)
- `geo` (optional): Filter by geographic scope
- `department` (optional): Filter by department scope

**Example:**
```
GET /budget-configurations?period=Quarterly&department=Engineering
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "budget_id": "123e4567-e89b-12d3-a456-426614174000",
      "budget_name": "Q1 2025 Operations",
      "period_type": "Quarterly",
      "tenure_groups": [...],
      "approvers": [...],
      "access_scopes": [...]
    }
  ],
  "message": "Budget configurations retrieved successfully"
}
```

---

### 1.3 Get Budget Configuration by ID
**GET** `/budget-configurations/:id`

Retrieves a single budget configuration with all related data.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "budget_id": "123e4567-e89b-12d3-a456-426614174000",
    "budget_name": "Q1 2025 Operations",
    "tenure_groups": [...],
    "approvers": [...],
    "access_scopes": [...]
  },
  "message": "Budget configuration retrieved successfully"
}
```

---

### 1.4 Update Budget Configuration
**PUT** `/budget-configurations/:id`

Updates the main budget configuration fields. To update related data, use the specific endpoints for tenure groups, approvers, or access scopes.

**Request Body:**
```json
{
  "budget_name": "Q1 2025 Operations - Updated",
  "max_limit": 150000,
  "budget_control": false,
  "updated_by": "user-uuid-here"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "budget_id": "123e4567-e89b-12d3-a456-426614174000",
    "budget_name": "Q1 2025 Operations - Updated",
    "tenure_groups": [...],
    "approvers": [...],
    "access_scopes": [...]
  },
  "message": "Budget configuration updated successfully"
}
```

---

### 1.5 Delete Budget Configuration
**DELETE** `/budget-configurations/:id`

Deletes a budget configuration and all related records (cascade delete).

**Response (200):**
```json
{
  "success": true,
  "data": {},
  "message": "Budget configuration deleted successfully"
}
```

---

### 1.6 Get User's Budget Configurations
**GET** `/budget-configurations/user/:userId`

Retrieves all budget configurations created by a specific user.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "budget_id": "123e4567-e89b-12d3-a456-426614174000",
      "budget_name": "Q1 2025 Operations",
      "created_by": "user-uuid-here",
      "tenure_groups": [...],
      "approvers": [...],
      "access_scopes": [...]
    }
  ],
  "message": "User budget configurations retrieved successfully"
}
```

---

## 2. Tenure Groups Endpoints

### 2.1 Get Tenure Groups for a Budget
**GET** `/budget-configurations/:budgetId/tenure-groups`

Retrieves all tenure groups associated with a budget configuration.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "config_tenure_id": "tenure-uuid-1",
      "budget_id": "123e4567-e89b-12d3-a456-426614174000",
      "tenure_group": "Senior",
      "created_at": "2025-01-15T10:30:00Z"
    },
    {
      "config_tenure_id": "tenure-uuid-2",
      "budget_id": "123e4567-e89b-12d3-a456-426614174000",
      "tenure_group": "Mid-Level",
      "created_at": "2025-01-15T10:30:00Z"
    }
  ],
  "message": "Tenure groups retrieved successfully"
}
```

---

### 2.2 Add Tenure Groups to a Budget
**POST** `/budget-configurations/:budgetId/tenure-groups`

Adds one or more tenure groups to an existing budget configuration.

**Request Body:**
```json
{
  "tenure_groups": ["Senior", "Mid-Level", "Junior"]
}
```

**Response (201):**
```json
{
  "success": true,
  "data": [
    {
      "config_tenure_id": "tenure-uuid-1",
      "budget_id": "123e4567-e89b-12d3-a456-426614174000",
      "tenure_group": "Senior",
      "created_at": "2025-01-15T10:30:00Z"
    }
  ],
  "message": "Tenure groups added successfully"
}
```

---

### 2.3 Remove a Tenure Group
**DELETE** `/budget-configurations/tenure-groups/:tenureGroupId`

Removes a specific tenure group from a budget configuration.

**Response (200):**
```json
{
  "success": true,
  "data": {},
  "message": "Tenure group removed successfully"
}
```

---

## 3. Approvers Endpoints

### 3.1 Get Approvers for a Budget
**GET** `/budget-configurations/:budgetId/approvers`

Retrieves all approvers associated with a budget configuration, sorted by approval level.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "approver_id": "approver-uuid-1",
      "budget_id": "123e4567-e89b-12d3-a456-426614174000",
      "approval_level": 1,
      "primary_approver": "approver-1-uuid",
      "backup_approver": "backup-1-uuid",
      "created_by": "user-uuid-here",
      "created_at": "2025-01-15T10:30:00Z",
      "updated_at": null
    },
    {
      "approver_id": "approver-uuid-2",
      "budget_id": "123e4567-e89b-12d3-a456-426614174000",
      "approval_level": 2,
      "primary_approver": "approver-2-uuid",
      "backup_approver": null,
      "created_by": "user-uuid-here",
      "created_at": "2025-01-15T10:30:00Z",
      "updated_at": null
    }
  ],
  "message": "Approvers retrieved successfully"
}
```

---

### 3.2 Set or Update Approver for a Level
**POST** `/budget-configurations/:budgetId/approvers`

Sets or updates an approver for a specific approval level (1-3). If an approver already exists for that level, it's updated; otherwise, it's created.

**Request Body:**
```json
{
  "approval_level": 1,
  "primary_approver": "approver-1-uuid",
  "backup_approver": "backup-1-uuid"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "approver_id": "approver-uuid-1",
    "budget_id": "123e4567-e89b-12d3-a456-426614174000",
    "approval_level": 1,
    "primary_approver": "approver-1-uuid",
    "backup_approver": "backup-1-uuid",
    "created_at": "2025-01-15T10:30:00Z"
  },
  "message": "Approver set successfully"
}
```

**Validation Rules:**
- `approval_level` must be between 1 and 3
- `primary_approver` is required
- `backup_approver` is optional
- Unique constraint: Only one approver per budget per approval level

---

### 3.3 Remove an Approver
**DELETE** `/budget-configurations/approvers/:approverId`

Removes a specific approver from a budget configuration.

**Response (200):**
```json
{
  "success": true,
  "data": {},
  "message": "Approver removed successfully"
}
```

---

## 4. Access Scopes Endpoints

### 4.1 Get Access Scopes for a Budget
**GET** `/budget-configurations/:budgetId/access-scopes`

Retrieves all access scopes associated with a budget configuration.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "scope_id": "scope-uuid-1",
      "budget_id": "123e4567-e89b-12d3-a456-426614174000",
      "scope_type": "organizational_unit",
      "scope_value": "Engineering-NYC",
      "created_by": "user-uuid-here",
      "created_at": "2025-01-15T10:30:00Z"
    },
    {
      "scope_id": "scope-uuid-2",
      "budget_id": "123e4567-e89b-12d3-a456-426614174000",
      "scope_type": "cost_center",
      "scope_value": "CC-12345",
      "created_by": "user-uuid-here",
      "created_at": "2025-01-15T10:30:00Z"
    }
  ],
  "message": "Access scopes retrieved successfully"
}
```

---

### 4.2 Add Access Scope to a Budget
**POST** `/budget-configurations/:budgetId/access-scopes`

Adds a new access scope to a budget configuration. Access scopes define which departments, organizational units, or cost centers can use this budget.

**Request Body:**
```json
{
  "scope_type": "organizational_unit",
  "scope_value": "Engineering-NYC"
}
```

**Common Scope Types:**
- `organizational_unit` - Org unit identifier
- `cost_center` - Cost center code
- `department` - Department name
- `location` - Geographic location
- `client_id` - Client identifier

**Response (201):**
```json
{
  "success": true,
  "data": {
    "scope_id": "scope-uuid-1",
    "budget_id": "123e4567-e89b-12d3-a456-426614174000",
    "scope_type": "organizational_unit",
    "scope_value": "Engineering-NYC",
    "created_by": "user-uuid-here",
    "created_at": "2025-01-15T10:30:00Z"
  },
  "message": "Access scope added successfully"
}
```

---

### 4.3 Remove Access Scope
**DELETE** `/budget-configurations/access-scopes/:scopeId`

Removes a specific access scope from a budget configuration.

**Response (200):**
```json
{
  "success": true,
  "data": {},
  "message": "Access scope removed successfully"
}
```

---

## Error Responses

All endpoints return error responses in the following format:

**4xx Client Error:**
```json
{
  "success": false,
  "error": "Description of the error",
  "message": "Error message"
}
```

**500 Server Error:**
```json
{
  "success": false,
  "error": "Internal server error message",
  "message": "Error message"
}
```

### Common Error Codes:

- **400 Bad Request** - Missing required fields or invalid data
- **404 Not Found** - Resource not found
- **409 Conflict** - Constraint violation (e.g., duplicate approval level for a budget)
- **500 Internal Server Error** - Server-side error

---

## Frontend Integration Notes

When connecting the frontend to these endpoints:

1. **Create Budget Request Flow:**
   - Send all form data (budget config + tenure groups + approvers + access scopes) in one request to `POST /budget-configurations`
   - The backend will handle creating all related records in a transaction

2. **Fetch Complete Configuration:**
   - Use `GET /budget-configurations/:id` to fetch a budget with all related data
   - Related data is automatically included in the response

3. **Update Related Data:**
   - Use specific endpoints for tenure groups, approvers, and access scopes
   - Do NOT send these in the main budget update endpoint

4. **Approval Levels:**
   - Levels are 1, 2, and 3
   - Each budget can have 0-3 approval levels configured
   - Use the unique constraint to prevent duplicates

5. **Access Scopes:**
   - Multiple scopes can be added to a single budget
   - Use `scope_type` to categorize different access restrictions
   - Query parameters can filter by specific scope types

---

## Database Schema Reference

### tblbudgetconfiguration
Main budget configuration table.

```sql
- budget_id (UUID, PK)
- budget_name (TEXT)
- min_limit (NUMERIC)
- max_limit (NUMERIC)
- budget_control (BOOLEAN)
- carryover_enabled (BOOLEAN)
- client_sponsored (BOOLEAN)
- period_type (TEXT) - Enum: Monthly, Quarterly, Semi-Annual, Yearly
- geo_scope (TEXT)
- location_scope (TEXT)
- department_scope (TEXT)
- created_by (UUID, FK)
- created_at (TIMESTAMP)
- updated_by (UUID)
- updated_at (TIMESTAMP)
```

### tblbudgetconfig_tenure_groups
Tenure groups associated with a budget.

```sql
- config_tenure_id (UUID, PK)
- budget_id (UUID, FK) - References tblbudgetconfiguration
- tenure_group (TEXT)
- created_at (TIMESTAMP)
```

### tblbudgetconfig_approvers
Approvers for different approval levels.

```sql
- approver_id (UUID, PK)
- budget_id (UUID, FK) - References tblbudgetconfiguration
- approval_level (INTEGER) - Check: 1-3
- primary_approver (UUID, FK)
- backup_approver (UUID, FK)
- created_by (UUID)
- created_at (TIMESTAMP)
- updated_by (UUID)
- updated_at (TIMESTAMP)
- Unique: (budget_id, approval_level)
```

### tblbudgetconfig_access_scopes
Access scopes for budget usage restrictions.

```sql
- scope_id (UUID, PK)
- budget_id (UUID, FK) - References tblbudgetconfiguration
- scope_type (TEXT)
- scope_value (TEXT)
- created_by (UUID)
- created_at (TIMESTAMP)
```

---

## Version History

- **v1.0** (2025-01-15) - Initial release with normalized schema support
