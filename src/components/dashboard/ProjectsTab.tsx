"use client";

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { useWallet } from '@/contexts/WalletContext';
import { JobCard } from './JobCard';
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
  const [activeTab, setActiveTab] = useState<'posted' | 'applied'>(hasPosterRole ? 'posted' : 'applied');
  const [currentPage, setCurrentPage] = useState(0);
  const [postedCount, setPostedCount] = useState(0);
  const [appliedCount, setAppliedCount] = useState(0);

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
      // Query trực tiếp từ Aptos events
      const { getJobsList } = await import('@/lib/aptosClient');
      const jobsRes = await getJobsList(200);
      if (!jobsRes.ok) {
        throw new Error('Failed to fetch jobs');
      }
      const jobsData = await jobsRes.json();
      if (!jobsData.success) {
        throw new Error(jobsData.error || 'Failed to fetch jobs');
      }
      const allJobs = jobsData.jobs || [];
      
      const postedJobs = allJobs.filter((job: Job) => job.poster?.toLowerCase() === account.toLowerCase());
      const appliedJobs = allJobs.filter((job: Job) => {
        const freelancerMatch = job.freelancer?.toLowerCase() === account.toLowerCase();
        const pendingMatch = job.pending_freelancer?.toLowerCase() === account.toLowerCase();
        return freelancerMatch || pendingMatch;
      });

      setPostedCount(postedJobs.length);
      setAppliedCount(appliedJobs.length);

      const filteredJobs = activeTab === 'posted' ? postedJobs : appliedJobs;

        const jobsWithMetadata = await Promise.all(
        filteredJobs.map(async (job: Job) => {
          let enrichedJob: Job = job;
          try {
            const { getParsedJobData } = await import('@/lib/aptosClient');
            const [detailData, cidRes] = await Promise.all([
              getParsedJobData(job.id),
              fetch(`/api/ipfs/job?jobId=${job.id}&decodeOnly=true`),
            ]);

            if (detailData) {
              enrichedJob = { ...enrichedJob, ...detailData };
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

      setJobs(jobsWithMetadata);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (account) {
      fetchJobs();
    }
  }, [account, activeTab, hasPosterRole, hasFreelancerRole]);

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
    return <EmptyState message="Vui lòng kết nối wallet" />;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Card variant="outlined" className="p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-blue-800 mb-2">Dự Án</h2>
          <p className="text-gray-700">Xem và quản lý dự án từ blockchain</p>
        </div>

        <SegmentedTabs
          stretch
          className="w-full mb-6"
          tabs={[
            ...(hasPosterRole
              ? [{
                  value: 'posted' as const,
                  label: 'Công việc Đã Đăng',
                  badge: postedCount,
                }]
              : []),
            ...(hasFreelancerRole
              ? [{
                  value: 'applied' as const,
                  label: 'Công việc Đã Ứng tuyển',
                  badge: appliedCount,
                }]
              : []),
          ]}
          activeTab={activeTab}
          onChange={(value) => {
            setActiveTab(value as 'posted' | 'applied');
            setCurrentPage(0);
          }}
        />

        <div className="flex items-center justify-between gap-2 mb-4">
          <Button 
            onClick={fetchJobs} 
            variant="outline" 
            disabled={loading} 
            className="!bg-white !text-black !border-2 !border-black py-2 font-bold hover:!bg-gray-100"
          >
            {loading ? 'Đang tải...' : 'Làm mới'}
          </Button>
        </div>

        <div className="space-y-4">
          {loading && jobs.length === 0 ? (
            <LoadingState message="Đang tải dự án..." />
          ) : displayedJobs.length === 0 ? (
            <EmptyState
              message={
                activeTab === 'posted' 
                  ? 'Bạn chưa đăng job nào.' 
                  : 'Bạn chưa apply job nào.'
              }
            />
          ) : (
            <>
              {displayedJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  account={account}
                  activeTab={activeTab}
                  onUpdate={fetchJobs}
                />
              ))}

              {jobs.length > JOBS_PER_PAGE && (
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
            </>
          )}
        </div>
      </Card>
    </div>
  );
};
