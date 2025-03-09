// src/services/userService.js

const API_BASE_URL =  'https://ad.bigwin.gold/api';

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
 * Fetch all users
 * @returns {Promise<Array>} Array of users
 */
const fetchUsers = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/users`, {
      headers: createAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch users');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

/**
 * Fetch all wallets
 * @returns {Promise<Array>} Array of wallets
 */
const fetchWallets = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/wallets`, {
      headers: createAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch wallets');
    }
    
    const wallets = await response.json();
    
    // Convert to a map for easier lookup
    const walletsMap = {};
    wallets.forEach(wallet => {
      walletsMap[wallet.userId] = wallet;
    });
    
    return walletsMap;
  } catch (error) {
    console.error('Error fetching wallets:', error);
    throw error;
  }
};

/**
 * Delete a user
 * @param {string} userId - The ID of the user to delete
 * @returns {Promise<void>}
 */
const deleteUser = async (userId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'DELETE',
      headers: createAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete user');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

/**
 * Update a user
 * @param {string} userId - The ID of the user to update
 * @param {Object} userData - The updated user data
 * @returns {Promise<Object>} Updated user data
 */
const updateUser = async (userId, userData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'PUT',
      headers: createAuthHeaders(true),
      body: JSON.stringify(userData)
    });
    
    if (!response.ok) {
      throw new Error('Failed to update user');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

/**
 * Create a new user
 * @param {Object} userData - The user data
 * @returns {Promise<Object>} Created user data
 */
const createUser = async (userData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: createAuthHeaders(true),
      body: JSON.stringify(userData)
    });
    
    if (!response.ok) {
      throw new Error('Failed to create user');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

export {
  fetchUsers,
  fetchWallets,
  deleteUser,
  updateUser,
  createUser
};