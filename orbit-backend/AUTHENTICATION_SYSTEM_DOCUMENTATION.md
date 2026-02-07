# Backend Authentication System Documentation

## Overview
The backend authentication system manages user login, password changes, OTP generation, security questions, and user session handling. It uses Express.js, Supabase PostgreSQL, and JWT tokens for secure authentication.

## Architecture

### File Structure
```
orbit-backend/src/
├── controllers/
│   └── authController.js       # HTTP request handlers
├── services/
│   └── authService.js          # Business logic & database queries
├── routes/
│   └── authRoutes.js           # API endpoint definitions
├── middleware/
│   └── auth.js                 # JWT verification middleware
├── utils/
│   ├── validators.js           # Input validation schemas
│   └── response.js             # Response helpers
├── config/
│   ├── database.js             # Supabase client
│   ├── email.js                # Email service (Nodemailer)
│   └── cors.js                 # CORS configuration
└── index.js                    # Express app setup
```

## Core Components

### 1. AuthService (`src/services/authService.js`)

Main business logic for authentication:

#### Key Methods:

**`loginUser(email, password)`**
- Validates credentials against `tblusers` table
- Generates and sends OTP via email
- Returns: `{ success, message, data: { email, requiresOTP } }`

**`completeLogin(email, otp)`**
- Verifies OTP against `tblotp` table
- Fetches user details from `tblusers` + `tbluserroles` join
- Checks if user is first-time login (requires user agreement)
- Generates JWT token
- Returns: `{ success, data: { token, userId, firstName, lastName, role, requiresUserAgreement } }`

**`generateOTP(email, type)`**
- Creates 6-digit OTP code
- Saves to `tblotp` table with 3-minute expiry
- Sends OTP via email
- Returns: `{ success, message }`

**`firstTimePassword(email, currentPassword, newPassword)`**
- Validates current password against stored `password_hash`
- Validates new password strength (8+ chars, uppercase, lowercase, number, symbol)
- Updates `password_hash` in `tblusers`
- Returns: `{ success, message }`

**`changePassword(email, currentPassword, newPassword)`**
- Similar to `firstTimePassword` but with current password verification
- Updates both `password_hash` and `updated_at`
- Returns: `{ success, message }`

**`saveSecurityQuestions(userId, questions)`**
- Saves/updates security questions in `tblsecurity_questions`
- Updates `is_first_login = false` when complete
- Returns: `{ success, message }`

**`generateToken(userId, email, role)`**
- Creates JWT token using `jsonwebtoken` library
- Token expires in 24 hours
- Payload: `{ userId, email, role }`
- Returns: JWT string

**`verifyToken(token)`**
- Decodes and validates JWT
- Returns: `{ success, data: { userId, email, role } }`

**`getUserDetails(userId)`**
- Fetches user info from `tblusers`
- Returns: `{ success, data: { user_id, first_name, last_name, department, status, email } }`

**`acceptUserAgreement(userId, version)`**
- Records agreement in `tbluser_agreements`
- Returns: `{ success, message }`

### 2. AuthController (`src/controllers/authController.js`)

HTTP request handlers that validate input and call services:

#### Endpoints:

| Method | Endpoint | Handler | Purpose |
|--------|----------|---------|---------|
| POST | `/register` | `register()` | Register new user |
| POST | `/login` | `login()` | Send OTP to email |
| POST | `/complete-login` | `completeLogin()` | Verify OTP and get token |
| POST | `/forgot-password` | `forgotPassword()` | Initiate password reset |
| POST | `/reset-password` | `resetPassword()` | Update password after OTP |
| POST | `/change-password` | `changePassword()` | Change password when logged in |
| POST | `/first-time-password` | `firstTimePassword()` | Set password on first login |
| POST | `/verify-otp` | `verifyOTP()` | Verify OTP token |
| POST | `/resend-otp` | `resendOTP()` | Resend OTP to email |
| POST | `/security-questions` | `saveSecurityQuestions()` | Save security questions |
| POST | `/verify-security-answers` | `verifySecurityAnswers()` | Verify answers for account recovery |
| POST | `/support-ticket` | `createSupportTicket()` | Create support ticket |
| POST | `/user-agreement` | `acceptUserAgreement()` | Record user agreement acceptance |
| GET | `/user/:userId` | `getUserDetails()` | Fetch user details by ID |

### 3. Routes (`src/routes/authRoutes.js`)

Maps HTTP endpoints to controller methods:

```javascript
router.post('/login', AuthController.login);
router.post('/complete-login', AuthController.completeLogin);
router.post('/first-time-password', AuthController.firstTimePassword);
router.post('/security-questions', AuthController.saveSecurityQuestions);
router.post('/user-agreement', AuthController.acceptUserAgreement);
router.get('/user/:userId', AuthController.getUserDetails);
// ... more routes
```

## Database Schema

### Key Tables:

**`tblusers`**
```
- user_id (UUID, PK)
- email (VARCHAR, UNIQUE)
- password_hash (VARCHAR)
- first_name (VARCHAR)
- last_name (VARCHAR)
- department (VARCHAR)
- status (VARCHAR) - 'active', 'inactive', 'suspended'
- is_first_login (BOOLEAN)
- is_active (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

**`tbluserroles`**
```
- user_role_id (UUID, PK)
- user_id (UUID, FK → tblusers)
- role_id (UUID, FK → tblroles)
- is_active (BOOLEAN)
- assigned_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

**`tblroles`**
```
- role_id (UUID, PK)
- role_name (VARCHAR) - 'L1', 'L2', 'L3', 'Requestor', 'Admin', 'Payroll'
- description (VARCHAR)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

**`tblotp`**
```
- otp_id (UUID, PK)
- email (VARCHAR)
- otp_code (VARCHAR)
- type (VARCHAR) - 'login', 'reset'
- expires_at (TIMESTAMP)
- is_used (BOOLEAN)
- created_at (TIMESTAMP)
```

**`tblsecurity_questions`**
```
- id (UUID, PK)
- user_id (UUID, FK → tblusers)
- question_1 (VARCHAR)
- answer_1 (VARCHAR)
- question_2 (VARCHAR)
- answer_2 (VARCHAR)
- question_3 (VARCHAR)
- answer_3 (VARCHAR)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

**`tbluser_agreements`**
```
- id (UUID, PK)
- user_id (UUID, FK → tblusers)
- version (VARCHAR)
- accepted_at (TIMESTAMP)
- created_at (TIMESTAMP)
```

## Authentication Flow

### Normal Login (Returning User)
```
1. Login Page
   ↓ POST /api/auth/login (email, password)
2. AuthService.loginUser() → Verify credentials, generate OTP
3. Send OTP email
   ↓ VerifyOTP Page
4. POST /api/auth/complete-login (email, otp)
5. AuthService.completeLogin() → Verify OTP, fetch user details, generate JWT
6. Check is_first_login flag
   - If false: Redirect to Dashboard ✓
   - If true: Redirect to User Agreement
```

### First-Time Login
```
1. Login Page (default credentials)
   ↓ POST /api/auth/login
2. OTP sent
   ↓ VerifyOTP Page
3. POST /api/auth/complete-login
4. AuthService checks is_first_login = true
5. Returns: { requiresUserAgreement: true }
   ↓ UserAgreement Page
6. POST /api/auth/user-agreement
   ↓ FirstTimePassword Page
7. POST /api/auth/first-time-password
   ↓ SecurityQuestions Page
8. POST /api/auth/security-questions
9. AuthService.saveSecurityQuestions() → Sets is_first_login = false
10. Returns complete user details
   ↓ Dashboard
```

### Password Reset
```
1. ForgotPassword Page
   ↓ POST /api/auth/forgot-password
2. OTP sent to email
   ↓ VerifyOTP Page
3. POST /api/auth/verify-otp
   ↓ ResetPassword Page
4. POST /api/auth/reset-password
5. AuthService.resetPassword() → Update password_hash
   ↓ Login Page
```

## Security Mechanisms

### JWT Tokens
- **Algorithm**: HS256
- **Expiry**: 24 hours
- **Secret**: Stored in `.env` as `JWT_SECRET`
- **Payload**: `{ userId, email, role, expiresIn, issuer, subject }`

### OTP
- **Length**: 6 digits
- **Expiry**: 3 minutes (180 seconds)
- **Storage**: `tblotp` table
- **Marked used**: After first verification

### Password Requirements
```
✓ Minimum 8 characters
✓ At least one uppercase letter
✓ At least one lowercase letter
✓ At least one number
✓ At least one special character (!@#$%^&*)
```

### First-Time Login Flow
- New users get default password
- Must be changed before accessing dashboard
- Must answer security questions
- `is_first_login` only set to false after ALL steps complete

### Error Handling
- Database errors are NOT exposed to frontend
- Generic error messages shown to user
- Actual errors logged server-side for debugging
- Example: "An error occurred. Please try again." instead of database error details

## Environment Variables

Required in `.env`:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
JWT_SECRET=your-secret-key-64-chars
PORT=3001

# Email configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@orbit.com
```

## Testing Endpoints

### Create Test User
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d {
    "email": "test@example.com",
    "password": "TempPassword123!",
    "firstName": "John",
    "lastName": "Doe",
    "role": "requestor"
  }
```

### Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d {
    "email": "test@example.com",
    "password": "TempPassword123!"
  }
```

### Complete Login with OTP
```bash
curl -X POST http://localhost:3001/api/auth/complete-login \
  -H "Content-Type: application/json" \
  -d {
    "email": "test@example.com",
    "otp": "123456"
  }
```

### Get User Details
```bash
curl -X GET http://localhost:3001/api/auth/user/{userId}
```

## Common Issues

### "Invalid token" error
- Token may have expired (24-hour limit)
- Require user to login again
- Check JWT_SECRET matches in frontend/backend

### OTP not received
- Check email configuration in `.env`
- Verify Nodemailer SMTP settings
- Check spam folder for OTP emails

### Database errors exposed
- Wrap try-catch in controllers
- Always use generic error messages for frontend
- Log actual errors server-side for debugging

### First-time user stuck
- Ensure `is_first_login` is properly updated when security questions are saved
- Verify all three steps complete: password → agreement → security questions

## Integration with Frontend

The backend works with:
- **AuthContext.jsx**: Stores JWT token and user details
- **API calls**: Frontend calls `/api/auth/*` endpoints via axios
- **LocalStorage**: Frontend stores token and user details
- **JWT verification**: Backend validates token on protected endpoints

