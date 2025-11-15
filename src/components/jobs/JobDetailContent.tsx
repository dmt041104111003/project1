"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/contexts/WalletContext';
import { toast } from 'sonner';
import { JobIPFSContent } from './JobIPFSContent';
import { JobSidebar } from './JobSidebar';

export const JobDetailContent: React.FC = () => {
  const params = useParams();
  const jobId = params.id;
  const { account } = useWallet();
  
  const [jobDetails, setJobDetails] = useState<Record<string, unknown> | null>(null);
  const [jobData, setJobData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasFreelancerRole, setHasFreelancerRole] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    const fetchJobDetails = async () => {
      if (!jobId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const jobRes = await fetch(`/api/job/${jobId}`);
        if (!jobRes.ok) {
          throw new Error('Job not found');
        }
        
        const jobResData = await jobRes.json();
        const cid = jobResData.job?.cid;
        
        if (!cid) {
          throw new Error('Job CID not found');
        }
        
        setJobData(jobResData.job);
        
        const res = await fetch(`/api/ipfs/get?cid=${encodeURIComponent(cid)}`);
        const data = await res.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch job details from IPFS');
        }
        
        if (data.data) {
          setJobDetails(data.data);
        }
      } catch (err: unknown) {
        const errorMsg = (err as Error).message || 'Failed to fetch job details';
        setError(errorMsg);
        toast.error(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchJobDetails();
  }, [jobId]);

  // Check freelancer role from table
  useEffect(() => {
    if (!account) {
      setHasFreelancerRole(false);
      return;
    }
    fetch(`/api/role?address=${encodeURIComponent(account)}`)
      .then(res => res.json())
      .then(data => {
        const rolesData = data.roles || [];
        setHasFreelancerRole(rolesData.some((r: any) => r.name === 'freelancer'));
      })
      .catch(() => setHasFreelancerRole(false));
  }, [account]);

  const handleApply = async () => {
    if (!account || !hasFreelancerRole || !jobId) {
      toast.error('Bạn cần có role Freelancer để apply job. Vui lòng đăng ký role Freelancer trước!');
      return;
    }

    try {
      setApplying(true);
      
      const { escrowHelpers } = await import('@/utils/contractHelpers');
      const payload = escrowHelpers.applyJob(Number(jobId));
      
      // Sign and submit transaction
      const wallet = (window as any).aptos;
      if (!wallet) {
        throw new Error('Wallet not found. Please connect your wallet first.');
      }
      
      const tx = await wallet.signAndSubmitTransaction(payload);
      
      if (tx?.hash) {
        toast.success(`Apply thành công! TX: ${tx.hash}`);
      } else {
        toast.success('Apply transaction đã được gửi!');
      }
      
      // Reload job data to update state
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: unknown) {
      console.error('[JobDetailContent] Error applying:', err);
      toast.error(`Lỗi khi apply: ${(err as Error)?.message || 'Unknown error'}`);
    } finally {
      setApplying(false);
    }
  };


  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-700 text-lg">Loading job details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 text-lg">Error: {error}</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <Button 
          onClick={() => window.history.back()}
          variant="outline"
          size="sm"
          className="mb-4"
        >
          ← Back to Jobs
        </Button>
        <h1 className="text-3xl font-bold text-blue-800 mb-2">Job #{String(jobId)}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <JobIPFSContent jobDetails={jobDetails} />
          {jobData?.milestones && Array.isArray(jobData.milestones) && jobData.milestones.length > 0 && (
            <div className="bg-white border-2 border-gray-400 rounded-lg p-6">
              <h2 className="text-xl font-bold text-blue-800 mb-4">Cột mốc dự án ({jobData.milestones.length})</h2>
              <div className="space-y-4">
                {jobData.milestones.map((milestone: any, index: number) => {
                  const amount = Number(milestone.amount || 0) / 100_000_000;
                  const duration = Number(milestone.duration || 0);
                  const reviewPeriod = Number(milestone.review_period || 0);
                  const deadline = Number(milestone.deadline || 0);
                  const reviewDeadline = Number(milestone.review_deadline || 0);
                  
                  const formatSeconds = (seconds: number) => {
                    if (!seconds) return 'N/A';
                    const days = Math.floor(seconds / 86400);
                    const hours = Math.floor((seconds % 86400) / 3600);
                    if (days > 0) return `${days} ngày${hours > 0 ? ` ${hours} giờ` : ''}`;
                    if (hours > 0) return `${hours} giờ`;
                    const minutes = Math.floor((seconds % 3600) / 60);
                    return minutes > 0 ? `${minutes} phút` : `${seconds} giây`;
                  };

                  const formatDeadline = (timestamp: number) => {
                    if (!timestamp) return 'Chưa set';
                    const date = new Date(timestamp * 1000);
                    return date.toLocaleString('vi-VN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });
                  };

                  const getStatusColor = (status: any) => {
                    const statusStr = typeof status === 'string' ? status : 
                      (status?.vec && Array.isArray(status.vec) && status.vec.length > 0 ? String(status.vec[0]) : 
                      (status?.__variant__ ? String(status.__variant__) : 'Pending'));
                    switch (statusStr) {
                      case 'Accepted': return 'bg-green-100 text-green-800 border-green-300';
                      case 'Submitted': return 'bg-blue-100 text-blue-800 border-blue-300';
                      case 'Locked': return 'bg-red-100 text-red-800 border-red-300';
                      default: return 'bg-gray-100 text-gray-800 border-gray-300';
                    }
                  };

                  const parseEvidenceCid = (evidence: any): string | null => {
                    if (!evidence) return null;
                    if (typeof evidence === 'string') return evidence;
                    if (evidence.vec && Array.isArray(evidence.vec) && evidence.vec.length > 0) {
                      return evidence.vec[0];
                    }
                    return null;
                  };

                  const parseStatus = (status: any): string => {
                    if (typeof status === 'string') return status;
                    if (status?.vec && Array.isArray(status.vec) && status.vec.length > 0) {
                      return String(status.vec[0]);
                    }
                    if (status?.__variant__) return String(status.__variant__);
                    return 'Pending';
                  };

                  const statusStr = parseStatus(milestone.status);
                  const evidenceCidStr = parseEvidenceCid(milestone.evidence_cid);

                  return (
                    <div key={index} className="border-2 border-gray-300 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-bold text-lg text-gray-900">
                            Milestone {index + 1}
                          </h3>
                          <span className={`inline-block px-2 py-1 text-xs font-bold border-2 rounded ${getStatusColor(statusStr)}`}>
                            {statusStr}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-blue-800">
                            {amount.toFixed(3)} APT
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-xs text-gray-600 mb-1">Thời gian hoàn thành</div>
                          <div className="font-medium text-gray-900">
                            {formatSeconds(duration)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600 mb-1">Thời gian review</div>
                          <div className="font-medium text-gray-900">
                            {formatSeconds(reviewPeriod)}
                          </div>
                        </div>
                        {deadline > 0 && (
                          <div>
                            <div className="text-xs text-gray-600 mb-1">Deadline hoàn thành</div>
                            <div className={`font-medium ${deadline * 1000 < Date.now() && statusStr !== 'Accepted' ? 'text-red-600' : 'text-gray-900'}`}>
                              {formatDeadline(deadline)}
                              {deadline * 1000 < Date.now() && statusStr !== 'Accepted' && ' (Quá hạn)'}
                            </div>
                          </div>
                        )}
                        {reviewDeadline > 0 && (
                          <div>
                            <div className="text-xs text-gray-600 mb-1">Deadline review</div>
                            <div className={`font-medium ${reviewDeadline * 1000 < Date.now() && statusStr === 'Submitted' ? 'text-orange-600' : 'text-gray-900'}`}>
                              {formatDeadline(reviewDeadline)}
                              {reviewDeadline * 1000 < Date.now() && statusStr === 'Submitted' && ' (Có thể claim timeout)'}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <JobSidebar
          jobData={jobData}
          account={account}
          hasFreelancerRole={hasFreelancerRole}
          applying={applying}
          onApply={handleApply}
        />
      </div>
    </>
  );
};