"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { JobSidebarProps } from '@/constants/escrow';
import { formatAddress, copyAddress } from '@/utils/addressUtils';
import { getJobStateText } from '@/components/dashboard/MilestoneUtils';

const parseState = (state: any): string => {
  if (typeof state === 'string') return state;
  if (state?.vec && Array.isArray(state.vec) && state.vec.length > 0) return String(state.vec[0]);
  if (state?.__variant__) return String(state.__variant__);
  return 'Posted';
};

const getFreelancerAddr = (freelancer: any): string | null => {
  if (!freelancer) return null;
  if (typeof freelancer === 'string') return freelancer;
  if (freelancer?.vec && Array.isArray(freelancer.vec) && freelancer.vec.length > 0) {
    return freelancer.vec[0];
  }
  return null;
};

export const JobSidebar: React.FC<JobSidebarProps> = ({
  jobData,
  account,
  hasFreelancerRole,
  applying,
  onApply,
  latestFreelancerAddress,
  pendingFreelancerAddress,
  withdrawingApplication,
  onWithdrawApplication,
  reviewingCandidate = false,
  onReviewCandidate,
}) => {
  const router = useRouter();
  
  if (!jobData) return null;

  const renderApplySection = () => {
    if (!account) {
      return (
        <div className="text-center py-4">
          <p className="text-sm text-gray-900 mb-2 font-medium">
            Vui lòng kết nối ví để ứng tuyển
          </p>
        </div>
      );
    }

    if (!hasFreelancerRole) {
      return (
        <div className="text-center py-4">
          <p className="text-sm text-blue-800 mb-2 font-bold">
            Bạn cần có vai trò Người làm tự do để ứng tuyển công việc
          </p>
          <Button
            onClick={() => router.push('/auth/did-verification')}
            variant="outline"
            size="sm"
            className="mt-2"
          >
            Đăng ký vai trò Người làm tự do
          </Button>
        </div>
      );
    }

    const hasFreelancer = getFreelancerAddr(jobData.freelancer) !== null;
    const pendingCandidate = pendingFreelancerAddress;
    const stateStr = parseState(jobData.state);
    const isPosted = stateStr === 'Posted';
    const isCancelled = stateStr === 'Cancelled';
    const isCancelledByPoster = stateStr === 'CancelledByPoster';
    const freelancerStake = Number(jobData.freelancer_stake || 0);
    const applyDeadline = jobData.apply_deadline ? Number(jobData.apply_deadline) : 0;
    const applyDeadlineExpired = applyDeadline > 0 && applyDeadline * 1000 < Date.now();
    const isExpiredPosted = isPosted && applyDeadlineExpired && !hasFreelancer;

    const hasTimedOutMilestone = jobData.milestones && Array.isArray(jobData.milestones) 
      ? jobData.milestones.some((milestone: any) => {
          const deadline = Number(milestone.deadline || 0);
          const statusStr = typeof milestone.status === 'string' 
            ? milestone.status 
            : (milestone.status?.vec && Array.isArray(milestone.status.vec) && milestone.status.vec.length > 0 
              ? String(milestone.status.vec[0]) 
              : (milestone.status?.__variant__ ? String(milestone.status.__variant__) : 'Pending'));
          return deadline > 0 && deadline * 1000 < Date.now() && statusStr === 'Pending';
        })
      : false;

    const isReopenedAfterTimeout = (isCancelled && freelancerStake === 0) || hasTimedOutMilestone;
    
    if (isCancelledByPoster) {
      return (
        <div className="text-center py-4">
          <p className="text-sm text-blue-800 font-bold">Công việc đã bị hủy bởi người thuê</p>
        </div>
      );
    }
    
    if (isExpiredPosted && !isReopenedAfterTimeout) {
      return (
        <div className="text-center py-4">
          <p className="text-sm text-blue-800 font-bold">Đã hết hạn đăng ký ứng tuyển</p>
        </div>
      );
    }
    
    const applyDeadlineExpiredForApply = applyDeadline > 0 && applyDeadline * 1000 < Date.now();
    
    const isInProgress = stateStr === 'InProgress' || displayState === 'InProgress';
    
    if (isInProgress) {
      return (
        <div className="text-center py-4">
          <p className="text-sm text-gray-900 font-medium">Công việc đang được thực hiện</p>
        </div>
      );
    }
    
    if (pendingCandidate && stateStr !== 'Cancelled' && stateStr !== 'CancelledByPoster') {
      const isPendingCandidate = pendingCandidate && account && pendingCandidate.toLowerCase() === account.toLowerCase();
      const isPoster = account && jobData?.poster && account.toLowerCase() === String(jobData.poster).toLowerCase();
      return (
        <div className="text-center py-4 space-y-3">
          <p className="text-sm text-blue-800 font-bold">
            Công việc đang chờ Người thuê phê duyệt ứng viên.
          </p>
          {pendingCandidate && (
            <p className="text-xs text-gray-600">
              Ứng viên hiện tại: {formatAddress(pendingCandidate)}
            </p>
          )}
          {isPoster && onReviewCandidate && (
            <div className="space-y-2">
              <p className="text-xs text-blue-800 mb-2 font-bold">
                Bạn có thể phê duyệt hoặc từ chối ứng viên. Nếu từ chối, ứng viên sẽ được hoàn cọc và phí.
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => onReviewCandidate(true)}
                  disabled={reviewingCandidate || withdrawingApplication}
                  size="sm"
                  variant="primary"
                  className="flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {reviewingCandidate ? 'Đang phê duyệt...' : 'Phê duyệt ứng viên'}
                </Button>
                <Button
                  onClick={() => onReviewCandidate(false)}
                  disabled={reviewingCandidate || withdrawingApplication}
                  variant="outline"
                  size="sm"
                  className="flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {reviewingCandidate ? 'Đang xử lý...' : 'Từ chối & hoàn tiền'}
                </Button>
              </div>
            </div>
          )}
          {isPendingCandidate && onWithdrawApplication && (
            <Button
              onClick={onWithdrawApplication}
              disabled={withdrawingApplication || reviewingCandidate}
              variant="outline"
              size="sm"
              className="w-full"
            >
              {withdrawingApplication ? 'Đang rút...' : 'Rút ứng tuyển (Không mất cọc và phí)'}
            </Button>
          )}
        </div>
      );
    }

    const canApply = isPosted && !hasFreelancer && !applyDeadlineExpiredForApply;

    if (!canApply) {
      if (!isPosted) {
        return (
          <div className="text-center py-4">
            <p className="text-sm text-gray-900 font-medium">
              Công việc không còn ở trạng thái Mở (trạng thái: {stateStr})
            </p>
          </div>
        );
      }
      if (hasFreelancer) {
        return (
          <div className="text-center py-4">
            <p className="text-sm text-gray-900 font-medium">Công việc đã có người làm tự do</p>
          </div>
        );
      }
    }

    if (applyDeadlineExpiredForApply) {
      return (
        <div className="text-center py-4">
          <p className="text-sm text-blue-800 font-bold">Đã hết hạn đăng ký ứng tuyển</p>
          {isReopenedAfterTimeout && (
            <p className="text-xs text-gray-600 mt-1">
              Công việc đã được mở lại nhưng hạn đăng ký đã hết hạn
            </p>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {isReopenedAfterTimeout && (
          <div className="text-center mb-2">
            <p className="text-xs text-blue-800 font-bold bg-gray-50 border-2 border-blue-800 rounded px-2 py-1">
              Công việc đã được mở lại (Người làm tự do trước đã hết hạn)
            </p>
          </div>
        )}
        <Button
          onClick={onApply}
          disabled={applying}
          size="lg"
          className="w-full py-4 text-lg font-bold"
        >
          {applying ? 'Đang nhận việc...' : 'Nhận Công việc'}
        </Button>
      </div>
    );
  };

  const stateStr = parseState(jobData.state);
  const freelancerAddr = getFreelancerAddr(jobData.freelancer);
  const displayFreelancerAddr = freelancerAddr || latestFreelancerAddress || null;
  const isFreelancerOfJob = account && freelancerAddr 
    ? account.toLowerCase() === freelancerAddr.toLowerCase() 
    : false;
  const isPosterOfJob = account && jobData.poster
    ? account.toLowerCase() === String(jobData.poster).toLowerCase()
    : false;
  
  const applyDeadline = jobData.apply_deadline ? Number(jobData.apply_deadline) : 0;
  const applyDeadlineExpired = applyDeadline > 0 && applyDeadline * 1000 < Date.now();
  const hasFreelancer = freelancerAddr !== null;
  const pendingCandidate = pendingFreelancerAddress;
  
  const freelancerStake = Number(jobData.freelancer_stake || 0);
  const isCancelled = stateStr === 'Cancelled';
  const isCancelledByPoster = stateStr === 'CancelledByPoster';
  const hasTimedOutMilestone = jobData.milestones && Array.isArray(jobData.milestones) 
    ? jobData.milestones.some((milestone: any) => {
        const deadline = Number(milestone.deadline || 0);
        const statusStr = typeof milestone.status === 'string' 
          ? milestone.status 
          : (milestone.status?.vec && Array.isArray(milestone.status.vec) && milestone.status.vec.length > 0 
            ? String(milestone.status.vec[0]) 
            : (milestone.status?.__variant__ ? String(milestone.status.__variant__) : 'Pending'));
        return deadline > 0 && deadline * 1000 < Date.now() && statusStr === 'Pending';
      })
    : false;
  const isReopenedAfterTimeout = (isCancelled && freelancerStake === 0) || hasTimedOutMilestone;
  
  const isExpiredPosted = stateStr === 'Posted' && applyDeadlineExpired && !hasFreelancer && !isReopenedAfterTimeout;
  
  
  let displayState = (stateStr === 'Cancelled' && !isPosterOfJob && !isFreelancerOfJob) ? 'Posted' : stateStr;
  
  if (pendingCandidate && displayState !== 'Completed' && displayState !== 'Cancelled' && displayState !== 'CancelledByPoster' && displayState !== 'InProgress') {
    displayState = 'PendingApproval';
  }
  
  if (jobData.dispute_resolved) {
    displayState = 'Disputed';
  }
  
  const hasLockedMilestone = jobData.milestones && Array.isArray(jobData.milestones) 
    ? jobData.milestones.some((milestone: any) => {
        const statusStr = typeof milestone.status === 'string' 
          ? milestone.status 
          : (milestone.status?.vec && Array.isArray(milestone.status.vec) && milestone.status.vec.length > 0 
            ? String(milestone.status.vec[0]) 
            : (milestone.status?.__variant__ ? String(milestone.status.__variant__) : 'Pending'));
        return statusStr === 'Locked';
      })
    : false;
  if (hasLockedMilestone) {
    displayState = 'Disputed';
  }
  const displayText = isExpiredPosted ? 'Hết hạn đăng ký' : getJobStateText(displayState);

  const getStateClasses = (state: string, isExpiredPosted: boolean) => {
    const base = 'px-2 py-1 text-xs font-bold border-2';
    if (isExpiredPosted) return `${base} bg-gray-50 text-blue-800 border-blue-800`;
    if (state === 'Cancelled') return `${base} bg-gray-50 text-blue-800 border-blue-800`;
    if (state === 'CancelledByPoster') return `${base} bg-gray-50 text-blue-800 border-blue-800`;
    if (state === 'Posted') return `${base} bg-gray-50 text-blue-800 border-blue-800`;
    if (state === 'PendingApproval') return `${base} bg-gray-50 text-blue-800 border-blue-800`;
    if (state === 'InProgress') return `${base} bg-gray-50 text-blue-800 border-blue-800`;
    if (state === 'Completed') return `${base} bg-gray-50 text-blue-800 border-blue-800`;
    if (state === 'Disputed') return `${base} bg-gray-50 text-blue-800 border-blue-800`;
    return `${base} bg-gray-50 text-blue-800 border-blue-800`;
  };

  return (
    <div className="space-y-6">
      <Card variant="outlined" className="p-6">
        <h3 className="text-lg font-bold text-blue-800 mb-4">Thông tin Công việc</h3>
        <div className="space-y-4">
          {jobData.total_escrow && (
            <div>
              <div className="text-xs text-gray-600 mb-1">Tổng giá trị</div>
              <div className="text-sm font-bold text-gray-900">
                {(Number(jobData.total_escrow) / 100_000_000).toFixed(2)} APT
              </div>
            </div>
          )}
          
          {jobData.milestones && (
            <div>
              <div className="text-xs text-gray-600 mb-1">Số cột mốc</div>
              <div className="text-sm font-bold text-gray-900">
                {Array.isArray(jobData.milestones) ? jobData.milestones.length : 0}
              </div>
            </div>
          )}
          
          {jobData.state && (
            <div>
              <div className="text-xs text-gray-600 mb-1">Trạng thái</div>
              <div>
                <span className={getStateClasses(displayState, isExpiredPosted)}>
                  {displayText}
                </span>
              </div>
            </div>
          )}
          
          {jobData.poster && (
            <div>
              <div className="text-xs text-gray-600 mb-1">Người thuê</div>
              <div 
                className="text-sm font-bold text-blue-600 cursor-pointer hover:text-blue-800 hover:underline break-all"
                onClick={() => copyAddress(String(jobData.poster))}
              >
                {formatAddress(String(jobData.poster))}
              </div>
            </div>
          )}
          
          {displayFreelancerAddr && (
            <div>
              <div className="text-xs text-gray-600 mb-1">Người làm (mới nhất)</div>
              <div 
                className="text-sm font-bold text-blue-600 cursor-pointer hover:text-blue-800 hover:underline break-all"
                onClick={() => copyAddress(displayFreelancerAddr)}
              >
                {formatAddress(displayFreelancerAddr)}
              </div>
            </div>
          )}
          
          {jobData.apply_deadline && (() => {
            const deadline = Number(jobData.apply_deadline);
            const date = new Date(deadline * 1000);
            const isExpired = deadline * 1000 < Date.now();
            const formatted = date.toLocaleString('vi-VN', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
            return (
              <div>
                <div className="text-xs text-gray-600 mb-1">Hạn đăng ký</div>
                <div className={`text-sm font-bold ${isExpired ? 'text-blue-700' : 'text-gray-900'}`}>
                  {formatted}{isExpired && ' (Hết hạn)'}
                </div>
              </div>
            );
          })()}
        </div>
      </Card>

      <Card variant="outlined" className="p-6 bg-white">
        {renderApplySection()}
      </Card>
    </div>
  );
};

