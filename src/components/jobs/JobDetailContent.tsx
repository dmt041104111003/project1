"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useWallet } from '@/contexts/WalletContext';
import { toast } from 'sonner';

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
        
        // Get job from table first to get CID
        const jobRes = await fetch(`/api/job?job_id=${jobId}`);
        if (!jobRes.ok) {
          throw new Error('Job not found');
        }
        
        const jobResData = await jobRes.json();
        const cid = jobResData.job?.cid;
        
        if (!cid) {
          throw new Error('Job CID not found');
        }
        
        // Store job data (including apply_deadline)
        setJobData(jobResData.job);
        
        // Fetch IPFS data using CID directly
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
      
      // Get transaction payload from API
      const res = await fetch('/api/job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'apply',
          job_id: Number(jobId)
        })
      });
      
      const payload = await res.json();
      if (payload.error) {
        throw new Error(payload.error);
      }
      
      // Sign and submit transaction
      const wallet = (window as any).aptos;
      if (!wallet) {
        throw new Error('Wallet not found. Please connect your wallet first.');
      }
      
      const tx = await wallet.signAndSubmitTransaction({
        type: "entry_function_payload",
        function: payload.function,
        type_arguments: payload.type_args || [],
        arguments: payload.args
      });
      
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
        {/* Main Content - IPFS Data */}
        <div className="lg:col-span-2">
          <Card variant="outlined" className="p-8">
            {jobDetails ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-blue-800 mb-2">
                    {String(jobDetails.title || 'Untitled Job')}
                  </h2>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {String(jobDetails.description || 'No description provided')}
                  </p>
                </div>
                {(jobDetails as any).requirements && (
                  <div>
                    <h3 className="text-lg font-bold text-blue-800 mb-2">Requirements</h3>
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {Array.isArray((jobDetails as any).requirements)
                        ? (jobDetails as any).requirements.join(', ')
                        : String((jobDetails as any).requirements)}
                    </p>
                  </div>
                )}
                {(jobDetails as any).budget && (
                  <div>
                    <h3 className="text-lg font-bold text-blue-800 mb-2">Budget</h3>
                    <p className="text-gray-700">{String((jobDetails as any).budget)}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">Job details not available</p>
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar - Blockchain Data */}
        <div className="space-y-6">
          <Card variant="outlined" className="p-6">
            <h3 className="text-lg font-bold text-blue-800 mb-4">Thông tin Job</h3>
            <div className="space-y-4">
              {jobData?.total_escrow && (
                <div>
                  <div className="text-xs text-gray-600 mb-1">Tổng giá trị</div>
                  <div className="text-sm font-bold text-gray-900">
                    {(Number(jobData.total_escrow) / 100_000_000).toFixed(2)} APT
                  </div>
                </div>
              )}
              {jobData?.milestones && (
                <div>
                  <div className="text-xs text-gray-600 mb-1">Số cột mốc</div>
                  <div className="text-sm font-bold text-gray-900">
                    {Array.isArray(jobData.milestones) ? jobData.milestones.length : 0}
                  </div>
                </div>
              )}
              {jobData?.state && (() => {
                // Parse state similar to apply button logic
                let stateStr = 'Posted';
                if (typeof jobData.state === 'string') {
                  stateStr = jobData.state;
                } else if (jobData.state && typeof jobData.state === 'object') {
                  if (jobData.state.vec && Array.isArray(jobData.state.vec) && jobData.state.vec.length > 0) {
                    stateStr = String(jobData.state.vec[0]);
                  } else if (jobData.state.__variant__) {
                    stateStr = String(jobData.state.__variant__);
                  }
                }
                
                // Check if user is freelancer of this job
                let isFreelancerOfJob = false;
                if (account && jobData.freelancer) {
                  const freelancerAddr = typeof jobData.freelancer === 'string' 
                    ? jobData.freelancer 
                    : (jobData.freelancer?.vec && jobData.freelancer.vec[0]) || null;
                  if (freelancerAddr) {
                    isFreelancerOfJob = account.toLowerCase() === freelancerAddr.toLowerCase();
                  }
                }
                
                // Only show "Cancelled" to the freelancer, others see "Open"
                const displayState = (stateStr === 'Cancelled' && !isFreelancerOfJob) ? 'Posted' : stateStr;
                const displayText = displayState === 'Posted' ? 'Open' :
                                    displayState === 'InProgress' ? 'In Progress' :
                                    displayState === 'Completed' ? 'Completed' :
                                    displayState === 'Disputed' ? 'Disputed' :
                                    displayState === 'Cancelled' ? 'Cancelled' :
                                    displayState || 'Active';
                
                return (
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Trạng thái</div>
                    <div>
                      <span className={`px-2 py-1 text-xs font-bold border-2 ${
                        displayState === 'Cancelled' ? 'bg-orange-100 text-orange-800 border-orange-300' :
                        displayState === 'Posted' ? 'bg-green-100 text-green-800 border-green-300' :
                        displayState === 'InProgress' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                        displayState === 'Completed' ? 'bg-gray-100 text-gray-800 border-gray-300' :
                        displayState === 'Disputed' ? 'bg-red-100 text-red-800 border-red-300' :
                        'bg-gray-100 text-gray-800 border-gray-300'
                      }`}>
                        {displayText}
                      </span>
                    </div>
                  </div>
                );
              })()}
              {jobData?.poster && (
                <div>
                  <div className="text-xs text-gray-600 mb-1">Người đăng</div>
                  <div className="text-xs font-mono text-gray-700 break-all">
                    {jobData.poster}
                  </div>
                </div>
              )}
              {jobData?.freelancer && (
                <div>
                  <div className="text-xs text-gray-600 mb-1">Freelancer</div>
                  <div className="text-xs font-mono text-gray-700 break-all">
                    {typeof jobData.freelancer === 'string' 
                      ? jobData.freelancer
                      : (jobData.freelancer?.vec && jobData.freelancer.vec[0]) || 'Chưa có'}
                  </div>
                </div>
              )}
              {jobData?.apply_deadline && (
                <div>
                  <div className="text-xs text-gray-600 mb-1">Hạn đăng ký</div>
                  <div className={`text-sm font-bold ${
                    Number(jobData.apply_deadline) * 1000 < Date.now() ? 'text-red-600' : 'text-gray-900'
                  }`}>
                    {(() => {
                      const deadline = Number(jobData.apply_deadline);
                      const date = new Date(deadline * 1000);
                      const isExpired = deadline * 1000 < Date.now();
                      return (
                        <>
                          {date.toLocaleString('vi-VN', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                          {isExpired && ' (Hết hạn)'}
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Apply Button */}
          {jobData && (
            <Card variant="outlined" className="p-6 bg-white">
              {!account ? (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-900 mb-2 font-medium">Vui lòng kết nối wallet để apply</p>
                </div>
              ) : !hasFreelancerRole ? (
                <div className="text-center py-4">
                  <p className="text-sm text-red-700 mb-2 font-bold">Bạn cần có role Freelancer để apply job</p>
                  <Button
                    onClick={() => window.location.href = '/auth/did-verification'}
                    variant="outline"
                    size="sm"
                    className="mt-2"
                  >
                    Đăng ký role Freelancer
                  </Button>
                </div>
              ) : (() => {
                // Parse freelancer - API should already parse it, but check anyway
                let hasFreelancer = false;
                if (jobData.freelancer) {
                  if (typeof jobData.freelancer === 'string') {
                    hasFreelancer = true;
                  } else if (jobData.freelancer.vec && Array.isArray(jobData.freelancer.vec) && jobData.freelancer.vec.length > 0) {
                    hasFreelancer = true;
                  }
                }
                
                // Parse state - API should already parse it to string, but ensure it's a string
                let stateStr = 'Posted';
                if (typeof jobData.state === 'string') {
                  stateStr = jobData.state;
                } else if (jobData.state && typeof jobData.state === 'object') {
                  if (jobData.state.vec && Array.isArray(jobData.state.vec) && jobData.state.vec.length > 0) {
                    stateStr = String(jobData.state.vec[0]);
                  } else if (jobData.state.__variant__) {
                    stateStr = String(jobData.state.__variant__);
                  }
                }
                
                const isPosted = stateStr === 'Posted';
                const isExpired = jobData.apply_deadline && Number(jobData.apply_deadline) * 1000 < Date.now();
                
                console.log('[JobDetailContent] Apply button check:', { 
                  stateStr, 
                  isPosted, 
                  hasFreelancer, 
                  isExpired, 
                  applyDeadline: jobData.apply_deadline
                });
                
                if (!isPosted) {
                  return (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-900 font-medium">Job không còn ở trạng thái Open (state: {stateStr})</p>
                    </div>
                  );
                }
                
                if (hasFreelancer) {
                  return (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-900 font-medium">Job đã có freelancer</p>
                    </div>
                  );
                }
                
                if (isExpired) {
                  return (
                    <div className="text-center py-4">
                      <p className="text-sm text-red-700 font-bold">Đã hết hạn apply</p>
                    </div>
                  );
                }
                
                return (
                  <Button
                    onClick={handleApply}
                    disabled={applying}
                    size="lg"
                    className="w-full bg-blue-800 text-black hover:bg-blue-900 disabled:bg-blue-400 disabled:text-white py-4 text-lg font-bold"
                  >
                    {applying ? 'Đang apply...' : 'Apply Job'}
                  </Button>
                );
              })()}
            </Card>
          )}
        </div>
      </div>
    </>
  );
};
