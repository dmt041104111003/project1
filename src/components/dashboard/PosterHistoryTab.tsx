"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import { LoadingState, EmptyState, StatusBadge } from '@/components/common';
import { getPosterJobHistory, PosterJobHistory } from '@/lib/aptosClient';
import { formatAddress, copyAddress } from '@/utils/addressUtils';

const JOBS_PER_PAGE = 1;

interface PosterHistoryTabProps {
  posterAddress: string;
}

export const PosterHistoryTab: React.FC<PosterHistoryTabProps> = ({
  posterAddress,
}) => {
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<PosterJobHistory[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [decodedCids, setDecodedCids] = useState<Map<number, { cid: string; url: string }>>(new Map());

  useEffect(() => {
    const maxPageIndex = Math.max(0, Math.ceil(history.length / JOBS_PER_PAGE) - 1);
    if (currentPage > maxPageIndex) {
      setCurrentPage(maxPageIndex);
    }
  }, [history.length, currentPage]);

  const fetchHistory = useCallback(async () => {
    if (!posterAddress) {
      setHistory([]);
      return;
    }

    setLoading(true);
    try {
      const data = await getPosterJobHistory(posterAddress, 200);
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
      console.error('Error fetching poster history:', error);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [posterAddress]);

  useEffect(() => {
    fetchHistory();

    const handleJobsUpdated = () => {
      setTimeout(() => fetchHistory(), 2000);
    };

    window.addEventListener('jobsUpdated', handleJobsUpdated);
    return () => {
      window.removeEventListener('jobsUpdated', handleJobsUpdated);
    };
  }, [fetchHistory]);

  const getStatusDisplay = (status: PosterJobHistory['status']) => {
    switch (status) {
      case 'completed':
        return { text: 'Hoàn thành', variant: 'success' as const };
      case 'claimed_timeout':
        return { text: 'Đã đòi quá hạn', variant: 'info' as const };
      case 'cancelled':
        return { text: 'Đã hủy', variant: 'warning' as const };
      case 'in_progress':
        return { text: 'Đang làm', variant: 'info' as const };
      case 'pending_approval':
        return { text: 'Chờ phê duyệt', variant: 'info' as const };
      case 'expired':
        return { text: 'Hết hạn', variant: 'warning' as const };
      case 'posted':
        return { text: 'Đã đăng', variant: 'default' as const };
      default:
        return { text: 'Không xác định', variant: 'default' as const };
    }
  };

  const getStatusColor = (status: PosterJobHistory['status']) => {
    switch (status) {
      case 'completed':
        return 'text-blue-800 bg-blue-50 border-blue-300';
      case 'claimed_timeout':
        return 'text-blue-700 bg-blue-50 border-blue-300';
      case 'cancelled':
        return 'text-blue-800 bg-blue-50 border-blue-300';
      case 'in_progress':
        return 'text-blue-700 bg-blue-50 border-blue-300';
      case 'pending_approval':
        return 'text-blue-700 bg-blue-50 border-blue-300';
      case 'expired':
        return 'text-blue-800 bg-blue-50 border-blue-300';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-300';
    }
  };


  const totalPages = Math.max(1, Math.ceil(history.length / JOBS_PER_PAGE));
  const displayedHistory = history.slice(
    currentPage * JOBS_PER_PAGE,
    (currentPage + 1) * JOBS_PER_PAGE
  );

  if (loading && history.length === 0) {
    return <LoadingState message="Đang tải lịch sử công việc..." />;
  }

  if (history.length === 0) {
    return (
      <EmptyState
        message="Bạn chưa đăng công việc nào."
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
                    <span className="font-semibold">Tổng giá trị:</span>{' '}
                    {(item.totalAmount / 100_000_000).toFixed(2)} APT
                  </div>
                  <div className="text-xs text-gray-600 break-all">
                    <span className="font-semibold">{decodedCids.get(item.jobId) ? 'CID (đã giải mã):' : 'CID:'}</span>{' '}
                    {decodedCids.get(item.jobId)?.cid || item.cid}
                    {decodedCids.get(item.jobId)?.url && (
                      <a
                        href={decodedCids.get(item.jobId)!.url}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-2 text-blue-700 underline hover:text-blue-900"
                      >
                        Mở metadata
                      </a>
                    )}
                  </div>
                  <div>
                    <span className="font-semibold">Thời gian tạo:</span>{' '}
                    {new Date(item.createdAt * 1000).toLocaleString('vi-VN')}
                  </div>
                  {item.freelancer && (
                    <div>
                      <span className="font-semibold">Người làm tự do:</span>{' '}
                      <span
                        className="text-blue-600 cursor-pointer hover:text-blue-800 hover:underline"
                        onClick={() => copyAddress(item.freelancer!)}
                      >
                        {formatAddress(item.freelancer)}
                      </span>
                    </div>
                  )}
                  {item.pendingFreelancer && (
                    <div className="text-blue-700">
                      <span className="font-semibold">Ứng viên đang chờ:</span>{' '}
                      <span
                        className="text-blue-600 cursor-pointer hover:text-blue-800 hover:underline"
                        onClick={() => copyAddress(item.pendingFreelancer!)}
                      >
                        {formatAddress(item.pendingFreelancer)}
                      </span>
                    </div>
                  )}
                  {item.completedAt && (
                    <div className="text-blue-800">
                      <span className="font-semibold">Hoàn thành lúc:</span>{' '}
                      {new Date(item.completedAt * 1000).toLocaleString('vi-VN')}
                    </div>
                  )}
                  {item.claimedAt && (
                    <div className="text-blue-700">
                      <span className="font-semibold">Đòi quá hạn lúc:</span>{' '}
                      {new Date(item.claimedAt * 1000).toLocaleString('vi-VN')}
                    </div>
                  )}
                  {item.cancelledAt && (
                    <div className="text-blue-800">
                      <span className="font-semibold">Hủy lúc:</span>{' '}
                      {new Date(item.cancelledAt * 1000).toLocaleString('vi-VN')}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {item.reason && (
              <div className={`mt-3 p-3 rounded border-2 ${
                item.status === 'completed' 
                  ? 'bg-blue-100 border-blue-300 text-blue-800'
                  : item.status === 'claimed_timeout'
                  ? 'bg-blue-100 border-blue-300 text-blue-800'
                  : item.status === 'cancelled'
                  ? 'bg-blue-100 border-blue-300 text-blue-800'
                  : 'bg-gray-100 border-gray-300 text-gray-700'
              }`}>
                <div className="text-sm font-semibold mb-1">Trạng thái:</div>
                <div className="text-sm">{item.reason}</div>
              </div>
            )}

            {item.events && item.events.length > 0 && (
              <div className="mt-3 p-3 bg-white rounded border border-gray-300">
                <div className="text-sm font-semibold mb-2 text-gray-700">Lịch sử sự kiện:</div>
                <div className="space-y-1">
                  {item.events.map((event, idx) => (
                    <div key={idx} className="text-xs text-gray-600">
                      <span className="font-semibold">{event.description}</span>
                      <span className="text-gray-500 ml-2">
                        ({new Date(event.timestamp * 1000).toLocaleString('vi-VN')})
                      </span>
                    </div>
                  ))}
                </div>
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
              // Auto refresh khi đổi trang
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

