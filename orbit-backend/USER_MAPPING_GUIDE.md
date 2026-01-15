# User Mapping System - Approver UUIDs

## Overview

The backend now uses a **user mapping system** that converts user identifiers (names) to UUIDs for approver fields. This allows you to use friendly names during development and easily migrate to real user UUIDs when your user management system is ready.

## Current Implementation

### File Location
`src/utils/userMapping.js`

### Supported User Names (Mapped to Placeholder UUIDs)

| User Name | UUID | Role |
|-----------|------|------|
| john-smith | 11111111-1111-1111-1111-111111111111 | L1 Primary Approver |
| sarah-jones | 22222222-2222-2222-2222-222222222222 | L1 Backup Approver |
| michael-johnson | 33333333-3333-3333-3333-333333333333 | L2 Primary Approver |
| emily-davis | 44444444-4444-4444-4444-444444444444 | L2 Backup Approver |
| david-brown | 55555555-5555-5555-5555-555555555555 | L3 Primary Approver |
| kevin-wong | 66666666-6666-6666-6666-666666666666 | L3 Backup Approver |

### Data Flow

```
Frontend (HTML Form)
    ↓
    User enters approver name (e.g., "john-smith")
    ↓
API Request (POST /api/budget-configurations)
    {
      "approverL1": "john-smith",
      "backupApproverL1": "sarah-jones",
      ...
    }
    ↓
Backend Controller & Service
    ↓
    getUserUUID("john-smith") → "11111111-1111-1111-1111-111111111111"
    ↓
Database (tblbudgetconfig_approvers)
    {
      "budget_id": "...",
      "approval_level": 1,
      "primary_approver": "11111111-1111-1111-1111-111111111111",
      "backup_approver": "22222222-2222-2222-2222-222222222222"
    }
```

## How to Use

### Add a New User

Edit `src/utils/userMapping.js` and add an entry to the `userMapping` object:

```javascript
export const userMapping = {
  "john-smith": "11111111-1111-1111-1111-111111111111",
  "sarah-jones": "22222222-2222-2222-2222-222222222222",
  // Add new user here
  "jane-doe": "77777777-7777-7777-7777-777777777777",
};
```

### Use in Frontend

When collecting approver information, send the user's identifier name:

```javascript
const configData = {
  approverL1: "john-smith",        // Frontend sends name
  backupApproverL1: "sarah-jones", // Backend converts to UUID
  approverL2: "michael-johnson",
  // ...
};
```

## Migration to Real User System

When you implement a real user management system:

### Option 1: Direct UUID Input
Users can directly provide UUIDs:

```javascript
"approverL1": "550e8400-e29b-41d4-a716-446655440000"  // Real UUID
```

The system will automatically detect UUIDs and use them directly.

### Option 2: Database User Lookup
Replace `userMapping.js` with a database query:

```javascript
// src/utils/userMapping.js (updated version)
import supabase from '../config/database.js';

export const getUserUUID = async (userIdentifier) => {
  // First check if it's already a UUID
  if (isValidUUID(userIdentifier)) {
    return userIdentifier;
  }
  
  // Look up user in database by username or email
  const { data, error } = await supabase
    .from('tblusers')
    .select('user_id')
    .or(`username.eq.${userIdentifier},email.eq.${userIdentifier}`)
    .single();
  
  if (error || !data) {
    throw new Error(`User not found: ${userIdentifier}`);
  }
  
  return data.user_id;
};
```

### Option 3: Hybrid Approach
Support multiple user identification methods:

```javascript
export const getUserUUID = async (userIdentifier) => {
  // 1. Check if it's a UUID
  if (isValidUUID(userIdentifier)) return userIdentifier;
  
  // 2. Check local mapping for testing
  if (userMapping[userIdentifier]) return userMapping[userIdentifier];
  
  // 3. Query database for real users
  const dbUser = await queryUserDatabase(userIdentifier);
  if (dbUser) return dbUser.user_id;
  
  // 4. Not found
  throw new Error(`User not found: ${userIdentifier}`);
};
```

## Validation

The system validates approvers during budget configuration creation:

1. **Frontend sends:** `"approverL1": "john-smith"`
2. **Backend validates:** Is "john-smith" a valid user?
3. **If invalid:** Returns error with detailed message
4. **If valid:** Converts to UUID and saves to database

### Error Handling

If an invalid approver is provided:

```json
{
  "approverL1": "Invalid approver: unknown-user. User not found in system."
}
```

## Testing Approvers

### Valid Approver Names
- john-smith
- sarah-jones
- michael-johnson
- emily-davis
- david-brown
- kevin-wong

### Invalid Approver Names
- unknown-user (returns validation error)
- 12345 (not a valid UUID or mapped name)
- null (optional - skip if not needed)

## Database Compatibility

The approver UUIDs are stored in:
- **Table:** `tblbudgetconfig_approvers`
- **Columns:** 
  - `primary_approver` (UUID type)
  - `backup_approver` (UUID type, nullable)

When you migrate to a real user system with actual user IDs, the database schema remains unchanged - only the source of UUIDs changes.

## Code References

**Files Modified:**
- `src/utils/userMapping.js` - NEW: User mapping utilities
- `src/utils/validators.js` - UPDATED: Added approver validation
- `src/services/budgetConfigService.js` - UPDATED: UUID conversion in buildApproversFromConfig

**Functions:**
- `getUserUUID(userIdentifier)` - Convert name to UUID
- `isValidUser(userIdentifier)` - Check if user exists
- `buildApproversFromConfig(configData)` - Convert approvers with UUID resolution

## Next Steps

1. **Add more test users** to `userMapping.js` as needed
2. **Test with different approver combinations** to ensure validation works
3. **Document real user names** when you add actual users
4. **Plan migration** to database user lookup when ready
5. **Update this document** with your specific user mapping

## Example: Complete Budget Configuration with Approvers

```javascript
const budgetConfig = {
  budgetName: "Q1 2024 Performance Bonus",
  period: "Monthly",
  countries: ["ph", "sg"],
  siteLocation: ["Metro Manila"],
  ou: ["hr-dept"],
  selectedTenureGroups: ["0-6months", "6-12months"],
  approverL1: "john-smith",          // → 11111111-1111-1111-1111-111111111111
  backupApproverL1: "sarah-jones",   // → 22222222-2222-2222-2222-222222222222
  approverL2: "michael-johnson",     // → 33333333-3333-3333-3333-333333333333
  backupApproverL2: "emily-davis",   // → 44444444-4444-4444-4444-444444444444
  approverL3: "david-brown",         // → 55555555-5555-5555-5555-555555555555
  backupApproverL3: "kevin-wong",    // → 66666666-6666-6666-6666-666666666666
};

// Database Result
tblbudgetconfig_approvers:
- { approval_level: 1, primary_approver: "11111111...", backup_approver: "22222222..." }
- { approval_level: 2, primary_approver: "33333333...", backup_approver: "44444444..." }
- { approval_level: 3, primary_approver: "55555555...", backup_approver: "66666666..." }
```
