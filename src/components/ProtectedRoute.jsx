import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isInstitutionAuthenticated, getCurrentInstitution } from '../services/authService';

const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const isAuthenticated = isInstitutionAuthenticated();
  const institution = getCurrentInstitution();

  if (!isAuthenticated) {
    // Redirect to login if not authenticated
    return <Navigate to="/institution/login" state={{ from: location }} replace />;
  }

  if (institution && institution.status !== 'approved') {
    // Redirect to under review page if not approved
    return <Navigate to="/institution/under-review" replace />;
  }

  return children;
};

export default ProtectedRoute; 