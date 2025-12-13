"use client";

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { useWallet } from '@/contexts/WalletContext';
import { JobCard } from './JobCard';
import { FreelancerHistoryTab } from './FreelancerHistoryTab';
import { PosterHistoryTab } from './PosterHistoryTab';
import { DisputesTab } from './DisputesTab';
import { Job } from '@/constants/escrow';
import { SegmentedTabs } from '@/components/ui';
import { LoadingState, EmptyState } from '@/components/common';

const JOBS_PER_PAGE = 1;

interface ProjectsTabProps {
  hasPosterRole: boolean;
  hasFreelancerRole: boolean;
}

export const ProjectsTab: React.FC<ProjectsTabProps> = ({
  hasPosterRole,
  hasFreelancerRole,
}) => {
  const { account } = useWallet();
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeTab, setActiveTab] = useState<'posted' | 'applied' | 'history' | 'poster_history' | 'disputes'>(hasPosterRole ? 'posted' : hasFreelancerRole ? 'applied' : 'posted');
  const [currentPage, setCurrentPage] = useState(0);
  const [postedCount, setPostedCount] = useState(0);
  const [appliedCount, setAppliedCount] = useState(0);
  const [resolvedDisputesMap, setResolvedDisputesMap] = useState<Map<number, { disputeStatus: string; disputeWinner: boolean | null; milestoneId: number }>>(new Map());
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!hasPosterRole && activeTab === 'posted') {
      setActiveTab(hasFreelancerRole ? 'applied' : 'posted');
    } else if (!hasFreelancerRole && activeTab === 'applied') {
      setActiveTab(hasPosterRole ? 'posted' : 'applied');
    }
  }, [hasPosterRole, hasFreelancerRole, activeTab]);

  const fetchJobs = async () => {
    if (!account) {
      setJobs([]);
      setPostedCount(0);
      setAppliedCount(0);
      return;
    }

    if (activeTab === 'posted' && !hasPosterRole) {
      setJobs([]);
      return;
    }
    if (activeTab === 'applied' && !hasFreelancerRole) {
      setJobs([]);
      return;
    }

    setLoading(true);
    try {
      const { getJobsList, getJobsWithDisputes } = await import('@/lib/aptosClient');
      const { getDisputeOpenedEvents, getDisputeResolvedEvents } = await import('@/lib/aptosEvents');
      const [jobsRes, disputeOpenedEvents, disputeResolvedEvents] = await Promise.all([
        getJobsList(200),
        getDisputeOpenedEvents(200),
        getDisputeResolvedEvents(200),
      ]);
      
      const allJobs = jobsRes.jobs || [];
      
      const activeDisputeJobIds = new Set<number>();
      disputeOpenedEvents.forEach((evt: any) => {
        const jobId = Number(evt?.data?.job_id || 0);
        if (jobId > 0) {
          activeDisputeJobIds.add(jobId);
        }
      });
      
      const resolvedDisputeJobIds = new Set<number>();
      disputeResolvedEvents.forEach((evt: any) => {
        const jobId = Number(evt?.data?.job_id || 0);
        if (jobId > 0) {
          resolvedDisputeJobIds.add(jobId);
        }
      });
      
      const disputesData = await getJobsWithDisputes(account, 200);
      const newResolvedDisputesMap = new Map<number, { disputeStatus: string; disputeWinner: boolean | null; milestoneId: number }>();
      disputesData.forEach((d) => {
        if (d.disputeStatus === 'resolved') {
          newResolvedDisputesMap.set(d.jobId, { disputeStatus: d.disputeStatus, disputeWinner: d.disputeWinner, milestoneId: d.milestoneId });
        }
      });
      setResolvedDisputesMap(newResolvedDisputesMap);
      
      const { checkDisputeWinnerPendingClaim } = await import('@/lib/aptosClientCore');
      const pendingClaimMap = new Map<number, boolean>();
      for (const [jobId] of newResolvedDisputesMap) {
        const { hasPendingClaim } = await checkDisputeWinnerPendingClaim(jobId);
        pendingClaimMap.set(jobId, hasPendingClaim);
      }
      
      const postedJobs = allJobs.filter((job: Job) => {
        const isPoster = job.poster?.toLowerCase() === account.toLowerCase();
        const isCancelled = job.state === 'Cancelled' || job.state === 'CancelledByPoster';
        const isCompleted = job.state === 'Completed';
        const hasActiveDispute = activeDisputeJobIds.has(job.id) && !newResolvedDisputesMap.has(job.id);
        
        if (isCancelled || isCompleted) {
          return false;
        }
        
        if (hasActiveDispute) {
          return false;
        }
        
        const hasPendingClaim = pendingClaimMap.get(job.id);
        if (hasPendingClaim) {
          return false;
        }
        
        return isPoster;
      });
      
      const appliedJobs = allJobs.filter((job: Job) => {
        const freelancerMatch = job.freelancer && job.freelancer.toLowerCase() === account.toLowerCase();
        const pendingMatch = job.pending_freelancer && job.pending_freelancer.toLowerCase() === account.toLowerCase();
        const isCancelled = job.state === 'Cancelled' || job.state === 'CancelledByPoster';
        const isCompleted = job.state === 'Completed';
        const hasActiveDispute = activeDisputeJobIds.has(job.id) && !newResolvedDisputesMap.has(job.id);
        
        if (isCancelled || isCompleted) {
          return false;
        }
        
        if (hasActiveDispute) {
          return false;
        }
        
        const hasPendingClaim = pendingClaimMap.get(job.id);
        if (hasPendingClaim) {
          return false;
        }
        
        return (freelancerMatch || pendingMatch);
      });

      setPostedCount(postedJobs.length);
      setAppliedCount(appliedJobs.length);

      const filteredJobs = activeTab === 'posted' ? postedJobs : appliedJobs;

        const jobsWithMetadata = await Promise.all(
        filteredJobs.map(async (job: Job) => {
          let enrichedJob: Job = job;
          try {
            const cidRes = await fetch(`/api/ipfs/job?jobId=${job.id}&decodeOnly=true`);

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

      setJobs(jobsWithMetadata);
      setInitialized(true);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (account && (activeTab === 'posted' || activeTab === 'applied')) {
      fetchJobs();
    }
  }, [activeTab, account, hasPosterRole, hasFreelancerRole]);

  useEffect(() => {
    const handleRolesUpdated = () => {
      if (account) {
        fetchJobs();
      }
    };
    
    const handleJobsUpdated = async () => {
      if (account) {
        const { clearJobEventsCache, clearDisputeEventsCache } = await import('@/lib/aptosClient');
        const { clearJobTableCache } = await import('@/lib/aptosClientCore');
        clearJobEventsCache();
        clearDisputeEventsCache();
        clearJobTableCache();
        fetchJobs();
      }
    };

    window.addEventListener('rolesUpdated', handleRolesUpdated);
    window.addEventListener('jobsUpdated', handleJobsUpdated);
    
    return () => {
      window.removeEventListener('rolesUpdated', handleRolesUpdated);
      window.removeEventListener('jobsUpdated', handleJobsUpdated);
    };
  }, [account]);

  const totalPages = Math.max(1, Math.ceil(jobs.length / JOBS_PER_PAGE));
  const displayedJobs = jobs.slice(
    currentPage * JOBS_PER_PAGE,
    (currentPage + 1) * JOBS_PER_PAGE
  );

  useEffect(() => {
    const maxPageIndex = Math.max(0, Math.ceil(jobs.length / JOBS_PER_PAGE) - 1);
    if (currentPage > maxPageIndex) {
      setCurrentPage(maxPageIndex);
    }
  }, [jobs.length, currentPage]);

  if (!account) {
    return <EmptyState message="Vui lòng kết nối ví" />;
  }

  if (!initialized && !loading) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card variant="outlined" className="p-8 text-center">
          <h2 className="text-2xl font-bold text-blue-800 mb-2">Dự Án</h2>
          <p className="text-gray-700 mb-6">Xem và quản lý dự án từ blockchain</p>
          <Button onClick={fetchJobs} className="px-6 py-3">
            Tải danh sách dự án
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Card variant="outlined" className="p-8">
        <div className="text-center mb-8 relative">
          <h2 className="text-2xl font-bold text-blue-800 mb-2">Dự Án</h2>
          <p className="text-gray-700">Xem và quản lý dự án từ blockchain</p>
          <button
            onClick={fetchJobs}
            disabled={loading}
            className="absolute right-0 top-0 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '...' : '↻'}
          </button>
        </div>

        <SegmentedTabs
          stretch
          className="w-full mb-6"
          tabs={[
            ...(hasPosterRole
              ? [{
                  value: 'posted' as const,
                  label: 'Đã đăng',
                  badge: postedCount,
                }]
              : []),
            ...(hasFreelancerRole
              ? [{
                  value: 'applied' as const,
                  label: 'Đã tham gia',
                  badge: appliedCount,
                }]
              : []),
            ...(hasPosterRole
              ? [{
                  value: 'poster_history' as const,
                  label: 'Lịch sử',
                }]
              : []),
            ...(hasFreelancerRole
              ? [{
                  value: 'history' as const,
                  label: 'Lịch sử',
                }]
              : []),
            ...((hasPosterRole || hasFreelancerRole)
              ? [{
                  value: 'disputes' as const,
                  label: 'Tranh chấp',
                }]
              : []),
          ]}
          activeTab={activeTab}
          onChange={(value) => {
            setActiveTab(value as 'posted' | 'applied' | 'history' | 'poster_history' | 'disputes');
            setCurrentPage(0);
          }}
        />

    
        <div className="space-y-4">
          {activeTab === 'disputes' && account ? (
            <DisputesTab account={account} />
          ) : activeTab === 'poster_history' && hasPosterRole && account ? (
            <PosterHistoryTab posterAddress={account} />
          ) : activeTab === 'history' && hasFreelancerRole && account ? (
            <FreelancerHistoryTab freelancerAddress={account} />
          ) : loading && jobs.length === 0 ? (
            <LoadingState message="Đang tải dự án..." />
          ) : displayedJobs.length === 0 ? (
            <EmptyState
              message={
                activeTab === 'posted' 
                  ? 'Bạn chưa đăng công việc nào.' 
                  : 'Bạn chưa ứng tuyển công việc nào.'
              }
            />
          ) : (
            <>
              {displayedJobs.map((job) => {
                const resolvedDispute = resolvedDisputesMap.get(job.id);
                const jobWithOverride = resolvedDispute && 
                  resolvedDispute.disputeWinner !== null && 
                  resolvedDispute.disputeWinner !== undefined
                  ? { ...job, state: 'Disputed' as const }
                  : job;
                
                return (
                  <JobCard
                    key={job.id}
                    job={jobWithOverride}
                    account={account}
                    activeTab={activeTab === 'history' || activeTab === 'poster_history' || activeTab === 'disputes' ? 'applied' : activeTab}
                    onUpdate={fetchJobs}
                  />
                );
              })}

              {jobs.length > JOBS_PER_PAGE && (
                <div className="flex flex-col items-center gap-2 pt-4 border-t border-gray-300">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={(page) => {
                      setCurrentPage(page);
                      // No need to re-fetch - just change page display
                    }}
                    showAutoPlay={false}
                    showFirstLast
                  />
                  <div className="text-sm text-gray-700">
                    Trang {currentPage + 1} / {totalPages}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Card>
    </div>
  );
};
