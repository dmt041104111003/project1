"use client";

import React from 'react';

interface RefreshButtonProps {
  onRefresh: () => void | Promise<void>;
  loading?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'outline';
}

export const RefreshButton: React.FC<RefreshButtonProps> = ({
  onRefresh,
  loading = false,
  className = '',
  size = 'md',
  variant = 'outline',
}) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-2',
    lg: 'text-base px-4 py-3',
  };

  const variantClasses = {
    primary: 'bg-blue-100 text-black hover:bg-blue-200 border-2 border-blue-300',
    outline: 'bg-white text-black hover:bg-gray-100 border-2 border-black',
  };

  return (
    <button
      onClick={onRefresh}
      disabled={loading}
      className={`${sizeClasses[size]} rounded border-2 font-bold flex items-center gap-2 ${
        loading
          ? 'bg-gray-400 text-gray-600 border-gray-500 cursor-not-allowed'
          : variantClasses[variant]
      } ${className}`}
      title="Làm mới dữ liệu"
    >
      {loading ? (
        <>
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Đang tải...</span>
        </>
      ) : (
        <>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Làm mới</span>
        </>
      )}
    </button>
  );
};

