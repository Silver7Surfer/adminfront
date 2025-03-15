import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

const TransactionModal = ({ 
  showTxModal, 
  activeWithdrawal, 
  txHash,
  onTxHashChange,
  onClose, 
  onCopyAddress, 
  onApprove,
  getNetworkLabel 
}) => {
  if (!showTxModal || !activeWithdrawal) return null;
  
  return (
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
                onClick={() => onCopyAddress(activeWithdrawal.address)}
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
            onChange={(e) => onTxHashChange(e.target.value)}
            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
            placeholder="Enter blockchain transaction hash/ID"
          />
          <p className="mt-1 text-xs text-gray-500">
            You can leave this blank if you don't have a transaction hash yet.
          </p>
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="inline-flex justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onApprove}
            className="inline-flex justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
          >
            Approve
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionModal;