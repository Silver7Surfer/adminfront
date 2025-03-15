import React, { useState, useEffect } from 'react';
import {
  requestGameProfiles,
  requestGameStatistics,
  isSocketConnected,
  fetchGameProfiles,
  fetchGameStatistics,
  assignGameId,
  approveCredit,
  disapproveCredit,
  approveRedeem,
  disapproveRedeem,
  countPendingItems,
  formatGameProfiles,
  sendSystemNotification,
  broadcastUpdates
} from '../../../services/gameManagementService';
import {
  isNotificationSupported,
  isServiceWorkerSupported,
  getNotificationPermission,
  requestNotificationPermission,
  registerServiceWorker
} from '../../../services/PushNotificationService';

// Import components
import NotificationBadge from './ManageGame/NotificationBadge';
import GameStatsCards from './ManageGame/GameStatsCards';
import TabsFilter from './ManageGame/TabsFilter';
import ErrorAlert from './ManageGame/ErrorAlert';
import GameProfilesTable from './ManageGame/GameProfilesTable';
import GameIdModal from './ManageGame/GameIdModal';
import Pagination from './ManageGame/Pagination';
import { getPaginatedRows, calculateTotalPages } from './ManageGame/tableUtils';

/**
 * Main game management container component
 */
const ManageGamePage = () => {
  // State management
  const [gameProfiles, setGameProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [gameIdInput, setGameIdInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [statsData, setStatsData] = useState({
    totalProfiles: 0,
    pendingProfiles: 0,
    pendingCredits: 0,
    pendingRedeems: 0
  });
  
  // WebSocket and notification state
  const [socketConnected, setSocketConnected] = useState(false);
  const [newNotification, setNewNotification] = useState(false);
  const [notificationSupported, setNotificationSupported] = useState(false);
  const [serviceWorkerSupported, setServiceWorkerSupported] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [serviceWorkerRegistered, setServiceWorkerRegistered] = useState(false);
  
  const itemsPerPage = 10;

  // Check notification support on mount
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
    
    // Add visibility change detector
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Listen for messages from service worker
    if (navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (navigator.serviceWorker) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, []);

  // Register service worker if needed
  const registerServiceWorkerIfNeeded = async () => {
    try {
      const registration = await registerServiceWorker();
      if (registration) {
        console.log('Service worker registered successfully:', registration);
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
    console.log('Received message from service worker:', event.data);
    
    // Handle notification click from service worker
    if (event.data && event.data.type === 'NOTIFICATION_CLICK') {
      console.log('Notification clicked:', event.data);
      
      // Switch to appropriate tab based on notification type
      if (event.data.notificationType === 'credit') {
        setActiveTab('credit');
      } else if (event.data.notificationType === 'redeem') {
        setActiveTab('redeem');
      } else if (event.data.notificationType === 'gameId') {
        setActiveTab('pending');
      }
      
      // Clear the notification indicator
      setNewNotification(false);
    }
  };

  // Handle visibility changes
  const handleVisibilityChange = () => {
    const isVisible = document.visibilityState === 'visible';
    console.log(`Document visibility changed: ${isVisible ? 'visible' : 'hidden'}`);
    
    // Clear in-app notification when app becomes visible again
    if (isVisible) {
      setNewNotification(false);
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

  // Test notification
  const testNotification = async () => {
    if (notificationPermission === 'granted') {
      await sendSystemNotification(
        'credit',
        'Test User',
        'Test Game'
      );
    } else {
      alert('Notification permission not granted');
    }
  };

  // Initialize data loading and socket listeners
  useEffect(() => {
    // Initial data loading using REST API
    fetchGameProfilesFallback();
    fetchStatsFallback();
    
    // Define event handlers
    function handleGameProfiles(event) {
      const data = event.detail;
      console.log('Game profiles data received in ManageGamePage');
      if (data.success) {
        // Check if there are any new pending profiles for in-app notification badge
        const previousPendingCount = countPendingItems(gameProfiles);
        const newPendingCount = countPendingItems(data.profiles || []);
        
        if (previousPendingCount < newPendingCount && gameProfiles.length > 0) {
          // In-app notification badge
          setNewNotification(true);
          
          
        }
        
        // Update the data
        setGameProfiles(data.profiles || []);
        setLoading(false);
        setError(null);
      } else {
        setError(data.message || 'Failed to fetch game profiles');
        setLoading(false);
      }
    }
    
    function handleGameStatistics(event) {
      const data = event.detail;
      console.log('Game statistics received in ManageGamePage');
      if (data.success && data.statistics) {
        const newStats = {
          totalProfiles: data.statistics.totalProfiles || 0,
          pendingProfiles: data.statistics.totalPendingProfiles || 0,
          pendingCredits: data.statistics.pendingCreditRequests || 0,
          pendingRedeems: data.statistics.pendingRedeemRequests || 0
        };
        
        // Check for changes in stats for in-app notification badge
        if (statsData.pendingProfiles < newStats.pendingProfiles ||
            statsData.pendingCredits < newStats.pendingCredits ||
            statsData.pendingRedeems < newStats.pendingRedeems) {
          
          setNewNotification(true);
          
          
        }
        
        setStatsData(newStats);
      }
    }
    
    function handleSocketConnection(event) {
      setSocketConnected(event.detail.connected);
    }
    
    function handleSocketError(event) {
      console.error('WebSocket error in ManageGamePage:', event.detail.message);
      setError(event.detail.message || 'WebSocket error occurred');
      setLoading(false);
    }
    
    // Request data when component mounts
    if (isSocketConnected()) {
      requestGameProfiles();
      requestGameStatistics();
    }
    
    // Add event listeners to global events
    window.addEventListener('gameProfiles', handleGameProfiles);
    window.addEventListener('gameStatistics', handleGameStatistics);
    window.addEventListener('socketConnected', handleSocketConnection);
    window.addEventListener('socketError', handleSocketError);
    
    // Remove event listeners when component unmounts
    return () => {
      window.removeEventListener('gameProfiles', handleGameProfiles);
      window.removeEventListener('gameStatistics', handleGameStatistics);
      window.removeEventListener('socketConnected', handleSocketConnection);
      window.removeEventListener('socketError', handleSocketError);
      // Note: We don't disconnect the socket here as it's managed by AdminLayout
    };
    // IMPORTANT: Empty dependency array to prevent re-running this effect when state changes
  }, []);

  // Fallback functions to use REST API if WebSocket fails
  const fetchGameProfilesFallback = async () => {
    setLoading(true);
    try {
      const profiles = await fetchGameProfiles();
      setGameProfiles(profiles);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch game profiles');
      console.error('Error fetching game profiles:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatsFallback = async () => {
    try {
      const stats = await fetchGameStatistics();
      setStatsData(stats);
    } catch (err) {
      console.error('Error fetching statistics:', err);
    }
  };

  // Function to broadcast updates after API calls (with debounce)
  const handleBroadcastUpdates = async () => {
    broadcastUpdates(setLoading);
  };

  // Function to convert game profiles to table rows
  const getProfileRows = () => {
    return formatGameProfiles(gameProfiles, activeTab, searchQuery);
  };

  // Event handlers
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setNewNotification(false);
    setCurrentPage(1); // Reset to first page when changing tabs
  };

  const handleEditClick = (row) => {
    setEditingProfile({
      userId: row.userId,
      username: row.username,
      gameName: row.gameName,
      currentGameId: row.gameId === 'Not assigned' ? '' : row.gameId
    });
    setGameIdInput(row.gameId === 'Not assigned' ? '' : row.gameId);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProfile(null);
    setGameIdInput('');
    setPasswordInput('');
  };

  const handleSaveGameId = async () => {
    if (!gameIdInput.trim()) {
      setError('Please enter a Game ID');
      return;
    }
  
    try {
      setSubmitting(true);
      
      await assignGameId(
        editingProfile.userId, 
        editingProfile.gameName, 
        gameIdInput.trim(),
        passwordInput.trim()
      );
      
      await handleBroadcastUpdates(); // Request updates after successful save
      handleCloseModal();
    } catch (error) {
      console.error('Error assigning game ID:', error);
      setError('Failed to assign Game ID: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveCredit = async (row) => {
    try {
      setSubmitting(true);
      
      await approveCredit(row.userId, row.gameName);
      await handleBroadcastUpdates(); // Request updates after successful approval
    } catch (error) {
      console.error('Error approving credit:', error);
      setError('Failed to approve credit: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisapproveCredit = async (row) => {
    if (!window.confirm('Are you sure you want to disapprove this credit request? This will refund the user.')) {
      return;
    }
    
    try {
      setSubmitting(true);
      
      await disapproveCredit(row.userId, row.gameName);
      await handleBroadcastUpdates(); // Request updates after successful disapproval
    } catch (error) {
      console.error('Error disapproving credit:', error);
      setError('Failed to disapprove credit: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveRedeem = async (row) => {
    try {
      setSubmitting(true);
      
      await approveRedeem(row.userId, row.gameName);
      await handleBroadcastUpdates(); // Request updates after successful approval
    } catch (error) {
      console.error('Error approving redeem:', error);
      setError('Failed to approve redeem: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisapproveRedeem = async (row) => {
    if (!window.confirm('Are you sure you want to disapprove this redeem request?')) {
      return;
    }
    
    try {
      setSubmitting(true);
      
      await disapproveRedeem(row.userId, row.gameName);
      await handleBroadcastUpdates(); // Request updates after successful disapproval
    } catch (error) {
      console.error('Error disapproving redeem:', error);
      setError('Failed to disapprove redeem: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate pagination data
  const allRows = getProfileRows();
  const paginatedRows = getPaginatedRows(allRows, currentPage, itemsPerPage);
  const totalPages = calculateTotalPages(allRows.length, itemsPerPage);

  return (
    <div className="px-6 py-6 max-w-full">
      {/* Notification Permission Request */}
      {notificationSupported && notificationPermission !== 'granted' && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1 md:flex md:justify-between">
              <p className="text-sm text-blue-700">
                {notificationPermission === 'denied' 
                  ? "Notifications are blocked. Please enable them in your browser settings."
                  : serviceWorkerSupported
                    ? "Enable push notifications to receive alerts even when the app is closed."
                    : "Enable notifications to receive alerts when the app is in the background."}
              </p>
              <div className="mt-3 text-sm md:mt-0 md:ml-6">
                {notificationPermission !== 'denied' && (
                  <button 
                    onClick={handleRequestPermission}
                    className="whitespace-nowrap font-medium text-blue-700 hover:text-blue-600"
                  >
                    Enable notifications
                    <span aria-hidden="true"> &rarr;</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Show service worker status for debugging in development mode */}
      {process.env.NODE_ENV === 'development' && serviceWorkerSupported && notificationPermission === 'granted' && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1 md:flex md:justify-between">
              <p className="text-sm text-green-700">
                {navigator.serviceWorker && navigator.serviceWorker.controller 
                  ? "Service Worker is active. You'll receive notifications even when the app is closed."
                  : "Service Worker is registered but not yet controlling the page. Refresh to activate."}
              </p>
              <div className="mt-3 text-sm md:mt-0 md:ml-6">
                <button
                  onClick={testNotification}
                  className="whitespace-nowrap font-medium text-green-700 hover:text-green-600"
                >
                  Test notification
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      
  
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Game Management</h1>
          <p className="mt-1 text-gray-600">Manage game profiles and handle credit/redeem requests</p>
        </div>
        <div className="flex items-center space-x-2">
          {socketConnected && (
            <span className="text-xs text-green-600 flex items-center">
              <span className="h-2 w-2 bg-green-500 rounded-full mr-1"></span>
              Live Updates
            </span>
          )}
          {serviceWorkerRegistered && notificationPermission === 'granted' && (
            <span className="text-xs text-blue-600 flex items-center">
              <span className="h-2 w-2 bg-blue-500 rounded-full mr-1"></span>
              Push Notifications
            </span>
          )}
        </div>
      </div>
  
      {/* Stats Cards */}
      <GameStatsCards statsData={statsData} />
  
      {/* Filters and tabs */}
      <TabsFilter
        activeTab={activeTab}
        onTabChange={handleTabChange}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onRefresh={handleBroadcastUpdates}
        isLoading={loading}
        isSubmitting={submitting}
        statsData={statsData}
      />
  
      {/* Error display */}
      <ErrorAlert 
        error={error} 
        onDismiss={() => setError(null)} 
      />
  
      {/* Game Profiles Table */}
      <GameProfilesTable
        rows={paginatedRows}
        loading={loading}
        submitting={submitting}
        onEditClick={handleEditClick}
        onApproveCredit={handleApproveCredit}
        onDisapproveCredit={handleDisapproveCredit}
        onApproveRedeem={handleApproveRedeem}
        onDisapproveRedeem={handleDisapproveRedeem}
      />

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        totalItems={allRows.length}
        itemsPerPage={itemsPerPage}
      />

      {/* Show total count */}
      <div className="mt-4 text-sm text-gray-600">
        Showing {allRows.length} game profiles
      </div>
      
      {/* Game ID Assignment Modal */}
      <GameIdModal
        show={showModal}
        profile={editingProfile}
        gameIdInput={gameIdInput}
        onGameIdChange={setGameIdInput}
        passwordInput={passwordInput}
        onPasswordChange={setPasswordInput}
        submitting={submitting}
        onClose={handleCloseModal}
        onSave={handleSaveGameId}
      />
    </div>
  );
};

export default ManageGamePage;