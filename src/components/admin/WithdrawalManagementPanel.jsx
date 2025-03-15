import React, { useState, useEffect, useRef } from 'react';
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

// Import components from managewithdrawal folder
import AlertMessage from './managewithdrawal/AlertMessage';
import ConfirmDialog from './managewithdrawal/ConfirmDialog';
import ErrorAlert from './managewithdrawal/ErrorAlert';
import LoadingState from './managewithdrawal/LoadingState';
import NotificationBadge from './managewithdrawal/NotificationBadge';
import PanelHeader from './managewithdrawal/PanelHeader';
import QRCodeModal from './managewithdrawal/QRCodeModal';
import TransactionModal from './managewithdrawal/TransactionModal';
import WithdrawalTable from './managewithdrawal/WithdrawalTable';

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
    return <LoadingState />;
  }
  
  return (
    <div className="bg-white shadow rounded-lg p-4 mb-6 relative">
      {/* Notification Badge */}
      <NotificationBadge 
        newNotification={newNotification}
        notificationCount={notificationCount}
        onClear={clearNotifications}
      />

      {/* Custom Alert */}
      <AlertMessage 
        showAlert={showAlert}
        alertType={alertType}
        alertMessage={alertMessage}
      />

      {/* Confirmation Dialog */}
      <ConfirmDialog 
        showConfirmDialog={showConfirmDialog}
        onConfirm={() => {
          setShowConfirmDialog(false);
          if (confirmAction) confirmAction();
        }}
        onCancel={() => setShowConfirmDialog(false)}
      />

      {/* Panel Header */}
      <PanelHeader 
        onRequestNotificationPermission={handleRequestNotificationPermission}
        onRefreshData={handleFetchPendingWithdrawals}
      />
      
      {/* Error Alert */}
      <ErrorAlert error={error} />
      
      {/* Withdrawal Table */}
      <WithdrawalTable 
        withdrawals={withdrawals}
        onApproveClick={handleApproveClick}
        onShowQR={handleShowQR}
        onConfirmDisapprove={handleConfirmDisapprove}
        formatDate={formatDate}
        getNetworkLabel={getNetworkLabel}
      />
      
      {/* Transaction Hash Modal */}
      <TransactionModal 
        showTxModal={showTxModal}
        activeWithdrawal={activeWithdrawal}
        txHash={txHash}
        onTxHashChange={setTxHash}
        onClose={() => setShowTxModal(false)}
        onCopyAddress={handleCopyAddress}
        onApprove={handleApproveWithdrawal}
        getNetworkLabel={getNetworkLabel}
      />

      {/* QR Code Modal */}
      <QRCodeModal 
        showQRModal={showQRModal}
        qrAddress={qrAddress}
        onClose={() => setShowQRModal(false)}
        onCopyAddress={handleCopyAddress}
      />
    </div>
  );
};

export default WithdrawalManagementPanel;