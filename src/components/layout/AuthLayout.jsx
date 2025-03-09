import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import authService from '../../../services/authService';

const AuthLayout = () => {
  // Use the auth service to check authentication status
  const isAuthenticated = authService.isAuthenticated();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  return <Outlet />;
};

export default AuthLayout;