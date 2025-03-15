import React from 'react';

/**
 * Status tag component for displaying status labels with appropriate colors
 * @param {Object} props - Component props
 * @param {string} props.status - Status value
 * @param {string} props.type - Type of status (profile or credit)
 */
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

export default StatusTag;