# ORBIT Login System - Testing Guide

## Quick Test Flows

### 1. Password Reset Flow (Start to Finish)
```
1. Navigate to: http://localhost:5174/forgot-password
2. Enter email: test@example.com
3. Click "Send Reset Link"
4. Redirects to: /verify-otp?email=test@example.com&type=reset
5. Enter any 6 digits (e.g., 123456)
6. Click "Verify Code"
7. Redirects to: /reset-password?email=test@example.com
8. Enter current password: (any password)
9. Enter new password: (must meet requirements: 8+ chars, uppercase, lowercase, number, symbol)
   - Example: Password123!
10. Confirm new password
11. Click "Reset Password"
12. Redirects to: /login (with success message)
```

### 2. First-Time Login Flow (User Agreement → Security Questions → Password Setup)
```
1. Navigate to: http://localhost:5174/verify-otp?email=test@example.com&type=login
2. Enter any 6 digits (e.g., 123456)
3. Click "Verify Code"
4. Redirects to: /user-agreement?email=test@example.com&role=requestor
5. Scroll through and read the user agreement
6. Check "I have read and agree..."
7. Click "Accept & Continue"
8. Redirects to: /security-questions?email=test@example.com&role=requestor
9. Select 3 different security questions from dropdown
10. Enter 2+ character answers for each
11. Click "Continue"
12. Redirects to: /first-time-password?email=test@example.com&role=requestor
13. Enter current password: demo123
14. Enter new password: MyPassword123! (with all requirements)
15. Confirm new password
16. Click "Complete Setup"
17. Redirects to: /user-agreement (second time as final step)
    (In production, this would redirect to dashboard)
```

### 3. Direct Page Access (For Testing Individual Pages)

#### Verify OTP Page
- Reset flow: `http://localhost:5174/verify-otp?email=test@example.com&type=reset`
- Login flow: `http://localhost:5174/verify-otp?email=test@example.com&type=login`
- Default: `http://localhost:5174/verify-otp?email=test@example.com`

#### Reset Password Page
`http://localhost:5174/reset-password?email=test@example.com`

#### User Agreement Page
`http://localhost:5174/user-agreement?email=test@example.com&role=requestor`

#### Security Questions Page
`http://localhost:5174/security-questions?email=test@example.com&role=requestor`

#### First-Time Password Page
`http://localhost:5174/first-time-password?email=test@example.com&role=requestor`

---

## Key Features to Test

### 1. OTP Page Testing
- [x] 6 separate digit inputs with auto-focus
- [x] Paste support (paste 6 digits into any input)
- [x] Backspace navigation (go back between inputs)
- [x] 5-minute countdown timer
- [x] Red warning at < 60 seconds remaining
- [x] Resend button with 60-second cooldown
- [x] Type-based routing (reset vs login vs default)

### 2. Password Strength Validation
- Real-time requirement checking:
  - [x] Minimum 8 characters
  - [x] At least 1 uppercase letter (A-Z)
  - [x] At least 1 lowercase letter (a-z)
  - [x] At least 1 number (0-9)
  - [x] At least 1 special symbol (!@#$%...)
  - [x] Password confirmation matches
- Green checkmark (✓) when requirement met
- Gray X when requirement not met

### 3. Security Questions
- [x] 3 independent dropdowns
- [x] Cannot select same question twice (options disabled)
- [x] Text input for answers
- [x] 2+ character validation
- [x] All 3 questions must be answered

### 4. Form Validation
- [x] Email format validation (on forgot password & login)
- [x] Required field validation (all pages)
- [x] Real-time error display
- [x] Error clearing on input change
- [x] Disabled submit when validation fails

### 5. UI/UX Elements
- [x] Back button on all pages
- [x] Loading spinner during submission
- [x] Gradient background with overlays
- [x] Smooth animations
- [x] Proper error styling (red alert)
- [x] Proper success states

---

## Demo Credentials

### For First-Time Password Setup
- **Current Password**: `demo123`
- **New Password Example**: `MyPassword123!`
  - Has 8+ characters ✓
  - Has uppercase (M, P) ✓
  - Has lowercase (yassword) ✓
  - Has number (123) ✓
  - Has symbol (!) ✓

### For Password Reset
- **Any current password** (validation is disabled in demo)
- **New Password**: Same requirements as above

---

## Browser Testing Checklist

- [ ] All pages load without errors
- [ ] Navigation between pages works
- [ ] Back buttons work correctly
- [ ] Forms submit without errors
- [ ] Validation errors display properly
- [ ] Loading states work
- [ ] Timer counts down correctly
- [ ] OTP input handles paste correctly
- [ ] Password strength indicators update in real-time
- [ ] Disabled select options work (security questions)
- [ ] All routes respond to query parameters

---

## Common Test Cases

### Test Case 1: Incomplete OTP
1. Go to verify OTP
2. Enter only 3 digits
3. Try to submit
4. ✓ Should show error "Please enter the complete 6-digit code"

### Test Case 2: Password Mismatch
1. Go to reset password
2. Enter different passwords in confirm field
3. ✓ Should show error and disable submit button

### Test Case 3: Missing Security Question Answer
1. Go to security questions
2. Select 3 questions but don't fill all answers
3. Try to submit
4. ✓ Should show error "Please answer all three security questions"

### Test Case 4: Duplicate Security Question
1. Go to security questions
2. Select same question twice
3. ✓ Second dropdown should show that option as disabled

### Test Case 5: User Agreement Not Accepted
1. Go to user agreement
2. Try to click "Accept & Continue" without checking checkbox
3. ✓ Should show error

---

## Notes

- All pages simulate API calls with `setTimeout` delays
- Demo uses mock data (no real backend)
- Sessions are stored in browser memory only
- Refresh page will reset current form state
- Query parameters are used to pass state between pages

---

## Troubleshooting

**Page shows blank screen:**
- Clear browser cache
- Hard refresh (Ctrl+Shift+R)
- Check browser console for errors
- Verify URL has correct query parameters

**Navigation not working:**
- Check that the URL path is correct
- Ensure query parameters are properly encoded
- Check browser console for React Router errors

**Form validation not showing:**
- Click input field and start typing
- Validation shows in real-time
- Submit button becomes disabled when validation fails

**OTP timer expired:**
- Click "Resend OTP" to get new code
- Wait for 60-second resend cooldown
- Timer resets to 5 minutes

---

**Status**: ✅ Ready for Testing
**Last Updated**: December 2024
