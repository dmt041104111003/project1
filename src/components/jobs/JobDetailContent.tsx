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
  const [withdrawingApplication, setWithdrawingApplication] = useState(false);

  const getFreelancerFromOption = (value: any): string | null => {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (value?.vec && Array.isArray(value.vec) && value.vec.length > 0) {
      return value.vec[0];
    }
    return null;
  };

  const getLatestFreelancerFromMetadata = (): string | null => {
    if (!jobDetails) return null;
    const applicants = Array.isArray((jobDetails as any)?.applicants) ? (jobDetails as any).applicants : [];
    if (!applicants.length) return null;
    const latest = [...applicants]
      .sort((a: any, b: any) => {
        const aTime = new Date(a?.applied_at || 0).getTime();
        const bTime = new Date(b?.applied_at || 0).getTime();
        return bTime - aTime;
      })
      .find((applicant) => applicant?.freelancer_address);
    return latest?.freelancer_address || null;
  };

  const latestFreelancerAddress = getFreelancerFromOption(jobData?.freelancer) || getLatestFreelancerFromMetadata();
  const pendingFreelancerAddress = jobData?.pending_freelancer || null;

  useEffect(() => {
    const fetchJobDetails = async () => {
      if (!jobId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Query trực tiếp từ Aptos
        const { getParsedJobData } = await import('@/lib/aptosClient');
        const [jobData, ipfsRes] = await Promise.all([
          getParsedJobData(Number(jobId)),
          fetch(`/api/ipfs/job?jobId=${jobId}`),
        ]);
        
        if (!jobData) {
          throw new Error('Job not found');
        }
        setJobData(jobData);
        
        if (ipfsRes.ok) {
          const ipfsData = await ipfsRes.json();
          if (ipfsData.success && ipfsData.data) {
            setJobDetails(ipfsData.data);
          }
        }
      } catch (err: unknown) {
        const errorMsg = (err as Error).message || 'Không thể tải chi tiết công việc';
        setError(errorMsg);
        toast.error(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchJobDetails();
  }, [jobId]);

  useEffect(() => {
    if (!account) {
      setHasFreelancerRole(false);
      return;
    }
    (async () => {
      const { getUserRoles } = await import('@/lib/aptosClient');
      const { roles } = await getUserRoles(account);
      setHasFreelancerRole(roles.some((r: any) => r.name === 'freelancer'));
    })().catch(() => setHasFreelancerRole(false));
  }, [account]);

  const handleApply = async () => {
    if (!account || !hasFreelancerRole || !jobId) {
      toast.error('Bạn cần có role Người làm tự do để ứng tuyển công việc. Vui lòng đăng ký role Người làm tự do trước!');
      return;
    }

    try {
      setApplying(true);
      
      const { escrowHelpers } = await import('@/utils/contractHelpers');
      const payload = escrowHelpers.applyJob(Number(jobId));
      
      const wallet = (window as any).aptos;
      if (!wallet) {
        throw new Error('Không tìm thấy ví. Vui lòng kết nối ví trước.');
      }
      
      const tx = await wallet.signAndSubmitTransaction(payload);
      
      if (tx?.hash) {
        toast.success(`Ứng tuyển thành công! TX: ${tx.hash}`);
      } else {
        toast.success('Giao dịch ứng tuyển đã được gửi!');
      }
      
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: unknown) {
      toast.error(`Lỗi khi ứng tuyển: ${(err as Error)?.message || 'Lỗi không xác định'}`);
    } finally {
      setApplying(false);
    }
  };

  const handleWithdrawPendingApplication = async () => {
    if (!jobId || !account || !pendingFreelancerAddress || account.toLowerCase() !== pendingFreelancerAddress.toLowerCase()) {
      toast.error('Bạn không có ứng tuyển đang chờ duyệt để rút.');
      return;
    }
    try {
      setWithdrawingApplication(true);
      const { escrowHelpers } = await import('@/utils/contractHelpers');
      const payload = escrowHelpers.withdrawApplication(Number(jobId));
      const wallet = (window as any).aptos;
      if (!wallet) throw new Error('Không tìm thấy ví. Vui lòng kết nối ví trước.');
      const tx = await wallet.signAndSubmitTransaction(payload);
      toast.success(tx?.hash ? `Đã rút ứng tuyển! TX: ${tx.hash}` : 'Đã gửi yêu cầu rút ứng tuyển.');
      setTimeout(() => window.location.reload(), 2000);
    } catch (err: unknown) {
      toast.error(`Lỗi khi rút ứng tuyển: ${(err as Error)?.message || 'Lỗi không xác định'}`);
    } finally {
      setWithdrawingApplication(false);
    }
  };


  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-700 text-lg">Đang tải chi tiết công việc...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 text-lg">Lỗi: {error}</p>
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
          ← Quay lại danh sách công việc
        </Button>
        <h1 className="text-3xl font-bold text-blue-800 mb-2">Công việc #{String(jobId)}</h1>
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
                            Cột mốc {index + 1}
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
                            <div className="text-xs text-gray-600 mb-1">Hạn đánh giá</div>
                            <div className={`font-medium ${reviewDeadline * 1000 < Date.now() && statusStr === 'Submitted' ? 'text-orange-600' : 'text-gray-900'}`}>
                              {formatDeadline(reviewDeadline)}
                              {reviewDeadline * 1000 < Date.now() && statusStr === 'Submitted' && ' (Có thể yêu cầu hết hạn)'}
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
          latestFreelancerAddress={latestFreelancerAddress}
          pendingFreelancerAddress={pendingFreelancerAddress}
          withdrawingApplication={withdrawingApplication}
          onWithdrawApplication={handleWithdrawPendingApplication}
        />
      </div>
    </>
  );
};