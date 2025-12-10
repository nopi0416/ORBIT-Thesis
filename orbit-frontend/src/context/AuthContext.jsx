/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';

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
    // Simulate checking for existing auth token
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (token) {
          // Mock: Replace with actual API call to verify token
          const mockUser = {
            id: '1',
            name: 'John Doe',
            email: 'john.doe@example.com',
            role: 'requestor', // can be: 'requestor', 'l1', 'l2', 'l3', 'payroll'
          };
          setUser(mockUser);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (credentials) => {
    // Implement login logic
    setLoading(true);
    try {
      // Mock login - replace with actual API call
      const mockToken = 'mock-token-' + Date.now();
      localStorage.setItem('authToken', mockToken);
      
      const mockUser = {
        id: '1',
        name: credentials.email.split('@')[0],
        email: credentials.email,
        role: 'requestor', // can be: 'requestor', 'l1', 'l2', 'l3', 'payroll'
      };
      setUser(mockUser);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    // Clear any stored tokens
    localStorage.removeItem('authToken');
  };

  const value = {
    user,
    setUser,
    login,
    logout,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}