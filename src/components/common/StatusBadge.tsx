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
  success: 'bg-green-100 text-green-800 border-green-300',
  error: 'bg-red-100 text-red-800 border-red-300',
  warning: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  info: 'bg-blue-100 text-blue-800 border-blue-300',
  default: 'bg-gray-100 text-gray-800 border-gray-300',
  expired: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  pending: 'bg-orange-100 text-orange-800 border-orange-300',
  active: 'bg-green-100 text-green-800 border-green-300',
  completed: 'bg-gray-100 text-gray-800 border-gray-300',
  disputed: 'bg-red-100 text-red-800 border-red-300',
  cancelled: 'bg-orange-100 text-orange-800 border-orange-300',
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

