"use client";

import React from 'react';
import { LockIcon } from './LockIcon';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  children, 
  disabled,
  ...props 
}: ButtonProps) {
  const getVariantStyles = () => {
    if (disabled) {
      return 'bg-gray-400 text-gray-600 border-2 border-gray-500 cursor-not-allowed';
    }
    
    switch (variant) {
      case 'primary':
        return 'bg-white text-black border-2 border-black hover:bg-gray-100 active:bg-gray-200';
      case 'secondary':
        return 'bg-gray-100 text-blue-800 border border-blue-800 hover:bg-gray-200 active:bg-gray-300';
      case 'outline':
        return 'bg-white text-blue-800 border border-blue-800 hover:bg-blue-50 active:bg-blue-100';
      default:
        return 'bg-white text-black border-2 border-black hover:bg-gray-100 active:bg-gray-200';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'px-4 py-2 text-sm';
      case 'md':
        return 'px-6 py-3 text-base';
      case 'lg':
        return 'px-8 py-4 text-lg';
      default:
        return 'px-6 py-3 text-base';
    }
  };

  return (
    <button
      className={`font-bold flex items-center justify-center gap-2 ${getVariantStyles()} ${getSizeStyles()} ${className}`}
      disabled={disabled}
      {...props}
    >
      {disabled && <LockIcon className="w-4 h-4" />}
      {children}
    </button>
  );
}
