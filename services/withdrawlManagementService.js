// src/services/withdrawalManagementService.js
import { io } from 'socket.io-client';
import notificationSound from '../src/assets/notification-sound.mp3';

const API_BASE_URL = 'http://localhost:5000';
const API_ENDPOINT = `${API_BASE_URL}/api/admin/withdrawals`;

// Socket reference that can be used across function calls
let socketInstance = null;
let socketListeners = {};

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
 * Initialize socket connection
 * @param {Function} onAuthSuccess - Callback on successful authentication
 * @param {Function} onAuthFailure - Callback on authentication failure
 * @param {Function} onWithdrawalsReceived - Callback when withdrawals are received
 * @param {Function} onError - Callback on socket error
 * @returns {Object} - The socket instance
 */
const initializeSocket = (onAuthSuccess, onAuthFailure, onWithdrawalsReceived, onError) => {
  // Create socket connection if it doesn't exist
  if (!socketInstance) {
    socketInstance = io(API_BASE_URL, {
      transports: ['websocket'],
      autoConnect: true
    });
  }
  
  // Store callbacks
  socketListeners = {
    onAuthSuccess,
    onAuthFailure,
    onWithdrawalsReceived,
    onError
  };
  
  // Socket event handlers
  socketInstance.on('connect', () => {
    console.log('Connected to WebSocket server');
    authenticateSocket();
  });
  
  socketInstance.on('disconnect', () => {
    console.log('Disconnected from WebSocket server');
  });
  
  socketInstance.on('authenticated', (response) => {
    console.log('Socket authentication response:', response);
    if (response.success) {
      console.log('Socket authenticated successfully');
      if (socketListeners.onAuthSuccess) socketListeners.onAuthSuccess(response);
    } else {
      console.error('Socket authentication failed:', response.message);
      if (socketListeners.onAuthFailure) socketListeners.onAuthFailure(response.message);
    }
  });
  
  socketInstance.on('pendingWithdrawals', (data) => {
    console.log('Received pending withdrawals via WebSocket:', data);
    if (socketListeners.onWithdrawalsReceived) socketListeners.onWithdrawalsReceived(data);
  });
  
  socketInstance.on('error', (error) => {
    console.error('Socket error:', error);
    if (socketListeners.onError) socketListeners.onError(error);
  });
  
  return socketInstance;
};

/**
 * Authenticate socket connection
 */
const authenticateSocket = () => {
  if (!socketInstance) return;
  
  try {
    const token = getAuthToken();
    console.log('Authenticating socket with token');
    socketInstance.emit('authenticate', token);
  } catch (error) {
    console.error('Authentication failed:', error.message);
    if (socketListeners.onAuthFailure) socketListeners.onAuthFailure(error.message);
  }
};

/**
 * Disconnect socket
 */
const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
    socketListeners = {};
  }
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
 * Fetch pending withdrawals via REST API
 * @returns {Promise<Array>} Array of pending withdrawals
 */
const fetchPendingWithdrawals = async () => {
  try {
    const response = await fetch(`${API_ENDPOINT}/pending`, {
      headers: createAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch pending withdrawals');
    }
    
    const data = await response.json();
    
    if (data.success) {
      console.log("Pending withdrawals (REST API):", data.pendingWithdrawals);
      return data.pendingWithdrawals || [];
    } else {
      throw new Error(data.message || 'Failed to fetch pending withdrawals');
    }
  } catch (err) {
    console.error('Error fetching withdrawals:', err);
    throw err;
  }
};

/**
 * Approve a withdrawal
 * @param {Object} withdrawal - The withdrawal to approve
 * @param {string} txHash - Optional transaction hash
 * @returns {Promise<Object>} Response data
 */
const approveWithdrawal = async (withdrawal, txHash = '') => {
  try {
    const response = await fetch(`${API_ENDPOINT}/approve`, {
      method: 'POST',
      headers: createAuthHeaders(true),
      body: JSON.stringify({
        userId: withdrawal.userId,
        withdrawalId: withdrawal.withdrawalId,
        txHash: txHash.trim() || null
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to approve withdrawal');
    }
    
    const data = await response.json();
    
    if (data.success) {
      return data;
    } else {
      throw new Error(data.message || 'Failed to approve withdrawal');
    }
  } catch (err) {
    console.error('Error approving withdrawal:', err);
    throw err;
  }
};

/**
 * Disapprove/reject a withdrawal
 * @param {Object} withdrawal - The withdrawal to disapprove
 * @returns {Promise<Object>} Response data
 */
const disapproveWithdrawal = async (withdrawal) => {
  try {
    const response = await fetch(`${API_ENDPOINT}/disapprove`, {
      method: 'POST',
      headers: createAuthHeaders(true),
      body: JSON.stringify({
        userId: withdrawal.userId,
        withdrawalId: withdrawal.withdrawalId
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to reject withdrawal');
    }
    
    const data = await response.json();
    
    if (data.success) {
      return data;
    } else {
      throw new Error(data.message || 'Failed to reject withdrawal');
    }
  } catch (err) {
    console.error('Error rejecting withdrawal:', err);
    throw err;
  }
};

/**
 * Play notification sound
 */
const playNotificationSound = () => {
  try {
    const audio = new Audio(notificationSound);
    audio.play().catch(err => console.log('Unable to play notification sound', err));
  } catch (err) {
    console.log('Error playing notification sound:', err);
  }
};

/**
 * Show browser notification
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {string} icon - Notification icon path
 */
const showBrowserNotification = (title, body, icon = '/favicon.ico') => {
  if ("Notification" in window && Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon
    });
  }
};

/**
 * Request browser notification permission
 * @returns {Promise<string>} Permission status
 */
const requestNotificationPermission = async () => {
  if (!("Notification" in window)) {
    return 'not-supported';
  }
  
  if (Notification.permission !== "granted") {
    return await Notification.requestPermission();
  }
  
  return Notification.permission;
};

/**
 * Format date to local format
 * @param {string} dateString - Date string to format
 * @returns {string} Formatted date string
 */
const formatDate = (dateString) => {
  const options = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

/**
 * Get network display label
 * @param {string} asset - Asset code (e.g., 'btc', 'usdt')
 * @param {string} network - Network code (e.g., 'trc20', 'bep20')
 * @returns {string} Formatted network label
 */
const getNetworkLabel = (asset, network) => {
  if (asset === 'btc') return 'Bitcoin';
  if (asset === 'usdt') {
    if (network === 'trc20') return 'USDT (TRC20)';
    if (network === 'bep20') return 'USDT (BEP20)';
  }
  return `${asset.toUpperCase()} ${network ? `(${network.toUpperCase()})` : ''}`;
};

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<void>} Promise resolving on success or rejecting on failure
 */
const copyToClipboard = (text) => {
  return navigator.clipboard.writeText(text);
};

export {
  initializeSocket,
  disconnectSocket,
  requestPendingWithdrawals,
  isSocketConnected,
  fetchPendingWithdrawals,
  approveWithdrawal,
  disapproveWithdrawal,
  playNotificationSound,
  showBrowserNotification,
  requestNotificationPermission,
  formatDate,
  getNetworkLabel,
  copyToClipboard
};