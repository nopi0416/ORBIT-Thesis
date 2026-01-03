# ORBIT Authentication API - Quick Reference

## Base URL
```
http://localhost:3001/api
```

## Authentication Endpoints

### 1. Register User
**Endpoint:** `POST /auth/register`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "role": "requestor"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "requestor"
  }
}
```

**Error (400 Bad Request):**
```json
{
  "success": false,
  "error": "Password must contain at least one uppercase letter"
}
```

---

### 2. Login
**Endpoint:** `POST /auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJ...",
    "userId": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "requestor"
  }
}
```

**Error (401 Unauthorized):**
```json
{
  "success": false,
  "error": "Invalid email or password"
}
```

---

### 3. Forgot Password (Request OTP)
**Endpoint:** `POST /auth/forgot-password`

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "If an account exists, an OTP has been sent to your email"
}
```

**Note:** Response is same for existing/non-existing emails (security)

---

### 4. Verify OTP
**Endpoint:** `POST /auth/verify-otp`

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456",
  "type": "reset"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "OTP verified successfully"
}
```

**Error (400 Bad Request):**
```json
{
  "success": false,
  "error": "Invalid or expired OTP"
}
```

---

### 5. Reset Password
**Endpoint:** `POST /auth/reset-password`

**Request Body:**
```json
{
  "email": "user@example.com",
  "newPassword": "NewSecurePass456!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Error (400 Bad Request):**
```json
{
  "success": false,
  "error": "Password must be at least 8 characters long"
}
```

---

### 6. Change Password
**Endpoint:** `POST /auth/change-password`

**Request Body:**
```json
{
  "email": "user@example.com",
  "currentPassword": "OldPass123!",
  "newPassword": "NewSecurePass456!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Error (400 Bad Request):**
```json
{
  "success": false,
  "error": "Current password is incorrect"
}
```

---

### 7. First Time Password Setup
**Endpoint:** `POST /auth/first-time-password`

**Request Body:**
```json
{
  "email": "user@example.com",
  "currentPassword": "TempPassword123",
  "newPassword": "NewSecurePass456!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

### 8. Resend OTP
**Endpoint:** `POST /auth/resend-otp`

**Request Body:**
```json
{
  "email": "user@example.com",
  "type": "reset"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "If an account exists, an OTP has been sent to your email"
}
```

---

## Security Endpoints

### 9. Save Security Questions
**Endpoint:** `POST /auth/security-questions`

**Request Body:**
```json
{
  "userId": "uuid",
  "question1": "What was the name of your first pet?",
  "answer1": "Fluffy",
  "question2": "What city were you born in?",
  "answer2": "New York",
  "question3": "What is your mother's maiden name?",
  "answer3": "Smith"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Security questions saved successfully"
}
```

**Error (400 Bad Request):**
```json
{
  "success": false,
  "error": {
    "duplicateQuestion": "Please select different questions for each security question"
  }
}
```

---

### 10. Verify Security Answers
**Endpoint:** `POST /auth/verify-security-answers`

**Request Body:**
```json
{
  "email": "user@example.com",
  "answer1": "Fluffy",
  "answer2": "New York",
  "answer3": "Smith"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Security answers verified successfully"
}
```

**Error (400 Bad Request):**
```json
{
  "success": false,
  "error": "One or more security answers are incorrect"
}
```

---

## Support Endpoints

### 11. Create Support Ticket
**Endpoint:** `POST /auth/support-ticket`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "issueType": "password_reset",
  "description": "I forgot my password and need help recovering my account"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Support ticket created successfully",
  "data": {
    "ticketId": "uuid",
    "status": "open"
  }
}
```

**Error (400 Bad Request):**
```json
{
  "success": false,
  "error": {
    "description": "Description must be at least 10 characters"
  }
}
```

---

### 12. Accept User Agreement
**Endpoint:** `POST /auth/user-agreement`

**Request Body:**
```json
{
  "userId": "uuid",
  "accepted": true,
  "version": "1.0"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User agreement accepted successfully"
}
```

**Error (400 Bad Request):**
```json
{
  "success": false,
  "error": "You must accept the user agreement to continue"
}
```

---

## Error Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created (resource created) |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (invalid credentials) |
| 500 | Internal Server Error |

---

## Password Requirements

All passwords must meet these criteria:
- ✅ Minimum 8 characters
- ✅ At least 1 uppercase letter (A-Z)
- ✅ At least 1 lowercase letter (a-z)
- ✅ At least 1 number (0-9)
- ✅ At least 1 special character (!@#$%^&*()_+-=[]{};":\\|,.<>/?)

**Valid Example:** `SecurePassword123!`

---

## User Roles

Supported roles:
- `requestor` - Budget request submitter
- `l1` - Level 1 approver
- `l2` - Level 2 approver
- `l3` - Level 3 approver
- `payroll` - Payroll administrator

---

## OTP Information

- **Length:** 6 digits
- **Expiration:** 10 minutes
- **Format:** Numeric only
- **Type:** Can be "reset" or "register"
- **Development:** Check backend console for OTP (will be printed there)
- **Production:** OTP will be sent via email (requires email service integration)

---

## Testing with Curl

### Login Example
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

### Register Example
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe",
    "role": "requestor"
  }'
```

### Forgot Password Example
```bash
curl -X POST http://localhost:3001/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

---

## Important Notes

1. **Token Storage:** Frontend stores token in `localStorage.authToken`
2. **User Data:** Frontend stores user info in `localStorage.authUser`
3. **CORS:** Ensure backend CORS allows http://localhost:5173
4. **API URL:** Frontend expects backend at http://localhost:3001
5. **Development:** OTPs printed to backend console
6. **Production:** Before deploying, implement bcrypt, JWT, and email service

---

## Common Issues

**CORS Errors?**
- Ensure backend is running on 3001
- Check CORS config in `orbit-backend/src/config/cors.js`
- Verify http://localhost:5173 is in allowed origins

**OTP Not Working?**
- Check backend console for OTP value
- Verify OTP hasn't expired (10 minutes)
- Check `tblotp` table in Supabase

**Login Fails?**
- Verify user exists in `tblusers` table
- Check password is correct
- Check user is_active = true

**Password Validation Failed?**
- Ensure password meets all 5 requirements
- Check for typos in special characters
- Example valid: `SecurePassword123!`

---

**Last Updated:** January 3, 2026
**Status:** Ready for Testing
