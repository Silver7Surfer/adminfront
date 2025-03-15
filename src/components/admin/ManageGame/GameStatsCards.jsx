import React from 'react';

/**
 * Game statistics cards component
 * @param {Object} props - Component props
 * @param {Object} props.statsData - Statistics data
 */
const GameStatsCards = ({ statsData }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div className="bg-white shadow-sm rounded-lg p-5 border border-gray-200">
        <div className="flex items-center">
          <div className="flex-shrink-0 bg-indigo-500 rounded-md p-3">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div className="ml-5">
            <div className="text-sm font-medium text-gray-500">Total Profiles</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">{statsData.totalProfiles}</div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg p-5 border border-gray-200">
        <div className="flex items-center">
          <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-5">
            <div className="text-sm font-medium text-gray-500">Pending Profiles</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">{statsData.pendingProfiles}</div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg p-5 border border-gray-200">
        <div className="flex items-center">
          <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          </div>
          <div className="ml-5">
            <div className="text-sm font-medium text-gray-500">Credit Requests</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">{statsData.pendingCredits}</div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg p-5 border border-gray-200">
        <div className="flex items-center">
          <div className="flex-shrink-0 bg-purple-500 rounded-md p-3">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <div className="ml-5">
            <div className="text-sm font-medium text-gray-500">Redeem Requests</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">{statsData.pendingRedeems}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameStatsCards;