import React from 'react';
import { Routes, Route } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';
import Dashboard from '../pages/Dashboard';
import BudgetRequest from '../pages/BudgetRequest';
import Approval from '../pages/Approval';
import Organization from '../pages/Organization';
import Profile from '../pages/Profile';

// Main App Router Component
export const AppRouter = () => {
  return (
    <Routes>
      {/* Protected routes with dashboard layout */}
      <Route path="/" element={
        <DashboardLayout>
          <Dashboard />
        </DashboardLayout>
      } />
      <Route path="/dashboard" element={
        <DashboardLayout>
          <Dashboard />
        </DashboardLayout>
      } />
      
      {/* Budget Configuration page (renamed from budget-request) */}
      <Route path="/budget-configuration" element={
        <DashboardLayout>
          <BudgetRequest />
        </DashboardLayout>
      } />
      
      {/* New Approval page */}
      <Route path="/approval" element={
        <DashboardLayout>
          <Approval />
        </DashboardLayout>
      } />
      
      {/* Organization page */}
      <Route path="/organization" element={
        <DashboardLayout>
          <Organization />
        </DashboardLayout>
      } />
      
      {/* Profile page */}
      <Route path="/profile" element={
        <DashboardLayout>
          <Profile />
        </DashboardLayout>
      } />
      
      {/* Login page without layout - for future implementation */}
      <Route path="/login" element={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Login</h1>
            <p className="text-muted-foreground">Login Page - Coming Soon</p>
          </div>
        </div>
      } />
    </Routes>
  );
};

export default AppRouter;