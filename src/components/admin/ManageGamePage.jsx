import React, { useState, useEffect, useRef } from 'react';

const ManageGamePage = () => {
  const [gameProfiles, setGameProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [gameIdInput, setGameIdInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [statsData, setStatsData] = useState({
    totalProfiles: 0,
    pendingProfiles: 0,
    pendingCredits: 0,
    pendingRedeems: 0
  });
  
  const itemsPerPage = 10;

  useEffect(() => {
    fetchGameProfiles();
    fetchStats();
  }, []);

  const fetchGameProfiles = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/admin/games/profiles', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch game profiles');
      }
      
      const data = await response.json();
      
      if (data.success && data.profiles) {
        setGameProfiles(data.profiles);
      } else {
        setGameProfiles([]);
      }
      
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch game profiles');
      console.error('Error fetching game profiles:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/admin/games/statistics', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch statistics');
      }
      
      const data = await response.json();
      
      if (data.success && data.statistics) {
        setStatsData({
          totalProfiles: data.statistics.totalProfiles || 0,
          pendingProfiles: data.statistics.totalPendingProfiles || 0,
          pendingCredits: data.statistics.pendingCreditRequests || 0,
          pendingRedeems: data.statistics.pendingRedeemRequests || 0
        });
      }
    } catch (err) {
      console.error('Error fetching statistics:', err);
    }
  };

  // Function to convert game profiles to table rows
  const getProfileRows = () => {
    let rows = [];
    
    gameProfiles.forEach(profile => {
      if (!profile.games || !Array.isArray(profile.games)) return;
      
      const userId = profile.userId?.toString() || profile._id?.toString();
      const username = profile.userData?.username || 'Unknown';
      const email = profile.userData?.email || 'No email';
      
      profile.games.forEach(game => {
        const row = {
          userId,
          username,
          email,
          gameName: game.gameName,
          gameId: game.gameId || 'Not assigned',
          profileStatus: game.profileStatus,
          creditAmount: game.creditAmount?.amount || 0,
          requestedAmount: game.creditAmount?.requestedAmount || 0,
          creditStatus: game.creditAmount?.status || 'none',
          createdAt: new Date(profile.createdAt || Date.now()).toLocaleDateString()
        };
        
        // Filter based on active tab
        if (
          (activeTab === 'all') ||
          (activeTab === 'pending' && game.profileStatus === 'pending') ||
          (activeTab === 'credit' && game.creditAmount?.status === 'pending') ||
          (activeTab === 'redeem' && game.creditAmount?.status === 'pending_redeem')
        ) {
          rows.push(row);
        }
      });
    });
    
    // Apply search filter
    if (searchQuery) {
      rows = rows.filter(row => 
        row.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.gameName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (row.gameId && row.gameId.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    // Sort by status priority (pending first, then active)
    rows.sort((a, b) => {
      // Sort by request status first
      if (a.creditStatus === 'pending' && b.creditStatus !== 'pending') return -1;
      if (a.creditStatus !== 'pending' && b.creditStatus === 'pending') return 1;
      if (a.creditStatus === 'pending_redeem' && b.creditStatus !== 'pending_redeem') return -1;
      if (a.creditStatus !== 'pending_redeem' && b.creditStatus === 'pending_redeem') return 1;
      
      // Then sort by profile status
      if (a.profileStatus === 'pending' && b.profileStatus !== 'pending') return -1;
      if (a.profileStatus !== 'pending' && b.profileStatus === 'pending') return 1;
      
      return 0;
    });
    
    return rows;
  };

  // Pagination
  const paginatedRows = () => {
    const allRows = getProfileRows();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return allRows.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(getProfileRows().length / itemsPerPage);

  const handleEditClick = (row) => {
    setEditingProfile({
      userId: row.userId,
      username: row.username,
      gameName: row.gameName,
      currentGameId: row.gameId === 'Not assigned' ? '' : row.gameId
    });
    setGameIdInput(row.gameId === 'Not assigned' ? '' : row.gameId);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProfile(null);
    setGameIdInput('');
  };

  const handleSaveGameId = async () => {
    if (!gameIdInput.trim()) {
      setError('Please enter a Game ID');
      return;
    }

    try {
      setSubmitting(true);
      
      const response = await fetch('http://localhost:5000/api/admin/games/assign-gameid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          userId: editingProfile.userId,
          gameName: editingProfile.gameName,
          gameId: gameIdInput.trim()
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.success) {
          await fetchGameProfiles();
          await fetchStats();
          handleCloseModal();
        } else {
          throw new Error(data.message || 'Failed to assign Game ID');
        }
      } else {
        throw new Error('Network response was not ok');
      }
    } catch (error) {
      console.error('Error assigning game ID:', error);
      setError('Failed to assign Game ID: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveCredit = async (row) => {
    try {
      setSubmitting(true);
      
      const response = await fetch('http://localhost:5000/api/admin/games/approve-credit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          userId: row.userId,
          gameName: row.gameName
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.success) {
          await fetchGameProfiles();
          await fetchStats();
        } else {
          throw new Error(data.message || 'Failed to approve credit');
        }
      } else {
        throw new Error('Network response was not ok');
      }
    } catch (error) {
      console.error('Error approving credit:', error);
      setError('Failed to approve credit: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisapproveCredit = async (row) => {
    if (!window.confirm('Are you sure you want to disapprove this credit request? This will refund the user.')) {
      return;
    }
    
    try {
      setSubmitting(true);
      
      const response = await fetch('http://localhost:5000/api/admin/games/disapprove-credit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          userId: row.userId,
          gameName: row.gameName
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.success) {
          await fetchGameProfiles();
          await fetchStats();
        } else {
          throw new Error(data.message || 'Failed to disapprove credit');
        }
      } else {
        throw new Error('Network response was not ok');
      }
    } catch (error) {
      console.error('Error disapproving credit:', error);
      setError('Failed to disapprove credit: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveRedeem = async (row) => {
    try {
      setSubmitting(true);
      
      const response = await fetch('http://localhost:5000/api/admin/games/approve-redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          userId: row.userId,
          gameName: row.gameName
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.success) {
          await fetchGameProfiles();
          await fetchStats();
        } else {
          throw new Error(data.message || 'Failed to approve redeem');
        }
      } else {
        throw new Error('Network response was not ok');
      }
    } catch (error) {
      console.error('Error approving redeem:', error);
      setError('Failed to approve redeem: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisapproveRedeem = async (row) => {
    if (!window.confirm('Are you sure you want to disapprove this redeem request?')) {
      return;
    }
    
    try {
      setSubmitting(true);
      
      const response = await fetch('http://localhost:5000/api/admin/games/disapprove-redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          userId: row.userId,
          gameName: row.gameName
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.success) {
          await fetchGameProfiles();
          await fetchStats();
        } else {
          throw new Error(data.message || 'Failed to disapprove redeem');
        }
      } else {
        throw new Error('Network response was not ok');
      }
    } catch (error) {
      console.error('Error disapproving redeem:', error);
      setError('Failed to disapprove redeem: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Get status tag component
  const StatusTag = ({ status, type = 'profile' }) => {
    let bgColor = 'bg-gray-100';
    let textColor = 'text-gray-800';
    let label = status;

    if (type === 'profile') {
      if (status === 'active') {
        bgColor = 'bg-green-100';
        textColor = 'text-green-800';
      } else if (status === 'pending') {
        bgColor = 'bg-yellow-100';
        textColor = 'text-yellow-800';
      }
    } else if (type === 'credit') {
      if (status === 'pending') {
        bgColor = 'bg-blue-100';
        textColor = 'text-blue-800';
        label = 'Credit Pending';
      } else if (status === 'pending_redeem') {
        bgColor = 'bg-purple-100';
        textColor = 'text-purple-800';
        label = 'Redeem Pending';
      } else if (status === 'success') {
        bgColor = 'bg-green-100';
        textColor = 'text-green-800';
        label = 'Active';
      }
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
        {label}
      </span>
    );
  };

  return (
    <div className="px-6 py-6 max-w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Game Management</h1>
        <p className="mt-1 text-gray-600">Manage game profiles and handle credit/redeem requests</p>
      </div>

      {/* Stats Cards */}
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

      {/* Filters and tabs */}
      <div className="mb-6">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div className="flex-1">
            <div className="flex space-x-1 rounded-lg bg-gray-100 p-1">
              <button
                onClick={() => setActiveTab('all')}
                className={`flex-1 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ${
                  activeTab === 'all' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                All Profiles
              </button>
              <button
                onClick={() => setActiveTab('pending')}
                className={`flex-1 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ${
                  activeTab === 'pending' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Pending Profiles {statsData.pendingProfiles > 0 && `(${statsData.pendingProfiles})`}
              </button>
              <button
                onClick={() => setActiveTab('credit')}
                className={`flex-1 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ${
                  activeTab === 'credit' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Credit Requests {statsData.pendingCredits > 0 && `(${statsData.pendingCredits})`}
              </button>
              <button
                onClick={() => setActiveTab('redeem')}
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
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              <button
                onClick={() => {
                  fetchGameProfiles();
                  fetchStats();
                }}
                disabled={submitting}
                className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
              >
                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="rounded-md bg-red-50 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button
                  onClick={() => setError(null)}
                  className="inline-flex rounded-md bg-red-50 p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-red-50"
                >
                  <span className="sr-only">Dismiss</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Game Profiles Table */}
{loading ? (
  <div className="flex flex-col items-center justify-center h-64">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    <p className="mt-3 text-sm text-gray-500">Loading game profiles...</p>
  </div>
) : (
  <>
    <div className="overflow-x-auto bg-white shadow-sm ring-1 ring-gray-200 sm:rounded-lg">
      {getProfileRows().length > 0 ? (
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">User</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Game</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Game ID</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
              <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                Credit Amount
              </th>
              <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                Requested
              </th>
              <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Date</th>
              <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {paginatedRows().map((row, index) => (
              <tr key={`${row.userId}-${row.gameName}-${index}`}>
                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                  <div className="flex items-center">
                    <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center">
                      <span className="text-xs font-medium text-white">
                        {row.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="ml-4">
                      <div className="font-medium text-gray-900">{row.username}</div>
                      <div className="text-gray-500">{row.email}</div>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">{row.gameName}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-700">
                  {row.gameId === 'Not assigned' ? (
                    <span className="text-gray-400 italic">Not assigned</span>
                  ) : (
                    row.gameId
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm">
                  <StatusTag status={row.profileStatus} type="profile" />
                  {row.creditStatus !== 'none' && (
                    <span className="ml-2">
                      <StatusTag status={row.creditStatus} type="credit" />
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-right text-gray-900">
                  ${row.creditAmount.toFixed(2)}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-right">
                  {row.requestedAmount > 0 ? (
                    <span className="font-medium text-gray-900">
                      ${row.requestedAmount.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-right text-gray-500">
                  {row.createdAt}
                </td>
                <td className="whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                  {row.profileStatus === 'pending' && (
                    <button
                      type="button"
                      onClick={() => handleEditClick(row)}
                      className="text-indigo-600 hover:text-indigo-900 mr-3"
                      disabled={submitting}
                    >
                      Assign ID
                    </button>
                  )}
                  
                  {row.creditStatus === 'pending' && (
                    <div className="flex space-x-2 justify-end">
                      <button
                        type="button"
                        onClick={() => handleApproveCredit(row)}
                        className="text-green-600 hover:text-green-900"
                        disabled={submitting}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDisapproveCredit(row)}
                        className="text-red-600 hover:text-red-900"
                        disabled={submitting}
                      >
                        Decline
                      </button>
                    </div>
                  )}
                  
                  {row.creditStatus === 'pending_redeem' && (
                    <div className="flex space-x-2 justify-end">
                      <button
                        type="button"
                        onClick={() => handleApproveRedeem(row)}
                        className="text-green-600 hover:text-green-900"
                        disabled={submitting}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDisapproveRedeem(row)}
                        className="text-red-600 hover:text-red-900"
                        disabled={submitting}
                      >
                        Decline
                      </button>
                    </div>
                  )}
                  
                  {row.profileStatus === 'active' && row.creditStatus === 'none' && (
                    <button
                      type="button"
                      onClick={() => handleEditClick(row)}
                      className="text-indigo-600 hover:text-indigo-900"
                      disabled={submitting}
                    >
                      Edit ID
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="py-16 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No game profiles</h3>
          <p className="mt-1 text-sm text-gray-500">
            No game profiles found matching your criteria.
          </p>
        </div>
      )}
    </div>

    {/* Pagination */}
    {getProfileRows().length > 0 && (
      <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4 rounded-md">
        <div className="flex flex-1 justify-between sm:hidden">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{Math.min((currentPage - 1) * itemsPerPage + 1, getProfileRows().length)}</span> to{' '}
              <span className="font-medium">{Math.min(currentPage * itemsPerPage, getProfileRows().length)}</span> of{' '}
              <span className="font-medium">{getProfileRows().length}</span> results
            </p>
          </div>
          <div>
            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
              >
                <span className="sr-only">Previous</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                </svg>
              </button>
              
              {/* Page numbers */}
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                    currentPage === i + 1
                      ? 'z-10 bg-indigo-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                      : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
              >
                <span className="sr-only">Next</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                </svg>
              </button>
            </nav>
          </div>
        </div>
      </div>
    )}
  </>
)}

{/* Game ID Assignment Modal */}
{showModal && (
  <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
      <div className="flex items-start justify-between mb-5">
        <h3 className="text-lg font-medium leading-6 text-gray-900">
          {editingProfile.currentGameId ? 'Edit Game ID' : 'Assign Game ID'}
        </h3>
        <button
          type="button"
          className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none"
          onClick={handleCloseModal}
        >
          <span className="sr-only">Close</span>
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="mt-2">
  <div className="mb-4">
    <div className="px-5 py-4 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
      <div className="flex items-center text-sm">
        <span className="font-semibold text-gray-600 w-24">Username:</span>
        <span className="ml-2 text-gray-900 font-medium">{editingProfile.username}</span>
      </div>
      <div className="mt-2 flex items-center text-sm">
        <span className="font-semibold text-gray-600 w-24">Game:</span>
        <span className="ml-2 text-gray-900 font-medium">{editingProfile.gameName}</span>
      </div>
    </div>
  </div>
  
  <div className="mb-5">
    <label htmlFor="gameId" className="block text-sm font-medium text-gray-700 mb-2">
      Game ID
    </label>
    <div className="relative rounded-md shadow-sm">
      <input
        type="text"
        name="gameId"
        id="gameId"
        className="block w-full px-4 py-2.5 sm:text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
        placeholder="Enter game ID"
        value={gameIdInput}
        onChange={(e) => setGameIdInput(e.target.value)}
        autoFocus
      />
    </div>
  </div>
</div>
      
      <div className="mt-5 flex justify-end gap-3">
        <button
          type="button"
          className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          onClick={handleCloseModal}
        >
          Cancel
        </button>
        <button
          type="button"
          className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
          onClick={handleSaveGameId}
          disabled={submitting}
        >
          {submitting ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  </div>
)}

      {/* Show total count */}
      <div className="mt-4 text-sm text-gray-600">
        Showing {getProfileRows().length} game profiles
      </div>
    </div>
  );
};

export default ManageGamePage;