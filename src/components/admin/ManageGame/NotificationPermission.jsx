import React from 'react';

/**
 * Component to display notification permission status and request button
 * @param {Object} props - Component props
 * @param {boolean} props.isSupported - Whether notifications are supported
 * @param {string} props.permissionStatus - Current permission status
 * @param {function} props.onRequestPermission - Function to call to request permission
 */
const NotificationPermission = ({ isSupported, permissionStatus, onRequestPermission }) => {
  if (!isSupported) {
    return null; // Don't show anything if notifications are not supported
  }

  // If permission already granted, don't show anything
  if (permissionStatus === 'granted') {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3 flex-1 md:flex md:justify-between">
          <p className="text-sm text-blue-700">
            {permissionStatus === 'denied' 
              ? "Notifications are blocked. Please enable them in your browser settings."
              : "Enable notifications to receive alerts for new game profiles and requests."}
          </p>
          <div className="mt-3 text-sm md:mt-0 md:ml-6">
            {permissionStatus !== 'denied' && (
              <button 
                onClick={onRequestPermission}
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
  );
};

export default NotificationPermission;