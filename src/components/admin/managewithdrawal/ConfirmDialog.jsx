import React from 'react';

const ConfirmDialog = ({ showConfirmDialog, onConfirm, onCancel }) => {
  if (!showConfirmDialog) return null;
  
  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-gray-600 bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Rejection</h3>
        <p className="text-gray-700 mb-6">
          Are you sure you want to reject this withdrawal request? Funds will be returned to the user's wallet.
        </p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="inline-flex justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="inline-flex justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700"
          >
            Reject Withdrawal
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;