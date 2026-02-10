/* eslint-disable react-refresh/only-export-components */
/**
 * AuthContext - Frontend Authentication Management
 * 
 * Manages user authentication state and provides methods for login, logout, and user session management.
 * All user details are automatically stored in localStorage for persistence across page refreshes.
 * 
 * ## Key Features:
 * - JWT token management (stored in localStorage.authToken)
 * - User details persistence (stored in localStorage.authUser)
 * - Automatic session restoration on page refresh
 * - OTP-based login flow
 * - First-time user setup detection
 * - Automatic logout with localStorage cleanup
 * 
 * ## LocalStorage Keys:
 * - authToken: JWT token (24-hour expiry)
 * - authUser: User details JSON object
 * 
 * ## User Object Structure:
 * {
 *   id: "uuid",
 *   email: "user@example.com",
 *   first_name: "John",
 *   last_name: "Doe",
 *   department: "Engineering",
 *   status: "active",
 *   role: "L1"
 * }
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

export const AuthContext = createContext();

/**
 * Custom hook to access AuthContext
 * 
 * @returns {Object} Auth context with user, setUser, login, completeLogin, logout, loading
 * @throws {Error} If used outside of AuthProvider
 * 
 * @example
 * const { user, login, logout } = useAuth();
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }) {
  /**
   * USER STATE
   * Stores current logged-in user details
   * Can be null (not logged in) or object with user data
   * 
   * Structure:
   * {
   *   id: string (user_id from database)
   *   email: string
   *   first_name: string
   *   last_name: string
   *   department: string
   *   status: string ('active', 'inactive', 'suspended')
   *   role: string ('L1', 'L2', 'L3', 'Requestor', 'Admin', 'Payroll')
   * }
   */
  const [user, setUser] = useState(null);
  
  /**
   * LOADING STATE
   * Used during authentication checks and API calls
   * Prevents rendering before auth is verified
   * Set to false once initial auth check completes
   */
  const [loading, setLoading] = useState(true);

  /**
   * Custom wrapper for setUser that automatically saves user to localStorage
   * 
   * WHEN CALLED WITH USER DATA:
   * - Saves user details to localStorage.authUser (JSON string)
   * - Saves session ID to localStorage.auth_session (unique session identifier)
   * - Saves expiration info to localStorage.session_cache (JSON with expiresAt timestamp)
   * - Updates React state with user data
   * - Automatically persists across browser refreshes
   * 
   * WHEN CALLED WITH NULL:
   * - Removes authUser from localStorage
   * - Removes authToken from localStorage
   * - Removes auth_session from localStorage
   * - Removes session_cache from localStorage
   * - Clears user state
   * - Used during logout
   * 
   * STORAGE KEYS MANAGED:
   * ✓ authToken - JWT token (24-hour expiry)
   * ✓ authUser - User details
   * ✓ auth_session - Session identifier (unique ID for this login session)
   * ✓ session_cache - Session expiration: { expiresAt: ISO timestamp }
   * 
   * @param {Object|null} userData - User object or null to clear
   * 
   * @example
   * // Store user in localStorage and state
   * setUserWithStorage({
   *   id: "123",
   *   email: "user@example.com",
   *   first_name: "John",
   *   last_name: "Doe",
   *   department: "Engineering",
   *   status: "active",
   *   role: "L1"
   * });
   * 
   * // Clear user from localStorage and state
   * setUserWithStorage(null);
   */
  const setUserWithStorage = (userData) => {
    if (userData) {
      // Store user details in localStorage
      localStorage.setItem('authUser', JSON.stringify(userData));
      
      // Create and store session identifier as UUID v4
      const sessionId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
      localStorage.setItem('auth_session', sessionId);
      
      // Create and store session expiration cache
      // Token expires in 24 hours from now
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      localStorage.setItem('session_cache', JSON.stringify({ expiresAt }));
      
      setUser(userData);
    } else {
      // Clear all auth-related keys from localStorage on logout
      const keysToRemove = ['authUser', 'authToken', 'auth_session', 'session_cache'];
      keysToRemove.forEach(key => {
        if (localStorage.getItem(key)) {
          console.log(`[AUTH] Clearing localStorage key on logout: ${key}`);
          localStorage.removeItem(key);
        }
      });
      setUser(null);
      setUser(null);
    }
  };

  /**
   * INITIALIZATION FLOW - Runs once on component mount
   * 
   * 1. Clears all old localStorage keys from previous implementation
   * 2. Checks for existing authToken in localStorage
   * 3. Verifies token is still valid on the backend
   * 4. If token is valid, restores user from localStorage.authUser
   * 5. If token is invalid/expired, clears all auth data
   * 6. Sets loading = false once complete
   * 
   * CLEARS OLD KEYS: auth_token, auth_user, demoUser, auth_session, session_cache
   * KEEPS ONLY: authToken, authUser (when logged in and token is valid)
   * 
   * FLOW:
   * App Mount → Clear Old Keys → Check Token → Verify Token Valid → Restore Session → Set Loading False → Ready
   */
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Clean up all old/unused localStorage keys
        const keysToRemove = ['auth_token', 'auth_user', 'demoUser', 'auth_session', 'session_cache'];
        keysToRemove.forEach(key => {
          if (localStorage.getItem(key)) {
            console.log(`[AUTH] Removing old localStorage key: ${key}`);
            localStorage.removeItem(key);
          }
        });

        const token = localStorage.getItem('authToken');
        if (token) {
          try {
            // Verify token is still valid by calling backend
            const response = await axios.post(`${API_URL}/auth/verify-token`, 
              { token },
              { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.success) {
              // Token is valid, restore user from localStorage
              const userStr = localStorage.getItem('authUser');
              if (userStr) {
                console.log('[AUTH] Token valid, restoring user session');
                setUser(JSON.parse(userStr));
              }
            } else {
              // Token is invalid, clear everything
              console.log('[AUTH] Token invalid or expired, clearing session');
              localStorage.removeItem('authToken');
              localStorage.removeItem('authUser');
            }
          } catch (error) {
            // Token verification failed, clear everything
            console.log('[AUTH] Token verification failed, clearing session:', error.message);
            localStorage.removeItem('authToken');
            localStorage.removeItem('authUser');
          }
        } else {
          // No token found, user is not logged in
          console.log('[AUTH] No token found, user not logged in');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  /**
   * LOGIN - Initiates login with email and password
   * 
   * ENDPOINT: POST /api/auth/login
   * 
   * WHAT IT DOES:
   * 1. Sends email and password to backend
   * 2. Backend verifies credentials and generates OTP
   * 3. Stores JWT token in localStorage.authToken
   * 4. Returns OTP requirement status
   * 
   * RETURN VALUES:
   * - OTP required: { success: true, requiresOTP: true, email: "user@example.com" }
   * - Direct login: { success: true }
   * - Error: { success: false, error: "Error message" }
   * 
   * NORMAL FLOW:
   * Login Page → POST /api/auth/login → VerifyOTP Page
   * 
   * @param {Object} credentials - { email, password }
   * @returns {Promise<Object>} Login result
   * 
   * @example
   * const { login } = useAuth();
   * const result = await login({
   *   email: "user@example.com",
   *   password: "password123"
   * });
   * 
   * if (result.requiresOTP) {
   *   // Show OTP verification page
   * }
   */
  const login = async (credentials) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        employeeId: credentials.employeeId,
        password: credentials.password,
      });

      if (response.data.success) {
        // Check if OTP is required (2-step login)
        if (response.data.data?.requiresOTP) {
          return { 
            success: true, 
            requiresOTP: true, 
            email: response.data.data.email,
            employeeId: response.data.data.employeeId 
          };
        }
        
        // Direct login (fallback, in case backend doesn't require OTP)
        const { token, userId, email, employeeId, firstName, lastName, role } = response.data.data;
        
        localStorage.setItem('authToken', token);
        const userData = { 
          id: userId, 
          name: `${firstName} ${lastName}`,
          email,
          employeeId,
          firstName,
          lastName,
          role 
        };
        
        // Use setUserWithStorage to save user and create auth_session + session_cache
        setUserWithStorage(userData);
        
        return { success: true, role };
      } else {
        return { success: false, error: response.data.error };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || error.message || 'Login failed' 
      };
    } finally {
      setLoading(false);
    }
  };

  /**
   * COMPLETE LOGIN - Verifies OTP and completes authentication
   * 
   * ENDPOINT: POST /api/auth/complete-login
   * 
   * WHAT IT DOES:
   * 1. Sends email and OTP to backend for verification
   * 2. Backend validates OTP and generates JWT token
   * 3. Fetches user details including role from database
   * 4. Checks if first-time login (is_first_login flag)
   * 5. Stores token and user data in localStorage
   * 
   * RETURN VALUES:
   * - First-time user: { success: true, requiresUserAgreement: true, userId, email, firstName, lastName, role }
   * - Password change needed: { success: true, requiresPasswordChange: true, userId, email }
   * - Normal login: { success: true }
   * - Error: { success: false, error: "Error message" }
   * 
   * FLOW OPTIONS:
   * 1. First-Time User: VerifyOTP → UserAgreement → PasswordChange → SecurityQuestions → Dashboard
   * 2. Returning User: VerifyOTP → Dashboard
   * 
   * @param {string} email - User email
   * @param {string} otp - 6-digit OTP code
   * @returns {Promise<Object>} Login completion result
   * 
   * @example
   * const { completeLogin } = useAuth();
   * const result = await completeLogin("user@example.com", "123456");
   * 
   * if (result.requiresUserAgreement) {
   *   // Redirect to user agreement page
   * } else {
   *   // Redirect to dashboard
   * }
   */
  const completeLogin = async (email, otp) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/complete-login`, {
        email,
        otp,
      });

      console.log('Complete login response:', response.data);
      console.log('requiresUserAgreement:', response.data.data?.requiresUserAgreement);

      if (response.data.success) {
        // Check if user agreement is required (first-time login)
        if (response.data.data?.requiresUserAgreement) {
          console.log('User agreement required for first-time login');
          return { 
            success: true, 
            requiresUserAgreement: true,
            userId: response.data.data?.userId,
            email: response.data.data?.email,
            firstName: response.data.data?.firstName,
            lastName: response.data.data?.lastName,
            role: response.data.data?.role
          };
        }

        // Check if password change is required
        if (response.data.requiresPasswordChange) {
          console.log('Password change required, storing temp data');
          return { 
            success: true, 
            requiresPasswordChange: true,
            userId: response.data.data?.userId,
            email: response.data.data?.email
          };
        }

        const { token, userId, firstName, lastName, role, email: respEmail } = response.data.data;
        
        console.log('Token:', token);
        console.log('UserId:', userId);
        console.log('FirstName:', firstName);
        console.log('LastName:', lastName);
        
        // Store token and user info
        if (!token) {
          return { success: false, error: 'No token received from server' };
        }

        localStorage.setItem('authToken', token);
        const userData = { 
          id: userId, 
          name: `${firstName || ''} ${lastName || ''}`.trim(),
          email: respEmail || email,
          firstName: firstName || '',
          lastName: lastName || '',
          role: role || 'user'
        };
        console.log('Storing user data:', userData);
        
        // Use setUserWithStorage to save user and create auth_session + session_cache
        setUserWithStorage(userData);
        
        return { success: true, role: role || 'user' };
      } else {
        return { success: false, error: response.data.error };
      }
    } catch (error) {
      console.error('Complete login error:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || error.message || 'OTP verification failed' 
      };
    } finally {
      setLoading(false);
    }
  };

  /**
   * LOGOUT - Clears user session and removes from localStorage
   * 
   * WHAT IT DOES:
   * 1. Calls setUserWithStorage(null) which removes ALL auth-related keys:
   *    - Removes authToken from localStorage
   *    - Removes authUser from localStorage
   *    - Removes auth_session from localStorage
   *    - Removes session_cache from localStorage
   *    - Clears user state to null
   * 2. Component will re-render with user = null
   * 3. Auth guard will redirect to login page
   * 4. localStorage is now completely empty (like before login)
   * 
   * RESULT: localStorage is empty
   * 
   * FLOW:
   * Click Logout → logout() → Clear all 4 keys → Clear state → Redirect to login
   * 
   * @example
   * const { logout } = useAuth();
   * 
   * const handleLogout = () => {
   *   logout();
   *   navigate('/login');
   * };
   */
  const logout = () => {
    setUserWithStorage(null);
  };

  /**
   * CONTEXT VALUE OBJECT
   * All methods and state exported to consumers via useAuth()
   * 
   * PROPERTIES:
   * - user: Current user object or null
   * - setUser: Function to manually set user (automatically saves to localStorage)
   * - login: Function to initiate login with email/password
   * - completeLogin: Function to verify OTP and complete login
   * - logout: Function to clear session
   * - loading: Boolean indicating auth check in progress
   * 
   * @example
   * const { user, login, logout, loading } = useAuth();
   */
  const value = {
    user,
    setUser: setUserWithStorage,
    login,
    completeLogin,
    logout,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}