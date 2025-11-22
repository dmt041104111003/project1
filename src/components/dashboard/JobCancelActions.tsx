"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { JobCancelActionsProps } from '@/constants/escrow';

export const JobCancelActions: React.FC<JobCancelActionsProps> = ({
  account,
  poster,
  freelancer,
  canInteract,
  isCancelled,
  jobState,
  mutualCancelRequestedBy,
  freelancerWithdrawRequestedBy,
  onMutualCancel,
  onAcceptMutualCancel,
  onRejectMutualCancel,
  onFreelancerWithdraw,
  onAcceptFreelancerWithdraw,
  onRejectFreelancerWithdraw,
  cancelling,
  withdrawing,
  acceptingCancel,
  rejectingCancel,
  acceptingWithdraw,
  rejectingWithdraw,
}) => {
  const isPoster = account?.toLowerCase() === poster?.toLowerCase();
  const isFreelancer = account && freelancer && account.toLowerCase() === freelancer.toLowerCase();

  if (!canInteract || isCancelled || !freelancer || jobState === 'Disputed' || jobState === 'PendingApproval') return null;

  return (
    <div className="mt-4 p-3 border-2 border-blue-800 bg-gray-50 rounded">
      <h5 className="text-sm font-bold text-blue-800 mb-2">Dừng dự án</h5>

      {mutualCancelRequestedBy && mutualCancelRequestedBy.toLowerCase() === poster.toLowerCase() && (
        <div className="mb-2 p-2 bg-gray-50 border-2 border-blue-800 rounded">
          {isPoster ? (
            <p className="text-xs text-blue-800 font-bold">
              ✓ Bạn đã yêu cầu hủy. Đang chờ freelancer xác nhận...
            </p>
          ) : (
            <p className="text-xs text-blue-800 font-bold">
              ⚠ Poster đã yêu cầu hủy. Bạn có muốn chấp nhận không?
            </p>
          )}
        </div>
      )}

      {freelancerWithdrawRequestedBy && freelancerWithdrawRequestedBy.toLowerCase() === freelancer?.toLowerCase() && (
        <div className="mb-2 p-2 bg-gray-50 border-2 border-blue-800 rounded">
          {isFreelancer ? (
            <p className="text-xs text-blue-800 font-bold">
              ✓ Bạn đã yêu cầu rút. Đang chờ poster xác nhận...
            </p>
          ) : (
            <p className="text-xs text-blue-800 font-bold">
              ⚠ Freelancer đã yêu cầu rút. Bạn có muốn chấp nhận không?
            </p>
          )}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {isPoster && !mutualCancelRequestedBy && (
          <Button
            size="sm"
            variant="primary"
            onClick={onMutualCancel}
            disabled={cancelling || !!freelancerWithdrawRequestedBy}
            className="text-xs px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
            title={freelancerWithdrawRequestedBy ? 'Không thể yêu cầu khi đang có yêu cầu rút từ freelancer' : ''}
          >
            {cancelling ? 'Đang xử lý...' : 'Yêu cầu hủy (Mutual Cancel)'}
          </Button>
        )}

        {isPoster && freelancerWithdrawRequestedBy && freelancerWithdrawRequestedBy.toLowerCase() === freelancer?.toLowerCase() && (
          <>
            <Button
              size="sm"
              variant="primary"
              onClick={onAcceptFreelancerWithdraw}
              disabled={acceptingWithdraw || rejectingWithdraw}
              className="text-xs px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {acceptingWithdraw ? 'Đang xử lý...' : 'Chấp nhận rút'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onRejectFreelancerWithdraw}
              disabled={acceptingWithdraw || rejectingWithdraw}
              className="text-xs px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {rejectingWithdraw ? 'Đang xử lý...' : 'Từ chối rút'}
            </Button>
          </>
        )}

        {isFreelancer && mutualCancelRequestedBy && mutualCancelRequestedBy.toLowerCase() === poster.toLowerCase() && (
          <>
            <Button
              size="sm"
              variant="primary"
              onClick={onAcceptMutualCancel}
              disabled={acceptingCancel || rejectingCancel}
              className="text-xs px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {acceptingCancel ? 'Đang xử lý...' : 'Chấp nhận hủy'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onRejectMutualCancel}
              disabled={acceptingCancel || rejectingCancel}
              className="text-xs px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {rejectingCancel ? 'Đang xử lý...' : 'Từ chối hủy'}
            </Button>
          </>
        )}

        {isFreelancer && !freelancerWithdrawRequestedBy && !mutualCancelRequestedBy && (
          <Button
            size="sm"
            variant="outline"
            onClick={onFreelancerWithdraw}
            disabled={withdrawing}
            className="text-xs px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {withdrawing ? 'Đang xử lý...' : 'Yêu cầu rút (Mất stake nếu được chấp nhận)'}
          </Button>
        )}
      </div>
    </div>
  );
};

