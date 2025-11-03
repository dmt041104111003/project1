"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface MilestoneReviewActionsProps {
  jobId: number;
  milestoneId: number;
  account: string | null;
  isOverdue: boolean;
  isPending: boolean;
  isSubmitted: boolean;
  isCancelled: boolean;
  canInteract: boolean;
  confirming: boolean;
  rejecting: boolean;
  claiming: boolean;
  onConfirm: () => void;
  onReject: () => void;
  onClaimTimeout: () => void;
}

export const MilestoneReviewActions: React.FC<MilestoneReviewActionsProps> = ({
  milestoneId,
  isOverdue,
  isPending,
  isSubmitted,
  isCancelled,
  canInteract,
  confirming,
  rejecting,
  claiming,
  onConfirm,
  onReject,
  onClaimTimeout,
}) => {
  return (
    <>
      {isOverdue && isPending && canInteract && !isCancelled && (
        <Button
          size="sm"
          onClick={onClaimTimeout}
          disabled={claiming || isCancelled}
          className="bg-orange-600 text-black hover:bg-orange-700 text-xs px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {claiming ? 'Đang claim...' : 'Claim Timeout (Nhận stake freelancer)'}
        </Button>
      )}
      {isCancelled && (
        <span className="text-xs text-orange-700 font-bold">✓ Đã claim timeout, job đã bị hủy</span>
      )}

      {isSubmitted && canInteract && (
        <>
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={confirming}
            className="bg-green-600 text-black hover:bg-green-700 text-xs px-3 py-1"
          >
            {confirming ? 'Đang confirm...' : 'Confirm'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onReject}
            disabled={rejecting}
            className="bg-red-100 text-red-800 border-red-300 hover:bg-red-200 text-xs px-3 py-1"
          >
            {rejecting ? 'Đang reject...' : 'Reject'}
          </Button>
        </>
      )}
    </>
  );
};

