import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import Login from './pages/Login';
import Signup from './pages/Signup';
import MerchantDashboard from './pages/merchant/Dashboard';
import ReviewerQueue from './pages/reviewer/Queue';
import SubmissionDetail from './pages/reviewer/SubmissionDetail';

function ProtectedRoute({ children, requiredRole }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={user.role === 'reviewer' ? '/reviewer/queue' : '/merchant/dashboard'} replace />;
  }
  return children;
}

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'reviewer' ? '/reviewer/queue' : '/merchant/dashboard'} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Merchant */}
      <Route path="/merchant/dashboard" element={
        <ProtectedRoute requiredRole="merchant"><MerchantDashboard /></ProtectedRoute>
      } />

      {/* Reviewer */}
      <Route path="/reviewer/queue" element={
        <ProtectedRoute requiredRole="reviewer"><ReviewerQueue /></ProtectedRoute>
      } />
      <Route path="/reviewer/submission/:id" element={
        <ProtectedRoute requiredRole="reviewer"><SubmissionDetail /></ProtectedRoute>
      } />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
