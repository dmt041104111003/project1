"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Pagination } from '@/components/ui/pagination';
import { LockIcon } from '@/components/ui/LockIcon';
import { LoadingState, EmptyState, StatusBadge } from '@/components/common';
import { getJobsWithDisputes, JobWithDispute } from '@/lib/aptosClient';
import { formatAddress, copyAddress } from '@/utils/addressUtils';
import { JobCard } from './JobCard';
import { Job } from '@/constants/escrow';

const getWallet = async () => {
  const wallet = (window as { aptos?: { account: () => Promise<string | { address: string }>; signAndSubmitTransaction: (payload: unknown) => Promise<{ hash?: string }> } }).aptos;
  if (!wallet) throw new Error('Không tìm thấy ví');
  const acc = await wallet.account();
  const address = typeof acc === 'string' ? acc : acc?.address;
  if (!address) throw new Error('Vui lòng kết nối ví');
  return { wallet, address };
};

const JOBS_PER_PAGE = 1;

interface DisputesTabProps {
  account: string;
}

const REVIEWER_VOTE_DELAY = 180;
const INITIAL_VOTE_TIMEOUT = 60;
const RESELECT_COOLDOWN = 120;

export const DisputesTab: React.FC<DisputesTabProps> = ({
  account,
}) => {
  const [loading, setLoading] = useState(false);
  const [disputeJobs, setDisputeJobs] = useState<JobWithDispute[]>([]);
  const [jobsData, setJobsData] = useState<Job[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [reselecting, setReselecting] = useState<number | null>(null);
  const [claimingDispute, setClaimingDispute] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<Map<number, number>>(new Map());
  const [canReselect, setCanReselect] = useState<Map<number, boolean>>(new Map());

  useEffect(() => {
    const maxPageIndex = Math.max(0, Math.ceil(disputeJobs.length / JOBS_PER_PAGE) - 1);
    if (currentPage > maxPageIndex) {
      setCurrentPage(maxPageIndex);
    }
  }, [disputeJobs.length, currentPage]);

  useEffect(() => {
    const updateTimers = () => {
      const now = Math.floor(Date.now() / 1000);
      const newTimeRemaining = new Map<number, number>();
      const newCanReselect = new Map<number, boolean>();

      disputeJobs.forEach((dispute) => {
        if (dispute.disputeStatus === 'resolved' || (dispute.votesCount || 0) >= 3) {
          newCanReselect.set(dispute.disputeId, false);
          return;
        }

        const votesCount = dispute.votesCount || 0;
        if (votesCount >= 3) {
          newCanReselect.set(dispute.disputeId, false);
          return;
        }

        let deadline = 0;
        if (!dispute.lastReselectionTime || dispute.lastReselectionTime === 0) {
          deadline = dispute.initialVoteDeadline || dispute.openedAt + REVIEWER_VOTE_DELAY + INITIAL_VOTE_TIMEOUT;
        } else {

          const lastReselectionTime = dispute.lastReselectionTime;
          const lastVoteTime = dispute.lastVoteTime || dispute.openedAt;
          const deadlineFromReselection = lastReselectionTime + RESELECT_COOLDOWN;
          const deadlineFromVote = lastVoteTime + RESELECT_COOLDOWN;
          deadline = Math.max(deadlineFromReselection, deadlineFromVote);
        }

        const remaining = deadline - now;
        if (remaining <= 0) {
          newCanReselect.set(dispute.disputeId, true);
          newTimeRemaining.set(dispute.disputeId, 0);
        } else {
          newCanReselect.set(dispute.disputeId, false);
          newTimeRemaining.set(dispute.disputeId, remaining);
        }
      });

      setTimeRemaining(newTimeRemaining);
      setCanReselect(newCanReselect);
    };

    updateTimers();
    const interval = setInterval(updateTimers, 1000);
    return () => clearInterval(interval);
  }, [disputeJobs]);

  const fetchDisputes = useCallback(async () => {
    if (!account) {
      setDisputeJobs([]);
      setJobsData([]);
      return;
    }

    setLoading(true);
    try {
      const disputes = await getJobsWithDisputes(account, 200);
      const { getParsedJobData } = await import('@/lib/aptosClient');
      const { parseStatus } = await import('./MilestoneUtils');
      
      const filteredDisputes: typeof disputes = [];
      const jobsWithMetadata: Job[] = [];

      for (const dispute of disputes) {
        let shouldSkip = false;
        
        if (dispute.disputeStatus === 'resolved') {
          if (dispute.disputeWinner === null || dispute.disputeWinner === undefined) {
            try {
              const jobData = await getParsedJobData(dispute.jobId);
              if (jobData?.milestones) {
                const milestone = jobData.milestones.find((m: any) => Number(m.id) === dispute.milestoneId);
                if (milestone) {
                  const status = parseStatus(milestone.status);
                  if (status === 'Accepted') {
                    shouldSkip = true;
                  }
                }
              }
            } catch (e) {
              console.error('Error checking milestone status:', e);
            }
          }
          // Nếu dispute_winner !== null, không skip - hiển thị để user có thể claim
        }
        
        if (shouldSkip) {
          continue;
        }
        
        filteredDisputes.push(dispute);
        
        let enrichedJob: Job = {
          id: dispute.jobId,
          cid: dispute.cid,
          poster: dispute.poster,
          freelancer: dispute.freelancer,
          total_amount: dispute.totalAmount,
          milestones_count: 0,
          has_freelancer: !!dispute.freelancer,
          state: 'Disputed',
        };

        try {
          const [detailData, cidRes] = await Promise.all([
            getParsedJobData(dispute.jobId),
            fetch(`/api/ipfs/job?jobId=${dispute.jobId}&decodeOnly=true`),
          ]);

          if (detailData) {
            enrichedJob = { ...enrichedJob, ...detailData, state: 'Disputed' };
          }

          if (cidRes.ok) {
            const cidData = await cidRes.json();
            if (cidData?.success) {
              enrichedJob = {
                ...enrichedJob,
                decodedCid: cidData.cid,
                ipfsUrl: cidData.url,
              };
            }
          }
        } catch {
        }
        jobsWithMetadata.push(enrichedJob);
      }

      setDisputeJobs(filteredDisputes);
      setJobsData(jobsWithMetadata);
    } catch (error) {
      console.error('Error fetching disputes:', error);
      setDisputeJobs([]);
      setJobsData([]);
    } finally {
      setLoading(false);
    }
  }, [account]);

  useEffect(() => {
    fetchDisputes();

    const handleJobsUpdated = () => {
      setTimeout(() => fetchDisputes(), 2000);
    };

    window.addEventListener('jobsUpdated', handleJobsUpdated);
    return () => {
      window.removeEventListener('jobsUpdated', handleJobsUpdated);
    };
  }, [fetchDisputes]);

  const totalPages = Math.max(1, Math.ceil(disputeJobs.length / JOBS_PER_PAGE));
  const displayedJobs = jobsData.slice(
    currentPage * JOBS_PER_PAGE,
    (currentPage + 1) * JOBS_PER_PAGE
  );

  if (loading && disputeJobs.length === 0) {
    return <LoadingState message="Đang tải tranh chấp..." />;
  }

  if (disputeJobs.length === 0) {
    return (
      <EmptyState
        message="Không có tranh chấp nào."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h3 className="text-xl font-bold text-blue-800">Tranh chấp</h3>
        <p className="text-sm text-gray-600 mt-1">Các công việc đang có tranh chấp</p>
      </div>

      {displayedJobs.map((job) => {
        const dispute = disputeJobs.find(d => d.jobId === job.id);
        if (!dispute) return null;

        const getDisputeStatusDisplay = () => {
          switch (dispute.disputeStatus) {
            case 'resolved':
              return { text: 'Đã giải quyết', variant: 'success' as const };
            case 'voting':
              return { text: 'Đang bỏ phiếu', variant: 'info' as const };
            case 'open':
              return { text: 'Đang mở', variant: 'warning' as const };
            default:
              return { text: 'Không xác định', variant: 'default' as const };
          }
        };

        const statusDisplay = getDisputeStatusDisplay();

        const votesCount = dispute.votesCount || 0;
        const isReselecting = reselecting === dispute.disputeId;
        const canReselectNow = canReselect.get(dispute.disputeId) || false;
        const timeRemainingNow = timeRemaining.get(dispute.disputeId) || 0;
        const showReselectButton = votesCount < 3 && (account?.toLowerCase() === dispute.poster.toLowerCase() || account?.toLowerCase() === dispute.freelancer?.toLowerCase());

        const handleReselect = async () => {
          if (!canReselectNow || isReselecting) return;
          try {
            setReselecting(dispute.disputeId);
            const { wallet } = await getWallet();
            const { disputeHelpers } = await import('@/utils/contractHelpers');
            const payload = disputeHelpers.reselectReviewers(dispute.disputeId);
            await wallet.signAndSubmitTransaction(payload as any);
            
            const { clearJobEventsCache, clearDisputeEventsCache } = await import('@/lib/aptosClient');
            const { clearJobTableCache } = await import('@/lib/aptosClientCore');
            clearJobEventsCache();
            clearDisputeEventsCache();
            clearJobTableCache();
            
            window.dispatchEvent(new CustomEvent('jobsUpdated'));
            setTimeout(() => {
              fetchDisputes();
              setReselecting(null);
            }, 3000);
          } catch (e: any) {
            console.error('Error reselecting reviewers:', e);
            setReselecting(null);
          }
        };

        const handleClaimDispute = async () => {
          if (claimingDispute === dispute.disputeId) return;
          try {
            setClaimingDispute(dispute.disputeId);
            const { wallet } = await getWallet();
            const { escrowHelpers } = await import('@/utils/contractHelpers');
            const { toast } = await import('sonner');
            
            const payload = dispute.disputeWinner
              ? escrowHelpers.claimDisputePayment(dispute.jobId, dispute.milestoneId)
              : escrowHelpers.claimDisputeRefund(dispute.jobId, dispute.milestoneId);
            
            const tx = await wallet.signAndSubmitTransaction(payload as any);
            toast.success(`Đã yêu cầu ${dispute.disputeWinner ? 'thanh toán' : 'hoàn tiền'} tranh chấp! TX: ${tx?.hash || 'N/A'}`);
            
            const { clearJobEventsCache, clearDisputeEventsCache } = await import('@/lib/aptosClient');
            const { clearJobTableCache } = await import('@/lib/aptosClientCore');
            clearJobEventsCache();
            clearDisputeEventsCache();
            clearJobTableCache();
            
            window.dispatchEvent(new CustomEvent('jobsUpdated'));
            
            setTimeout(async () => {
              await fetchDisputes();
              window.dispatchEvent(new CustomEvent('jobsUpdated'));
              setClaimingDispute(null);
            }, 3000);
          } catch (e: any) {
            const { toast } = await import('sonner');
            toast.error(`Lỗi: ${e?.message || 'Không thể claim tranh chấp'}`);
            setClaimingDispute(null);
          }
        };

        return (
          <div key={job.id} className="space-y-2">
            <div className="p-3 bg-blue-50 border-2 border-blue-300 rounded">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-bold text-blue-800">Tranh chấp #{dispute.disputeId}</span>
                <StatusBadge text={statusDisplay.text} variant={statusDisplay.variant} />
              </div>
              <div className="text-sm text-gray-700 space-y-1">
                <div>
                  <span className="font-semibold">Cột mốc:</span> #{dispute.milestoneId + 1}
                </div>
                <div>
                  <span className="font-semibold">Số phiếu:</span> {votesCount}/3
                </div>
                <div>
                  <span className="font-semibold">Mở bởi:</span>{' '}
                  <span
                    className="text-blue-600 cursor-pointer hover:text-blue-800 hover:underline"
                    onClick={() => copyAddress(dispute.openedBy)}
                  >
                    {formatAddress(dispute.openedBy)}
                  </span>
                </div>
                <div>
                  <span className="font-semibold">Thời gian mở:</span>{' '}
                  {new Date(dispute.openedAt * 1000).toLocaleString('vi-VN')}
                </div>
                {dispute.disputeStatus === 'resolved' && dispute.disputeWinner !== null && dispute.disputeWinner !== undefined && (
                  <div className="mt-2 pt-2 border-t border-blue-200">
                    {((dispute.disputeWinner && account?.toLowerCase() === dispute.freelancer?.toLowerCase()) ||
                      (!dispute.disputeWinner && account?.toLowerCase() === dispute.poster.toLowerCase())) && (
                      <button
                        className={`text-xs px-3 py-2 rounded border-2 font-bold flex items-center gap-2 ${
                          claimingDispute === dispute.disputeId
                            ? 'bg-gray-400 text-gray-600 border-gray-500 cursor-not-allowed'
                            : 'bg-blue-100 text-black hover:bg-blue-200 border-blue-300'
                        }`}
                        disabled={claimingDispute === dispute.disputeId}
                        onClick={handleClaimDispute}
                      >
                        {claimingDispute === dispute.disputeId && <LockIcon className="w-4 h-4" />}
                        {claimingDispute === dispute.disputeId ? 'Đang xử lý...' : dispute.disputeWinner ? 'Yêu cầu Thanh toán' : 'Yêu cầu Hoàn tiền'}
                      </button>
                    )}
                  </div>
                )}
                {showReselectButton && (
                  <div className="mt-2 pt-2 border-t border-blue-200">
                    {!canReselectNow && timeRemainingNow > 0 && (
                      <div className="text-xs text-blue-700 mb-2">
                        Có thể chọn lại đánh giá viên sau: {Math.floor(timeRemainingNow / 60)}:{(timeRemainingNow % 60).toString().padStart(2, '0')}
                      </div>
                    )}
                    <button
                      className={`text-xs px-3 py-2 rounded border-2 font-bold flex items-center gap-2 ${
                        !canReselectNow || isReselecting
                          ? 'bg-gray-400 text-gray-600 border-gray-500 cursor-not-allowed'
                          : 'bg-white text-black hover:bg-gray-100 border-black'
                      }`}
                      disabled={!canReselectNow || isReselecting}
                      onClick={handleReselect}
                    >
                      {(!canReselectNow || isReselecting) && <LockIcon className="w-4 h-4" />}
                      {isReselecting ? 'Đang chọn lại đánh giá viên...' : 'Chọn lại Đánh giá viên'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <JobCard
              job={job}
              account={account}
              activeTab="posted"
              onUpdate={() => {}}
            />
          </div>
        );
      })}

      {disputeJobs.length > JOBS_PER_PAGE && (
        <div className="flex flex-col items-center gap-2 pt-4 border-t border-gray-300">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) => {
              setCurrentPage(page);
              if (account) {
                setTimeout(() => fetchDisputes(), 300);
              }
            }}
            showAutoPlay={false}
            showFirstLast
          />
          <div className="text-sm text-gray-700">
            Trang {currentPage + 1} / {totalPages}
          </div>
        </div>
      )}
    </div>
  );
};

