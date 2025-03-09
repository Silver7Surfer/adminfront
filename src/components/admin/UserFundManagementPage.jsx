import React from 'react';
import WithdrawalManagementPanel from './WithdrawalManagementPanel';

const UserFundManagementPage = () => {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">User Fund Management</h1>
        <p className="mt-1 text-sm text-gray-500">Manage user deposits and withdrawals</p>
      </div>

      {/* Use the WithdrawalManagementPanel component */}
      <WithdrawalManagementPanel />
    </div>
  );
};

export default UserFundManagementPage;