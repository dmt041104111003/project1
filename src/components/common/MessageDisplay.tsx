"use client";

import React from 'react';

interface MessageDisplayProps {
  message: string;
  className?: string;
}

export const MessageDisplay: React.FC<MessageDisplayProps> = ({ message, className = '' }) => {
  if (!message) return null;
  
  const isSuccess = message.includes('thành công') || message.includes('success');
  const isError = message.includes('lỗi') || message.includes('Lỗi') || message.includes('error');
  
  return (
    <div className={`text-xs ${
      isSuccess ? 'text-green-700' : isError ? 'text-red-700' : 'text-gray-700'
    } ${className}`}>
      {message}
    </div>
  );
};

