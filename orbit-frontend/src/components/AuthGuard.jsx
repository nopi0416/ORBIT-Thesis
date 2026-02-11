import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const AuthGuard = ({ children, requireAuth = true }) => {
  const { user, loading } = useAuth();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  // If auth is required but user is not authenticated
  // If auth is required but user is not authenticated
  if (requireAuth && !user) {
    return <Navigate to="/login" replace />;
  }
  // If no auth required or user is authenticated
  return children;
};