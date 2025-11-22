"use client";

import React from 'react';
import { formatAddress, copyAddress } from '@/utils/addressUtils';

interface AddressDisplayProps {
  address: string | null | undefined;
  label?: string;
  showLabel?: boolean;
  className?: string;
}

export const AddressDisplay: React.FC<AddressDisplayProps> = ({
  address,
  label = 'Ví',
  showLabel = true,
  className = '',
}) => {
  if (!address) {
    return (
      <div className={`text-sm text-gray-700 ${className}`}>
        {showLabel && `${label}: `}
        <span className="text-gray-500">Chưa kết nối</span>
      </div>
    );
  }

  return (
    <div className={`text-sm text-gray-700 ${className}`}>
      {showLabel && `${label}: `}
      <span
        className="font-bold text-blue-600 cursor-pointer hover:text-blue-800 hover:underline"
        onClick={() => copyAddress(address)}
      >
        {formatAddress(address)}
      </span>
    </div>
  );
};

