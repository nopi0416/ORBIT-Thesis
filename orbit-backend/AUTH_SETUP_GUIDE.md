## ORBIT Backend Authentication System

This guide explains how to set up and use the authentication system for ORBIT.

### Database Setup

1. **Create Database Tables**
   - Log into your Supabase dashboard
   - Go to SQL Editor
   - Copy the contents of `DATABASE_SCHEMA.sql` 
   - Run the SQL to create all required tables

   The following tables will be created:
   - `tblusers` - User accounts
   - `tblotp` - One-Time Passwords for password reset
   - `tblsecurity_questions` - User security questions and answers
   - `tblsupport_tickets` - Help/support tickets
   - `tbluser_agreements` - User agreement acceptance records
   - `tblpassword_history` - Password change history (optional)
   - `tbllogin_audit` - Login attempt audit trail (optional)

2. **Verify Tables in Supabase**
   - Check the "Table Editor" in Supabase to confirm all tables are created
   - Verify the columns and types match the schema

### Environment Configuration

Ensure your `.env` file in `orbit-backend/` has:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_key
PORT=3001
```

### API Endpoints

#### Authentication Endpoints

**Register User**
```
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "role": "requestor"
}
```

**Login**
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

Response:
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "...",
    "userId": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "requestor"
  }
}
```

#### Password Management Endpoints

**Forgot Password (Request OTP)**
```
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Verify OTP**
```
POST /api/auth/verify-otp
Content-Type: application/json

{
  "email": "user@example.com",
  "otp": "123456",
  "type": "reset"
}
```

**Reset Password**
```
POST /api/auth/reset-password
Content-Type: application/json

{
  "email": "user@example.com",
  "newPassword": "NewSecurePass123!"
}
```

**Change Password**
```
POST /api/auth/change-password
Content-Type: application/json

{
  "email": "user@example.com",
  "currentPassword": "OldPass123!",
  "newPassword": "NewSecurePass123!"
}
```

**First Time Password Setup**
```
POST /api/auth/first-time-password
Content-Type: application/json

{
  "email": "user@example.com",
  "currentPassword": "TempPassword123",
  "newPassword": "NewSecurePass123!"
}
```

**Resend OTP**
```
POST /api/auth/resend-otp
Content-Type: application/json

{
  "email": "user@example.com",
  "type": "reset"
}
```

#### Security Questions Endpoints

**Save Security Questions**
```
POST /api/auth/security-questions
Content-Type: application/json

{
  "userId": "uuid-here",
  "question1": "What was the name of your first pet?",
  "answer1": "Fluffy",
  "question2": "What city were you born in?",
  "answer2": "New York",
  "question3": "What is your mother's maiden name?",
  "answer3": "Smith"
}
```

**Verify Security Answers**
```
POST /api/auth/verify-security-answers
Content-Type: application/json

{
  "email": "user@example.com",
  "answer1": "Fluffy",
  "answer2": "New York",
  "answer3": "Smith"
}
```

#### Support & Agreement Endpoints

**Create Support Ticket**
```
POST /api/auth/support-ticket
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "issueType": "password_reset",
  "description": "I forgot my password and need help recovering my account"
}
```

**Accept User Agreement**
```
POST /api/auth/user-agreement
Content-Type: application/json

{
  "userId": "uuid-here",
  "accepted": true,
  "version": "1.0"
}
```

### Password Requirements

Passwords must meet these criteria:
- At least 8 characters long
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)
- At least one special character (!@#$%^&*()_+-=[]{};":\\|,.<>/?)

### Frontend Integration

The frontend pages automatically call these endpoints:

1. **Login.jsx** → `POST /api/auth/login`
2. **ForgotPassword.jsx** → `POST /api/auth/forgot-password` 
3. **VerifyOTP.jsx** → `POST /api/auth/verify-otp` & `POST /api/auth/resend-otp`
4. **ResetPassword.jsx** → `POST /api/auth/reset-password`
5. **FirstTimePassword.jsx** → `POST /api/auth/first-time-password` & `POST /api/auth/security-questions`
6. **SecurityQuestions.jsx** → `POST /api/auth/verify-security-answers`
7. **SupportTicket.jsx** → `POST /api/auth/support-ticket`
8. **UserAgreement.jsx** → `POST /api/auth/user-agreement`

### Important Security Notes

⚠️ **TODO: These features need to be implemented in production:**

1. **Password Hashing** - Currently passwords are stored in plain text. Use `bcrypt` library:
   ```javascript
   import bcrypt from 'bcrypt';
   const hashedPassword = await bcrypt.hash(password, 10);
   ```

2. **JWT Token Implementation** - Replace the stub token generation with `jsonwebtoken`:
   ```javascript
   import jwt from 'jsonwebtoken';
   const token = jwt.sign({ userId, email, role }, process.env.JWT_SECRET, { expiresIn: '24h' });
   ```

3. **Email Service** - Integrate an email service (SendGrid, AWS SES, etc.) to actually send OTPs:
   ```javascript
   // In authService.js generateOTP() method
   await sendEmail(email, `Your ORBIT OTP: ${otp}`);
   ```

4. **Rate Limiting** - Add rate limiting to prevent brute force attacks
5. **HTTPS Only** - Ensure all authentication endpoints are HTTPS only
6. **CORS** - Verify CORS is properly configured in `src/config/cors.js`

### Testing

1. **Start Backend**
   ```bash
   cd orbit-backend
   npm install
   npm run dev
   ```

2. **Test Endpoints**
   Use Postman or curl to test endpoints:
   ```bash
   curl -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password"}'
   ```

3. **Check Database**
   - Log into Supabase
   - View data in table editor to see created records

### Debugging

- Check backend console logs: `npm run dev` outputs all errors
- Enable Supabase logs in dashboard
- Use browser DevTools Network tab to inspect API responses
- Check `.env` file is correctly set with Supabase credentials

### Next Steps

1. Implement password hashing (bcrypt)
2. Implement JWT token signing
3. Set up email service for OTP delivery
4. Add rate limiting middleware
5. Add logging/audit trails
6. Add session management
7. Implement refresh tokens
