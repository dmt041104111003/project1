"use client";

import React from 'react';
import { Card } from '@/components/ui/card';

interface EmptyStateProps {
  title?: string;
  message: string;
  className?: string;
  variant?: 'default' | 'card';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  message,
  className = '',
  variant = 'default',
}) => {
  const content = (
    <>
      {title && <h3 className="text-lg font-bold text-blue-800 mb-2">{title}</h3>}
      <p className="text-gray-700">{message}</p>
    </>
  );

  if (variant === 'card') {
    return (
      <Card variant="outlined" className={`p-8 text-center ${className}`}>
        {content}
      </Card>
    );
  }

  return (
    <div className={`text-center py-8 border border-gray-300 bg-gray-50 rounded ${className}`}>
      {content}
    </div>
  );
};

