"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import { useWallet } from '@/contexts/WalletContext';
import { JobListItem } from '@/constants/escrow';
import { formatAddress, copyAddress } from '@/utils/addressUtils';
import { formatDate } from '@/utils/timeUtils';
import { getJobStateDisplay } from '@/utils/jobStateUtils';
import { LoadingState, ErrorState, EmptyState, StatusBadge } from '@/components/common';

const JOBS_PER_PAGE = 8;

export const JobsContent: React.FC = () => {
  const router = useRouter();
  const { account } = useWallet();
  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [latestFreelancers, setLatestFreelancers] = useState<Record<number, string | null>>({});

  const fetchJobs = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Query trực tiếp từ Aptos events
      const { getJobsList } = await import('@/lib/aptosClient');
      const result = await getJobsList(200);
      setJobs(result.jobs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách công việc');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    const handleJobsUpdated = () => {
      setTimeout(() => fetchJobs(), 1000);
    };

    window.addEventListener('jobsUpdated', handleJobsUpdated);
    
    return () => {
      window.removeEventListener('jobsUpdated', handleJobsUpdated);
    };
  }, [fetchJobs]);

  useEffect(() => {
    const jobsNeedingLookup = jobs.filter((job) => !job.freelancer && job.cid);
    if (jobsNeedingLookup.length === 0) {
      setLatestFreelancers({});
      return;
    }

    let cancelled = false;

    const fetchLatestFreelancers = async () => {
      const results = await Promise.all(
        jobsNeedingLookup.map(async (job) => {
          try {
            const res = await fetch(`/api/ipfs/job?jobId=${job.id}&freelancers=true`);
            if (!res.ok) {
              return [job.id, null] as const;
            }
            const data = await res.json();
            const applicants = Array.isArray(data.applicants) ? data.applicants : [];
            if (!applicants.length) {
              return [job.id, null] as const;
            }
            const latest = [...applicants]
              .sort((a, b) => {
                const aTime = new Date(a?.applied_at || 0).getTime();
                const bTime = new Date(b?.applied_at || 0).getTime();
                return bTime - aTime;
              })
              .find((applicant) => applicant?.freelancer_address);
            return [job.id, latest?.freelancer_address || null] as const;
          } catch {
            return [job.id, null] as const;
          }
        })
      );

      if (!cancelled) {
        const map: Record<number, string | null> = {};
        results.forEach(([id, addr]) => {
          map[id] = addr;
        });
        setLatestFreelancers(map);
      }
    };

    fetchLatestFreelancers();

    return () => {
      cancelled = true;
    };
  }, [jobs]);

  if (loading) {
    return <LoadingState message="Đang tải công việc..." />;
  }

  if (error) {
    return <ErrorState message={`Lỗi: ${error}`} onRetry={() => window.location.reload()} />;
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-blue-800 mb-2">Tìm công việc</h1>
        <p className="text-lg text-gray-700">Công việc trên blockchain (nhấp để xem chi tiết từ CID)</p>
      </div>

      {jobs.length === 0 ? (
        <EmptyState
          title="Không tìm thấy công việc"
          message="Hãy là người đầu tiên đăng công việc và bắt đầu kiếm tiền!"
          variant="card"
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {jobs
              .slice(currentPage * JOBS_PER_PAGE, (currentPage + 1) * JOBS_PER_PAGE)
              .map((job: JobListItem) => {
            let stateStr = 'Posted';
            if (typeof job.state === 'string') {
              stateStr = job.state;
            }
            
            const pendingFreelancer = (job as any).pending_freelancer || null;
            if (pendingFreelancer && stateStr !== 'Completed' && stateStr !== 'Cancelled' && stateStr !== 'CancelledByPoster') {
              const inProgressState = stateStr === 'InProgress';
              if (inProgressState) {
                stateStr = 'PendingApproval';
              }
            }
            
            let freelancerAddress = '';
            let isFreelancerOfJob = false;
            if (job.freelancer) {
              freelancerAddress = typeof job.freelancer === 'string' 
                ? job.freelancer 
                : String(job.freelancer || '');
              if (account && freelancerAddress) {
                isFreelancerOfJob = account.toLowerCase() === freelancerAddress.toLowerCase();
              }
            }
            if (!freelancerAddress) {
              const latestAddr = latestFreelancers[job.id];
              if (latestAddr) {
                freelancerAddress = latestAddr;
              }
            }
            
            let isPosterOfJob = false;
            if (account && job.poster) {
              isPosterOfJob = account.toLowerCase() === String(job.poster).toLowerCase();
            }
            
            const applyDeadlineExpired = job.apply_deadline 
              ? Number(job.apply_deadline) * 1000 < Date.now() 
              : false;
            const hasFreelancer = job.freelancer !== null && job.freelancer !== undefined;
            const isExpiredPosted = stateStr === 'Posted' && applyDeadlineExpired && !hasFreelancer;
            
          
            const displayState = (stateStr === 'Cancelled' && !isPosterOfJob && !isFreelancerOfJob) ? 'Posted' : stateStr;
            const stateDisplay = getJobStateDisplay(displayState, job.apply_deadline, hasFreelancer);
            
            return (
              <div 
                key={job.id} 
                className="cursor-pointer h-full"
                onClick={() => router.push(`/jobs/${job.id}`)}
              >
                <Card 
                  variant="outlined"
                  className="p-6 hover:bg-gray-50 h-full flex flex-col"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-blue-800">Công việc #{job.id}</h3>
                      <p className="text-sm text-gray-700">
                        {typeof job.total_amount === 'number' 
                          ? `${(job.total_amount / 100_000_000).toFixed(2)} APT` 
                          : '—'}
                        {typeof job.milestones_count === 'number' 
                          ? ` • ${job.milestones_count} cột mốc` 
                          : ''}
                      </p>
                    </div>
                    <StatusBadge text={stateDisplay.text} variant={stateDisplay.variant} />
                  </div>
                  
                  <div className="space-y-2 pt-2 border-t border-gray-200 mt-auto">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">Người thuê:</span>
                      <span 
                        className="font-bold text-blue-600 cursor-pointer hover:text-blue-800 hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          const posterAddr = typeof job.poster === 'string' ? job.poster : String(job.poster || '');
                          if (posterAddr) copyAddress(posterAddr);
                        }}
                      >
                        {formatAddress(typeof job.poster === 'string' ? job.poster : String(job.poster || ''))}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">Người làm (mới nhất):</span>
                      {freelancerAddress ? (
                        <span 
                          className="font-bold text-blue-600 cursor-pointer hover:text-blue-800 hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyAddress(freelancerAddress);
                          }}
                        >
                          {formatAddress(freelancerAddress)}
                        </span>
                      ) : (
                        <span className="font-bold text-gray-600">
                          None
                        </span>
                      )}
                    </div>
                    {job.apply_deadline && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700">Hạn đăng ký:</span>
                        <span className={`font-bold text-xs ${
                          job.apply_deadline * 1000 < Date.now() ? 'text-red-600' : 'text-gray-800'
                        }`}>
                          {(() => {
                            const deadline = Number(job.apply_deadline);
                            const date = new Date(deadline * 1000);
                            const isExpired = deadline * 1000 < Date.now();
                            return (
                              <>
                                {formatDate(deadline)}
                                {isExpired && 'Hết hạn'}
                              </>
                            );
                          })()}
                        </span>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            );
          })}
          </div>
          
          {jobs.length > JOBS_PER_PAGE && (
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(jobs.length / JOBS_PER_PAGE)}
              onPageChange={setCurrentPage}
              showAutoPlay={false}
              showFirstLast={true}
            />
          )}
        </>
      )}
    </>
  );
};
