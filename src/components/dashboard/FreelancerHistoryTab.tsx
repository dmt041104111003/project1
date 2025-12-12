"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import { useWallet } from '@/contexts/WalletContext';
import { LoadingState, EmptyState, StatusBadge } from '@/components/common';
import { getFreelancerJobHistory, FreelancerJobHistory } from '@/lib/aptosClient';
import { formatAddress, copyAddress } from '@/utils/addressUtils';

const JOBS_PER_PAGE = 1;

interface FreelancerHistoryTabProps {
  freelancerAddress: string;
}

export const FreelancerHistoryTab: React.FC<FreelancerHistoryTabProps> = ({
  freelancerAddress,
}) => {
  const { account } = useWallet();
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<FreelancerJobHistory[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [decodedCids, setDecodedCids] = useState<Map<number, { cid: string; url: string }>>(new Map());

  const fetchHistory = useCallback(async () => {
    if (!freelancerAddress) {
      setHistory([]);
      setDecodedCids(new Map());
      return;
    }

    setLoading(true);
    try {
      const data = await getFreelancerJobHistory(freelancerAddress, 200);
      setHistory(data);

      const cidMap = new Map<number, { cid: string; url: string }>();
      await Promise.all(
        data.map(async (item) => {
          try {
            const cidRes = await fetch(`/api/ipfs/job?jobId=${item.jobId}&decodeOnly=true`);
            if (cidRes.ok) {
              const cidData = await cidRes.json();
              if (cidData?.success) {
                cidMap.set(item.jobId, {
                  cid: cidData.cid,
                  url: cidData.url,
                });
              }
            }
          } catch {
          }
        })
      );
      setDecodedCids(cidMap);
    } catch (error) {
      console.error('Error fetching freelancer history:', error);
      setHistory([]);
      setDecodedCids(new Map());
    } finally {
      setLoading(false);
    }
  }, [freelancerAddress]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    const handleJobsUpdated = () => {
      setTimeout(() => fetchHistory(), 2000);
    };

    window.addEventListener('jobsUpdated', handleJobsUpdated);
    return () => {
      window.removeEventListener('jobsUpdated', handleJobsUpdated);
    };
  }, [fetchHistory]);

  useEffect(() => {
    const maxPageIndex = Math.max(0, Math.ceil(history.length / JOBS_PER_PAGE) - 1);
    if (currentPage > maxPageIndex) {
      setCurrentPage(maxPageIndex);
    }
  }, [history.length, currentPage]);

  const getStatusDisplay = (status: FreelancerJobHistory['status']) => {
    switch (status) {
      case 'completed':
        return { text: 'Hoàn thành', variant: 'success' as const };
      case 'claimed_timeout':
        return { text: 'Bị đòi quá hạn', variant: 'error' as const };
      case 'rejected':
        return { text: 'Bị từ chối', variant: 'error' as const };
      case 'cancelled':
        return { text: 'Bị hủy', variant: 'warning' as const };
      case 'in_progress':
        return { text: 'Đang làm', variant: 'info' as const };
      case 'pending_approval':
        return { text: 'Chờ phê duyệt', variant: 'info' as const };
      case 'posted':
        return { text: 'Đã apply', variant: 'default' as const };
      default:
        return { text: 'Không xác định', variant: 'default' as const };
    }
  };

  const getStatusColor = (status: FreelancerJobHistory['status']) => {
    switch (status) {
      case 'completed':
        return 'text-blue-800 bg-blue-50 border-blue-300';
      case 'claimed_timeout':
        return 'text-blue-800 bg-blue-50 border-blue-400';
      case 'rejected':
        return 'text-blue-800 bg-blue-50 border-blue-300';
      case 'cancelled':
        return 'text-blue-800 bg-blue-50 border-blue-300';
      case 'in_progress':
        return 'text-blue-700 bg-blue-50 border-blue-300';
      case 'pending_approval':
        return 'text-blue-700 bg-blue-50 border-blue-300';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-300';
    }
  };

  if (loading && history.length === 0) {
    return <LoadingState message="Đang tải lịch sử công việc..." />;
  }

  const totalPages = Math.max(1, Math.ceil(history.length / JOBS_PER_PAGE));
  const displayedHistory = history.slice(
    currentPage * JOBS_PER_PAGE,
    (currentPage + 1) * JOBS_PER_PAGE
  );

  if (history.length === 0) {
    return (
      <EmptyState
        message="Bạn chưa từng apply công việc nào."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h3 className="text-xl font-bold text-blue-800">Lịch sử công việc</h3>
      </div>

      {displayedHistory.map((item) => {
        const statusDisplay = getStatusDisplay(item.status);
        const statusColor = getStatusColor(item.status);

        return (
          <Card
            key={item.jobId}
            variant="outlined"
            className={`p-4 border-2 ${statusColor}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-bold text-blue-800">Công việc #{item.jobId}</h4>
                  <StatusBadge text={statusDisplay.text} variant={statusDisplay.variant} />
                </div>
                <div className="text-sm text-gray-700 space-y-1">
                  <div>
                    <span className="font-semibold">Người thuê:</span>{' '}
                    <span
                      className="text-blue-600 cursor-pointer hover:text-blue-800 hover:underline"
                      onClick={() => copyAddress(item.poster)}
                    >
                      {formatAddress(item.poster)}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold">Tổng giá trị:</span>{' '}
                    {(item.totalAmount / 100_000_000).toFixed(2)} APT
                  </div>
                  <div>
                    <span className="font-semibold">CID:</span>{' '}
                    {decodedCids.has(item.jobId) ? (
                      <span>
                        <span className="font-mono text-xs break-all">{decodedCids.get(item.jobId)?.cid}</span>
                        {' '}
                        <a
                          href={decodedCids.get(item.jobId)?.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 hover:underline text-xs ml-1"
                        >
                          Mở metadata
                        </a>
                      </span>
                    ) : (
                      <span className="font-mono text-xs break-all">{item.cid}</span>
                    )}
                  </div>
                  <div>
                    <span className="font-semibold">Thời gian apply:</span>{' '}
                    {new Date(item.appliedAt * 1000).toLocaleString('vi-VN')}
                  </div>
                  {item.completedAt && (
                    <div className="text-blue-800">
                      <span className="font-semibold">Hoàn thành lúc:</span>{' '}
                      {new Date(item.completedAt * 1000).toLocaleString('vi-VN')}
                    </div>
                  )}
                  {item.claimedAt && (
                    <div className="text-blue-800">
                      <span className="font-semibold">Bị đòi lúc:</span>{' '}
                      {new Date(item.claimedAt * 1000).toLocaleString('vi-VN')}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {item.reason && (
              <div className={`mt-3 p-3 rounded border-2 ${
                item.status === 'completed' 
                  ? 'bg-blue-100 border-blue-300 text-blue-800'
                  : item.status === 'claimed_timeout' || item.status === 'rejected'
                  ? 'bg-blue-100 border-blue-300 text-blue-800'
                  : item.status === 'cancelled'
                  ? 'bg-blue-100 border-blue-300 text-blue-800'
                  : 'bg-gray-100 border-gray-300 text-gray-700'
              }`}>
                <div className="text-sm font-semibold mb-1">Lý do:</div>
                <div className="text-sm">{item.reason}</div>
              </div>
            )}
          </Card>
        );
      })}

      {history.length > JOBS_PER_PAGE && (
        <div className="flex flex-col items-center gap-2 pt-4 border-t border-gray-300">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) => {
              setCurrentPage(page);
              setTimeout(() => fetchHistory(), 300);
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

