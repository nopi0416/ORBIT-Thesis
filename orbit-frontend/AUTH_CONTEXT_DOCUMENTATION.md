# AuthContext Documentation - Frontend

## Overview
The `AuthContext` manages user authentication state and provides methods for login, logout, and user session management. All user details are automatically stored in localStorage for persistence across page refreshes.

## File Location
`src/context/AuthContext.jsx`

## State Management

### User State
```javascript
const [user, setUser] = useState(null);
```
- Stores current logged-in user details
- Can be null (not logged in) or object with user data

### Loading State
```javascript
const [loading, setLoading] = useState(true);
```
- Used during authentication checks and API calls
- Prevents rendering before auth is verified

## Core Functions

### 1. `setUserWithStorage(userData)`
Custom wrapper that manages both state and localStorage:

**When called with user data:**
```javascript
setUserWithStorage({
  id: "user-id",
  email: "user@example.com",
  first_name: "John",
  last_name: "Doe",
  department: "Engineering",
  status: "active",
  role: "L1"
});
```
- Saves user data to `localStorage.authUser`
- Updates React state with user data
- Automatically persists across browser refreshes

**When called with null:**
```javascript
setUserWithStorage(null);
```
- Removes `authUser` from localStorage
- Clears user state
- Used during logout

### 2. `login(credentials)`
Initiates login with email and password:

```javascript
const result = await login({
  email: "user@example.com",
  password: "password123"
});
```

**Returns:**
- OTP required: `{ success: true, requiresOTP: true, email: "..." }`
- Direct login: `{ success: true }`
- Error: `{ success: false, error: "..." }`

**What happens:**
- Sends credentials to `/api/auth/login`
- Stores JWT token in `localStorage.authToken`
- Returns OTP requirement status

### 3. `completeLogin(email, otp)`
Completes login with OTP verification:

```javascript
const result = await completeLogin("user@example.com", "123456");
```

**Returns:**
- User agreement required: `{ success: true, requiresUserAgreement: true, userId: "...", role: "..." }`
- Password change required: `{ success: true, requiresPasswordChange: true, ... }`
- Login complete: `{ success: true }`
- Error: `{ success: false, error: "..." }`

**What happens:**
- Sends email and OTP to `/api/auth/complete-login`
- Stores JWT token in `localStorage.authToken`
- Stores user data via `setUserWithStorage()`
- Checks if first-time user needs agreement/password change

### 4. `logout()`
Clears user session:

```javascript
logout();
```

**What happens:**
- Calls `setUserWithStorage(null)` to clear everything
- Removes `authToken` from localStorage
- Removes `authUser` from localStorage
- Resets user state to null

## LocalStorage Keys

### `authToken`
- **Type**: String (JWT)
- **Contents**: JWT token with user ID, email, role
- **Expiry**: 24 hours
- **Auto-cleared on logout**: Yes

### `authUser`
- **Type**: JSON string
- **Contents**: User details object
- **Structure**:
  ```json
  {
    "id": "uuid",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "department": "Engineering",
    "status": "active",
    "role": "L1"
  }
  ```
- **Auto-cleared on logout**: Yes

## Usage in Components

### Access User Data
```javascript
import { useAuth } from '../context/AuthContext';

function MyComponent() {
  const { user, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Not logged in</div>;
  
  return <div>Welcome, {user.first_name}!</div>;
}
```

### Login
```javascript
const { login } = useAuth();

const handleLogin = async () => {
  const result = await login({
    email: "user@example.com",
    password: "password123"
  });
  
  if (result.success) {
    // Handle OTP if required
    if (result.requiresOTP) {
      // Show OTP page
    }
  }
};
```

### Logout
```javascript
const { logout } = useAuth();

const handleLogout = () => {
  logout();
  navigate('/login');
};
```

### Set User Manually
```javascript
const { setUser } = useAuth();

// After completing security questions
setUser({
  id: userId,
  email: email,
  first_name: "John",
  last_name: "Doe",
  department: "Engineering",
  status: "active",
  role: "L1"
});
// Automatically saves to localStorage!
```

## Initialization Flow

1. **App Mount**: `useEffect` runs once
2. **Check Token**: Looks for `authToken` in localStorage
3. **Restore Session**: If token exists, restores `authUser` from localStorage
4. **Set Loading**: Sets `loading = false` once complete
5. **Ready**: Component renders with user data or null

## Error Handling

All methods return a consistent error structure:
```javascript
{
  success: false,
  error: "Error message describing what went wrong"
}
```

Check `result.success` before proceeding with the response.

## Security Notes

⚠️ **Important**:
- JWT tokens are stored in localStorage (not httpOnly, but standard for SPAs)
- User details in localStorage are plain text (but public data only)
- Passwords are NEVER stored in localStorage
- Token expires after 24 hours
- Token is removed on logout

## Integration Points

- **Login.jsx**: Uses `login()` and `completeLogin()`
- **SecurityQuestions.jsx**: Uses `setUser()` to store user after first-time setup
- **Logout**: Used in navigation/profile pages
- **ProtectedRoutes**: Checks `user` and `loading` states

