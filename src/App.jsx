import React, { useEffect } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { isServiceWorkerSupported, registerServiceWorker } from '../services/PushNotificationService';

// Import layout components
import AuthLayout from './components/layout/AuthLayout';
import NoAuthLayout from './components/layout/NoAuthLayout';
import AdminLayout from './components/layout/AdminLayout';

// Import auth components
import LoginPage from './components/auth/LoginPage';
import SignupPage from './components/auth/SignupPage';

// Import admin components
import Dashboard from './components/admin/Dashboard';
import UsersPage from './components/admin/UsersPage';
import ManageGamePage from './components/admin/ManageGamePage'; // Import the new ManageGamePage component
//import ReportsPage from './components/admin/ReportsPage';
import UserFundManagementPage from './components/admin/UserFundManagementPage';
import SettingsPage from './components/admin/SettingsPage';

const NotFoundPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
      <p className="text-xl text-gray-600 mb-8">Page not found</p>
      <a href="/" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
        Go back home
      </a>
    </div>
  </div>
);

// Define the router with route groups
const router = createBrowserRouter([
  // Public routes - No Auth Required
  {
    path: '/',
    element: <NoAuthLayout />,
    children: [
      {
        path: 'login',
        element: <LoginPage />
      },
      {
        path: 'signup',
        element: <SignupPage />
      },
      {
        path: '',
        element: <Navigate to="/login" replace />
      }
    ]
  },
  
  // Protected routes - Auth Required
  {
    path: '/admin',
    element: <AuthLayout />,
    children: [
      {
        path: '',
        element: <AdminLayout />,
        children: [
          {
            path: 'dashboard',
            element: <Dashboard />
          },
          {
            path: 'users',
            element: <UsersPage />
          },
          {
            path: 'manage-game', // Changed from 'products' to 'manage-game'
            element: <ManageGamePage /> // Changed from ProductsPage to ManageGamePage
          },
          {
            path: 'fund-management',
            element: <UserFundManagementPage />
          },
          {
            path: 'settings',
            element: <SettingsPage />
          },
          {
            path: '',
            element: <Navigate to="/admin/dashboard" replace />
          }
        ]
      }
    ]
  },
  
  // Catch all route for 404
  {
    path: '*',
    element: <NotFoundPage />
  }
]);

function App() {
  // Register service worker for push notifications
  useEffect(() => {
    // Register service worker if supported
    if (isServiceWorkerSupported()) {
      registerServiceWorker()
        .then(registration => {
          console.log('Service Worker registered successfully');
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, []);

  return <RouterProvider router={router} />;
}

export default App;