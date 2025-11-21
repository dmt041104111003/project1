"use client";

import React from 'react';

interface InfoFieldProps {
  label: string;
  value: string | number | null | undefined;
  className?: string;
  valueClassName?: string;
  labelWidth?: string;
}

export const InfoField: React.FC<InfoFieldProps> = ({
  label,
  value,
  className = '',
  valueClassName = 'text-windows-blue',
  labelWidth = 'min-w-[140px]',
}) => {
  if (!value && value !== 0) return null;

  return (
    <div className={`flex flex-col sm:flex-row sm:items-start ${className}`}>
      <span className={`font-semibold ${labelWidth}`}>{label}:</span>
      <span className={valueClassName}>{String(value)}</span>
    </div>
  );
};

