# Setup Test User & Fix OTP Flow

## What Was Fixed

### 1. OTP Requirement Fix ✅
**Problem**: Admin users were skipping OTP verification and going directly to dashboard
**Solution**: Fixed frontend `AuthContext.jsx` to check for `requiresOTP` at root level of response instead of nested in data

**File Changed**: [src/context/AuthContext.jsx](src/context/AuthContext.jsx#L54)
```javascript
// Before
if (response.data.data?.requiresOTP) { ... }

// After
if (response.data.requiresOTP) { ... }
```

Now ALL users (including admin) will require OTP verification before accessing the dashboard.

---

## Setting Up Test Users

### Step 1: Add password_hash Column to Database

Run this SQL in your Supabase SQL Editor:

```sql
ALTER TABLE tblusers ADD COLUMN password_hash VARCHAR(255);
UPDATE tblusers SET password_hash = password WHERE password_hash IS NULL;
ALTER TABLE tblusers ALTER COLUMN password_hash SET NOT NULL;
```

Or run the migration file:
- File: `orbit-backend/migrations/001_add_password_hash.sql`

### Step 2: Create Test Users

Run this SQL in your Supabase SQL Editor:

```sql
-- Test User 1: First Time User (requires password change)
INSERT INTO tblusers (
  email,
  password,
  password_hash,
  first_name,
  last_name,
  employee_id,
  department,
  status,
  is_first_login,
  role,
  is_active,
  created_at,
  updated_at
) VALUES (
  'testuser@example.com',
  'TestPassword123!',
  'TestPassword123!',
  'John',
  'Doe',
  'EMP001',
  'Engineering',
  'active',
  true,
  'requestor',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
) ON CONFLICT (email) DO NOTHING;

-- Test User 2: Existing User (no password change needed)
INSERT INTO tblusers (
  email,
  password,
  password_hash,
  first_name,
  last_name,
  employee_id,
  department,
  status,
  is_first_login,
  role,
  is_active,
  created_at,
  updated_at
) VALUES (
  'jane.smith@example.com',
  'JanePassword123!',
  'JanePassword123!',
  'Jane',
  'Smith',
  'EMP002',
  'Marketing',
  'active',
  false,
  'requestor',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
) ON CONFLICT (email) DO NOTHING;
```

Or run the seed file: `orbit-backend/seeds/01_test_users.sql`

### Step 3: Verify Users Created

Run this in Supabase SQL Editor:
```sql
SELECT id, email, first_name, last_name, is_first_login, created_at 
FROM tblusers 
WHERE email LIKE '%@example.com%' 
ORDER BY created_at DESC;
```

You should see:
- `testuser@example.com` with `is_first_login = true`
- `jane.smith@example.com` with `is_first_login = false`

---

## Testing the Login Flow

### Test User 1: First Time User

**Credentials**:
- Email: `testuser@example.com`
- Password: `TestPassword123!`

**Expected Flow**:
1. ✅ Enter credentials → Click Login
2. ✅ **OTP Required** → System sends OTP to email (shows in console log)
3. ✅ Enter OTP (check backend console for OTP code)
4. ✅ **First Time Password** → Set new password
5. ✅ **Security Questions** → Set up 3 security questions
6. ✅ **User Agreement** → Accept terms
7. ✅ **Dashboard** → Login complete

### Test User 2: Existing User

**Credentials**:
- Email: `jane.smith@example.com`
- Password: `JanePassword123!`

**Expected Flow**:
1. ✅ Enter credentials → Click Login
2. ✅ **OTP Required** → System sends OTP to email
3. ✅ Enter OTP
4. ✅ **Dashboard** → Login complete (skips password/security questions since already set up)

---

## Key Points

### Database Columns
Your `tblusers` table now has these columns:
- `user_id` - UUID primary key
- `employee_id` - Employee number
- `first_name` - User's first name
- `last_name` - User's last name
- `email` - Email address (unique)
- `department` - Department
- `status` - Active/Inactive status
- `is_first_login` - Boolean flag (triggers first time password flow)
- `password` - Current password (being phased out)
- `password_hash` - **NEW** Better security with bcrypt (future)
- `password_updated_at` - When password was last changed
- `created_by` - User who created this record
- `updated_by` - User who last updated this record
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

### Password Verification
The backend now checks `password_hash` first, then falls back to `password`:
```javascript
const passwordToCheck = user.password_hash || user.password;
if (passwordToCheck !== password) { /* error */ }
```

This allows gradual migration from plain text to hashed passwords.

---

## OTP Testing

Since email is not configured yet, OTPs are logged to the backend console:

```
Backend Console Output:
Generated OTP for testuser@example.com: 123456
Generated OTP for jane.smith@example.com: 654321
```

Copy the 6-digit code from the console and paste it into the OTP input field.

---

## Next Steps (Production Setup)

1. **Email Service**: Implement SendGrid/Mailgun to send OTP codes via email
2. **Password Hashing**: Use bcrypt to hash passwords before storing
3. **JWT Tokens**: Implement proper JWT signing with jsonwebtoken library
4. **Security Questions**: Hash answers before storing
5. **Rate Limiting**: Prevent brute-force attacks

---

## Files Modified/Created

✅ **Modified**:
- `orbit-frontend/src/context/AuthContext.jsx` - Fixed requiresOTP check
- `orbit-backend/src/services/authService.js` - Updated password check

✅ **Created**:
- `orbit-backend/migrations/001_add_password_hash.sql` - Schema migration
- `orbit-backend/seeds/01_test_users.sql` - Test user seeds

---

## Troubleshooting

### Issue: OTP not showing up
**Solution**: Check backend console for OTP code. Currently it logs: `Generated OTP for {email}: {code}`

### Issue: User not found
**Solution**: Verify user was created with correct email in Supabase

### Issue: Password incorrect
**Solution**: Use exact password: `TestPassword123!` or `JanePassword123!` for test users

### Issue: Still bypassing OTP
**Solution**: Hard refresh browser (Ctrl+Shift+R) to clear cached login flow

