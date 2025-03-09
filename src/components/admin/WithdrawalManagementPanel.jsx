// src/components/WithdrawalManagementPanel.jsx
import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
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
} from '../../../services/withdrawlManagementService';

const WithdrawalManagementPanel = () => {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [txHash, setTxHash] = useState('');
  const [activeWithdrawal, setActiveWithdrawal] = useState(null);
  const [showTxModal, setShowTxModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrAddress, setQrAddress] = useState('');
  
  // Custom alert state
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('success'); // 'success', 'error', 'warning', 'info'
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  
  // Notification state
  const [newNotification, setNewNotification] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const previousWithdrawalsCountRef = useRef(0);
  
  // Initialize WebSocket connection
  useEffect(() => {
    // Fetch data initially using REST API to ensure we have data
    fetchPendingWithdrawalsFallback();
    
    // Socket event handlers
    const onAuthSuccess = (response) => {
      console.log('Socket authenticated successfully');
    };
    
    const onAuthFailure = (message) => {
      console.error('Socket authentication failed:', message);
      setError('WebSocket authentication failed: ' + message);
      // Fall back to REST API
      fetchPendingWithdrawalsFallback();
    };
    
    const onWithdrawalsReceived = (data) => {
      if (data.success) {
        // Check if this is an update with new withdrawals
        const currentCount = withdrawals.length;
        const newCount = (data.pendingWithdrawals || []).length;
        
        if (currentCount > 0 && newCount > currentCount) {
          // There are new withdrawals
          const additionalCount = newCount - currentCount;
          setNotificationCount(additionalCount);
          setNewNotification(true);
          
          // Play notification sound and show browser notification
          playNotificationSound();
          showBrowserNotification(
            'New Withdrawal Requests', 
            `${additionalCount} new withdrawal request${additionalCount > 1 ? 's' : ''} pending`
          );
        }
        
        // Update state with new withdrawals
        setWithdrawals(data.pendingWithdrawals || []);
        setError(null);
      } else {
        setError(data.message || 'Failed to fetch pending withdrawals');
      }
      setLoading(false);
    };
    
    const onError = (error) => {
      console.error('Socket error:', error);
      setError(error.message || 'WebSocket error occurred');
      setLoading(false);
    };
    
    // Initialize socket with event handlers
    initializeSocket(
      onAuthSuccess, 
      onAuthFailure, 
      onWithdrawalsReceived,
      onError
    );
    
    // Request browser notification permission on component mount
    if ("Notification" in window && 
        Notification.permission !== 'granted' && 
        Notification.permission !== 'denied') {
      requestNotificationPermission();
    }
    
    // Clean up socket connection when component unmounts
    return () => {
      disconnectSocket();
    };
  }, []);

  // Track withdrawals count for notifications
  useEffect(() => {
    // If this isn't the initial load and we have more withdrawals than before
    if (previousWithdrawalsCountRef.current > 0 && 
        withdrawals.length > previousWithdrawalsCountRef.current) {
      const newCount = withdrawals.length - previousWithdrawalsCountRef.current;
      setNotificationCount(newCount);
      setNewNotification(true);
    }
    
    // Update the reference for next comparison
    previousWithdrawalsCountRef.current = withdrawals.length;
  }, [withdrawals.length]);
  
  // Function to show alert
  const showCustomAlert = (message, type = 'success') => {
    setAlertMessage(message);
    setAlertType(type);
    setShowAlert(true);
    // Auto hide after 3 seconds
    setTimeout(() => {
      setShowAlert(false);
    }, 3000);
  };
  
  // Clear notifications
  const clearNotifications = () => {
    setNewNotification(false);
    setNotificationCount(0);
  };

  // Request browser notification permission
  const handleRequestNotificationPermission = async () => {
    const permission = await requestNotificationPermission();
    
    if (permission === 'not-supported') {
      showCustomAlert("This browser does not support desktop notifications", "warning");
      return;
    }
    
    if (permission === "granted") {
      showCustomAlert("Notifications enabled!", "success");
    } else {
      showCustomAlert("Notification permission denied", "info");
    }
  };
  
  // Fallback function to use REST API
  const fetchPendingWithdrawalsFallback = async () => {
    try {
      setLoading(true);
      const data = await fetchPendingWithdrawals();
      setWithdrawals(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching withdrawals:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Refresh data on demand - use WebSocket if connected, otherwise fallback to REST
  const handleFetchPendingWithdrawals = () => {
    clearNotifications(); // Clear notifications when manually refreshing
    
    if (isSocketConnected()) {
      setLoading(true);
      requestPendingWithdrawals();
    } else {
      fetchPendingWithdrawalsFallback();
    }
  };
  
  const handleApproveClick = (withdrawal) => {
    setActiveWithdrawal(withdrawal);
    setTxHash('');
    setShowTxModal(true);
  };

  const handleShowQR = (address) => {
    setQrAddress(address);
    setShowQRModal(true);
  };

  const handleCopyAddress = (address) => {
    copyToClipboard(address)
      .then(() => {
        showCustomAlert('Address copied to clipboard!', 'success');
      })
      .catch((err) => {
        console.error('Failed to copy: ', err);
        showCustomAlert('Failed to copy address', 'error');
      });
  };
  
  const handleApproveWithdrawal = async () => {
    if (!activeWithdrawal) return;
    
    try {
      await approveWithdrawal(activeWithdrawal, txHash);
      // Remove the approved withdrawal from the list
      setWithdrawals(withdrawals.filter(w => w.withdrawalId !== activeWithdrawal.withdrawalId));
      setShowTxModal(false);
      setActiveWithdrawal(null);
      showCustomAlert('Withdrawal successfully approved!', 'success');
    } catch (err) {
      setError(err.message);
      showCustomAlert(err.message, 'error');
      console.error('Error approving withdrawal:', err);
    }
  };
  
  const handleConfirmDisapprove = (withdrawal) => {
    setConfirmAction(() => () => performDisapproveWithdrawal(withdrawal));
    setShowConfirmDialog(true);
  };
  
  const performDisapproveWithdrawal = async (withdrawal) => {
    try {
      await disapproveWithdrawal(withdrawal);
      // Remove the rejected withdrawal from the list
      setWithdrawals(withdrawals.filter(w => w.withdrawalId !== withdrawal.withdrawalId));
      showCustomAlert('Withdrawal successfully rejected', 'info');
    } catch (err) {
      setError(err.message);
      showCustomAlert(err.message, 'error');
      console.error('Error rejecting withdrawal:', err);
    }
  };
  
  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Pending Withdrawals</h2>
        <div className="flex justify-center py-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white shadow rounded-lg p-4 mb-6 relative">
      {/* Notification Badge */}
      {newNotification && (
        <div 
          className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg animate-pulse z-50 cursor-pointer"
          onClick={clearNotifications}
        >
          <div className="flex items-center">
            <svg className="w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span>
              {notificationCount} new withdrawal{notificationCount > 1 ? 's' : ''} pending
            </span>
          </div>
        </div>
      )}

      {/* Custom Alert */}
      {showAlert && (
        <div className={`absolute top-4 right-4 p-4 rounded-md shadow-lg z-50 transition-all duration-300 ${
          alertType === 'success' ? 'bg-green-100 border border-green-400 text-green-700' :
          alertType === 'error' ? 'bg-red-100 border border-red-400 text-red-700' :
          alertType === 'warning' ? 'bg-yellow-100 border border-yellow-400 text-yellow-700' :
          'bg-blue-100 border border-blue-400 text-blue-700'
        }`}>
          <div className="flex items-center">
            {alertType === 'success' && (
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
            {alertType === 'error' && (
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
            {alertType === 'warning' && (
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
            {alertType === 'info' && (
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            )}
            <p>{alertMessage}</p>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 backdrop-blur-sm bg-gray-600 bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Rejection</h3>
            <p className="text-gray-700 mb-6">
              Are you sure you want to reject this withdrawal request? Funds will be returned to the user's wallet.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="inline-flex justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowConfirmDialog(false);
                  if (confirmAction) confirmAction();
                }}
                className="inline-flex justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700"
              >
                Reject Withdrawal
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-gray-900">Pending Withdrawals</h2>
        <div className="flex">
          <button
            onClick={handleRequestNotificationPermission}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 mr-2"
            title="Notification Settings"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>
          <button
            onClick={handleFetchPendingWithdrawals}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
          >
            <svg className="-ml-0.5 mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 p-3 rounded-md mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {withdrawals.length === 0 ? (
        <div className="text-center py-6 text-gray-500">
          No pending withdrawals
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {withdrawals.map((withdrawal) => (
                <tr key={withdrawal.withdrawalId}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                        <span className="text-indigo-800 font-medium">{withdrawal.username.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{withdrawal.username}</div>
                        <div className="text-sm text-gray-500">{withdrawal.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {getNetworkLabel(withdrawal.asset, withdrawal.network)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${withdrawal.amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {withdrawal.address ? (
                      <button 
                        onClick={() => handleShowQR(withdrawal.address)}
                        className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                        View QR
                      </button>
                    ) : (
                      "Address not available"
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(withdrawal.timestamp)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleApproveClick(withdrawal)}
                      className="text-green-600 hover:text-green-900 mr-4"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleConfirmDisapprove(withdrawal)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Transaction Hash Modal */}
      {showTxModal && activeWithdrawal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-gray-600 bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Approve Withdrawal</h3>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-1">
                <span className="font-medium">User:</span> {activeWithdrawal.username}
              </p>
              <p className="text-sm text-gray-600 mb-1">
                <span className="font-medium">Asset:</span> {getNetworkLabel(activeWithdrawal.asset, activeWithdrawal.network)}
              </p>
              <p className="text-sm text-gray-600 mb-1">
                <span className="font-medium">Amount:</span> ${activeWithdrawal.amount.toFixed(2)}
              </p>
              <p className="text-sm text-gray-600 mb-1">
                <span className="font-medium">User's Withdrawal Address:</span>
              </p>
              <div className="bg-gray-50 rounded p-2 mb-3 break-all text-xs text-gray-800 flex justify-between items-center">
                <span className="mr-2">{activeWithdrawal.address || "Address not available"}</span>
                {activeWithdrawal.address && (
                  <button 
                    onClick={() => handleCopyAddress(activeWithdrawal.address)}
                    className="text-indigo-600 hover:text-indigo-800"
                    title="Copy address"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                )}
              </div>
              
              <div className="flex justify-center mb-4">
                {activeWithdrawal.address && (
                  <div className="p-2 bg-white border border-gray-200 rounded-md">
                    <QRCodeSVG 
                      value={activeWithdrawal.address} 
                      size={128}
                      includeMargin={true}
                    />
                  </div>
                )}
              </div>
              
              <div className="bg-blue-50 rounded p-3 mb-4">
                <p className="text-sm text-blue-800 font-medium mb-1">Payment Instructions:</p>
                <p className="text-xs text-blue-700">
                  Send {activeWithdrawal.amount.toFixed(2)} {activeWithdrawal.asset.toUpperCase()} to the address above using
                  {activeWithdrawal.network && activeWithdrawal.network !== activeWithdrawal.asset ? 
                  ` the ${activeWithdrawal.network.toUpperCase()} network` : 
                  ' the native network'}.
                </p>
              </div>
              
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transaction Hash (Optional)
              </label>
              <input
                type="text"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                placeholder="Enter blockchain transaction hash/ID"
              />
              <p className="mt-1 text-xs text-gray-500">
                You can leave this blank if you don't have a transaction hash yet.
              </p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowTxModal(false)}
                className="inline-flex justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleApproveWithdrawal}
                className="inline-flex justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
{/* QR Code Modal */}
{showQRModal && qrAddress && (
  <div className="fixed inset-0 backdrop-blur-sm bg-gray-600 bg-opacity-30 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 w-full max-w-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">Withdrawal Address</h3>
        <button 
          onClick={() => setShowQRModal(false)}
          className="text-gray-400 hover:text-gray-500"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="flex justify-center mb-4">
        <div className="p-4 bg-white border border-gray-200 rounded-md">
          <QRCodeSVG 
            value={qrAddress} 
            size={200}
            includeMargin={true}
          />
        </div>
      </div>
      
      <div className="bg-gray-50 rounded p-3 mb-4">
        <div className="flex justify-between items-center">
          <div className="break-all text-sm text-gray-800 mr-2">
            {qrAddress}
          </div>
          <button 
            onClick={() => handleCopyAddress(qrAddress)}
            className="flex-shrink-0 inline-flex items-center justify-center p-1.5 border border-transparent rounded-md text-indigo-600 hover:bg-indigo-50"
            title="Copy address"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      </div>
      
      <div className="flex justify-end">
        <button
          onClick={() => setShowQRModal(false)}
          className="inline-flex justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}
</div>
  );
};

export default WithdrawalManagementPanel;