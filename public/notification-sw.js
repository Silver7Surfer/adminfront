// Public/notification-sw.js

// Cache version for updates
const CACHE_VERSION = 'v1';
const CACHE_NAME = `admin-panel-cache-${CACHE_VERSION}`;

// Install Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker installing');
  self.skipWaiting(); // Ensure new service worker activates immediately
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim(); // Take control immediately
});

// Handle notifications being clicked
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.notification.tag);
  event.notification.close();
  
  // This looks to see if the current is already open and focuses if it is
  event.waitUntil(
    clients.matchAll({
      type: 'window'
    }).then((clientList) => {
      // Check if there's already a window/tab open with the target URL
      for (const client of clientList) {
        if (client.url.includes('/admin') && 'focus' in client) {
          client.focus();
          // Send a message to the client with the notification data
          if (event.notification.data?.url) {
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              url: event.notification.data.url,
              notificationType: event.notification.data.type
            });
          }
          return;
        }
      }
      
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow('/admin/manage-game');
      }
    })
  );
});

// Receive push notifications from server (if you implement Web Push API later)
self.addEventListener('push', (event) => {
  console.log('Push received:', event);
  
  // Parse data if available
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: 'New Notification',
        body: event.data.text(),
        url: '/admin/manage-game'
      };
    }
  }
  
  // Show notification
  const options = {
    body: data.body || 'You have a new request pending',
    icon: data.icon || '/favicon.ico',
    badge: '/notification-badge.png',
    tag: data.tag || 'admin-notification',
    data: {
      url: data.url || '/admin/manage-game',
      type: data.type || 'general'
    },
    requireInteraction: true,
    vibrate: [200, 100, 200]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Admin Panel Notification', options)
  );
});