"use client";

import React from 'react';
import clsx from 'clsx';

type SegmentedTabValue = string;

export interface SegmentedTabOption {
  value: SegmentedTabValue;
  label: React.ReactNode;
  disabled?: boolean;
  badge?: React.ReactNode;
}

interface SegmentedTabsProps {
  tabs: SegmentedTabOption[];
  activeTab: SegmentedTabValue;
  onChange: (value: SegmentedTabValue) => void;
  className?: string;
  size?: 'sm' | 'md';
  stretch?: boolean;
}

export const SegmentedTabs: React.FC<SegmentedTabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className = '',
  size = 'md',
  stretch = false,
}) => {
  const sizeClasses =
    size === 'sm'
      ? 'px-3 py-2 text-sm'
      : 'px-4 py-2 text-sm md:px-6 md:py-3 md:text-base';

  return (
    <div
      className={clsx(
        'inline-flex rounded-lg bg-gray-100 p-1 gap-1',
        stretch && 'flex w-full',
        className,
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.value === activeTab;
        const showBadge = tab.badge !== undefined && tab.badge !== null;
        return (
          <button
            key={tab.value}
            type="button"
            disabled={tab.disabled}
            onClick={() => !tab.disabled && onChange(tab.value)}
            className={clsx(
              'relative flex items-center justify-center font-semibold transition-all rounded-md border',
              sizeClasses,
              stretch && 'flex-1',
              tab.disabled
                ? 'text-gray-400 border-transparent cursor-not-allowed opacity-60'
                : isActive
                ? 'bg-blue-800 text-white border-blue-800 shadow-sm'
                : 'bg-transparent text-gray-700 border-transparent hover:bg-white hover:text-blue-800',
            )}
          >
            <span className="inline-flex items-center gap-2">
              {tab.label}
              {showBadge && (
                <span className="inline-flex min-w-[1.5rem] justify-center items-center rounded-full bg-white/80 px-2 py-0.5 text-xs font-bold text-blue-800">
                  {tab.badge}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
};

