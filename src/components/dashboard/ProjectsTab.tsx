"use client";

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/contexts/WalletContext';

interface Job {
  id: number;
  cid: string;
  poster: string;
  freelancer: string | null;
  total_amount: number;
  milestones_count: number;
  has_freelancer: boolean;
  state: string;
}

export const ProjectsTab: React.FC = () => {
  const { account } = useWallet();
  const [loading, setLoading] = useState(false);
  const [hasPosterRole, setHasPosterRole] = useState(false);
  const [hasFreelancerRole, setHasFreelancerRole] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeTab, setActiveTab] = useState<'posted' | 'applied'>('posted');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // Check user roles
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
        setHasPosterRole(rolesData.some((r: any) => r.name === 'poster'));
        setHasFreelancerRole(rolesData.some((r: any) => r.name === 'freelancer'));
      } catch {
        setHasPosterRole(false);
        setHasFreelancerRole(false);
      }
    };
    checkRoles();
  }, [account]);

  // Fetch jobs from table
  const fetchJobs = async () => {
    if (!account) {
      setJobs([]);
      return;
    }

    // Check role for current tab
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
      const res = await fetch('/api/job?list=true');
      if (!res.ok) {
        setJobs([]);
        return;
      }
      
      const data = await res.json();
      const allJobs = data.jobs || [];
      
      // Filter jobs: posted = jobs where poster === account, applied = jobs where freelancer === account
      const filteredJobs = allJobs.filter((job: Job) => {
        if (activeTab === 'posted') {
          return job.poster?.toLowerCase() === account.toLowerCase();
        } else {
          return job.freelancer?.toLowerCase() === account.toLowerCase();
        }
      });

      setJobs(filteredJobs);
    } catch (err) {
      console.error('[ProjectsTab] Error fetching jobs:', err);
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

  if (!account) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <p className="text-xl text-gray-700">Vui lòng kết nối wallet</p>
      </div>
    );
  }

  // Show tabs if user has at least one role
  const hasAnyRole = hasPosterRole || hasFreelancerRole;

  const displayedJobs = jobs.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.max(1, Math.ceil(jobs.length / pageSize));

  return (
    <div className="max-w-3xl mx-auto">
      <Card variant="outlined" className="p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-blue-800 mb-2">Dự Án</h2>
          <p className="text-gray-700">Xem và quản lý dự án từ blockchain</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-300">
          <button
            onClick={() => {
              setActiveTab('posted');
              setCurrentPage(1);
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
              setCurrentPage(1);
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

        {/* Refresh Button */}
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

        {/* Jobs List */}
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
                <div key={job.id} className="border border-gray-400 bg-gray-50 p-4 rounded">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-blue-800">Job #{job.id}</h3>
                    <span className={`px-2 py-1 text-xs font-bold border-2 ${
                      (typeof job.state === 'string' && job.state === 'Posted') ? 'bg-green-100 text-green-800 border-green-300' :
                      (typeof job.state === 'string' && job.state === 'InProgress') ? 'bg-blue-100 text-blue-800 border-blue-300' :
                      (typeof job.state === 'string' && job.state === 'Completed') ? 'bg-gray-100 text-gray-800 border-gray-300' :
                      (typeof job.state === 'string' && job.state === 'Disputed') ? 'bg-red-100 text-red-800 border-red-300' :
                      'bg-gray-100 text-gray-800 border-gray-300'
                    }`}>
                      {(typeof job.state === 'string' && job.state === 'Posted') ? 'Open' :
                       (typeof job.state === 'string' && job.state === 'InProgress') ? 'In Progress' :
                       (typeof job.state === 'string' && job.state === 'Completed') ? 'Completed' :
                       (typeof job.state === 'string' && job.state === 'Disputed') ? 'Disputed' :
                       (typeof job.state === 'string' ? job.state : 'Active')}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-gray-600 break-all">CID: {job.cid}</p>
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
                      <div><span className="font-bold">Poster:</span> {job.poster ? `${job.poster.substring(0, 6)}...${job.poster.substring(job.poster.length - 4)}` : '-'}</div>
                      <div><span className="font-bold">Freelancer:</span> {job.freelancer ? `${job.freelancer.substring(0, 6)}...${job.freelancer.substring(job.freelancer.length - 4)}` : '-'}</div>
                      <div><span className="font-bold">Total:</span> {job.total_amount ? `${(job.total_amount / 100_000_000).toFixed(2)} APT` : '-'}</div>
                      <div><span className="font-bold">Milestones:</span> {job.milestones_count || 0}</div>
                      <div><span className="font-bold">Assigned:</span> {job.has_freelancer ? 'Yes' : 'No'}</div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Pagination */}
              {jobs.length > pageSize && (
                <div className="flex items-center justify-between gap-4 pt-4 border-t border-gray-300">
                  <Button 
                    variant="outline" 
                    disabled={currentPage === 1} 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                    className="!bg-white !text-black !border-2 !border-black py-2 px-4"
                  >
                    Trước
                  </Button>
                  <div className="text-sm text-gray-700">
                    Trang {currentPage} / {totalPages}
                  </div>
                  <Button 
                    variant="outline" 
                    disabled={currentPage >= totalPages} 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                    className="!bg-white !text-black !border-2 !border-black py-2 px-4"
                  >
                    Sau
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </Card>
    </div>
  );
};
