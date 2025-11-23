"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { MilestoneReviewActionsProps } from '@/constants/escrow';
import { LockIcon } from '@/components/ui/LockIcon';

export const MilestoneReviewActions: React.FC<MilestoneReviewActionsProps> = ({
  milestoneId: _milestoneId,
  isOverdue,
  isPending,
  isSubmitted,
  isCancelled,
  canInteract,
  reviewTimeout = false,
  confirming,
  rejecting,
  claiming,
  onConfirm,
  onReject,
  onClaimTimeout,
  interactionLocked = false,
}) => {
  const reviewActionLocked = confirming || rejecting || interactionLocked;

  return (
    <>
      {isOverdue && isPending && canInteract && !isCancelled && (
        <button
          onClick={onClaimTimeout}
          disabled={claiming || isCancelled || interactionLocked}
          className={`text-xs px-3 py-1 rounded border-2 font-bold flex items-center gap-2 ${
            claiming || isCancelled || interactionLocked
              ? 'bg-gray-400 text-gray-600 border-gray-500 cursor-not-allowed'
              : 'bg-blue-100 text-black hover:bg-blue-200 border-blue-300'
          }`}
        >
          {(claiming || isCancelled || interactionLocked) && <LockIcon className="w-4 h-4" />}
          {claiming ? 'Đang yêu cầu...' : 'Yêu cầu Hết hạn (Nhận cọc người làm tự do)'}
        </button>
      )}
      {isCancelled && (
        <span className="text-xs text-blue-800 font-bold">✓ Đã yêu cầu hết hạn, công việc đã bị hủy</span>
      )}

      {isSubmitted && canInteract && !reviewTimeout && (
        <>
          <button
            onClick={onConfirm}
            disabled={reviewActionLocked}
            className={`text-xs px-3 py-1 rounded border-2 font-bold flex items-center gap-2 ${
              reviewActionLocked
                ? 'bg-gray-400 text-gray-600 border-gray-500 cursor-not-allowed'
                : 'bg-blue-100 text-black hover:bg-blue-200 border-blue-300'
            }`}
          >
            {reviewActionLocked && <LockIcon className="w-4 h-4" />}
            {confirming ? 'Đang xác nhận...' : 'Xác nhận'}
          </button>
          <button
            onClick={onReject}
            disabled={reviewActionLocked}
            className={`text-xs px-3 py-1 rounded border-2 font-bold flex items-center gap-2 ${
              reviewActionLocked
                ? 'bg-gray-400 text-gray-600 border-gray-500 cursor-not-allowed'
                : 'bg-blue-100 text-black hover:bg-blue-200 border-blue-300'
            }`}
          >
            {reviewActionLocked && <LockIcon className="w-4 h-4" />}
            {rejecting ? 'Đang từ chối...' : 'Từ chối'}
          </button>
        </>
      )}

      {isSubmitted && reviewTimeout && (
        <span className="text-xs text-blue-800 font-bold">
          ⚠ Đã hết thời gian đánh giá. Người làm tự do có thể yêu cầu hết hạn.
        </span>
      )}
    </>
  );
};

