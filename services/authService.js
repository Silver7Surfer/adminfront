// Configuration for the API
const API_URL = 'https://ad.bigwin.gold/api';

// Token management
const getToken = () => {
  return localStorage.getItem('accessToken');
};

const setToken = (token) => {
  localStorage.setItem('accessToken', token);
};

const removeToken = () => {
  localStorage.removeItem('accessToken');
};

const setUser = (user) => {
  localStorage.setItem('user', JSON.stringify(user));
};

const getUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

const removeUser = () => {
  localStorage.removeItem('user');
};

// Check if user is authenticated
const isAuthenticated = () => {
  return getToken() !== null;
};

// API request helper
const apiRequest = async (endpoint, method = 'GET', body = null, customHeaders = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...customHeaders
  };

  // Add authorization header if token exists
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    method,
    headers,
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Something went wrong');
    }

    return data;
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
};

// Authentication API methods
const login = async (email, password) => {
  try {
    const data = await apiRequest('/auth/login', 'POST', { email, password });
    
    // Store authentication data
    setToken(data.token);
    setUser(data.user);
    
    return data.user;
  } catch (error) {
    throw error;
  }
};

const register = async (username, email, password) => {
  try {
    const data = await apiRequest('/auth/register', 'POST', { username, email, password });
    return data;
  } catch (error) {
    throw error;
  }
};

const logout = () => {
  // Clear authentication data
  removeToken();
  removeUser();
};

const getCurrentUser = () => {
  return getUser();
};

// User management methods
const getAllUsers = async () => {
  try {
    return await apiRequest('/users');
  } catch (error) {
    throw error;
  }
};

const getUserById = async (userId) => {
  try {
    return await apiRequest(`/users/${userId}`);
  } catch (error) {
    throw error;
  }
};

const updateUser = async (userId, userData) => {
  try {
    return await apiRequest(`/users/${userId}`, 'PUT', userData);
  } catch (error) {
    throw error;
  }
};

const deleteUser = async (userId) => {
  try {
    return await apiRequest(`/users/${userId}`, 'DELETE');
  } catch (error) {
    throw error;
  }
};

// Export the service methods
const authService = {
  login,
  register,
  logout,
  isAuthenticated,
  getCurrentUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser
};

export default authService;