import React, { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  initializeSocket,
  disconnectSocket,
  requestGameProfiles,
  requestGameStatistics,
  requestPendingWithdrawals,
  isSocketConnected,
  registerGameManagementHandlers,
  registerWithdrawalManagementHandlers
} from '../../../services/UnifiedSocketService';
import {
  isNotificationSupported,
  isServiceWorkerSupported,
  getNotificationPermission,
  requestNotificationPermission,
  registerServiceWorker
} from '../../../services/PushNotificationService';

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [withdrawalCount, setWithdrawalCount] = useState(0);
  const [socketConnected, setSocketConnected] = useState(false);
  const [notificationSupported, setNotificationSupported] = useState(false);
  const [serviceWorkerSupported, setServiceWorkerSupported] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [serviceWorkerRegistered, setServiceWorkerRegistered] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  
  // Initialize notification system and check permissions
  useEffect(() => {
    // Check if notifications are supported
    const supported = isNotificationSupported();
    setNotificationSupported(supported);
    
    // Check if service worker is supported
    const swSupported = isServiceWorkerSupported();
    setServiceWorkerSupported(swSupported);
    
    if (supported) {
      // Get current permission status
      const permission = getNotificationPermission();
      setNotificationPermission(permission);
      
      // If permission is granted, register service worker for push notifications
      if (permission === 'granted' && swSupported) {
        registerServiceWorkerIfNeeded();
      }
    }
    
    // Listen for messages from service worker
    if (navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }
    
    return () => {
      if (navigator.serviceWorker) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, []);
  
  // Listen for game notifications
  useEffect(() => {
    // Function to handle game notifications
    const handleGameNotifications = (event) => {
      const data = event.detail;
      if (data.success && data.statistics) {
        // Update notification count for badge
        const totalPending = (
          (data.statistics.totalPendingProfiles || 0) +
          (data.statistics.pendingCreditRequests || 0) +
          (data.statistics.pendingRedeemRequests || 0)
        );
        setNotificationCount(totalPending);
      }
    };

    // Add event listener
    window.addEventListener('gameStatistics', handleGameNotifications);
    
    // Clean up
    return () => {
      window.removeEventListener('gameStatistics', handleGameNotifications);
    };
  }, []);
  
  // Listen for withdrawal notifications
  useEffect(() => {
    // Function to handle withdrawal notifications
    const handleWithdrawalNotifications = (event) => {
      const data = event.detail;
      if (data.success && data.pendingWithdrawals) {
        // Count pending withdrawals
        const pendingCount = data.pendingWithdrawals.filter(w => w.status === 'pending').length;
        setWithdrawalCount(pendingCount);
      }
    };

    // Add event listener
    window.addEventListener('pendingWithdrawals', handleWithdrawalNotifications);
    
    // Clean up
    return () => {
      window.removeEventListener('pendingWithdrawals', handleWithdrawalNotifications);
    };
  }, []);
  
  // Initialize WebSocket connection
  useEffect(() => {
    console.log('AdminLayout: Initializing unified socket');
    
    // Set up socket connection status handler
    const handleSocketConnection = (event) => {
      setSocketConnected(event.detail.connected);
    };
    
    // Add connection status listener
    window.addEventListener('socketConnected', handleSocketConnection);
    
    // Register game management event handlers
    registerGameManagementHandlers({
      onConnect: () => {
        console.log('Game management connected in AdminLayout');
      },
      onDisconnect: () => {
        console.log('Game management disconnected in AdminLayout');
      },
      onAuthenticated: (response) => {
        console.log('Game management authenticated in AdminLayout', response);
        if (response.success) {
          // Request initial data
          requestGameProfiles();
          requestGameStatistics();
        }
      },
      onGameProfiles: (data) => {
        console.log('Game profiles received in AdminLayout');
        // Just update connection status - actual data handling is in ManageGamePage
      },
      onGameStatistics: (data) => {
        console.log('Game statistics received in AdminLayout');
        if (data.success && data.statistics) {
          // Update notification count for badge
          const totalPending = (
            (data.statistics.totalPendingProfiles || 0) +
            (data.statistics.pendingCreditRequests || 0) +
            (data.statistics.pendingRedeemRequests || 0)
          );
          setNotificationCount(totalPending);
        }
      },
      onError: (errorMsg) => {
        console.error('Game management error in AdminLayout:', errorMsg);
      }
    });
    
    // Register withdrawal management event handlers
    registerWithdrawalManagementHandlers({
      onAuthSuccess: (response) => {
        console.log('Withdrawal management authenticated in AdminLayout', response);
        if (response.success) {
          // Request initial withdrawal data
          requestPendingWithdrawals();
        }
      },
      onAuthFailure: (errorMsg) => {
        console.error('Withdrawal authentication failed in AdminLayout:', errorMsg);
      },
      onWithdrawalsReceived: (data) => {
        console.log('Withdrawal data received in AdminLayout');
        if (data.success && data.pendingWithdrawals) {
          // Count pending withdrawals
          const pendingCount = data.pendingWithdrawals.filter(w => w.status === 'pending').length;
          setWithdrawalCount(pendingCount);
        }
      },
      onError: (errorMsg) => {
        console.error('Withdrawal management error in AdminLayout:', errorMsg);
      }
    });
    
    // Initialize the socket connection
    initializeSocket();
    
    // Clean up
    return () => {
      window.removeEventListener('socketConnected', handleSocketConnection);
      disconnectSocket();
    };
  }, []);

  // Register service worker if needed
  const registerServiceWorkerIfNeeded = async () => {
    try {
      const registration = await registerServiceWorker();
      if (registration) {
        console.log('Service worker registered successfully in AdminLayout:', registration);
        setServiceWorkerRegistered(true);
        
        // Check for updates
        registration.update().catch(err => {
          console.error('Error updating service worker:', err);
        });
      }
    } catch (error) {
      console.error('Failed to register service worker:', error);
    }
  };

  // Handle messages from service worker
  const handleServiceWorkerMessage = (event) => {
    console.log('Received message from service worker in AdminLayout:', event.data);
    
    // Handle notification click from service worker
    if (event.data && event.data.type === 'NOTIFICATION_CLICK') {
      console.log('Notification clicked:', event.data);
      
      // Navigate to the appropriate page based on notification type
      if (event.data.notificationType === 'credit' || 
          event.data.notificationType === 'redeem' ||
          event.data.notificationType === 'gameId') {
        // Navigate to manage-game page
        navigate('/admin/manage-game');
      } else if (event.data.notificationType === 'withdrawal') {
        // Navigate to fund management page
        navigate('/admin/fund-management');
      }
    }
  };

  // Request notification permission
  const handleRequestPermission = async () => {
    try {
      const granted = await requestNotificationPermission();
      const newPermission = granted ? 'granted' : 'default';
      setNotificationPermission(newPermission);
      
      // If permission was granted, register service worker
      if (newPermission === 'granted' && serviceWorkerSupported) {
        await registerServiceWorkerIfNeeded();
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  };
  
  // Load user data and setup click handlers
  useEffect(() => {
    // Get current user data when component mounts
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        // Try to get user info from localStorage if available
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const userData = JSON.parse(userStr);
          setUser(userData);
        } else {
          // Fallback to a default user if not available
          setUser({
            username: 'Admin',
            email: 'admin@example.com',
            role: 'admin'
          });
        }
      } catch (err) {
        console.error('Error parsing user data:', err);
      }
    }
    
    // Add click event listener to close dropdown when clicking outside
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  
  // Monitor route changes to ensure socket connection
  useEffect(() => {
    console.log(`AdminLayout: Route changed to ${location.pathname}`);
    
    // Request fresh data when changing pages
    if (isSocketConnected()) {
      if (location.pathname === '/admin/manage-game') {
        requestGameProfiles();
        requestGameStatistics();
      } else if (location.pathname === '/admin/fund-management') {
        requestPendingWithdrawals();
      }
    }
  }, [location.pathname]);
  
  const navigation = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: 'home' },
    { name: 'Users', href: '/admin/users', icon: 'users' },
    { 
      name: 'Manage Game', 
      href: '/admin/manage-game', 
      icon: 'game',
      hasBadge: true,
      badgeCount: notificationCount
    },
    { 
      name: 'Fund Management', 
      href: '/admin/fund-management', 
      icon: 'money',
      hasBadge: true,
      badgeCount: withdrawalCount
    },
    { name: 'Settings', href: '/admin/settings', icon: 'cog' },
  ];
  
  const handleLogout = () => {
    // Clear authentication data
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    
    // Redirect to login page
    navigate('/login');
  };
  
  const getIcon = (iconName) => {
    switch (iconName) {
      case 'home':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        );
      case 'users':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        );
      case 'game':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
          </svg>
        );
      case 'money':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'cog':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      default:
        return null;
    }
  };
  
  // Get the first letter of username for avatar
  const getUserInitial = () => {
    if (user && user.username) {
      return user.username.charAt(0).toUpperCase();
    }
    return 'A';
  };
  
  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 flex md:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" aria-hidden="true"></div>
        </div>
      )}
      
      {/* Notification Permission Request */}
      {notificationSupported && notificationPermission !== 'granted' && (
        <div className="fixed bottom-0 inset-x-0 pb-2 sm:pb-5 z-50">
          <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
            <div className="p-2 rounded-lg bg-blue-500 shadow-lg sm:p-3">
              <div className="flex items-center justify-between flex-wrap">
                <div className="w-0 flex-1 flex items-center">
                  <span className="flex p-2 rounded-lg bg-blue-600">
                    <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </span>
                  <p className="ml-3 font-medium text-white truncate">
                    {notificationPermission === 'denied' 
                      ? "Notifications are blocked. Please enable them in your browser settings."
                      : "Enable notifications to receive alerts for new requests."}
                  </p>
                </div>
                <div className="order-3 mt-2 flex-shrink-0 w-full sm:order-2 sm:mt-0 sm:w-auto">
                  {notificationPermission !== 'denied' && (
                    <button
                      onClick={handleRequestPermission}
                      className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-blue-600 bg-white hover:bg-blue-50"
                    >
                      Enable notifications
                    </button>
                  )}
                </div>
                <div className="order-2 flex-shrink-0 sm:order-3 sm:ml-2">
                  <button type="button" className="-mr-1 flex p-2 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-white">
                    <span className="sr-only">Dismiss</span>
                    <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Sidebar for mobile */}
      <div 
        className={`fixed inset-y-0 left-0 flex flex-col z-40 w-64 bg-gray-800 text-white transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:h-full`}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between h-16 px-4 bg-gray-900">
          <div className="flex-shrink-0 flex items-center">
            <span className="text-xl font-bold">Admin Panel</span>
          </div>
          <button 
            className="md:hidden rounded-md p-2 inline-flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none"
            onClick={() => setSidebarOpen(false)}
          >
            <span className="sr-only">Close sidebar</span>
            <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Sidebar navigation */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          <nav className="flex-1 px-2 py-4 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`${
                    isActive
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  } group flex items-center px-2 py-2 text-sm font-medium rounded-md relative`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <div className={`${
                    isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'
                  } mr-3`}>
                    {getIcon(item.icon)}
                  </div>
                  {item.name}
                  
                  {/* Badge for notification count */}
                  {item.hasBadge && item.badgeCount > 0 && (
                    <span className="absolute right-0 top-0 -mt-1 -mr-1 flex h-5 w-5">
                      <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 text-xs text-white items-center justify-center">
                        {item.badgeCount > 99 ? '99+' : item.badgeCount}
                      </span>
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
        
        {/* User profile */}
        <div className="flex-shrink-0 flex border-t border-gray-700 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-full bg-gray-500 flex items-center justify-center text-white font-medium">
                {getUserInitial()}
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-white">
                {user ? user.username || user.email : 'User'}
              </p>
              <button 
                onClick={handleLogout}
                className="text-xs font-medium text-gray-300 hover:text-white"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header */}
        <div className="bg-white shadow-sm z-10">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  {/* Mobile menu button */}
                  <button
                    className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none"
                    onClick={() => setSidebarOpen(true)}
                  >
                    <span className="sr-only">Open sidebar</span>
                    <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="flex items-center">
                {/* Connection status */}
                {socketConnected && (
                  <span className="mr-4 text-xs text-green-600 flex items-center">
                    <span className="h-2 w-2 bg-green-500 rounded-full mr-1"></span>
                    Connected
                  </span>
                )}
                
                {/* Notifications - Display both types of notifications */}
                <div className="flex items-center">
                  {/* Game notifications */}
                  <Link to="/admin/manage-game" className="p-2 rounded-full text-gray-400 hover:text-gray-500 relative">
                    <span className="sr-only">View game notifications</span>
                    <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    {notificationCount > 0 && (
                      <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-red-500 flex items-center justify-center text-xs text-white">
                        {notificationCount > 9 ? '9+' : notificationCount}
                      </span>
                    )}
                  </Link>
                  
                  {/* Withdrawal notifications */}
                  <Link to="/admin/fund-management" className="p-2 rounded-full text-gray-400 hover:text-gray-500 relative">
                    <span className="sr-only">View withdrawal notifications</span>
                    <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {withdrawalCount > 0 && (
                      <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-red-500 flex items-center justify-center text-xs text-white">
                        {withdrawalCount > 9 ? '9+' : withdrawalCount}
                      </span>
                    )}
                  </Link>
                </div>
                
                {/* Profile dropdown */}
                <div className="ml-3 relative" ref={dropdownRef}>
                  <div>
                    <button 
                      className="bg-white rounded-full flex text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    >
                      <span className="sr-only">Open user menu</span>
                      <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                        {getUserInitial()}
                      </div>
                    </button>
                  </div>
                  
                  {/* Profile dropdown menu */}
                  {profileDropdownOpen && (
                    <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                      <div className="px-4 py-3">
                        <p className="text-sm">Signed in as</p>
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {user ? user.email : 'user@example.com'}
                        </p>
                      </div>
                      
                      <div className="border-t border-gray-100"></div>
                      
                      <Link
                        to="/admin/settings"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setProfileDropdownOpen(false)}
                      >
                        Settings
                      </Link>
                      
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;