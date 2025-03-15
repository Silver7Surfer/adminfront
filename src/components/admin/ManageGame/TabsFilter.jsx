import React from 'react';

/**
 * Tabs and filter component
 * @param {Object} props - Component props
 * @param {string} props.activeTab - Currently active tab
 * @param {function} props.onTabChange - Function to call when tab changes
 * @param {string} props.searchQuery - Current search query
 * @param {function} props.onSearchChange - Function to call when search changes
 * @param {function} props.onRefresh - Function to call when refresh button is clicked
 * @param {boolean} props.isLoading - Whether data is loading
 * @param {boolean} props.isSubmitting - Whether a submission is in progress
 * @param {Object} props.statsData - Statistics data for badge counts
 */
const TabsFilter = ({
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  onRefresh,
  isLoading,
  isSubmitting,
  statsData
}) => {
  return (
    <div className="mb-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div className="flex-1">
          <div className="flex space-x-1 rounded-lg bg-gray-100 p-1">
            <button
              onClick={() => onTabChange('all')}
              className={`flex-1 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ${
                activeTab === 'all' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              All Profiles
            </button>
            <button
              onClick={() => onTabChange('pending')}
              className={`flex-1 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ${
                activeTab === 'pending' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Pending Profiles {statsData.pendingProfiles > 0 && `(${statsData.pendingProfiles})`}
            </button>
            <button
              onClick={() => onTabChange('credit')}
              className={`flex-1 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ${
                activeTab === 'credit' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Credit Requests {statsData.pendingCredits > 0 && `(${statsData.pendingCredits})`}
            </button>
            <button
              onClick={() => onTabChange('redeem')}
              className={`flex-1 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ${
                activeTab === 'redeem' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Redeem Requests {statsData.pendingRedeems > 0 && `(${statsData.pendingRedeems})`}
            </button>
          </div>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-4">
          <div className="flex space-x-2">
            <div className="relative flex-grow">
              <input
                type="text"
                placeholder="Search..."
                className="block w-full rounded-md border-0 py-1.5 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
              />
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            <button
              onClick={onRefresh}
              disabled={isSubmitting || isLoading}
              className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
            >
              {isLoading ? (
                <svg className="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              {isLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TabsFilter;