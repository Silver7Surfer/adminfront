import React from 'react';
import WithdrawalManagementPanel from './WithdrawalManagementPanel';

const Dashboard = () => {
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Admin Dashboard
            </h2>
          </div>
        </div>
        
        {/* Featured Ad Banner */}
        <div className="mb-8 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-8 md:px-10 md:py-12 flex flex-col md:flex-row items-center">
            <div className="flex-1 text-center md:text-left text-white mb-6 md:mb-0">
              <h3 className="text-xl md:text-2xl font-bold mb-2">Special Promotion: 30% off Premium Features</h3>
              <p className="text-purple-100 mb-4">Upgrade your account today and unlock advanced analytics tools!</p>
              <button className="bg-white text-purple-700 font-bold py-2 px-6 rounded-full shadow-md hover:bg-purple-50 transition-colors">
                Claim Offer
              </button>
            </div>
            <div className="flex-shrink-0">
              <img 
                src="/api/placeholder/300/200" 
                alt="Premium Features" 
                className="h-40 w-auto rounded-lg shadow-md" 
              />
            </div>
          </div>
        </div>
        
        {/* Withdrawal Panel */}
        <WithdrawalManagementPanel />
        
        {/* Ad Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Ad Card 1 */}
          <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 mr-4">
                  <img 
                    src="/api/placeholder/80/80" 
                    alt="Crypto Trading" 
                    className="h-16 w-16 rounded" 
                  />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Start Trading Crypto Today</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Join thousands of traders on our secure platform
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <button className="w-full bg-indigo-600 text-white py-2 px-4 rounded font-medium hover:bg-indigo-700 transition-colors">
                  Open Trading Account
                </button>
              </div>
            </div>
          </div>

          {/* Ad Card 2 */}
          <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 mr-4">
                  <img 
                    src="/api/placeholder/80/80" 
                    alt="Crypto Wallet" 
                    className="h-16 w-16 rounded" 
                  />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Secure Crypto Wallet</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Store your assets safely with industry-leading security
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <button className="w-full bg-green-600 text-white py-2 px-4 rounded font-medium hover:bg-green-700 transition-colors">
                  Download Wallet
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom Wide Ad Banner */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 mb-8">
          <div className="flex flex-col md:flex-row">
            <div className="md:w-1/2 p-6 md:p-8">
              <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold mb-3">
                NEW FEATURE
              </span>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Introducing Advanced Crypto Analytics
              </h3>
              <p className="text-gray-600 mb-4">
                Make smarter trading decisions with real-time market insights and predictive analytics.
                Our new dashboard gives you everything you need to stay ahead of market trends.
              </p>
              <button className="bg-indigo-600 text-white py-2 px-6 rounded font-medium hover:bg-indigo-700 transition-colors">
                Explore Analytics
              </button>
            </div>
            <div className="md:w-1/2 bg-gray-100">
              <img 
                src="/api/placeholder/600/300" 
                alt="Analytics Dashboard" 
                className="w-full h-full object-cover" 
              />
            </div>
          </div>
        </div>
        
        {/* Partner Logos */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-6 text-center">Trusted by Industry Leaders</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="flex items-center justify-center grayscale hover:grayscale-0 transition-all">
              <img src="/api/placeholder/120/40" alt="Partner 1" className="h-8" />
            </div>
            <div className="flex items-center justify-center grayscale hover:grayscale-0 transition-all">
              <img src="/api/placeholder/120/40" alt="Partner 2" className="h-8" />
            </div>
            <div className="flex items-center justify-center grayscale hover:grayscale-0 transition-all">
              <img src="/api/placeholder/120/40" alt="Partner 3" className="h-8" />
            </div>
            <div className="flex items-center justify-center grayscale hover:grayscale-0 transition-all">
              <img src="/api/placeholder/120/40" alt="Partner 4" className="h-8" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;