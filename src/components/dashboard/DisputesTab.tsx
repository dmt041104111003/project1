"use client";

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import { useWallet } from '@/contexts/WalletContext';
import { LoadingState, EmptyState, StatusBadge } from '@/components/common';
import { getJobsWithDisputes, JobWithDispute } from '@/lib/aptosClient';
import { formatAddress, copyAddress } from '@/utils/addressUtils';
import { JobCard } from './JobCard';
import { Job } from '@/constants/escrow';

const JOBS_PER_PAGE = 1;

interface DisputesTabProps {
  account: string;
}

export const DisputesTab: React.FC<DisputesTabProps> = ({
  account,
}) => {
  const [loading, setLoading] = useState(false);
  const [disputeJobs, setDisputeJobs] = useState<JobWithDispute[]>([]);
  const [jobsData, setJobsData] = useState<Job[]>([]);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    const maxPageIndex = Math.max(0, Math.ceil(disputeJobs.length / JOBS_PER_PAGE) - 1);
    if (currentPage > maxPageIndex) {
      setCurrentPage(maxPageIndex);
    }
  }, [disputeJobs.length, currentPage]);

  useEffect(() => {
    const fetchDisputes = async () => {
      if (!account) {
        setDisputeJobs([]);
        setJobsData([]);
        return;
      }

      setLoading(true);
      try {
        const disputes = await getJobsWithDisputes(account, 200);
        setDisputeJobs(disputes);

        const jobsWithMetadata = await Promise.all(
          disputes.map(async (dispute) => {
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
              const { getParsedJobData } = await import('@/lib/aptosClient');
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
            return enrichedJob;
          })
        );

        setJobsData(jobsWithMetadata);
      } catch (error) {
        console.error('Error fetching disputes:', error);
        setDisputeJobs([]);
        setJobsData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDisputes();

    const handleJobsUpdated = () => {
      setTimeout(() => fetchDisputes(), 2000);
    };

    window.addEventListener('jobsUpdated', handleJobsUpdated);
    return () => {
      window.removeEventListener('jobsUpdated', handleJobsUpdated);
    };
  }, [account]);

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

      {displayedJobs.map((job, index) => {
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

        return (
          <div key={job.id} className="space-y-2">
            <div className="p-3 bg-orange-50 border-2 border-orange-300 rounded">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-bold text-orange-800">Tranh chấp #{dispute.disputeId}</span>
                <StatusBadge text={statusDisplay.text} variant={statusDisplay.variant} />
              </div>
              <div className="text-sm text-gray-700 space-y-1">
                <div>
                  <span className="font-semibold">Cột mốc:</span> #{dispute.milestoneId + 1}
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
                {dispute.resolvedAt && (
                  <div className="text-green-700">
                    <span className="font-semibold">Giải quyết lúc:</span>{' '}
                    {new Date(dispute.resolvedAt * 1000).toLocaleString('vi-VN')}
                  </div>
                )}
                {dispute.disputeWinner !== null && (
                  <div className="text-green-700">
                    <span className="font-semibold">Người thắng:</span>{' '}
                    {dispute.disputeWinner ? 'Người làm tự do' : 'Người thuê'}
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
            onPageChange={setCurrentPage}
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

