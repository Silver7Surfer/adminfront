import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import authService from '../../../services/authService';

const NoAuthLayout = () => {
  const location = useLocation();
  
  // Use the auth service to check authentication status
  const isAuthenticated = authService.isAuthenticated();
  
  if (isAuthenticated) {
    // Redirect to the dashboard, preserving any intended location
    const from = location.state?.from?.pathname || '/admin/dashboard';
    return <Navigate to={from} replace />;
  }
  
  return <Outlet />;
};

export default NoAuthLayout;