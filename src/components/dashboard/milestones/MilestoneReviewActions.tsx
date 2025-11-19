"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { MilestoneReviewActionsProps } from '@/constants/escrow';

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
        <Button
          size="sm"
          onClick={onClaimTimeout}
          disabled={claiming || isCancelled || interactionLocked}
          className="bg-orange-100 text-black hover:bg-orange-200 text-xs px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {claiming ? 'Đang claim...' : 'Claim Timeout (Nhận stake freelancer)'}
        </Button>
      )}
      {isCancelled && (
        <span className="text-xs text-orange-700 font-bold">✓ Đã claim timeout, job đã bị hủy</span>
      )}

      {isSubmitted && canInteract && !reviewTimeout && (
        <>
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={reviewActionLocked}
            className="bg-green-100 text-black hover:bg-green-200 text-xs px-3 py-1"
          >
            {confirming ? 'Đang confirm...' : 'Confirm'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onReject}
            disabled={reviewActionLocked}
            className="bg-red-100 text-red-800 border-red-300 hover:bg-red-200 text-xs px-3 py-1"
          >
            {rejecting ? 'Đang reject...' : 'Reject'}
          </Button>
        </>
      )}

      {isSubmitted && reviewTimeout && (
        <span className="text-xs text-orange-700 font-bold">
          ⚠ Đã hết thời gian review. Freelancer có thể claim timeout.
        </span>
      )}
    </>
  );
};

