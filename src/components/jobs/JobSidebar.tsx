"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { JobSidebarProps } from '@/constants/escrow';
import { formatAddress, copyAddress } from '@/utils/addressUtils';

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
}) => {
  if (!jobData) return null;

  const renderApplySection = () => {
    if (!account) {
      return (
        <div className="text-center py-4">
          <p className="text-sm text-gray-900 mb-2 font-medium">
            Vui lòng kết nối wallet để apply
          </p>
        </div>
      );
    }

    if (!hasFreelancerRole) {
      return (
        <div className="text-center py-4">
          <p className="text-sm text-red-700 mb-2 font-bold">
            Bạn cần có role Freelancer để apply job
          </p>
          <Button
            onClick={() => window.location.href = '/auth/did-verification'}
            variant="outline"
            size="sm"
            className="mt-2"
          >
            Đăng ký role Freelancer
          </Button>
        </div>
      );
    }

    const hasFreelancer = getFreelancerAddr(jobData.freelancer) !== null;
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
          <p className="text-sm text-red-700 font-bold">Job đã bị hủy bởi người đăng</p>
        </div>
      );
    }
    
    if (isExpiredPosted && !isReopenedAfterTimeout) {
      return (
        <div className="text-center py-4">
          <p className="text-sm text-red-700 font-bold">Đã hết hạn đăng ký apply</p>
        </div>
      );
    }
    
    const applyDeadlineExpiredForApply = applyDeadline > 0 && applyDeadline * 1000 < Date.now();
    
    const canApply = (isPosted && !hasFreelancer && !applyDeadlineExpiredForApply) || 
                     (isReopenedAfterTimeout && !hasFreelancer && !applyDeadlineExpiredForApply);

    if (!canApply && !isPosted && !isReopenedAfterTimeout) {
      return (
        <div className="text-center py-4">
          <p className="text-sm text-gray-900 font-medium">
            Job không còn ở trạng thái Open (state: {stateStr})
          </p>
        </div>
      );
    }

    if (hasFreelancer && !hasTimedOutMilestone && !(isCancelled && freelancerStake === 0)) {
      return (
        <div className="text-center py-4">
          <p className="text-sm text-gray-900 font-medium">Job đã có freelancer</p>
        </div>
      );
    }

    if (applyDeadlineExpiredForApply) {
      return (
        <div className="text-center py-4">
          <p className="text-sm text-red-700 font-bold">Đã hết hạn đăng ký apply</p>
          {isReopenedAfterTimeout && (
            <p className="text-xs text-gray-600 mt-1">
              Job đã được mở lại nhưng hạn đăng ký đã hết hạn
            </p>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {isReopenedAfterTimeout && (
          <div className="text-center mb-2">
            <p className="text-xs text-orange-700 font-bold bg-orange-50 border border-orange-300 rounded px-2 py-1">
              Job đã được mở lại (Freelancer trước đã timeout)
            </p>
          </div>
        )}
        <Button
          onClick={onApply}
          disabled={applying}
          size="lg"
          className="w-full bg-white-800 text-black hover:bg-blue-300 disabled:bg-blue-400 disabled:text-white py-4 text-lg font-bold"
        >
          {applying ? 'Đang apply...' : 'Apply Job'}
        </Button>
      </div>
    );
  };

  const stateStr = parseState(jobData.state);
  const freelancerAddr = getFreelancerAddr(jobData.freelancer);
  const isFreelancerOfJob = account && freelancerAddr 
    ? account.toLowerCase() === freelancerAddr.toLowerCase() 
    : false;
  const isPosterOfJob = account && jobData.poster
    ? account.toLowerCase() === String(jobData.poster).toLowerCase()
    : false;
  
  const applyDeadline = jobData.apply_deadline ? Number(jobData.apply_deadline) : 0;
  const applyDeadlineExpired = applyDeadline > 0 && applyDeadline * 1000 < Date.now();
  const hasFreelancer = freelancerAddr !== null;
  
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
  
  
  const displayState = (stateStr === 'Cancelled' && !isPosterOfJob && !isFreelancerOfJob) ? 'Posted' : stateStr;
  const displayText = isExpiredPosted ? 'Hết hạn đăng ký' :
                      displayState === 'Posted' ? 'Open' :
                      displayState === 'InProgress' ? 'In Progress' :
                      displayState === 'Completed' ? 'Completed' :
                      displayState === 'Disputed' ? 'Disputed' :
                      displayState === 'Cancelled' ? 'Cancelled' :
                      displayState === 'CancelledByPoster' ? 'Đã hủy bởi người đăng' :
                      displayState || 'Active';

  const getStateClasses = (state: string, isExpiredPosted: boolean) => {
    const base = 'px-2 py-1 text-xs font-bold border-2';
    if (isExpiredPosted) return `${base} bg-yellow-100 text-yellow-800 border-yellow-300`;
    if (state === 'Cancelled') return `${base} bg-orange-100 text-orange-800 border-orange-300`;
    if (state === 'CancelledByPoster') return `${base} bg-red-100 text-red-800 border-red-300`;
    if (state === 'Posted') return `${base} bg-green-100 text-green-800 border-green-300`;
    if (state === 'InProgress') return `${base} bg-blue-100 text-blue-800 border-blue-300`;
    if (state === 'Completed') return `${base} bg-gray-100 text-gray-800 border-gray-300`;
    if (state === 'Disputed') return `${base} bg-red-100 text-red-800 border-red-300`;
    return `${base} bg-gray-100 text-gray-800 border-gray-300`;
  };

  return (
    <div className="space-y-6">
      <Card variant="outlined" className="p-6">
        <h3 className="text-lg font-bold text-blue-800 mb-4">Thông tin Job</h3>
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
              <div className="text-xs text-gray-600 mb-1">Người đăng</div>
              <div 
                className="text-sm font-bold text-blue-600 cursor-pointer hover:text-blue-800 hover:underline break-all"
                onClick={() => copyAddress(String(jobData.poster))}
              >
                {formatAddress(String(jobData.poster))}
              </div>
            </div>
          )}
          
          {jobData.freelancer && (
            <div>
              <div className="text-xs text-gray-600 mb-1">Freelancer</div>
              <div 
                className="text-sm font-bold text-blue-600 cursor-pointer hover:text-blue-800 hover:underline break-all"
                onClick={() => copyAddress(freelancerAddr)}
              >
                {formatAddress(freelancerAddr)}
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
                <div className={`text-sm font-bold ${isExpired ? 'text-red-600' : 'text-gray-900'}`}>
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

