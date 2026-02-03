/**
 * Protected Route Component
 * Ensures user is authenticated and has required role to access a route
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { canAccessRoute } from '../utils/roleRouting';

export const ProtectedRoute = ({ 
  children, 
  requiredRole = null,
  fallbackRoute = '/login' 
}) => {
  const { user, loading } = useAuth();

  // Still loading auth state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <Navigate to={fallbackRoute} replace />;
  }

  // Check role-based access if required role is specified
  if (requiredRole && !canAccessRoute(user.role, requiredRole)) {
    console.warn(`User role '${user.role}' does not have access to route '${requiredRole}'`);
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
