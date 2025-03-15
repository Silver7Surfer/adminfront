// src/services/gameManagementService.js
import { io } from 'socket.io-client';
import notificationSound from '../src/assets/notification-sound.mp3';
import { showNotification } from './PushNotificationService';

const API_BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:5000';
const API_ENDPOINT = `${API_BASE_URL}/api/admin/games`;

// Socket instance that will be reused
let socketInstance = null;
// Debounce timer for API requests
let requestDebounceTimer = null;

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
 * Create headers with authentication
 * @param {boolean} includeContentType - Whether to include Content-Type header
 * @returns {Object} Headers object
 */
const createAuthHeaders = (includeContentType = false) => {
  const headers = {
    'Authorization': `Bearer ${getAuthToken()}`
  };

  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
};

/**
 * Send system notification for new events
 * @param {string} type - Notification type (credit, redeem, gameId, etc)
 * @param {string} username - Username involved
 * @param {string} gameName - Game name
 * @returns {Promise<boolean>} Whether notification was shown
 */
const sendSystemNotification = async (type, username, gameName) => {
  let title = 'New Admin Request';
  let body = 'You have a new request to review';
  let notificationType = 'general';
  let url = '/admin/manage-game';

  switch (type) {
    case 'credit':
      title = 'New Credit Request';
      body = `${username} requested credits for ${gameName}`;
      notificationType = 'credit';
      break;
    case 'redeem':
      title = 'New Redemption Request';
      body = `${username} requested to redeem from ${gameName}`;
      notificationType = 'redeem';
      break;
    case 'gameId':
      title = 'New Game ID Request';
      body = `${username} needs a game ID assigned for ${gameName}`;
      notificationType = 'gameId';
      break;
    default:
      break;
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
      gameName,
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
 * Initialize the WebSocket connection
 * @param {Object} handlers - Object containing event handlers (optional)
 * @returns {Object} The socket instance
 */
const initializeSocket = (handlers = {}) => {
  // Create socket connection if it doesn't exist
  if (!socketInstance) {
    socketInstance = io(API_BASE_URL, {
      transports: ['websocket'],
      autoConnect: true
    });
  }
  
  // Maintain a cache of previous profiles for comparison
  let previousProfiles = [];
  
  // Socket event handlers
  socketInstance.on('connect', () => {
    console.log('Connected to WebSocket server');
    
    // Dispatch global event for connected state
    window.dispatchEvent(new CustomEvent('socketConnected', {
      detail: { connected: true }
    }));
    
    if (handlers.onConnect) handlers.onConnect();
    
    // Authenticate with JWT token from localStorage
    try {
      const token = getAuthToken();
      console.log('Authenticating socket with token');
      socketInstance.emit('authenticate', token);
    } catch (error) {
      console.error('Authentication failed:', error.message);
      
      // Dispatch global error event
      window.dispatchEvent(new CustomEvent('socketError', {
        detail: { message: 'Authentication token not found' }
      }));
      
      if (handlers.onError) handlers.onError('Authentication token not found');
    }
  });
  
  socketInstance.on('disconnect', () => {
    console.log('Disconnected from WebSocket server');
    
    // Dispatch global event for disconnected state
    window.dispatchEvent(new CustomEvent('socketConnected', {
      detail: { connected: false }
    }));
    
    if (handlers.onDisconnect) handlers.onDisconnect();
  });
  
  socketInstance.on('authenticated', (response) => {
    console.log('Socket authentication response:', response);
    if (response.success) {
      console.log('Socket authenticated successfully');
      if (handlers.onAuthenticated) handlers.onAuthenticated(response);
    } else {
      console.error('Socket authentication failed:', response.message);
      
      // Dispatch global error event
      window.dispatchEvent(new CustomEvent('socketError', {
        detail: { message: 'WebSocket authentication failed: ' + response.message }
      }));
      
      if (handlers.onError) handlers.onError('WebSocket authentication failed: ' + response.message);
    }
  });
  
  socketInstance.on('gameProfiles', (data) => {
    console.log('Received game profiles via WebSocket');
    
    if (data.success) {
      // Check for changes that require notifications
      const notifications = checkForProfileChanges(previousProfiles, data.profiles || []);
      
      // Send system-level notifications for new events
      if (notifications.length > 0 && document.visibilityState !== 'visible') {
        // Only send if the document is not visible (tab in background or minimized)
        notifications.forEach(notification => {
          sendSystemNotification(
            notification.type,
            notification.username,
            notification.gameName
          );
        });
      }
      
      // Update the previous profiles cache for future comparisons
      previousProfiles = [...(data.profiles || [])];
      
      // Dispatch global event with profiles data - add delay to prevent event stacking
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('gameProfiles', {
          detail: data
        }));
      }, 50);
    } else {
      // Dispatch global error event
      window.dispatchEvent(new CustomEvent('socketError', {
        detail: { message: data.message || 'Failed to fetch game profiles' }
      }));
    }
    
    if (handlers.onGameProfiles) handlers.onGameProfiles(data);
  });
  
  socketInstance.on('gameStatistics', (data) => {
    console.log('Received game statistics via WebSocket');
    
    // Dispatch global event with statistics data - add delay to prevent event stacking
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('gameStatistics', {
        detail: data
      }));
    }, 50);
    
    if (handlers.onGameStatistics) handlers.onGameStatistics(data);
  });
  
  socketInstance.on('error', (error) => {
    console.error('Socket error:', error);
    
    // Dispatch global error event
    window.dispatchEvent(new CustomEvent('socketError', {
      detail: { message: error.message || 'WebSocket error occurred' }
    }));
    
    if (handlers.onError) handlers.onError(error.message || 'WebSocket error occurred');
  });
  
  return socketInstance;
};

/**
 * Disconnect the socket
 */
const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
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
 * Check if socket is connected
 * @returns {boolean} Connection status
 */
const isSocketConnected = () => {
  return socketInstance && socketInstance.connected;
};

/**
 * Fetch game profiles via REST API
 * @returns {Promise<Array>} Array of game profiles
 */
const fetchGameProfiles = async () => {
  try {
    console.log('Fetching game profiles using REST API...');
    const response = await fetch(`${API_ENDPOINT}/profiles`, {
      headers: createAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch game profiles');
    }
    
    const data = await response.json();
    console.log('REST API game profiles response:', data);
    
    if (data.success && data.profiles) {
      return data.profiles;
    } else {
      return [];
    }
  } catch (err) {
    console.error('Error fetching game profiles:', err);
    throw err;
  }
};

/**
 * Fetch game statistics via REST API
 * @returns {Promise<Object>} Game statistics
 */
const fetchGameStatistics = async () => {
  try {
    console.log('Fetching game statistics using REST API...');
    const response = await fetch(`${API_ENDPOINT}/statistics`, {
      headers: createAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch statistics');
    }
    
    const data = await response.json();
    
    if (data.success && data.statistics) {
      return {
        totalProfiles: data.statistics.totalProfiles || 0,
        pendingProfiles: data.statistics.totalPendingProfiles || 0,
        pendingCredits: data.statistics.pendingCreditRequests || 0,
        pendingRedeems: data.statistics.pendingRedeemRequests || 0
      };
    }
    
    return {
      totalProfiles: 0,
      pendingProfiles: 0,
      pendingCredits: 0,
      pendingRedeems: 0
    };
  } catch (err) {
    console.error('Error fetching statistics:', err);
    throw err;
  }
};

/**
 * Assign a game ID to a user's game profile
 * @param {string} userId - User ID
 * @param {string} gameName - Game name
 * @param {string} gameId - Game ID to assign
 * @returns {Promise<Object>} Response data
 */
const assignGameId = async (userId, gameName, gameId, gamePassword = '') => {
  try {
    console.log('Assigning game ID:', gameId, 'and password:', gamePassword);
    
    const response = await fetch(`${API_ENDPOINT}/assign-gameid`, {
      method: 'POST',
      headers: createAuthHeaders(true),
      body: JSON.stringify({
        userId,
        gameName,
        gameId: gameId.trim(),
        gamePassword: gamePassword ? gamePassword.trim() : ''
      })
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to assign Game ID');
    }
    
    return data;
  } catch (error) {
    console.error('Error assigning game ID:', error);
    throw error;
  }
};

/**
 * Approve a credit request
 * @param {string} userId - User ID
 * @param {string} gameName - Game name
 * @returns {Promise<Object>} Response data
 */
const approveCredit = async (userId, gameName) => {
  try {
    console.log('Approving credit for user:', userId, 'game:', gameName);
    
    const response = await fetch(`${API_ENDPOINT}/approve-credit`, {
      method: 'POST',
      headers: createAuthHeaders(true),
      body: JSON.stringify({
        userId,
        gameName
      })
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to approve credit');
    }
    
    return data;
  } catch (error) {
    console.error('Error approving credit:', error);
    throw error;
  }
};

/**
 * Disapprove a credit request
 * @param {string} userId - User ID
 * @param {string} gameName - Game name
 * @returns {Promise<Object>} Response data
 */
const disapproveCredit = async (userId, gameName) => {
  try {
    console.log('Disapproving credit for user:', userId, 'game:', gameName);
    
    const response = await fetch(`${API_ENDPOINT}/disapprove-credit`, {
      method: 'POST',
      headers: createAuthHeaders(true),
      body: JSON.stringify({
        userId,
        gameName
      })
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to disapprove credit');
    }
    
    return data;
  } catch (error) {
    console.error('Error disapproving credit:', error);
    throw error;
  }
};

/**
 * Approve a redeem request
 * @param {string} userId - User ID
 * @param {string} gameName - Game name
 * @returns {Promise<Object>} Response data
 */
const approveRedeem = async (userId, gameName) => {
  try {
    console.log('Approving redeem for user:', userId, 'game:', gameName);
    
    const response = await fetch(`${API_ENDPOINT}/approve-redeem`, {
      method: 'POST',
      headers: createAuthHeaders(true),
      body: JSON.stringify({
        userId,
        gameName
      })
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to approve redeem');
    }
    
    return data;
  } catch (error) {
    console.error('Error approving redeem:', error);
    throw error;
  }
};

/**
 * Disapprove a redeem request
 * @param {string} userId - User ID
 * @param {string} gameName - Game name
 * @returns {Promise<Object>} Response data
 */
const disapproveRedeem = async (userId, gameName) => {
  try {
    console.log('Disapproving redeem for user:', userId, 'game:', gameName);
    
    const response = await fetch(`${API_ENDPOINT}/disapprove-redeem`, {
      method: 'POST',
      headers: createAuthHeaders(true),
      body: JSON.stringify({
        userId,
        gameName
      })
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to disapprove redeem');
    }
    
    return data;
  } catch (error) {
    console.error('Error disapproving redeem:', error);
    throw error;
  }
};


/**
 * Count pending items in game profiles
 * @param {Array} profiles - Array of game profiles
 * @returns {number} Count of pending items
 */
const countPendingItems = (profiles) => {
  let count = 0;
  profiles.forEach(profile => {
    if (!profile.games || !Array.isArray(profile.games)) return;
    
    profile.games.forEach(game => {
      if (game.profileStatus === 'pending' || 
          game.creditAmount?.status === 'pending' || 
          game.creditAmount?.status === 'pending_redeem') {
        count++;
      }
    });
  });
  return count;
};

/**
 * Format game profiles for display
 * @param {Array} profiles - Array of game profiles
 * @param {string} activeTab - Active tab filter
 * @param {string} searchQuery - Search query
 * @returns {Array} Formatted game profile rows
 */
const formatGameProfiles = (profiles, activeTab, searchQuery) => {
  let rows = [];
  
  profiles.forEach(profile => {
    if (!profile.games || !Array.isArray(profile.games)) return;
    
    const userId = profile.userId?.toString() || profile._id?.toString();
    const username = profile.userData?.username || 'Unknown';
    const email = profile.userData?.email || 'No email';
    
    profile.games.forEach(game => {
      // Make sure gameId is correctly handled
      const gameId = game.gameId || 'Not assigned';
      
      // Log each game to debug Edit ID issue
      console.log(`Game for ${username}: ${game.gameName}, ID: ${gameId}, Status: ${game.profileStatus}, Credit Status: ${game.creditAmount?.status || 'none'}`);
      
      const row = {
        userId,
        username,
        email,
        gameName: game.gameName,
        gameId: gameId, // Ensure we use the correct field
        profileStatus: game.profileStatus,
        creditAmount: game.creditAmount?.amount || 0,
        requestedAmount: game.creditAmount?.requestedAmount || 0,
        creditStatus: game.creditAmount?.status || 'none',
        createdAt: new Date(profile.createdAt || Date.now()).toLocaleDateString()
      };
      
      // Filter based on active tab
      if (
        (activeTab === 'all') ||
        (activeTab === 'pending' && game.profileStatus === 'pending') ||
        (activeTab === 'credit' && game.creditAmount?.status === 'pending') ||
        (activeTab === 'redeem' && game.creditAmount?.status === 'pending_redeem')
      ) {
        rows.push(row);
      }
    });
  });
  
  // Apply search filter
  if (searchQuery) {
    rows = rows.filter(row => 
      row.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.gameName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (row.gameId && row.gameId.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }
  
  // Sort by status priority (pending first, then active)
  rows.sort((a, b) => {
    // Sort by request status first
    if (a.creditStatus === 'pending' && b.creditStatus !== 'pending') return -1;
    if (a.creditStatus !== 'pending' && b.creditStatus === 'pending') return 1;
    if (a.creditStatus === 'pending_redeem' && b.creditStatus !== 'pending_redeem') return -1;
    if (a.creditStatus !== 'pending_redeem' && b.creditStatus === 'pending_redeem') return 1;
    
    // Then sort by profile status
    if (a.profileStatus === 'pending' && b.profileStatus !== 'pending') return -1;
    if (a.profileStatus !== 'pending' && b.profileStatus === 'pending') return 1;
    
    return 0;
  });
  
  return rows;
};

/**
 * Broadcast updates for game profiles and statistics with debounce
 */
const broadcastUpdates = async (setLoading) => {
  if (setLoading) setLoading(true);
  
  // Clear any pending requests
  if (requestDebounceTimer) {
    clearTimeout(requestDebounceTimer);
  }
  
  // Debounce the request
  requestDebounceTimer = setTimeout(() => {
    if (isSocketConnected()) {
      requestGameProfiles();
      requestGameStatistics();
      
      // Fallback to REST if socket doesn't respond within 3 seconds
      setTimeout(() => {
        if (setLoading) setLoading(false);
      }, 3000);
    } else {
      // Use REST API directly
      fetchGameProfiles().catch(console.error);
      fetchGameStatistics().catch(console.error);
      
      if (setLoading) setTimeout(() => setLoading(false), 500);
    }
    
    requestDebounceTimer = null;
  }, 300); // Wait 300ms before making request
};

export {
  initializeSocket,
  disconnectSocket,
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
};