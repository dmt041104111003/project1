"use client";

import React from 'react';

interface InfoCardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'windows';
}

export const InfoCard: React.FC<InfoCardProps> = ({
  title,
  children,
  className = '',
  variant = 'default',
}) => {
  const baseClasses = variant === 'windows'
    ? 'p-3 sm:p-4 bg-windows-bg border-2 border-windows-border rounded-lg text-xs sm:text-sm'
    : 'p-4 bg-white border border-gray-300 rounded-lg';

  return (
    <div className={`${baseClasses} ${className}`}>
      {title && (
        <div className="font-bold text-windows-blue mb-2">{title}</div>
      )}
      <div className="space-y-1 sm:space-y-2 text-black">
        {children}
      </div>
    </div>
  );
};

