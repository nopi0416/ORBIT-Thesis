# ORBIT Authentication System - Complete Setup Guide

## Overview

This document provides step-by-step instructions to set up and test the complete authentication system for ORBIT, including:
- User login/registration
- Password reset and change
- OTP verification
- Security questions
- Support tickets
- User agreements

## Prerequisites

- Node.js 18+
- Supabase account with project created
- Backend and frontend running

## Step 1: Database Setup

### 1.1 Access Supabase

1. Go to [supabase.io](https://supabase.io) and log in
2. Open your ORBIT project
3. Navigate to **SQL Editor** (left sidebar)

### 1.2 Create Database Tables

1. Click **+ New Query**
2. Copy the entire contents of `orbit-backend/DATABASE_SCHEMA.sql`
3. Paste into the SQL editor
4. Click **Run**
5. Verify tables appear in **Table Editor** (left sidebar)

Expected tables:
- `tblusers` - User accounts
- `tblotp` - One-time passwords
- `tblsecurity_questions` - Security question data
- `tblsupport_tickets` - Support/help tickets
- `tbluser_agreements` - Agreement acceptance records
- `tblpassword_history` - Password change history
- `tbllogin_audit` - Login audit logs

## Step 2: Backend Configuration

### 2.1 Environment Variables

1. Open `orbit-backend/.env`
2. Ensure it contains:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_anon_key_here
PORT=3001
```

3. Get credentials from Supabase:
   - Dashboard → Settings → API → Project URL
   - Dashboard → Settings → API → Service role key (use for backend)

### 2.2 Start Backend

```bash
cd orbit-backend
npm install
npm run dev
```

Expected output:
```
ORBIT Backend is running
Server running on port 3001
```

### 2.3 Test Backend Health

Open browser or terminal:
```bash
curl http://localhost:3001/api/health
```

Response should be:
```json
{
  "status": "OK",
  "message": "ORBIT Backend is running",
  "timestamp": "2024-01-XX..."
}
```

## Step 3: Frontend Configuration

### 3.1 Start Frontend

```bash
cd orbit-frontend
npm install
npm run dev
```

Expected output:
```
  VITE v7.X.X  ready in XXX ms

  ➜  Local:   http://localhost:5173/
```

### 3.2 Test with Browser

Open `http://localhost:5173` in browser

## Step 4: Test Authentication Flows

### 4.1 Register a New User

#### Method 1: API Call (Postman/Curl)

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "SecurePassword123!",
    "firstName": "Test",
    "lastName": "User",
    "role": "requestor"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": "uuid-here",
    "email": "testuser@example.com",
    "firstName": "Test",
    "lastName": "User",
    "role": "requestor"
  }
}
```

#### Method 2: Frontend (Manual)

1. Open frontend browser tab
2. Navigate to signup page (if available) or use Login page

### 4.2 Test Login

#### Method 1: API Call

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "SecurePassword123!"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJ...",
    "userId": "uuid",
    "email": "testuser@example.com",
    "firstName": "Test",
    "lastName": "User",
    "role": "requestor"
  }
}
```

#### Method 2: Frontend

1. Go to `http://localhost:5173/login`
2. Enter email: `testuser@example.com`
3. Enter password: `SecurePassword123!`
4. Click Login
5. Should redirect to dashboard

### 4.3 Test Password Reset Flow

#### Step 1: Request OTP

```bash
curl -X POST http://localhost:3001/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "testuser@example.com"}'
```

Expected: OTP generated and stored in database

#### Step 2: Get OTP from Database

1. In Supabase → Table Editor → `tblotp`
2. Find the latest record with your email
3. Copy the `otp` value (should be 6 digits)
4. Note: In production, OTP would be sent via email

#### Step 3: Verify OTP

```bash
curl -X POST http://localhost:3001/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "otp": "123456",
    "type": "reset"
  }'
```

#### Step 4: Reset Password

```bash
curl -X POST http://localhost:3001/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "newPassword": "NewSecurePassword456!"
  }'
```

### 4.4 Test Security Questions

#### Step 1: Get User ID

```bash
# From login response, extract userId
# Or query database directly
SELECT id FROM tblusers WHERE email = 'testuser@example.com';
```

#### Step 2: Save Security Questions

```bash
curl -X POST http://localhost:3001/api/auth/security-questions \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "your-user-id-here",
    "question1": "What was the name of your first pet?",
    "answer1": "Fluffy",
    "question2": "What city were you born in?",
    "answer2": "New York",
    "question3": "What is your mother'\''s maiden name?",
    "answer3": "Smith"
  }'
```

#### Step 3: Verify Security Answers

```bash
curl -X POST http://localhost:3001/api/auth/verify-security-answers \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "answer1": "Fluffy",
    "answer2": "New York",
    "answer3": "Smith"
  }'
```

### 4.5 Test Support Ticket

```bash
curl -X POST http://localhost:3001/api/auth/support-ticket \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "testuser@example.com",
    "issueType": "password_reset",
    "description": "I forgot my password and need help recovering my account"
  }'
```

Check database: `tblsupport_tickets` table should have new record

### 4.6 Test User Agreement

```bash
curl -X POST http://localhost:3001/api/auth/user-agreement \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "your-user-id-here",
    "accepted": true,
    "version": "1.0"
  }'
```

Check database: `tbluser_agreements` table should have new record

## Step 5: Frontend Page Testing

Navigate to each page and test:

### Pages to Test

1. **Login Page** (`http://localhost:5173/login`)
   - Enter valid credentials
   - Try with invalid credentials
   - Verify error messages

2. **Forgot Password** (`http://localhost:5173/forgot-password`)
   - Enter email
   - Should redirect to OTP page

3. **Verify OTP** (`http://localhost:5173/verify-otp?email=...&type=reset`)
   - Enter 6-digit OTP
   - Test resend OTP
   - Should redirect to Reset Password page

4. **Reset Password** (`http://localhost:5173/reset-password?email=...`)
   - Enter new password
   - Verify password requirements display
   - Should return to login

5. **First Time Password** (`http://localhost:5173/first-time-password?email=...&role=...`)
   - Enter current password: `demo123` (default)
   - Enter new password
   - Should redirect to User Agreement

6. **Security Questions** (`http://localhost:5173/security-questions?email=...&role=...`)
   - Select 3 different questions
   - Enter answers
   - Should save to database

7. **User Agreement** (`http://localhost:5173/user-agreement?email=...&role=...`)
   - Check "I agree" checkbox
   - Should redirect to dashboard

8. **Support Ticket** (`http://localhost:5173/support-ticket`)
   - Fill all fields
   - Submit
   - Should show success message

## Step 6: Troubleshooting

### Issue: Backend not connecting to Supabase

**Solution:**
1. Check `.env` file has correct `SUPABASE_URL` and `SUPABASE_KEY`
2. Verify URL format: `https://your-project.supabase.co`
3. Restart backend: `npm run dev`
4. Check Supabase dashboard is accessible

### Issue: Frontend getting CORS errors

**Solution:**
1. Verify backend CORS config in `orbit-backend/src/config/cors.js`
2. Ensure `http://localhost:5173` is in allowed origins
3. Restart backend

### Issue: OTP not working

**Solution:**
1. Check `tblotp` table in Supabase for records
2. Verify OTP hasn't expired (10 minute expiry)
3. OTP expires even if correct - generate new one
4. In development, OTP prints to backend console logs

### Issue: Password validation fails

**Solution:**
Password must have:
- At least 8 characters
- At least 1 uppercase letter (A-Z)
- At least 1 lowercase letter (a-z)
- At least 1 number (0-9)
- At least 1 special character (!@#$%^&*()_+-=[]{};":\\|,.<>/?)

Example: `SecurePassword123!`

## Step 7: Production Considerations

Before deploying to production:

1. **Enable Password Hashing**
   - Install bcrypt: `npm install bcrypt`
   - Update `authService.js` to hash passwords
   - Update login to verify hashes

2. **Implement JWT Tokens**
   - Install jsonwebtoken: `npm install jsonwebtoken`
   - Update `authService.js` generateToken method
   - Add JWT verification middleware

3. **Set Up Email Service**
   - Install SendGrid/AWS SES/similar
   - Update `generateOTP` method to send emails
   - Remove console.log debug OTP

4. **Enable Rate Limiting**
   - Install express-rate-limit: `npm install express-rate-limit`
   - Add middleware to auth routes

5. **Use Environment Secrets**
   - Store JWT_SECRET in environment
   - Use Supabase service key for admin operations
   - Never commit `.env` file

6. **Enable HTTPS**
   - Use HTTPS in production only
   - Set secure cookie flags
   - Implement HSTS headers

7. **Add Logging**
   - Log authentication attempts
   - Monitor suspicious activity
   - Use Winston or similar logger

## Testing Checklist

- [ ] Database tables created
- [ ] Backend starts without errors
- [ ] Backend health check works
- [ ] Frontend starts without errors
- [ ] User registration works
- [ ] Login works with correct credentials
- [ ] Login fails with incorrect credentials
- [ ] Forgot password generates OTP
- [ ] OTP verification works
- [ ] Password reset works
- [ ] Security questions can be saved
- [ ] Security answers can be verified
- [ ] Support ticket can be created
- [ ] User agreement can be accepted
- [ ] CORS errors resolved
- [ ] Frontend pages load correctly

## Support

For issues or questions:
1. Check the error messages in backend console
2. Check browser DevTools Network tab
3. Check Supabase logs for database errors
4. Review code comments in service files
5. Check this guide's troubleshooting section

## Next Steps

After successful testing:
1. Implement password hashing (bcrypt)
2. Implement proper JWT tokens
3. Set up email service for OTP delivery
4. Add rate limiting
5. Add request logging and audit trails
6. Deploy to staging environment
7. Run security audit
8. Deploy to production
