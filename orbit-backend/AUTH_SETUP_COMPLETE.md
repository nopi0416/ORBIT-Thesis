# ORBIT Authentication System - Complete Setup Guide

This guide walks you through setting up and running the complete ORBIT authentication system with Supabase as the backend database.

## Prerequisites

- Node.js v16+ and npm
- Supabase account with a PostgreSQL database
- Two terminal windows (one for frontend, one for backend)

## Database Setup

### 1. Create Supabase Project

1. Go to [Supabase](https://supabase.com) and create a new project
2. Note your `SUPABASE_URL` and `SUPABASE_ANON_KEY`
3. Go to SQL Editor and run the schema from `orbit-backend/DATABASE_SCHEMA.sql`

### 2. Create Database Tables

Execute the following SQL in your Supabase SQL Editor:

```sql
-- Copy the entire contents of orbit-backend/DATABASE_SCHEMA.sql and paste here
```

The schema creates these tables:
- `tblusers` - User accounts
- `tblotp` - One-time passwords for login/reset
- `tblsecurity_questions` - User security Q&A
- `tblsupport_tickets` - Support requests
- `tbluser_agreements` - Agreement acceptance tracking
- `tblpassword_history` - Password change audit log
- `tbllogin_audit` - Login attempt tracking

## Backend Setup (orbit-backend)

### 1. Install Dependencies

```bash
cd orbit-backend
npm install
```

### 2. Create .env File

Create `orbit-backend/.env` with your Supabase credentials:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_key
PORT=3001
```

### 3. Start Backend Server

```bash
npm run dev
```

Expected output:
```
Server running on http://localhost:3001
API health check: GET http://localhost:3001/api/health
```

## Frontend Setup (orbit-frontend)

### 1. Install Dependencies

```bash
cd orbit-frontend
npm install
```

### 2. Create .env File

Create `orbit-frontend/.env`:

```env
VITE_API_URL=http://localhost:3001/api
```

### 3. Start Frontend Dev Server

```bash
npm run dev
```

Frontend will be available at `http://localhost:5173`

## API Endpoints Reference

All endpoints return the same format:

```json
{
  "success": true/false,
  "data": { /* response data */ },
  "message": "Success message",
  "statusCode": 200
}
```

### Authentication Endpoints

#### 1. Login
**POST** `/api/auth/login`

Request:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Response (with OTP required):
```json
{
  "success": true,
  "data": {
    "email": "user@example.com",
    "userType": "user"
  },
  "message": "OTP has been sent to your email"
}
```

#### 2. Complete Login (Verify OTP)
**POST** `/api/auth/complete-login`

Request:
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "token": "eyJ...",
    "userId": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "requestor"
  },
  "message": "Login successful"
}
```

#### 3. Forgot Password
**POST** `/api/auth/forgot-password`

Request:
```json
{
  "email": "user@example.com"
}
```

#### 4. Verify OTP
**POST** `/api/auth/verify-otp`

Request:
```json
{
  "email": "user@example.com",
  "otp": "123456",
  "type": "reset" // or "login"
}
```

#### 5. Reset Password
**POST** `/api/auth/reset-password`

Request:
```json
{
  "email": "user@example.com",
  "newPassword": "NewPassword123!"
}
```

#### 6. Change Password
**POST** `/api/auth/change-password`

Request:
```json
{
  "email": "user@example.com",
  "currentPassword": "oldPassword123",
  "newPassword": "NewPassword123!"
}
```

#### 7. First-Time Password
**POST** `/api/auth/first-time-password`

Request:
```json
{
  "email": "user@example.com",
  "currentPassword": "tempPassword123",
  "newPassword": "NewPassword123!"
}
```

#### 8. Save Security Questions
**POST** `/api/auth/security-questions`

Request:
```json
{
  "userId": "uuid",
  "question1": "What is your pet's name?",
  "answer1": "Fluffy",
  "question2": "Where were you born?",
  "answer2": "New York",
  "question3": "What was your first car?",
  "answer3": "Honda"
}
```

#### 9. Verify Security Answers
**POST** `/api/auth/verify-security-answers`

Request:
```json
{
  "email": "user@example.com",
  "answer1": "Fluffy",
  "answer2": "New York",
  "answer3": "Honda"
}
```

#### 10. Create Support Ticket
**POST** `/api/auth/support-ticket`

Request:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "issueType": "Forgot Password",
  "description": "I cannot access my account"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "ticketId": "uuid",
    "status": "open"
  },
  "message": "Support ticket created successfully"
}
```

#### 11. Accept User Agreement
**POST** `/api/auth/user-agreement`

Request:
```json
{
  "userId": "uuid",
  "accepted": true,
  "version": "1.0"
}
```

#### 12. Resend OTP
**POST** `/api/auth/resend-otp`

Request:
```json
{
  "email": "user@example.com",
  "type": "reset"
}
```

## Frontend Pages and Flows

### 1. Login Page (`/login`)
- **Path**: `/src/pages/Login.jsx`
- **Features**: Email/password input, OTP verification
- **API**: Uses `authAPI.login()` and `authAPI.completeLogin()`
- **Flow**: 
  1. Enter email/password → Step 1
  2. Receive OTP → Show OTP input
  3. Verify OTP → Logged in

### 2. Forgot Password (`/forgot-password`)
- **Path**: `/src/pages/ForgotPassword.jsx`
- **Features**: Email input, triggers OTP generation
- **API**: Uses `authAPI.forgotPassword()`
- **Flow**: Email → OTP sent → Redirect to `/verify-otp?type=reset`

### 3. Verify OTP (`/verify-otp`)
- **Path**: `/src/pages/VerifyOTP.jsx`
- **Features**: 6-digit OTP input, auto-focus, paste support, timer
- **API**: Uses `authAPI.verifyOTP()` and `authAPI.resendOTP()`
- **Query Params**: `email=`, `type=reset|login`

### 4. Reset Password (`/reset-password`)
- **Path**: `/src/pages/ResetPassword.jsx`
- **Features**: Password strength indicators, requirements validation
- **API**: Uses `authAPI.resetPassword()`
- **Password Requirements**:
  - Minimum 8 characters
  - Uppercase letter
  - Lowercase letter
  - Number
  - Special symbol

### 5. First-Time Password (`/first-time-password`)
- **Path**: `/src/pages/FirstTimePassword.jsx`
- **Features**: Force password change for first-time login
- **API**: Uses `authAPI.firstTimePassword()`

### 6. Security Questions (`/security-questions`)
- **Path**: `/src/pages/SecurityQuestions.jsx`
- **Features**: Set up 3 security questions
- **API**: Uses `authAPI.saveSecurityQuestions()`
- **Query Params**: `userId=`

### 7. User Agreement (`/user-agreement`)
- **Path**: `/src/pages/UserAgreement.jsx`
- **Features**: Display and accept terms
- **API**: Uses `authAPI.acceptUserAgreement()`

### 8. Support Ticket (`/support-ticket`)
- **Path**: `/src/pages/SupportTicket.jsx`
- **Features**: Submit support requests with issue types
- **API**: Uses `authAPI.createSupportTicket()`
- **Issue Types**: 
  - Forgot Password
  - Forgot Security Questions/Answers
  - Trouble Logging In
  - Account Locked
  - Other Issue

## Complete Login Flow

```
1. User visits /login
   ↓
2. Enters email & password → POST /api/auth/login
   ↓
3. Receives OTP via email
   ↓
4. Enters OTP → POST /api/auth/complete-login
   ↓
5. Check if password_change_required
   ├─ Yes → /first-time-password
   └─ No → Continue
   ↓
6. Check if security questions set
   ├─ No → /security-questions?userId=xxx
   └─ Yes → Continue
   ↓
7. Check if user agreement accepted
   ├─ No → /user-agreement
   └─ Yes → Continue
   ↓
8. Redirect to /dashboard
```

## Password Reset Flow

```
1. User visits /forgot-password
   ↓
2. Enters email → POST /api/auth/forgot-password
   ↓
3. Receives OTP via email
   ↓
4. Redirected to /verify-otp?type=reset
   ↓
5. Enters OTP → POST /api/auth/verify-otp
   ↓
6. Redirected to /reset-password?email=xxx
   ↓
7. Enters new password → POST /api/auth/reset-password
   ↓
8. Redirect to /login?reset=success
```

## Testing the System

### Test Login
```bash
# Terminal 1: Start Backend
cd orbit-backend
npm run dev

# Terminal 2: Start Frontend
cd orbit-frontend
npm run dev

# Open http://localhost:5173
# Click Login and use test credentials
```

### Test with curl (Backend)

```bash
# Test login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Test OTP verification
curl -X POST http://localhost:3001/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","otp":"123456","type":"reset"}'

# Health check
curl http://localhost:3001/api/health
```

## Environment Variables Reference

### Backend (.env)
| Variable | Description | Example |
|----------|-------------|---------|
| SUPABASE_URL | Supabase project URL | `https://abc123.supabase.co` |
| SUPABASE_KEY | Supabase anon key | `eyJ...` |
| PORT | Server port | `3001` |

### Frontend (.env)
| Variable | Description | Example |
|----------|-------------|---------|
| VITE_API_URL | Backend API base URL | `http://localhost:3001/api` |

## Common Issues and Solutions

### Issue: "Missing Supabase URL or Key"
**Solution**: Check `.env` file in `orbit-backend/`. Ensure `SUPABASE_URL` and `SUPABASE_KEY` are set correctly.

### Issue: CORS errors
**Solution**: Ensure backend is running on port 3001 and frontend `.env` has correct `VITE_API_URL`.

### Issue: "Database table does not exist"
**Solution**: Run the database schema SQL from `orbit-backend/DATABASE_SCHEMA.sql` in your Supabase SQL Editor.

### Issue: OTP not sending
**Solution**: Currently OTP is logged to console. In production, integrate an email service like SendGrid or Mailgun.

## Production Deployment

1. **Password Hashing**: Replace plain text passwords with bcrypt hashing
2. **JWT Library**: Implement proper JWT signing with `jsonwebtoken` library
3. **Email Service**: Set up SendGrid or similar to send OTP codes
4. **HTTPS**: Deploy with HTTPS enabled
5. **Environment**: Use secure environment variable management
6. **Rate Limiting**: Add rate limiting to prevent brute-force attacks

## Next Steps

- Implement email service for OTP delivery
- Add password hashing with bcrypt
- Implement proper JWT token generation
- Add refresh token mechanism
- Set up audit logging
- Implement session management
- Add multi-factor authentication (MFA)

## Support

For issues or questions, check:
- Backend logs: `npm run dev` output
- Frontend console: Browser DevTools
- Supabase logs: Supabase dashboard
