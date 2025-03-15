import React from 'react';

/**
 * Modal for assigning or editing game IDs
 * @param {Object} props - Component props
 * @param {boolean} props.show - Whether the modal is visible
 * @param {Object} props.profile - Profile being edited
 * @param {string} props.gameIdInput - Current game ID input value
 * @param {function} props.onGameIdChange - Function to call when game ID changes
 * @param {string} props.passwordInput - Current password input value
 * @param {function} props.onPasswordChange - Function to call when password changes
 * @param {boolean} props.submitting - Whether a submission is in progress
 * @param {function} props.onClose - Function to call when modal is closed
 * @param {function} props.onSave - Function to call when save button is clicked
 */
const GameIdModal = ({
  show,
  profile,
  gameIdInput,
  onGameIdChange,
  passwordInput,
  onPasswordChange,
  submitting,
  onClose,
  onSave
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-start justify-between mb-5">
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            {profile.currentGameId ? 'Edit Game ID' : 'Assign Game ID'}
          </h3>
          <button
            type="button"
            className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none"
            onClick={onClose}
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
                <span className="ml-2 text-gray-900 font-medium">{profile?.username}</span>
              </div>
              <div className="mt-2 flex items-center text-sm">
                <span className="font-semibold text-gray-600 w-24">Game:</span>
                <span className="ml-2 text-gray-900 font-medium">{profile?.gameName}</span>
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
                onChange={(e) => onGameIdChange(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <div className="mb-5">
            <label htmlFor="gamePassword" className="block text-sm font-medium text-gray-700 mb-2">
              Game Password
            </label>
            <div className="relative rounded-md shadow-sm">
              <input
                type="text"
                name="gamePassword"
                id="gamePassword"
                className="block w-full px-4 py-2.5 sm:text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                placeholder="Enter game password"
                value={passwordInput}
                onChange={(e) => onPasswordChange(e.target.value)}
              />
            </div>
          </div>
        </div>
        
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
            onClick={onSave}
            disabled={submitting}
          >
            {submitting ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameIdModal;