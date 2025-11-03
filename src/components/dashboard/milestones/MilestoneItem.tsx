"use client";

import React from 'react';
import { MilestoneFileUpload } from './MilestoneFileUpload';
import { MilestoneReviewActions } from './MilestoneReviewActions';
import { parseStatus, parseEvidenceCid } from './MilestoneUtils';

interface Milestone {
  id: string;
  amount: string;
  duration?: string;
  deadline: string;
  review_period?: string;
  review_deadline?: string;
  status: string;
  evidence_cid?: { vec?: string[] } | string | null;
}

interface MilestoneItemProps {
  milestone: Milestone;
  index: number;
  jobId: number;
  account: string | null;
  poster: string;
  freelancer: string | null;
  jobState: string;
  canInteract: boolean;
  isCancelled: boolean;
  isFirstMilestone: boolean;
  prevMilestoneAccepted: boolean;
  submitting: boolean;
  confirming: boolean;
  rejecting: boolean;
  claiming: boolean;
  evidenceCid?: string;
  onFileUploaded: (milestoneId: number, cid: string) => void;
  onSubmitMilestone: (milestoneId: number) => void;
  onConfirmMilestone: (milestoneId: number) => void;
  onRejectMilestone: (milestoneId: number) => void;
  onClaimTimeout: (milestoneId: number) => void;
}

export const MilestoneItem: React.FC<MilestoneItemProps> = ({
  milestone,
  index,
  jobId,
  account,
  poster,
  freelancer,
  jobState,
  canInteract,
  isCancelled,
  isFirstMilestone,
  prevMilestoneAccepted,
  submitting,
  confirming,
  rejecting,
  claiming,
  evidenceCid,
  onFileUploaded,
  onSubmitMilestone,
  onConfirmMilestone,
  onRejectMilestone,
  onClaimTimeout,
}) => {
  const isPoster = account?.toLowerCase() === poster?.toLowerCase();
  const isFreelancer = account && freelancer && account.toLowerCase() === freelancer.toLowerCase();
  const statusStr = parseStatus(milestone.status);
  const evidence = parseEvidenceCid(milestone.evidence_cid);
  const isPending = statusStr === 'Pending';
  const isSubmitted = statusStr === 'Submitted';
  const isAccepted = statusStr === 'Accepted';
  const isLocked = statusStr === 'Locked';
  const deadline = Number(milestone.deadline);
  const deadlineDate = deadline ? new Date(deadline * 1000) : null;
  const isOverdue = Boolean(deadlineDate && deadlineDate.getTime() < Date.now() && !isAccepted);
  const canSubmit = (isFirstMilestone || prevMilestoneAccepted) && !isOverdue;
  
  // Review period info
  const duration = Number(milestone.duration || 0);
  const reviewPeriod = Number(milestone.review_period || 0);
  const reviewDeadline = Number(milestone.review_deadline || 0);
  const reviewDeadlineDate = reviewDeadline ? new Date(reviewDeadline * 1000) : null;
  const reviewTimeout = Boolean(reviewDeadlineDate && reviewDeadlineDate.getTime() < Date.now() && isSubmitted);

  const formatSeconds = (seconds: number) => {
    if (!seconds) return null;
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    if (days > 0) return `${days} ngày${hours > 0 ? ` ${hours} giờ` : ''}`;
    if (hours > 0) return `${hours} giờ`;
    const minutes = Math.floor((seconds % 3600) / 60);
    return minutes > 0 ? `${minutes} phút` : `${seconds} giây`;
  };

  const getCardClasses = () => {
    if (isAccepted) return 'bg-green-50 border-green-300';
    if (isLocked) return 'bg-red-50 border-red-300';
    if (isSubmitted) return 'bg-blue-50 border-blue-300';
    if (isOverdue) return 'bg-yellow-50 border-yellow-300';
    return 'bg-gray-50 border-gray-300';
  };

  const getStatusBadgeClasses = () => {
    const base = 'px-2 py-1 text-xs font-bold border-2 rounded';
    if (isAccepted) return `${base} bg-green-100 text-green-800 border-green-300`;
    if (isLocked) return `${base} bg-red-100 text-red-800 border-red-300`;
    if (isSubmitted) return `${base} bg-blue-100 text-blue-800 border-blue-300`;
    if (isPending) return `${base} bg-gray-100 text-gray-800 border-gray-300`;
    return `${base} bg-yellow-100 text-yellow-800 border-yellow-300`;
  };

  return (
    <div className={`border-2 rounded p-3 ${getCardClasses()}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex-1">
          <h5 className="font-bold text-blue-800 text-sm">Milestone #{index + 1}</h5>
          <p className="text-xs text-gray-700">
            Amount: <span className="font-bold">{(Number(milestone.amount) / 100_000_000).toFixed(2)} APT</span>
          </p>
          {duration > 0 && (
            <p className="text-xs text-gray-600">
              Thời gian: {formatSeconds(duration)}
            </p>
          )}
          {reviewPeriod > 0 && (
            <p className="text-xs text-gray-600">
              Review period: {formatSeconds(reviewPeriod)}
            </p>
          )}
          {deadlineDate && (
            <p className={`text-xs ${isOverdue && !isAccepted ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
              Deadline: {deadlineDate.toLocaleString('vi-VN')}
              {isOverdue && !isAccepted && ' (Quá hạn)'}
            </p>
          )}
          {reviewDeadlineDate && isSubmitted && (
            <p className={`text-xs ${reviewTimeout ? 'text-orange-600 font-bold' : 'text-gray-600'}`}>
              Review deadline: {reviewDeadlineDate.toLocaleString('vi-VN')}
              {reviewTimeout && ' (Có thể claim timeout)'}
            </p>
          )}
        </div>
        <span className={getStatusBadgeClasses()}>
          {statusStr}
        </span>
      </div>

      {evidence && (
        <div className="mb-2 p-2 bg-white rounded border border-gray-300">
          <p className="text-xs text-gray-600 mb-1">Evidence CID:</p>
          <p className="text-xs font-mono break-all">{evidence}</p>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {isFreelancer && isPending && canInteract && (
          <MilestoneFileUpload
            milestoneId={Number(milestone.id)}
            canSubmit={canSubmit}
            isOverdue={isOverdue}
            onFileUploaded={onFileUploaded}
            onSubmit={onSubmitMilestone}
            submitting={submitting}
            evidenceCid={evidenceCid}
          />
        )}

        {isFreelancer && isSubmitted && reviewTimeout && canInteract && (
          <button
            onClick={() => onClaimTimeout(Number(milestone.id))}
            disabled={claiming}
            className="bg-orange-600 text-white hover:bg-orange-700 text-xs px-3 py-2 rounded border-2 border-orange-700 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {claiming ? 'Đang claim...' : 'Claim Timeout (Poster không phản hồi)'}
          </button>
        )}

        {isPoster && (
          <MilestoneReviewActions
            jobId={jobId}
            milestoneId={Number(milestone.id)}
            account={account}
            isOverdue={isOverdue}
            isPending={isPending}
            isSubmitted={isSubmitted}
            isCancelled={isCancelled}
            canInteract={canInteract}
            confirming={confirming}
            rejecting={rejecting}
            claiming={claiming}
            onConfirm={() => onConfirmMilestone(Number(milestone.id))}
            onReject={() => onRejectMilestone(Number(milestone.id))}
            onClaimTimeout={() => onClaimTimeout(Number(milestone.id))}
          />
        )}

        {isAccepted && (
          <span className="text-xs text-green-700 font-bold">✓ Đã hoàn thành và thanh toán</span>
        )}

        {isLocked && (
          <span className="text-xs text-red-700 font-bold">⚠ Đã bị lock (dispute)</span>
        )}
      </div>
    </div>
  );
};

