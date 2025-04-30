import React from 'react';
import { Navigate } from 'react-router-dom';
import { isAdminAuthenticated } from '../services/authService';

const AdminProtectedRoute = ({ children }) => {
  if (!isAdminAuthenticated()) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
};

export default AdminProtectedRoute; 