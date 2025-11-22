"use client";

import React from 'react';

interface ErrorStateProps {
  message: string;
  className?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message,
  className = '',
  onRetry,
}) => {
  return (
    <div className={`text-center py-12 ${className}`}>
      <p className="text-red-500 text-lg mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Thử lại
        </button>
      )}
    </div>
  );
};

