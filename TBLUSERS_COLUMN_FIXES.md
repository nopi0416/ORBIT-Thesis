# tblusers Table Column Fixes

## Overview

Fixed references to the `tblusers` table throughout the backend to use the correct column names as defined in your schema.

## Table Schema Reference

The actual `tblusers` table columns are:

| Column | Type | Notes |
|--------|------|-------|
| `user_id` | uuid | Primary key |
| `employee_id` | varchar | Employee identifier |
| `first_name` | varchar | First name of user |
| `last_name` | varchar | Last name of user |
| `email` | varchar | Email address |
| `status` | varchar | User status (active, inactive, etc.) |
| `is_first_login` | boolean | Flag for first-time login |
| `password_hash` | varchar | Hashed password |
| `password_updated_at` | timestamp | When password was last updated |
| `geo_id` | uuid | Geographic/location reference |
| `org_id` | uuid | Organization reference |
| `created_by` | uuid | User who created this record |
| `updated_by` | uuid | User who last updated this record |
| `created_at` | timestamp | Creation timestamp |
| `updated_at` | timestamp | Last update timestamp |

## Changes Made

### 1. authService.js - registerUser() method

**File:** `orbit-backend/src/services/authService.js`
**Line:** ~29-70

#### Before:
```javascript
// Incorrect columns
.select('id')  // ❌ Column doesn't exist
.insert([{
  email,
  password,  // ❌ Should be password_hash
  first_name: firstName,
  last_name: lastName,
  role,  // ❌ Role not in tblusers (use tbluserroles instead)
  is_active: true,  // ❌ Should be status='active'
  password_expires_at: ...,  // ❌ Not in schema
  created_at: ...
}])
id: data[0].id,  // ❌ Should be user_id
role: data[0].role,  // ❌ Not in tblusers
```

#### After:
```javascript
// Correct columns
.select('user_id')  // ✅ Correct primary key
.insert([{
  email,
  password_hash: password,  // ✅ Correct column
  first_name: firstName,
  last_name: lastName,
  status: 'active',  // ✅ Use status field
  is_first_login: true,  // ✅ Flag for initial setup
  created_at: ...
}])
id: data[0].user_id,  // ✅ Correct ID field
// Role is fetched separately from tbluserroles
```

## Files Reviewed and Fixed

### ✅ authService.js
- **registerUser()** - Fixed column references (user_id, password_hash, status, is_first_login)
- **loginUser()** - Already correct (uses password_hash, email)
- **completeLogin()** - Already correct (uses user_id, first_name, last_name)
- **resetPassword()** - Already correct (uses password_hash, email)
- **changePassword()** - Already correct (uses password_hash, email)

### ✅ adminUserManagementService.js
- **emailExists()** - Already correct (select user_id)
- **employeeIdExists()** - Already correct (select user_id, filter on employee_id)
- **createAdminUser()** - Already correct (all columns properly named)
- **getAllAdminUsers()** - Already correct (select proper columns)

### ✅ budgetConfigService.js
- **getApprovers()** - Already correct (select user_id, first_name, last_name, email)
- All other user queries - Already correct

## Important Notes

### Role Handling
The `tblusers` table does NOT contain a `role` field. User roles are managed through:
- `tbluserroles` - Links users to roles
- `tblroles` - Defines available roles

When fetching user role, always join through `tbluserroles`:
```javascript
const { data: userRole } = await supabase
  .from('tbluserroles')
  .select('tblroles:role_id(role_name)')
  .eq('user_id', userId)
  .single();
```

### Admin Users vs Regular Users
The system has two authentication paths:
- **Regular Users**: Stored in `tblusers`, roles managed via `tbluserroles`
- **Admin Users**: Stored in `tbladminusers`, roles stored directly in `admin_role` column

### Password Hashing TODO
All password operations include a TODO comment to implement bcrypt hashing before storing. Currently passwords are stored as plain text - this MUST be fixed before production:

```javascript
password_hash: await bcrypt.hash(password, 10)  // REQUIRED FOR PRODUCTION
```

## Verification

All changes have been verified:
- ✅ No TypeScript/JavaScript errors
- ✅ Column names match database schema
- ✅ Foreign key references are correct
- ✅ Timestamp fields use ISO format
- ✅ UUID fields match schema

## Testing Recommendations

After these fixes, test the following flows:

1. **User Registration** - New user creation via admin panel
2. **User Login** - Email/password login flow
3. **OTP Verification** - Complete login with OTP
4. **User Agreement** - First-time login flow
5. **Password Reset** - Reset password via email
6. **Role Assignment** - User role association through tbluserroles

## Migration Notes

If you have existing data in `tblusers` with incorrect column values:

1. Verify your actual database schema matches this documentation
2. If columns differ, update references accordingly
3. Run migration to populate missing required columns (status, is_first_login, etc.)
4. Test all authentication flows before deploying

## Related Files

- [tbladminusers schema](ADMIN_TABLE_SCHEMA.md) - Admin user table structure
- [Database schema](orbit-backend/DATABASE_SCHEMA.sql) - Complete schema
- [Authentication documentation](orbit-backend/AUTHENTICATION_SYSTEM_DOCUMENTATION.md) - Full auth details
