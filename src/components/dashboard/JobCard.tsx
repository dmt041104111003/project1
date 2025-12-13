"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MilestonesList } from './MilestonesList';
import { toast } from 'sonner';
import { JobCardProps } from '@/constants/escrow';
import { formatAddress, copyAddress } from '@/utils/addressUtils';
import { escrowHelpers } from '@/utils/contractHelpers';
import { StatusBadge } from '@/components/common';
import { getJobStateDisplay } from '@/utils/jobStateUtils';
import { useWallet } from '@/contexts/WalletContext';


export const JobCard: React.FC<JobCardProps> = ({ job, account, activeTab, onUpdate }) => {
  const { signAndSubmitTransaction } = useWallet();
  const [reviewingCandidate, setReviewingCandidate] = useState(false);
  const [withdrawingApplication, setWithdrawingApplication] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const handleWithdraw = async () => {
    toast.warning('Bạn có chắc muốn rút lại công việc này? Cọc và ký quỹ sẽ được hoàn về ví của bạn.', {
      action: {
        label: 'Xác nhận',
        onClick: async () => {
          if (withdrawing) return;
          try {
            setWithdrawing(true);
            const payload = escrowHelpers.posterWithdrawUnfilled(job.id);

            const tx = await signAndSubmitTransaction(payload);

            toast.success(`Rút công việc thành công! TX: ${tx?.hash || 'N/A'}`);
            
            const { clearJobEventsCache } = await import('@/lib/aptosClient');
            const { clearJobTableCache } = await import('@/lib/aptosClientCore');
            clearJobEventsCache();
            clearJobTableCache();
            
            window.dispatchEvent(new CustomEvent('jobsUpdated'));
            onUpdate();
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Lỗi không xác định';
            toast.error(`Lỗi: ${errorMessage}`);
          } finally {
            setWithdrawing(false);
          }
        }
      },
      cancel: {
        label: 'Hủy',
        onClick: () => {}
      },
      duration: 10000
    });
  };

  const handleReviewCandidate = async (approve: boolean) => {
    setReviewingCandidate(true);
    try {
      const payload = escrowHelpers.reviewCandidate(job.id, approve);
      const tx = await signAndSubmitTransaction(payload);
      toast.success(`${approve ? 'Phê duyệt' : 'Từ chối'} ứng viên thành công! TX: ${tx?.hash || 'N/A'}`);
      
      const { clearJobEventsCache } = await import('@/lib/aptosClient');
      const { clearJobTableCache } = await import('@/lib/aptosClientCore');
      clearJobEventsCache();
      clearJobTableCache();
      
      window.dispatchEvent(new CustomEvent('jobsUpdated'));
      onUpdate();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Lỗi không xác định';
      toast.error(`Không thể xử lý ứng viên: ${errorMessage}`);
    } finally {
      setReviewingCandidate(false);
    }
  };

  const handleWithdrawApplicationPending = async () => {
    setWithdrawingApplication(true);
    try {
      const payload = escrowHelpers.withdrawApplication(job.id);
      const tx = await signAndSubmitTransaction(payload);
      toast.success(`Đã rút ứng tuyển! TX: ${tx?.hash || 'N/A'}`);
      
      const { clearJobEventsCache } = await import('@/lib/aptosClient');
      const { clearJobTableCache } = await import('@/lib/aptosClientCore');
      clearJobEventsCache();
      clearJobTableCache();
      
      window.dispatchEvent(new CustomEvent('jobsUpdated'));
      onUpdate();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Lỗi không xác định';
      toast.error(`Không thể rút ứng tuyển: ${errorMessage}`);
    } finally {
      setWithdrawingApplication(false);
    }
  };

  let displayState = job.state || 'Posted';
  const pendingCandidate = job.pending_freelancer || null;
  if (pendingCandidate && displayState !== 'Completed' && displayState !== 'Cancelled' && displayState !== 'CancelledByPoster') {
    if (displayState === 'InProgress') {
      displayState = 'PendingApproval';
    }
  }
  const stateDisplay = getJobStateDisplay(displayState, job.apply_deadline, job.has_freelancer);
  const isPoster = account?.toLowerCase() === job.poster?.toLowerCase();
  const isPendingCandidate = pendingCandidate && account?.toLowerCase() === pendingCandidate.toLowerCase();
  const canShowWithdraw = activeTab === 'posted' && 
    !job.has_freelancer && 
    job.state === 'Posted' && 
    isPoster;

  return (
    <div className="border border-gray-400 bg-gray-50 p-4 rounded">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold text-blue-800">Công việc #{job.id}</h3>
        <StatusBadge text={stateDisplay.text} variant={stateDisplay.variant} />
      </div>
      
      <div className="space-y-2">
        <div className="text-xs text-gray-600 break-all">
          <span className="font-semibold">Mã định danh:</span>{' '}
          {job.decodedCid || job.cid}
          {job.ipfsUrl && (
            <a
              href={job.ipfsUrl}
              target="_blank"
              rel="noreferrer"
              className="ml-2 text-blue-700 underline hover:text-blue-900"
            >
              Xem chi tiết
            </a>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
          <div>
            <span className="font-bold">Người thuê:</span>{' '}
            <span 
              className="text-blue-600 cursor-pointer hover:text-blue-800 hover:underline"
              onClick={() => copyAddress(job.poster)}
            >
              {formatAddress(job.poster)}
            </span>
          </div>
          <div>
            <span className="font-bold">Người làm tự do:</span>{' '}
            <span 
              className="text-blue-600 cursor-pointer hover:text-blue-800 hover:underline"
              onClick={() => copyAddress(job.freelancer)}
            >
              {formatAddress(job.freelancer)}
            </span>
          </div>
          <div><span className="font-bold">Tổng:</span> {job.total_amount ? `${(job.total_amount / 100_000_000).toFixed(2)} APT` : '-'}</div>
          <div><span className="font-bold">Cột mốc:</span> {job.milestones_count || 0}</div>
          <div><span className="font-bold">Đã giao:</span> {job.has_freelancer ? 'Có' : 'Chưa'}</div>
          {job.apply_deadline && (
            <div className="col-span-2">
              <span className="font-bold">Hạn đăng ký:</span> {
                new Date(job.apply_deadline * 1000).toLocaleString('vi-VN')
              }
              {job.apply_deadline * 1000 < Date.now() && (
                <span className="ml-2 text-blue-700 font-bold">(Đã hết hạn)</span>
              )}
            </div>
          )}
        </div>
      </div>

      {canShowWithdraw && (
        <div className="mt-3 mb-3 p-3 border-2 border-blue-800 bg-gray-50 rounded">
          <p className="text-xs text-blue-800 mb-2 font-bold">
            Công việc chưa có người làm tự do ứng tuyển. Bạn có thể rút lại cọc và ký quỹ về ví.
          </p>
          <Button
            size="sm"
            variant="primary"
            onClick={handleWithdraw}
            disabled={withdrawing || reviewingCandidate || withdrawingApplication}
            className="text-xs px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {withdrawing ? 'Đang rút...' : 'Rút lại công việc (Nhận cọc + ký quỹ)'}
          </Button>
        </div>
      )}

      {pendingCandidate && displayState !== 'Cancelled' && displayState !== 'CancelledByPoster' && (
        <div className="mt-3 mb-3 p-3 border-2 border-blue-800 bg-gray-50 rounded">
          <p className="text-xs text-blue-800 mb-2 font-bold">
            {isPoster
              ? 'Có ứng viên đang chờ bạn phê duyệt. Nếu từ chối, ứng viên sẽ được hoàn cọc và phí.'
              : isPendingCandidate
                ? 'Ứng tuyển của bạn đang chờ người thuê phê duyệt. Bạn có thể rút nếu thay đổi quyết định.'
                : 'Công việc đang chờ Người thuê phê duyệt ứng viên hiện tại.'}
          </p>
          <div className="text-xs text-gray-700 mb-3 flex flex-wrap items-center gap-2">
            <span className="font-semibold">Ứng viên:</span>
            <span
              className="text-blue-600 cursor-pointer hover:text-blue-800 hover:underline"
              onClick={() => copyAddress(pendingCandidate)}
            >
              {formatAddress(pendingCandidate)}
            </span>
          </div>
          {isPoster && (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="primary"
                className="disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => handleReviewCandidate(true)}
                disabled={reviewingCandidate || withdrawing || withdrawingApplication}
              >
                {reviewingCandidate ? 'Đang phê duyệt...' : 'Phê duyệt ứng viên'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => handleReviewCandidate(false)}
                disabled={reviewingCandidate || withdrawing || withdrawingApplication}
              >
                {reviewingCandidate ? 'Đang xử lý...' : 'Từ chối & hoàn tiền'}
              </Button>
            </div>
          )}
          {isPendingCandidate && (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                className="disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleWithdrawApplicationPending}
                disabled={withdrawingApplication || reviewingCandidate || withdrawing}
              >
                {withdrawingApplication ? 'Đang rút...' : 'Rút ứng tuyển (Không mất cọc và phí)'}
              </Button>
            </div>
          )}
        </div>
      )}

      {job.milestones && Array.isArray(job.milestones) && job.milestones.length > 0 && (
        <MilestonesList
          jobId={job.id}
          milestones={job.milestones}
          poster={job.poster || ''}
          freelancer={job.freelancer}
          jobState={job.state || 'Posted'}
          mutualCancelRequestedBy={job.mutual_cancel_requested_by || null}
          freelancerWithdrawRequestedBy={job.freelancer_withdraw_requested_by || null}
          pendingFreelancer={job.pending_freelancer || null}
          onUpdate={onUpdate}
        />
      )}
    </div>
  );
};

