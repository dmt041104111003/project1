"use client";

import React from 'react';
import { Button } from './button';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showAutoPlay?: boolean;
  isAutoPlaying?: boolean;
  onAutoPlayToggle?: () => void;
  showFirstLast?: boolean;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  showAutoPlay = false,
  isAutoPlaying = false,
  onAutoPlayToggle,
  showFirstLast = true,
}: PaginationProps) {
  const handlePrevious = () => {
    if (currentPage > 0) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages - 1) {
      onPageChange(currentPage + 1);
    }
  };

  const handleFirst = () => {
    onPageChange(0);
  };

  const handleLast = () => {
    onPageChange(totalPages - 1);
  };

  return (
    <div className="flex justify-center items-center gap-4 mt-6">
      {showFirstLast && (
        <Button
          onClick={handleFirst}
          variant="outline"
          className="border-2 border-blue-800 text-blue-800 hover:bg-blue-800 hover:text-white"
          disabled={currentPage === 0}
        >
          ← Đầu
        </Button>
      )}

      <Button
        onClick={handlePrevious}
        variant="outline"
        className="border-2 border-blue-800 text-blue-800 hover:bg-blue-800 hover:text-white"
        disabled={currentPage === 0}
      >
        ← Trước
      </Button>

      <div className="flex gap-2">
        {Array.from({ length: totalPages }, (_, index) => (
          <button
            key={index}
            onClick={() => onPageChange(index)}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              currentPage === index 
                ? 'bg-blue-800 w-8' 
                : 'bg-blue-300 hover:bg-blue-500'
            }`}
            aria-label={`Trang ${index + 1}`}
          />
        ))}
      </div>

      <Button
        onClick={handleNext}
        variant="outline"
        className="border-2 border-blue-800 text-blue-800 hover:bg-blue-800 hover:text-white"
        disabled={currentPage >= totalPages - 1}
      >
        Sau →
      </Button>

      {showFirstLast && (
        <Button
          onClick={handleLast}
          variant="outline"
          className="border-2 border-blue-800 text-blue-800 hover:bg-blue-800 hover:text-white"
          disabled={currentPage >= totalPages - 1}
        >
          Cuối →
        </Button>
      )}

      {showAutoPlay && onAutoPlayToggle && (
        <Button
          onClick={onAutoPlayToggle}
          variant="outline"
          className="border-2 border-blue-800 text-blue-800 hover:bg-blue-800 hover:text-white"
        >
          {isAutoPlaying ? '⏸ Tạm dừng' : '▶ Tiếp tục'}
        </Button>
      )}
    </div>
  );
}

