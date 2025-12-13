"use client";

import React, { useState, useEffect } from 'react';
import { MilestoneFileUpload } from './MilestoneFileUpload';
import { MilestoneReviewActions } from './MilestoneReviewActions';
import { parseStatus, parseEvidenceCid, getMilestoneStatusDisplay } from './MilestoneUtils';
import { LockIcon } from '@/components/ui/LockIcon';
import { MilestoneItemProps } from '@/constants/escrow';

export const MilestoneItem: React.FC<MilestoneItemProps> = ({
  milestone,
  milestones,
  index,
  jobId,
  account,
  poster,
  freelancer,
  jobState: _jobState,
  canInteract,
  isCancelled,
  isFirstMilestone,
  submitting,
  confirming,
  rejecting,
  claiming,
  evidenceCid,
  disputeEvidenceCid,
  openingDispute,
  submittingEvidence,
  hasDisputeId,
  votesCompleted,
  onFileUploaded,
  onDisputeFileUploaded,
  onSubmitMilestone,
  onConfirmMilestone,
  onRejectMilestone,
  onClaimTimeout,
  onOpenDispute,
  onSubmitEvidence,
  onClaimDispute,
  disputeWinner,
  isClaimed = false,
  interactionLocked = false,
}) => {
  const [disputeUploading, setDisputeUploading] = useState(false);
  const [disputeSelectedFile, setDisputeSelectedFile] = useState<File | null>(null);
  const [evidenceUrl, setEvidenceUrl] = useState<string | null>(null);
  const [loadingEvidence, setLoadingEvidence] = useState(false);
  const isPoster = account?.toLowerCase() === poster?.toLowerCase();
  const isFreelancer = account && freelancer && account.toLowerCase() === freelancer.toLowerCase();
  const statusStr = parseStatus(milestone.status);
  const evidence = parseEvidenceCid(milestone.evidence_cid);
  const isPending = statusStr === 'Pending';
  const isSubmitted = statusStr === 'Submitted';
  const isAccepted = statusStr === 'Accepted';
  const isLocked = statusStr === 'Locked';
  const isWithdrawn = statusStr === 'Withdrawn';
  const hasClaimTimeoutInfo = milestone.claim_timeout !== null && milestone.claim_timeout !== undefined;
  const deadline = Number(milestone.deadline);
  const deadlineDate = deadline ? new Date(deadline * 1000) : null;
  const rawOverdue = Boolean(deadlineDate && deadlineDate.getTime() < Date.now() && !isAccepted);
  const timersStopped = isLocked;
  const isOverdue = timersStopped ? false : rawOverdue;

  const hasDeadline = deadline > 0;
  const safeMilestones = Array.isArray(milestones) ? milestones : [];
  const prevMilestone = index > 0 && safeMilestones.length > index - 1 ? safeMilestones[index - 1] : null;
  const prevStatusStr = prevMilestone ? parseStatus(prevMilestone.status) : null;
  const prevMilestoneAccepted = prevStatusStr === 'Accepted';
  const canSubmit = (isFirstMilestone || prevMilestoneAccepted) && !isOverdue && hasDeadline;
  
  const duration = Number(milestone.duration || 0);
  const reviewPeriod = Number(milestone.review_period || 0);
  const reviewDeadline = Number(milestone.review_deadline || 0);
  const reviewDeadlineDate = reviewDeadline ? new Date(reviewDeadline * 1000) : null;
  const reviewTimeout = timersStopped ? false : Boolean(reviewDeadlineDate && reviewDeadlineDate.getTime() < Date.now() && isSubmitted);

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
    if (isAccepted) return 'bg-blue-50 border-blue-300';
    if (isLocked) return 'bg-blue-100 border-blue-400';
    if (isWithdrawn) return 'bg-gray-100 border-gray-400 opacity-60';
    if (isSubmitted) return 'bg-blue-50 border-blue-300';
    if (isOverdue) return 'bg-blue-50 border-blue-300';
    return 'bg-gray-50 border-gray-300';
  };

  const getStatusBadgeClasses = () => {
    const base = 'px-2 py-1 text-xs font-bold border-2 rounded';
    if (isAccepted) return `${base} bg-blue-100 text-blue-800 border-blue-300`;
    if (isLocked) return `${base} bg-blue-200 text-blue-900 border-blue-400`;
    if (isWithdrawn) return `${base} bg-gray-200 text-gray-600 border-gray-400`;
    if (isSubmitted) return `${base} bg-blue-100 text-blue-800 border-blue-300`;
    if (isPending) return `${base} bg-gray-100 text-gray-800 border-gray-300`;
    return `${base} bg-blue-100 text-blue-800 border-blue-300`;
  };

  useEffect(() => {
    const decodeEvidence = async () => {
      if (!evidence) {
        setEvidenceUrl(null);
        return;
      }
      try {
        setLoadingEvidence(true);
        const res = await fetch(`/api/ipfs/get?cid=${encodeURIComponent(evidence)}&decodeOnly=true`);
        if (!res.ok) {
          setEvidenceUrl(null);
          return;
        }
        const data = await res.json().catch(() => null);
        if (data?.success && data.url) {
          setEvidenceUrl(data.url);
        } else {
          setEvidenceUrl(null);
        }
      } catch {
        setEvidenceUrl(null);
      } finally {
        setLoadingEvidence(false);
      }
    };

    decodeEvidence();
  }, [evidence]);

  const handleDisputeFileChange = async (file: File | null) => {
    if (!file) {
      setDisputeSelectedFile(null);
      return;
    }
    setDisputeSelectedFile(file);
    try {
      setDisputeUploading(true);
      if (!account) {
        throw new Error('Vui lòng kết nối ví trước');
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'dispute_evidence');
      formData.append('jobId', String(jobId));
      formData.append('address', account);
      const uploadRes = await fetch('/api/ipfs/upload', { method: 'POST', body: formData });
      const uploadData = await uploadRes.json().catch(() => ({ success: false, error: 'Tải lên thất bại' }));
      if (!uploadRes.ok || !uploadData.success) {
        throw new Error(uploadData.error || 'Tải lên thất bại');
      }
      const finalCid = uploadData.encCid || uploadData.ipfsHash;
      if (onDisputeFileUploaded) {
        onDisputeFileUploaded(Number(milestone.id), String(finalCid || ''));
      }
    } catch {
      setDisputeSelectedFile(null);
    } finally {
      setDisputeUploading(false);
    }
  };

  return (
    <div className={`border-2 rounded p-3 ${getCardClasses()}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex-1">
          <h5 className="font-bold text-blue-800 text-sm">Cột mốc #{index + 1}</h5>
          <p className="text-xs text-gray-700">
            Số tiền: <span className="font-bold">{(Number(milestone.amount) / 100_000_000).toFixed(2)} APT</span>
          </p>
          {duration > 0 && (
            <p className="text-xs text-gray-600">
              Thời gian: {formatSeconds(duration)}
            </p>
          )}
          {reviewPeriod > 0 && (
            <p className="text-xs text-gray-600">
              Thời gian đánh giá: {formatSeconds(reviewPeriod)}
            </p>
          )}
          {deadlineDate && (
            <p className={`text-xs ${isOverdue && !isAccepted ? 'text-blue-700 font-bold' : 'text-gray-600'}`}>
              Hạn chót: {deadlineDate.toLocaleString('vi-VN')}
              {timersStopped ? ' (Đã dừng - đang tranh chấp)' : (isOverdue && !isAccepted ? ' (Quá hạn)' : '')}
            </p>
          )}
          {reviewDeadlineDate && isSubmitted && (
            <p className={`text-xs ${reviewTimeout ? 'text-blue-700 font-bold' : 'text-gray-600'}`}>
              Hạn đánh giá: {reviewDeadlineDate.toLocaleString('vi-VN')}
              {reviewTimeout && ' (Có thể yêu cầu hết hạn)'}
            </p>
          )}
        </div>
        <span className={getStatusBadgeClasses()}>
          {getMilestoneStatusDisplay(statusStr)}
        </span>
      </div>

      {evidence && (
        <div className="mb-2 p-2 bg-white rounded border border-gray-300">
          <p className="text-xs text-gray-600 mb-1">Mã bằng chứng:</p>
          <p className="text-xs font-mono break-all mb-1">{evidence}</p>
          {loadingEvidence ? (
            <p className="text-xs text-gray-500">Đang giải mã...</p>
          ) : evidenceUrl ? (
            <a
              className="text-xs text-blue-700 underline break-all hover:text-blue-900"
              href={evidenceUrl}
              target="_blank"
              rel="noreferrer"
            >
              Mở tệp bằng chứng
            </a>
          ) : (
            <p className="text-xs text-blue-700">Không thể giải mã</p>
          )}
        </div>
      )}

      {isWithdrawn && (
        <div className="text-xs text-gray-500 italic mb-2">
          ⚠ Cột mốc này đã được người thuê rút ký quỹ khi có tranh chấp
        </div>
      )}

      {isFreelancer && hasClaimTimeoutInfo && isPending && (
        <div className="text-xs text-blue-800 font-bold italic mb-2">
          CÔNG VIỆC ĐÃ BỊ HỦY - Bạn đã không hoàn thành cột mốc đúng hạn. Người thuê đã đòi tiền cọc và công việc đã được mở lại cho người khác ứng tuyển.
        </div>
      )}

      {!isWithdrawn && (
      <div className="flex gap-2 flex-wrap">
        {isFreelancer && isPending && canInteract && (
          <MilestoneFileUpload
            jobId={jobId}
            milestoneId={Number(milestone.id)}
            canSubmit={canSubmit}
            isOverdue={isOverdue}
            onFileUploaded={onFileUploaded}
            onSubmit={onSubmitMilestone}
            submitting={submitting}
            evidenceCid={evidenceCid}
            interactionLocked={interactionLocked}
          />
        )}

        {isFreelancer && isSubmitted && reviewTimeout && canInteract && (
          <button
            onClick={() => onClaimTimeout(Number(milestone.id))}
            disabled={claiming || interactionLocked}
            className={`text-xs px-3 py-2 rounded border-2 font-bold flex items-center gap-2 ${
              claiming || interactionLocked
                ? 'bg-gray-400 text-gray-600 border-gray-500 cursor-not-allowed'
                : 'bg-blue-100 text-black hover:bg-blue-200 border-blue-300'
            }`}
          >
            {(claiming || interactionLocked) && <LockIcon className="w-4 h-4" />}
            {claiming ? 'Đang yêu cầu...' : 'Yêu cầu Hết hạn (Người thuê không phản hồi)'}
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
            reviewTimeout={reviewTimeout}
            confirming={confirming}
            rejecting={rejecting}
            claiming={claiming}
            onConfirm={() => onConfirmMilestone(Number(milestone.id))}
            onReject={() => onRejectMilestone(Number(milestone.id))}
            onClaimTimeout={() => onClaimTimeout(Number(milestone.id))}
            interactionLocked={interactionLocked}
          />
        )}

        {isAccepted && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-blue-800 font-bold">Đã hoàn thành</span>
            {votesCompleted && typeof disputeWinner === 'boolean' && (
              (disputeWinner && isFreelancer) || (!disputeWinner && isPoster) ? (
                isClaimed ? (
                  <span className="text-xs text-blue-700 font-bold">Đã đòi</span>
                ) : (
                <button
                  onClick={() => onClaimDispute && onClaimDispute(Number(milestone.id))}
                  disabled={interactionLocked}
                  className={`text-xs px-3 py-2 rounded border-2 font-bold flex items-center gap-2 ${
                    interactionLocked
                      ? 'bg-gray-400 text-gray-600 border-gray-500 cursor-not-allowed'
                      : 'bg-blue-100 text-black hover:bg-blue-200 border-blue-300'
                  }`}
                >
                  {interactionLocked && <LockIcon className="w-4 h-4" />}
                  Đòi tranh chấp {disputeWinner ? 'thanh toán' : 'hoàn tiền'}
                </button>
                )
              ) : (
                <span className="text-xs text-gray-600">(Chờ bên thắng đòi)</span>
              )
            )}
      
          </div>
        )}

        {isLocked && typeof disputeWinner !== 'boolean' && (
          <div className="flex flex-col gap-2 w-full">
            <span className="text-xs text-blue-800 font-bold">Đã bị khóa (tranh chấp)</span>
            {(isPoster || isFreelancer) && canInteract && (
              <div className="flex items-center gap-2 flex-wrap">
                <label className="flex-1 min-w-[180px]">
                  <input
                    type="file"
                    accept="*/*"
                    title="Chọn tệp bằng chứng để tải lên"
                    onChange={(e) => handleDisputeFileChange(e.target.files?.[0] || null)}
                    disabled={disputeUploading || interactionLocked}
                    className="w-full px-2 py-1 border border-gray-400 text-xs rounded text-gray-700 file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </label>
                {disputeUploading && (
                  <span className="text-xs text-blue-600">Đang tải lên...</span>
                )}
                {disputeSelectedFile && (
                  <span className="text-xs text-blue-700">{disputeSelectedFile.name}</span>
                )}
                {disputeEvidenceCid && (
                  <span className="text-xs text-blue-800 font-bold">Đã tải lên</span>
                )}
                {!hasDisputeId && (
                  <button
                    onClick={() => onOpenDispute && onOpenDispute(Number(milestone.id))}
                    disabled={openingDispute || !disputeEvidenceCid || disputeUploading || interactionLocked}
                    className={`text-xs px-3 py-2 rounded border-2 font-bold flex items-center gap-2 ${
                      openingDispute || !disputeEvidenceCid || disputeUploading || interactionLocked
                        ? 'bg-gray-400 text-gray-600 border-gray-500 cursor-not-allowed'
                        : 'bg-blue-100 text-black hover:bg-blue-200 border-blue-300'
                    }`}
                  >
                    {(openingDispute || !disputeEvidenceCid || disputeUploading || interactionLocked) && <LockIcon className="w-4 h-4" />}
                    {openingDispute ? 'Đang mở tranh chấp...' : 'Mở tranh chấp'}
                  </button>
                )}
                {hasDisputeId && (
                <button
                  onClick={() => onSubmitEvidence && onSubmitEvidence(Number(milestone.id))}
                  disabled={submittingEvidence || !disputeEvidenceCid || disputeUploading || interactionLocked}
                  className={`text-xs px-3 py-2 rounded border-2 font-bold flex items-center gap-2 ${
                    submittingEvidence || !disputeEvidenceCid || disputeUploading || interactionLocked
                      ? 'bg-gray-400 text-gray-600 border-gray-500 cursor-not-allowed'
                      : 'bg-blue-100 text-black hover:bg-blue-200 border-blue-300'
                  }`}
                >
                  {(submittingEvidence || !disputeEvidenceCid || disputeUploading || interactionLocked) && <LockIcon className="w-4 h-4" />}
                  {submittingEvidence ? 'Đang gửi...' : 'Gửi bằng chứng'}
                </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      )}
    </div>
  );
};

