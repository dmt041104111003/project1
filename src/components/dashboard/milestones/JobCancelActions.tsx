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

  if (!canInteract || isCancelled || !freelancer) return null;

  return (
    <div className="mt-4 p-3 border-2 border-orange-300 bg-orange-50 rounded">
      <h5 className="text-sm font-bold text-orange-800 mb-2">Dừng dự án</h5>

      {mutualCancelRequestedBy && mutualCancelRequestedBy.toLowerCase() === poster.toLowerCase() && (
        <div className="mb-2 p-2 bg-blue-100 border border-blue-300 rounded">
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
        <div className="mb-2 p-2 bg-red-100 border border-red-300 rounded">
          {isFreelancer ? (
            <p className="text-xs text-red-800 font-bold">
              ✓ Bạn đã yêu cầu rút. Đang chờ poster xác nhận...
            </p>
          ) : (
            <p className="text-xs text-red-800 font-bold">
              ⚠ Freelancer đã yêu cầu rút. Bạn có muốn chấp nhận không?
            </p>
          )}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {isPoster && !mutualCancelRequestedBy && (
          <Button
            size="sm"
            onClick={onMutualCancel}
            disabled={cancelling || !!freelancerWithdrawRequestedBy}
            className="bg-blue-600 text-black hover:bg-blue-700 text-xs px-3 py-1 disabled:opacity-50"
            title={freelancerWithdrawRequestedBy ? 'Không thể yêu cầu khi đang có yêu cầu rút từ freelancer' : ''}
          >
            {cancelling ? 'Đang xử lý...' : 'Yêu cầu hủy (Mutual Cancel)'}
          </Button>
        )}

        {isPoster && freelancerWithdrawRequestedBy && freelancerWithdrawRequestedBy.toLowerCase() === freelancer?.toLowerCase() && (
          <>
            <Button
              size="sm"
              onClick={onAcceptFreelancerWithdraw}
              disabled={acceptingWithdraw || rejectingWithdraw}
              className="bg-green-600 text-black hover:bg-green-700 text-xs px-3 py-1"
            >
              {acceptingWithdraw ? 'Đang xử lý...' : 'Chấp nhận rút'}
            </Button>
            <Button
              size="sm"
              onClick={onRejectFreelancerWithdraw}
              disabled={acceptingWithdraw || rejectingWithdraw}
              className="bg-red-600 text-black hover:bg-red-700 text-xs px-3 py-1"
            >
              {rejectingWithdraw ? 'Đang xử lý...' : 'Từ chối rút'}
            </Button>
          </>
        )}

        {isFreelancer && mutualCancelRequestedBy && mutualCancelRequestedBy.toLowerCase() === poster.toLowerCase() && (
          <>
            <Button
              size="sm"
              onClick={onAcceptMutualCancel}
              disabled={acceptingCancel || rejectingCancel}
              className="bg-green-600 text-black hover:bg-green-700 text-xs px-3 py-1"
            >
              {acceptingCancel ? 'Đang xử lý...' : 'Chấp nhận hủy'}
            </Button>
            <Button
              size="sm"
              onClick={onRejectMutualCancel}
              disabled={acceptingCancel || rejectingCancel}
              className="bg-red-600 text-black hover:bg-red-700 text-xs px-3 py-1"
            >
              {rejectingCancel ? 'Đang xử lý...' : 'Từ chối hủy'}
            </Button>
          </>
        )}

        {isFreelancer && !freelancerWithdrawRequestedBy && !mutualCancelRequestedBy && (
          <Button
            size="sm"
            onClick={onFreelancerWithdraw}
            disabled={withdrawing}
            className="bg-red-600 text-black hover:text-white hover:bg-red-700 text-xs px-3 py-1"
          >
            {withdrawing ? 'Đang xử lý...' : 'Yêu cầu rút (Mất stake nếu được chấp nhận)'}
          </Button>
        )}
      </div>
    </div>
  );
};

