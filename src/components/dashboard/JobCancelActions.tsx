"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { JobCancelActionsProps } from '@/constants/escrow';
import { LockIcon } from '@/components/ui/LockIcon';

export const JobCancelActions: React.FC<JobCancelActionsProps> = ({
  account,
  poster,
  freelancer,
  canInteract,
  isCancelled,
  jobState,
  hasDisputeId,
  disputeWinner,
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
  const hasActiveDispute = jobState === 'Disputed';

  console.log('[JobCancelActions] Debug:', {
    account,
    poster,
    freelancer,
    isPoster,
    isFreelancer,
    jobState,
    hasActiveDispute,
    mutualCancelRequestedBy,
    freelancerWithdrawRequestedBy,
    canInteract,
    isCancelled,
  });

  console.log('[JobCancelActions] Button conditions:', {
    'isPoster && !mutualCancelRequestedBy': isPoster && !mutualCancelRequestedBy,
    'isPoster && freelancerWithdrawRequestedBy && match': isPoster && freelancerWithdrawRequestedBy && freelancer && freelancerWithdrawRequestedBy.toLowerCase() === freelancer.toLowerCase(),
    'isFreelancer && mutualCancelRequestedBy && match': isFreelancer && mutualCancelRequestedBy && poster && mutualCancelRequestedBy.toLowerCase() === poster.toLowerCase(),
    'isFreelancer && !freelancerWithdrawRequestedBy && !mutualCancelRequestedBy': isFreelancer && !freelancerWithdrawRequestedBy && !mutualCancelRequestedBy,
  });

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
          <button
            onClick={onMutualCancel}
            disabled={cancelling || !!freelancerWithdrawRequestedBy || hasActiveDispute}
            className={`text-xs px-3 py-1 rounded border-2 font-bold flex items-center gap-2 ${
              cancelling || !!freelancerWithdrawRequestedBy || hasActiveDispute
                ? 'bg-gray-400 text-gray-600 border-gray-500 cursor-not-allowed'
                : 'bg-white text-black hover:bg-gray-100 border-black'
            }`}
            title={hasActiveDispute ? 'Không thể yêu cầu hủy khi đang có tranh chấp. Vui lòng giải quyết tranh chấp trước.' : (freelancerWithdrawRequestedBy ? 'Không thể yêu cầu khi đang có yêu cầu rút từ freelancer' : '')}
          >
            {(cancelling || !!freelancerWithdrawRequestedBy || hasActiveDispute) && <LockIcon className="w-4 h-4" />}
            {cancelling ? 'Đang xử lý...' : 'Yêu cầu hủy (Mutual Cancel)'}
          </button>
        )}

        {isPoster && freelancerWithdrawRequestedBy && freelancer && freelancerWithdrawRequestedBy.toLowerCase() === freelancer.toLowerCase() && (
          <>
            <button
              onClick={onAcceptFreelancerWithdraw}
              disabled={acceptingWithdraw || rejectingWithdraw}
              className={`text-xs px-3 py-1 rounded border-2 font-bold flex items-center gap-2 ${
                acceptingWithdraw || rejectingWithdraw
                  ? 'bg-gray-400 text-gray-600 border-gray-500 cursor-not-allowed'
                  : 'bg-white text-black hover:bg-gray-100 border-black'
              }`}
            >
              {(acceptingWithdraw || rejectingWithdraw) && <LockIcon className="w-4 h-4" />}
              {acceptingWithdraw ? 'Đang xử lý...' : 'Chấp nhận rút'}
            </button>
            <button
              onClick={onRejectFreelancerWithdraw}
              disabled={acceptingWithdraw || rejectingWithdraw}
              className={`text-xs px-3 py-1 rounded border-2 font-bold flex items-center gap-2 ${
                acceptingWithdraw || rejectingWithdraw
                  ? 'bg-gray-400 text-gray-600 border-gray-500 cursor-not-allowed'
                  : 'bg-white text-blue-800 hover:bg-blue-50 border-blue-800'
              }`}
            >
              {(acceptingWithdraw || rejectingWithdraw) && <LockIcon className="w-4 h-4" />}
              {rejectingWithdraw ? 'Đang xử lý...' : 'Từ chối rút'}
            </button>
          </>
        )}

        {isFreelancer && mutualCancelRequestedBy && poster && mutualCancelRequestedBy.toLowerCase() === poster.toLowerCase() && (
          <>
            <button
              onClick={onAcceptMutualCancel}
              disabled={acceptingCancel || rejectingCancel}
              className={`text-xs px-3 py-1 rounded border-2 font-bold flex items-center gap-2 ${
                acceptingCancel || rejectingCancel
                  ? 'bg-gray-400 text-gray-600 border-gray-500 cursor-not-allowed'
                  : 'bg-white text-black hover:bg-gray-100 border-black'
              }`}
            >
              {(acceptingCancel || rejectingCancel) && <LockIcon className="w-4 h-4" />}
              {acceptingCancel ? 'Đang xử lý...' : 'Chấp nhận hủy'}
            </button>
            <button
              onClick={onRejectMutualCancel}
              disabled={acceptingCancel || rejectingCancel}
              className={`text-xs px-3 py-1 rounded border-2 font-bold flex items-center gap-2 ${
                acceptingCancel || rejectingCancel
                  ? 'bg-gray-400 text-gray-600 border-gray-500 cursor-not-allowed'
                  : 'bg-white text-blue-800 hover:bg-blue-50 border-blue-800'
              }`}
            >
              {(acceptingCancel || rejectingCancel) && <LockIcon className="w-4 h-4" />}
              {rejectingCancel ? 'Đang xử lý...' : 'Từ chối hủy'}
            </button>
          </>
        )}

        {isFreelancer && !freelancerWithdrawRequestedBy && !mutualCancelRequestedBy && (
          <button
            onClick={onFreelancerWithdraw}
            disabled={withdrawing || hasActiveDispute}
            className={`text-xs px-3 py-1 rounded border-2 font-bold flex items-center gap-2 ${
              withdrawing || hasActiveDispute
                ? 'bg-gray-400 text-gray-600 border-gray-500 cursor-not-allowed'
                : 'bg-white text-blue-800 hover:bg-blue-50 border-blue-800'
            }`}
            title={hasActiveDispute ? 'Không thể yêu cầu rút khi đang có tranh chấp. Vui lòng giải quyết tranh chấp trước.' : ''}
          >
            {(withdrawing || hasActiveDispute) && <LockIcon className="w-4 h-4" />}
            {withdrawing ? 'Đang xử lý...' : 'Yêu cầu rút (Mất stake nếu được chấp nhận)'}
          </button>
        )}
      </div>
    </div>
  );
};

