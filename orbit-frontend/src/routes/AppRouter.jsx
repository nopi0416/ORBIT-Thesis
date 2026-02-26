import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../layouts/DashboardLayout';
import Dashboard from '../pages/Dashboard';
import BudgetRequest from '../pages/BudgetRequest';
import Approval from '../pages/Approval';
import Organization from '../pages/Organization';
import Profile from '../pages/Profile';
import Login from '../pages/Login';
import ForgotPassword from '../pages/ForgotPassword';
import SupportTicket from '../pages/SupportTicket';
import VerifyOTP from '../pages/VerifyOTP';
import ResetPassword from '../pages/ResetPassword';
import SecurityQuestions from '../pages/SecurityQuestions';
import FirstTimePassword from '../pages/FirstTimePassword';
import UserAgreement from '../pages/UserAgreement';
import AdminDashboard from '../pages/admin/AdminDashboard';
import AdminLogs from '../pages/admin/AdminLogs';
import AdminUserManagement from '../pages/admin/AdminUserManagement';
import AdminOUManagement from '../pages/admin/AdminOUManagement';
import AdminProfile from '../pages/admin/AdminProfile';

// Role-based Route Protection Component
const AdminRoute = ({ children }) => {
  const { user } = useAuth();
  const normalizedRole = (user?.role || '').toLowerCase();
  const isAdmin = normalizedRole.includes('admin');
  
  // If not admin, redirect to dashboard
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

// Main App Router Component
export const AppRouter = () => {
  return (
    <Routes>
      {/* Redirect root to login or dashboard based on auth */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      
      {/* Protected routes with dashboard layout */}
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

      {/* Admin Routes - Protected by role check */}
      <Route path="/admin" element={
        <AdminRoute>
          <DashboardLayout>
            <AdminDashboard />
          </DashboardLayout>
        </AdminRoute>
      } />
      <Route path="/admin/dashboard" element={
        <AdminRoute>
          <DashboardLayout>
            <AdminDashboard />
          </DashboardLayout>
        </AdminRoute>
      } />
      <Route path="/admin/logs" element={
        <AdminRoute>
          <DashboardLayout>
            <AdminLogs />
          </DashboardLayout>
        </AdminRoute>
      } />
      <Route path="/admin/users" element={
        <AdminRoute>
          <DashboardLayout>
            <AdminUserManagement />
          </DashboardLayout>
        </AdminRoute>
      } />
      <Route path="/admin/organizations" element={
        <AdminRoute>
          <DashboardLayout>
            <AdminOUManagement />
          </DashboardLayout>
        </AdminRoute>
      } />
      <Route path="/admin/profile" element={
        <AdminRoute>
          <DashboardLayout>
            <AdminProfile />
          </DashboardLayout>
        </AdminRoute>
      } />

      <Route path="/admin/settings" element={<Navigate to="/admin/profile" replace />} />
      
      {/* Login page without layout */}
      <Route path="/login" element={<Login />} />

      {/* Forgot Password page without layout */}
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* Support Ticket page without layout */}
      <Route path="/support-ticket" element={<SupportTicket />} />

      {/* Verify OTP page without layout */}
      <Route path="/verify-otp" element={<VerifyOTP />} />

      {/* Reset Password page without layout */}
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Security Questions page without layout */}
      <Route path="/security-questions" element={<SecurityQuestions />} />

      {/* First Time Password page without layout */}
      <Route path="/first-time-password" element={<FirstTimePassword />} />

      {/* User Agreement page without layout */}
      <Route path="/user-agreement" element={<UserAgreement />} />
    </Routes>
  );
};

export default AppRouter;