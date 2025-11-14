import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Mock user data - replace with actual API calls
  useEffect(() => {
    // Simulate loading user data
    const mockUser = {
      id: '1',
      name: 'John Doe',
      email: 'john.doe@example.com',
      role: 'requestor', // can be: 'requestor', 'l1', 'l2', 'l3', 'payroll'
    };
    
    // Simulate API delay
    setTimeout(() => {
      setUser(mockUser);
      setLoading(false);
    }, 1000);
  }, []);

  const login = async (credentials) => {
    // Implement login logic
    setLoading(true);
    try {
      // Mock login - replace with actual API call
      const mockUser = {
        id: '1',
        name: credentials.email.split('@')[0],
        email: credentials.email,
        role: 'requestor',
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
};