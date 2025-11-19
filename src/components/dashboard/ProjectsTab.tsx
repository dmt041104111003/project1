"use client";

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { useWallet } from '@/contexts/WalletContext';
import { JobCard } from './JobCard';
import { Job } from '@/constants/escrow';

const JOBS_PER_PAGE = 1;

export const ProjectsTab: React.FC = () => {
  const { account } = useWallet();
  const [loading, setLoading] = useState(false);
  const [hasPosterRole, setHasPosterRole] = useState(false);
  const [hasFreelancerRole, setHasFreelancerRole] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeTab, setActiveTab] = useState<'posted' | 'applied'>('posted');
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    if (!account) {
      setHasPosterRole(false);
      setHasFreelancerRole(false);
      return;
    }
    const checkRoles = async () => {
      try {
        const res = await fetch(`/api/role?address=${encodeURIComponent(account)}`);
        if (!res.ok) {
          setHasPosterRole(false);
          setHasFreelancerRole(false);
          return;
        }
        const data = await res.json();
        const rolesData = data.roles || [];
        setHasPosterRole(rolesData.some((r: { name: string }) => r.name === 'poster'));
        setHasFreelancerRole(rolesData.some((r: { name: string }) => r.name === 'freelancer'));
      } catch {
        setHasPosterRole(false);
        setHasFreelancerRole(false);
      }
    };
    checkRoles();
  }, [account]);

  const fetchJobs = async () => {
    if (!account) {
      setJobs([]);
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
      const res = await fetch('/api/job/list');
      if (!res.ok) {
        setJobs([]);
        return;
      }
      
      const data = await res.json();
      const allJobs = data.jobs || [];
      
      const filteredJobs = allJobs.filter((job: Job) => {
        if (activeTab === 'posted') {
          return job.poster?.toLowerCase() === account.toLowerCase();
        } else {
          return job.freelancer?.toLowerCase() === account.toLowerCase();
        }
      });

      const jobsWithMetadata = await Promise.all(
        filteredJobs.map(async (job: Job) => {
          let enrichedJob: Job = job;
          try {
            const [detailRes, cidRes] = await Promise.all([
              fetch(`/api/job/${job.id}`),
              fetch(`/api/ipfs/job?jobId=${job.id}&decodeOnly=true`),
            ]);

            if (detailRes.ok) {
              const detailData = await detailRes.json();
              enrichedJob = { ...enrichedJob, ...detailData.job };
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
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <p className="text-xl text-gray-700">Vui lòng kết nối wallet</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Card variant="outlined" className="p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-blue-800 mb-2">Dự Án</h2>
          <p className="text-gray-700">Xem và quản lý dự án từ blockchain</p>
        </div>

        <div className="flex gap-2 mb-6 border-b border-gray-300">
          <button
            onClick={() => {
              setActiveTab('posted');
              setCurrentPage(0);
            }}
            className={`flex-1 py-2 px-4 font-bold transition-colors ${
              activeTab === 'posted'
                ? 'bg-blue-800 text-white border-b-2 border-blue-800'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            } ${!hasPosterRole ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={!hasPosterRole}
            title={!hasPosterRole ? 'Bạn cần có role Poster' : ''}
          >
            Jobs Đã Đăng ({jobs.filter(j => j.poster?.toLowerCase() === account?.toLowerCase()).length})
          </button>
          <button
            onClick={() => {
              setActiveTab('applied');
              setCurrentPage(0);
            }}
            className={`flex-1 py-2 px-4 font-bold transition-colors ${
              activeTab === 'applied'
                ? 'bg-blue-800 text-white border-b-2 border-blue-800'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            } ${!hasFreelancerRole ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={!hasFreelancerRole}
            title={!hasFreelancerRole ? 'Bạn cần có role Freelancer' : ''}
          >
            Jobs Đã Apply ({jobs.filter(j => j.freelancer?.toLowerCase() === account?.toLowerCase()).length})
          </button>
        </div>

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
            <div className="text-center py-8">
              <p className="text-gray-700">Đang tải dự án...</p>
            </div>
          ) : (activeTab === 'posted' && !hasPosterRole) ? (
            <div className="text-center py-8 border border-gray-300 bg-gray-50 rounded">
              <p className="text-gray-700 mb-2">Bạn cần có role Poster để xem jobs đã đăng.</p>
              <p className="text-sm text-gray-600">Vui lòng đăng ký role Poster trong trang Role.</p>
            </div>
          ) : (activeTab === 'applied' && !hasFreelancerRole) ? (
            <div className="text-center py-8 border border-gray-300 bg-gray-50 rounded">
              <p className="text-gray-700 mb-2">Bạn cần có role Freelancer để xem jobs đã apply.</p>
              <p className="text-sm text-gray-600">Vui lòng đăng ký role Freelancer trong trang Role.</p>
            </div>
          ) : displayedJobs.length === 0 ? (
            <div className="text-center py-8 border border-gray-300 bg-gray-50 rounded">
              <p className="text-gray-700">
                {activeTab === 'posted' 
                  ? 'Bạn chưa đăng job nào.' 
                  : 'Bạn chưa apply job nào.'}
              </p>
            </div>
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
