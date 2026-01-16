/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

export const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session/token on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (token) {
          // TODO: Call backend to verify token validity
          // For now, parse the token and extract user info
          const userStr = localStorage.getItem('authUser');
          if (userStr) {
            setUser(JSON.parse(userStr));
          }
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

  const login = async (credentials) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email: credentials.email,
        password: credentials.password,
      });

      if (response.data.success) {
        // Check if OTP is required (2-step login)
        if (response.data.data?.requiresOTP) {
          return { success: true, requiresOTP: true, email: response.data.data.email };
        }
        
        // Direct login (fallback, in case backend doesn't require OTP)
        const { token, userId, email, firstName, lastName, role } = response.data.data;
        
        // Store token and user info
        localStorage.setItem('authToken', token);
        const userData = { 
          id: userId, 
          name: `${firstName} ${lastName}`,
          email,
          firstName,
          lastName,
          role 
        };
        localStorage.setItem('authUser', JSON.stringify(userData));
        setUser(userData);
        
        return { success: true };
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
        localStorage.setItem('authUser', JSON.stringify(userData));
        setUser(userData);
        
        return { success: true };
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

  const logout = () => {
    setUser(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
  };

  const value = {
    user,
    setUser,
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