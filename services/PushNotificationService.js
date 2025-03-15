// src/services/PushNotificationService.js

/**
 * Check if browser notifications are supported
 * @returns {boolean} Whether notifications are supported
 */
const isNotificationSupported = () => {
  return 'Notification' in window;
};

/**
 * Check if service worker is supported
 * @returns {boolean} Whether service worker is supported
 */
const isServiceWorkerSupported = () => {
  return 'serviceWorker' in navigator;
};

/**
 * Get current notification permission
 * @returns {string} Current permission status (default, granted, denied)
 */
const getNotificationPermission = () => {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission;
};

/**
 * Request notification permission
 * @returns {Promise<boolean>} Whether permission was granted
 */
const requestNotificationPermission = async () => {
  if (!isNotificationSupported()) {
    return false;
  }
  
  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

/**
 * Register service worker for push notifications
 * @returns {Promise<ServiceWorkerRegistration|null>} Service worker registration
 */
const registerServiceWorker = async () => {
  if (!isServiceWorkerSupported()) {
    console.warn('Service Worker is not supported in this browser');
    return null;
  }
  
  try {
    // Register the service worker
    const registration = await navigator.serviceWorker.register('/notification-sw.js');
    console.log('ServiceWorker registration successful with scope:', registration.scope);
    return registration;
  } catch (error) {
    console.error('ServiceWorker registration failed:', error);
    return null;
  }
};

/**
 * Show a browser notification
 * @param {Object} options - Notification options
 * @param {string} options.title - Title of the notification
 * @param {string} options.body - Body text of the notification
 * @param {string} options.icon - URL of the notification icon
 * @param {Object} options.data - Data to pass with the notification
 * @param {string} options.tag - Tag for grouping notifications
 * @param {Function} options.onClick - Function to call when notification is clicked
 * @returns {Promise<boolean>} Whether notification was shown
 */
const showNotification = async ({ title, body, icon, data = {}, tag = 'admin-notification', onClick }) => {
  // Check if notifications are supported
  if (!isNotificationSupported()) {
    console.warn('Notifications are not supported in this browser');
    return false;
  }
  
  // Check if we have permission to show notifications
  if (Notification.permission !== 'granted') {
    console.warn('Notification permission not granted');
    return false;
  }
  
  try {
    // If service worker is active and controlling the page, use it for notifications
    if (navigator.serviceWorker?.controller) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        body,
        icon: icon || '/favicon.ico',
        tag,
        data,
        requireInteraction: true,
        vibrate: [200, 100, 200]
      });
    } else {
      // Fallback to regular browser notifications
      const notification = new Notification(title, {
        body,
        icon: icon || '/favicon.ico',
        tag,
        data,
        requireInteraction: true
      });
      
      // Add click handler
      if (onClick) {
        notification.onclick = (event) => {
          event.preventDefault();
          window.focus();
          notification.close();
          onClick(data);
        };
      } else {
        // Default click handler focuses the window
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error showing notification:', error);
    return false;
  }
};

export {
  isNotificationSupported,
  isServiceWorkerSupported,
  getNotificationPermission,
  requestNotificationPermission,
  registerServiceWorker,
  showNotification
};