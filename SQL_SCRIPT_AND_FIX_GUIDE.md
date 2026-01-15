# SQL Script Location and Usage

## Where the SQL Script Was Created

The SQL script for creating the `tblbudgetconfig_budget_tracking` table has been created at:

```
orbit-backend/sql/tblbudgetconfig_budget_tracking.sql
```

## SQL Script Content

The script creates the budget tracking table with the following features:

```sql
CREATE TABLE IF NOT EXISTS tblbudgetconfig_budget_tracking (
  tracking_id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  budget_id BIGINT NOT NULL REFERENCES tblbudgetconfiguration(budget_id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_label VARCHAR(50) NOT NULL,              -- e.g., "October 2024"
  total_budget DECIMAL(15, 2) NOT NULL DEFAULT 0,
  budget_used DECIMAL(15, 2) NOT NULL DEFAULT 0,
  budget_remaining DECIMAL(15, 2) GENERATED ALWAYS AS (total_budget - budget_used),
  budget_carryover DECIMAL(15, 2) DEFAULT 0,
  approval_count_total INT DEFAULT 0,
  approval_count_approved INT DEFAULT 0,
  approval_count_rejected INT DEFAULT 0,
  approval_count_pending INT DEFAULT 0,
  last_updated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## How to Deploy

1. **Open Supabase SQL Editor**
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor

2. **Run the Script**
   - Copy the entire content from `orbit-backend/sql/tblbudgetconfig_budget_tracking.sql`
   - Paste it into the SQL Editor
   - Click "Run"

3. **Verify Creation**
   - Go to Table Editor
   - Look for `tblbudgetconfig_budget_tracking` in the tables list
   - Confirm the columns are created with correct types and constraints

## Backend Integration

The backend automatically creates tracking records when you:
1. Create a new budget configuration
2. The service inserts an initial tracking record with:
   - period_label: Current month (e.g., "January 2026")
   - period_start: 1st of current month
   - period_end: Last day of current month
   - total_budget: Set to max_limit value
   - budget_used: 0
   - All approval counts: 0

## API Endpoints

Once the table is created, the following endpoints are available:

### Get Budget History/Tracking
```
GET /api/budget-configurations/:id/history
```
Returns array of budget tracking records for a specific budget configuration

### Get Request Logs
```
GET /api/budget-configurations/:id/logs
```
Returns array of request log records (placeholder for future `tblbudget_requests` table)

## Data Display Issue - Now Fixed

**The Primary Issue**: Frontend was showing "All" instead of actual configured values

**Root Cause**: Frontend Details tab was trying to access incorrect property names

**Solution Applied**: Updated frontend Details tab to use correct backend field names:
- `department_scope` (instead of `department`)
- `geo_scope` (instead of `geo`)
- `access_scopes` array (instead of `clients` and individual scope properties)
- `approvers` array (instead of `approvalLevels`)

**Files Updated**:
- `orbit-frontend/src/pages/BudgetRequest.jsx` - Details tab (lines 599-720)

**Result**: ✅ Configuration details now display actual scoped values from database

---

## Verification Steps

After deploying the changes:

1. Create a test budget configuration with:
   - Multiple clients
   - Specific geographic location
   - Specific department
   - Multiple approval hierarchy levels

2. View the configuration and click **Details** tab

3. Verify you see:
   - ✅ Actual department name (not "All")
   - ✅ Actual geographic location (not "Not specified")
   - ✅ List of configured access scopes
   - ✅ List of approvers with names and emails
   - ✅ Budget tracking history in History tab
