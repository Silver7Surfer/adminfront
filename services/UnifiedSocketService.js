// src/services/UnifiedSocketService.js
import { io } from 'socket.io-client';
import notificationSound from '../src/assets/notification-sound.mp3';
import { showNotification } from './PushNotificationService';

const API_BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:5000';

// Single socket instance for the whole application
let socketInstance = null;

// Event listeners for different modules
const eventListeners = {
  // Game management listeners
  gameManagement: {
    onConnect: null,
    onDisconnect: null,
    onAuthenticated: null,
    onGameProfiles: null,
    onGameStatistics: null,
    onError: null
  },
  // Withdrawal management listeners
  withdrawalManagement: {
    onAuthSuccess: null,
    onAuthFailure: null,
    onWithdrawalsReceived: null,
    onError: null
  }
};

// Cache for previous data
let previousData = {
  gameProfiles: [],
  withdrawals: []
};

/**
 * Get the authentication token from localStorage
 * @returns {string} The authentication token
 */
const getAuthToken = () => {
  const token = localStorage.getItem('accessToken');
  if (!token) {
    throw new Error('Authentication token not found');
  }
  return token;
};

/**
 * Send system notification for new events
 * @param {string} type - Notification type (credit, redeem, gameId, withdrawal, etc)
 * @param {string} username - Username involved
 * @param {string|number} context - Game name or amount
 * @returns {Promise<boolean>} Whether notification was shown
 */
const sendSystemNotification = async (type, username, context) => {
  let title = 'New Admin Request';
  let body = 'You have a new request to review';
  let notificationType = 'general';
  let url = '/admin/dashboard';

  switch (type) {
    case 'credit':
      title = 'New Credit Request';
      body = `${username} requested credits for ${context}`;
      notificationType = 'credit';
      url = '/admin/manage-game';
      break;
    case 'redeem':
      title = 'New Redemption Request';
      body = `${username} requested to redeem from ${context}`;
      notificationType = 'redeem';
      url = '/admin/manage-game';
      break;
    case 'gameId':
      title = 'New Game ID Request';
      body = `${username} needs a game ID assigned for ${context}`;
      notificationType = 'gameId';
      url = '/admin/manage-game';
      break;
    case 'withdrawal':
      title = 'New Withdrawal Request';
      body = `${username} requested withdrawal of ${context}`;
      notificationType = 'withdrawal';
      url = '/admin/fund-management';
      break;
    default:
      break;
  }

  // Play notification sound
  try {
    const audio = new Audio(notificationSound);
    audio.play().catch(err => console.log('Unable to play notification sound', err));
  } catch (err) {
    console.log('Error playing notification sound:', err);
  }

  return await showNotification({
    title,
    body,
    icon: '/logo192.png',
    tag: `${notificationType}-${Date.now()}`,
    data: {
      url,
      type: notificationType,
      username,
      context, // Can be gameName or amount depending on notification type
      timestamp: Date.now()
    },
    onClick: (data) => {
      // Navigate to the appropriate page/tab when notification is clicked
      window.focus();
      window.location.href = data.url;
    }
  });
};

/**
 * Initialize the socket connection
 * @returns {Object} The socket instance
 */
const initializeSocket = () => {
  // Create socket connection if it doesn't exist
  if (!socketInstance) {
    console.log('Creating new unified socket instance');
    socketInstance = io(API_BASE_URL, {
      transports: ['websocket'],
      autoConnect: true
    });
    
    // Set up event handlers
    setupSocketEventHandlers();
  } else {
    console.log('Using existing unified socket instance');
  }
  
  return socketInstance;
};

/**
 * Set up socket event handlers
 */
const setupSocketEventHandlers = () => {
  if (!socketInstance) return;
  
  // Connect event
  socketInstance.on('connect', () => {
    console.log('Unified socket connected to server');
    
    // Dispatch global event for connected state
    window.dispatchEvent(new CustomEvent('socketConnected', {
      detail: { connected: true }
    }));
    
    // Call module-specific handlers
    if (eventListeners.gameManagement.onConnect) {
      eventListeners.gameManagement.onConnect();
    }
    
    // Authenticate the socket
    authenticateSocket();
  });
  
  // Disconnect event
  socketInstance.on('disconnect', () => {
    console.log('Unified socket disconnected from server');
    
    // Dispatch global event for disconnected state
    window.dispatchEvent(new CustomEvent('socketConnected', {
      detail: { connected: false }
    }));
    
    // Call module-specific handlers
    if (eventListeners.gameManagement.onDisconnect) {
      eventListeners.gameManagement.onDisconnect();
    }
  });
  
  // Authentication response
  socketInstance.on('authenticated', (response) => {
    console.log('Unified socket authentication response:', response);
    
    if (response.success) {
      console.log('Unified socket authenticated successfully');
      
      // Call module-specific handlers
      if (eventListeners.gameManagement.onAuthenticated) {
        eventListeners.gameManagement.onAuthenticated(response);
      }
      
      if (eventListeners.withdrawalManagement.onAuthSuccess) {
        eventListeners.withdrawalManagement.onAuthSuccess(response);
      }
      
      // Automatically request initial data for all modules
      requestAllData();
    } else {
      console.error('Unified socket authentication failed:', response.message);
      
      // Dispatch global error event
      window.dispatchEvent(new CustomEvent('socketError', {
        detail: { message: 'WebSocket authentication failed: ' + response.message }
      }));
      
      // Call module-specific error handlers
      if (eventListeners.gameManagement.onError) {
        eventListeners.gameManagement.onError('WebSocket authentication failed: ' + response.message);
      }
      
      if (eventListeners.withdrawalManagement.onAuthFailure) {
        eventListeners.withdrawalManagement.onAuthFailure(response.message);
      }
    }
  });
  
  // Game profiles event
  socketInstance.on('gameProfiles', (data) => {
    console.log('Unified socket received game profiles');
    
    if (data.success) {
      // Check for changes that require notifications
      const notifications = checkForProfileChanges(previousData.gameProfiles, data.profiles || []);
      
      // Send system-level notifications for new events
      if (notifications.length > 0 && document.visibilityState !== 'visible') {
        notifications.forEach(notification => {
          sendSystemNotification(
            notification.type,
            notification.username,
            notification.gameName
          );
        });
      }
      
      // Update the previous data cache
      previousData.gameProfiles = [...(data.profiles || [])];
      
      // Dispatch global event with data
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('gameProfiles', {
          detail: data
        }));
      }, 50);
    } else {
      // Dispatch error event
      window.dispatchEvent(new CustomEvent('socketError', {
        detail: { message: data.message || 'Failed to fetch game profiles' }
      }));
    }
    
    // Call module-specific handler
    if (eventListeners.gameManagement.onGameProfiles) {
      eventListeners.gameManagement.onGameProfiles(data);
    }
  });
  
  // Game statistics event
  socketInstance.on('gameStatistics', (data) => {
    console.log('Unified socket received game statistics');
    
    // Dispatch global event with data
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('gameStatistics', {
        detail: data
      }));
    }, 50);
    
    // Call module-specific handler
    if (eventListeners.gameManagement.onGameStatistics) {
      eventListeners.gameManagement.onGameStatistics(data);
    }
  });
  
  // Pending withdrawals event
  socketInstance.on('pendingWithdrawals', (data) => {
    console.log('Unified socket received pending withdrawals:', data);
    
    if (data.success) {
      // Check for changes that require notifications
      const notifications = checkForWithdrawalChanges(
        previousData.withdrawals, 
        data.pendingWithdrawals || []
      );
      
      // Send system-level notifications for new events
      if (notifications.length > 0 && document.visibilityState !== 'visible') {
        notifications.forEach(notification => {
          sendSystemNotification(
            'withdrawal',
            notification.username,
            notification.amount
          );
        });
      }
      
      // Update the previous data cache
      previousData.withdrawals = [...(data.pendingWithdrawals || [])];
      
      // Dispatch global event with data
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('pendingWithdrawals', {
          detail: data
        }));
      }, 50);
    } else {
      // Dispatch error event
      window.dispatchEvent(new CustomEvent('socketError', {
        detail: { message: data.message || 'Failed to fetch pending withdrawals' }
      }));
    }
    
    // Call module-specific handler
    if (eventListeners.withdrawalManagement.onWithdrawalsReceived) {
      eventListeners.withdrawalManagement.onWithdrawalsReceived(data);
    }
  });
  
  // Error event
  socketInstance.on('error', (error) => {
    console.error('Unified socket error:', error);
    
    // Dispatch global error event
    window.dispatchEvent(new CustomEvent('socketError', {
      detail: { message: error.message || 'WebSocket error occurred' }
    }));
    
    // Call module-specific error handlers
    if (eventListeners.gameManagement.onError) {
      eventListeners.gameManagement.onError(error.message || 'WebSocket error occurred');
    }
    
    if (eventListeners.withdrawalManagement.onError) {
      eventListeners.withdrawalManagement.onError(error);
    }
  });
};

/**
 * Authenticate socket connection
 */
const authenticateSocket = () => {
  if (!socketInstance) return;
  
  try {
    const token = getAuthToken();
    console.log('Authenticating unified socket with token');
    socketInstance.emit('authenticate', token);
  } catch (error) {
    console.error('Unified socket authentication failed:', error.message);
    
    // Dispatch global error event
    window.dispatchEvent(new CustomEvent('socketError', {
      detail: { message: 'Authentication token not found' }
    }));
    
    // Call module-specific error handlers
    if (eventListeners.gameManagement.onError) {
      eventListeners.gameManagement.onError('Authentication token not found');
    }
    
    if (eventListeners.withdrawalManagement.onAuthFailure) {
      eventListeners.withdrawalManagement.onAuthFailure(error.message);
    }
  }
};

/**
 * Register event listeners for game management
 * @param {Object} handlers - Object containing event handlers
 */
const registerGameManagementHandlers = (handlers = {}) => {
  eventListeners.gameManagement = {
    ...eventListeners.gameManagement,
    ...handlers
  };
};

/**
 * Register event listeners for withdrawal management
 * @param {Object} handlers - Object containing event handlers
 */
const registerWithdrawalManagementHandlers = (handlers = {}) => {
  eventListeners.withdrawalManagement = {
    ...eventListeners.withdrawalManagement,
    ...handlers
  };
};

/**
 * Disconnect the socket
 */
const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
    
    // Reset event listeners
    eventListeners.gameManagement = {
      onConnect: null,
      onDisconnect: null,
      onAuthenticated: null,
      onGameProfiles: null,
      onGameStatistics: null,
      onError: null
    };
    
    eventListeners.withdrawalManagement = {
      onAuthSuccess: null,
      onAuthFailure: null,
      onWithdrawalsReceived: null,
      onError: null
    };
  }
};

/**
 * Request all data from the server
 */
const requestAllData = () => {
  requestGameProfiles();
  requestGameStatistics();
  requestPendingWithdrawals();
};

/**
 * Request game profiles via WebSocket
 * @returns {boolean} Whether the request was sent
 */
const requestGameProfiles = () => {
  if (socketInstance && socketInstance.connected) {
    socketInstance.emit('get:gameProfiles');
    return true;
  }
  return false;
};

/**
 * Request game statistics via WebSocket
 * @returns {boolean} Whether the request was sent
 */
const requestGameStatistics = () => {
  if (socketInstance && socketInstance.connected) {
    socketInstance.emit('get:gameStatistics');
    return true;
  }
  return false;
};

/**
 * Request pending withdrawals via WebSocket
 * @returns {boolean} Whether the request was sent
 */
const requestPendingWithdrawals = () => {
  if (socketInstance && socketInstance.connected) {
    socketInstance.emit('get:pendingWithdrawals');
    return true;
  }
  return false;
};

/**
 * Check if socket is connected
 * @returns {boolean} Connection status
 */
const isSocketConnected = () => {
  return socketInstance && socketInstance.connected;
};

/**
 * Check for changes in profiles that require notifications
 * @param {Array} oldProfiles - Previous profiles
 * @param {Array} newProfiles - New profiles
 * @returns {Array} Array of notifications to send
 */
const checkForProfileChanges = (oldProfiles, newProfiles) => {
  const notifications = [];
  
  if (!oldProfiles || !newProfiles || oldProfiles.length === 0) {
    return notifications;
  }
  
  // Build lookup maps for efficient checking
  const oldProfileMap = new Map();
  
  oldProfiles.forEach(profile => {
    if (!profile.games || !Array.isArray(profile.games)) return;
    
    const userId = profile.userId?.toString() || profile._id?.toString();
    const username = profile.userData?.username || 'Unknown';
    
    profile.games.forEach(game => {
      const key = `${userId}-${game.gameName}`;
      oldProfileMap.set(key, {
        profileStatus: game.profileStatus,
        creditStatus: game.creditAmount?.status || 'none',
        username
      });
    });
  });
  
  // Check for changes in new profiles
  newProfiles.forEach(profile => {
    if (!profile.games || !Array.isArray(profile.games)) return;
    
    const userId = profile.userId?.toString() || profile._id?.toString();
    const username = profile.userData?.username || 'Unknown';
    
    profile.games.forEach(game => {
      const key = `${userId}-${game.gameName}`;
      const oldData = oldProfileMap.get(key);
      
      // If this is a new profile or game entry
      if (!oldData) {
        if (game.profileStatus === 'pending') {
          notifications.push({
            type: 'gameId',
            username,
            gameName: game.gameName
          });
        }
        if (game.creditAmount?.status === 'pending') {
          notifications.push({
            type: 'credit',
            username,
            gameName: game.gameName
          });
        }
        if (game.creditAmount?.status === 'pending_redeem') {
          notifications.push({
            type: 'redeem',
            username,
            gameName: game.gameName
          });
        }
        return;
      }
      
      // Check for status changes
      if (oldData.profileStatus !== 'pending' && game.profileStatus === 'pending') {
        notifications.push({
          type: 'gameId',
          username,
          gameName: game.gameName
        });
      }
      
      if (oldData.creditStatus !== 'pending' && game.creditAmount?.status === 'pending') {
        notifications.push({
          type: 'credit',
          username,
          gameName: game.gameName
        });
      }
      
      if (oldData.creditStatus !== 'pending_redeem' && game.creditAmount?.status === 'pending_redeem') {
        notifications.push({
          type: 'redeem',
          username,
          gameName: game.gameName
        });
      }
    });
  });
  
  return notifications;
};

/**
 * Check for changes in withdrawals that require notifications
 * @param {Array} oldWithdrawals - Previous withdrawals
 * @param {Array} newWithdrawals - New withdrawals
 * @returns {Array} Array of notifications to send
 */
const checkForWithdrawalChanges = (oldWithdrawals, newWithdrawals) => {
  const notifications = [];
  
  if (!oldWithdrawals || !newWithdrawals || oldWithdrawals.length === 0) {
    // If there were no previous withdrawals but we have new ones,
    // notify for all new pending withdrawals
    if (newWithdrawals.length > 0) {
      newWithdrawals.forEach(withdrawal => {
        if (withdrawal.status === 'pending') {
          notifications.push({
            username: withdrawal.userData?.username || 'User',
            amount: withdrawal.amount
          });
        }
      });
    }
    return notifications;
  }
  
  // Build lookup maps for efficient checking
  const oldWithdrawalMap = new Map();
  
  oldWithdrawals.forEach(withdrawal => {
    const withdrawalId = withdrawal.withdrawalId?.toString() || withdrawal._id?.toString();
    oldWithdrawalMap.set(withdrawalId, true);
  });
  
  // Check for new withdrawals
  newWithdrawals.forEach(withdrawal => {
    const withdrawalId = withdrawal.withdrawalId?.toString() || withdrawal._id?.toString();
    
    // If this is a new withdrawal and it's pending
    if (!oldWithdrawalMap.has(withdrawalId) && withdrawal.status === 'pending') {
      notifications.push({
        username: withdrawal.userData?.username || 'User',
        amount: withdrawal.amount
      });
    }
  });
  
  return notifications;
};

export {
  initializeSocket,
  disconnectSocket,
  isSocketConnected,
  requestGameProfiles,
  requestGameStatistics,
  requestPendingWithdrawals,
  requestAllData,
  registerGameManagementHandlers,
  registerWithdrawalManagementHandlers
};