"use client";

import React from 'react';

export type StatusVariant = 
  | 'success' 
  | 'error' 
  | 'warning' 
  | 'info' 
  | 'default'
  | 'expired'
  | 'pending'
  | 'active'
  | 'completed'
  | 'disputed'
  | 'cancelled';

interface StatusBadgeProps {
  text: string;
  variant?: StatusVariant;
  className?: string;
}

const variantClasses: Record<StatusVariant, string> = {
  success: 'bg-blue-100 text-blue-800 border-blue-300',
  error: 'bg-blue-200 text-blue-900 border-blue-400',
  warning: 'bg-blue-100 text-blue-800 border-blue-300',
  info: 'bg-blue-100 text-blue-800 border-blue-300',
  default: 'bg-gray-100 text-gray-800 border-gray-300',
  expired: 'bg-blue-100 text-blue-800 border-blue-300',
  pending: 'bg-blue-100 text-blue-800 border-blue-300',
  active: 'bg-blue-100 text-blue-800 border-blue-300',
  completed: 'bg-gray-100 text-gray-800 border-gray-300',
  disputed: 'bg-blue-200 text-blue-900 border-blue-400',
  cancelled: 'bg-blue-100 text-blue-800 border-blue-300',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  text, 
  variant = 'default',
  className = '' 
}) => {
  return (
    <span className={`px-2 py-1 text-xs font-bold border-2 rounded ${variantClasses[variant]} ${className}`}>
      {text}
    </span>
  );
};

