import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

const QRCodeModal = ({ showQRModal, qrAddress, onClose, onCopyAddress }) => {
  if (!showQRModal || !qrAddress) return null;
  
  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-gray-600 bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Withdrawal Address</h3>
          <button 
            onClick={onClose}
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
              onClick={() => onCopyAddress(qrAddress)}
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
            onClick={onClose}
            className="inline-flex justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRCodeModal;