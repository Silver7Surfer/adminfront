import React from 'react';
import StatusTag from './StatusTag';

/**
 * Game profiles table component
 * @param {Object} props - Component props
 * @param {Array} props.rows - Table rows to display
 * @param {boolean} props.loading - Whether data is loading
 * @param {boolean} props.submitting - Whether an action is being submitted
 * @param {function} props.onEditClick - Function to call when edit button is clicked
 * @param {function} props.onApproveCredit - Function to call when approve credit button is clicked
 * @param {function} props.onDisapproveCredit - Function to call when disapprove credit button is clicked
 * @param {function} props.onApproveRedeem - Function to call when approve redeem button is clicked
 * @param {function} props.onDisapproveRedeem - Function to call when disapprove redeem button is clicked
 */
const GameProfilesTable = ({
  rows,
  loading,
  submitting,
  onEditClick,
  onApproveCredit,
  onDisapproveCredit,
  onApproveRedeem,
  onDisapproveRedeem
}) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <p className="mt-3 text-sm text-gray-500">Loading game profiles...</p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="overflow-x-auto bg-white shadow-sm ring-1 ring-gray-200 sm:rounded-lg">
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
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white shadow-sm ring-1 ring-gray-200 sm:rounded-lg">
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
          {rows.map((row, index) => (
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
                    onClick={() => onEditClick(row)}
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
                      onClick={() => onApproveCredit(row)}
                      className="text-green-600 hover:text-green-900"
                      disabled={submitting}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => onDisapproveCredit(row)}
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
                      onClick={() => onApproveRedeem(row)}
                      className="text-green-600 hover:text-green-900"
                      disabled={submitting}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => onDisapproveRedeem(row)}
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
                    onClick={() => onEditClick(row)}
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
    </div>
  );
};

export default GameProfilesTable;