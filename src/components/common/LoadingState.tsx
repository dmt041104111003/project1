"use client";

import React from 'react';

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Đang tải...',
  className = '',
}) => {
  return (
    <div className={`text-center py-12 ${className}`}>
      <p className="text-gray-700 text-lg">{message}</p>
    </div>
  );
};

