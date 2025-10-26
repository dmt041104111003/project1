"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Container } from '@/components/ui/container';
import { Header } from '@/components/landing/header';
import { Footer } from '@/components/landing/footer';
import { toast } from 'sonner';

const sha256Hex = async (s: string): Promise<string> => {
  const enc = new TextEncoder();
  const data = enc.encode(s);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const bytes = Array.from(new Uint8Array(hash));
  return '0x' + bytes.map(b => b.toString(16).padStart(2, '0')).join('');
};

const getWalletAccount = async () => {
  const wallet = (window as any).aptos;
  if (!wallet) throw new Error('Wallet not found. Please connect your wallet first.');
  const account = await wallet.account();
  if (!account) throw new Error('Please connect your wallet first.');
  const accountAddress = typeof account === 'string' ? account : account.address;
  if (!accountAddress) throw new Error('Invalid account format. Please reconnect your wallet.');
  return { wallet, accountAddress };
};

export default function JobDetailPage() {
  const params = useParams();
  const jobId = params.id;
  
  const [job, setJob] = useState<any>(null);
  const [jobDetails, setJobDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [milestoneExpired, setMilestoneExpired] = useState(false);

  useEffect(() => {
    const fetchJobDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const jobResponse = await fetch(`/api/job/detail?id=${jobId}`);
        const jobData = await jobResponse.json();
        
        if (!jobData.success) {
          throw new Error(jobData.error || 'Failed to fetch job');
        }
        
        setJob(jobData.job);
        
        if (jobData.job.worker_commitment && jobData.job.approved) {
          try {
            const currentMilestone = parseInt(jobData.job.current_milestone) || 0;
            const expiryCheck = await fetch(`/api/job/check-expiry?job_id=${jobId}&milestone_index=${currentMilestone}`);
            const expiryData = await expiryCheck.json();
            if (expiryData.success && expiryData.is_expired) {
              setMilestoneExpired(true);
            }
          } catch (expiryError) {
            // Handle expiry check errors silently
          }
        }
        
        if (jobData.job.cid) {
          try {
            const ipfsGateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs';
            const ipfsResponse = await fetch(`${ipfsGateway}/${jobData.job.cid}`);
            if (ipfsResponse.ok) {
              const jobDetailsData = await ipfsResponse.json();
              setJobDetails(jobDetailsData);
            }
          } catch (ipfsError) {
            // Handle IPFS fetch errors silently
          }
        }
        
      } catch (err: any) {
        setError(err.message || 'Failed to fetch job details');
      } finally {
        setLoading(false);
      }
    };

    if (jobId) {
      fetchJobDetails();
    }
  }, [jobId]);

  const handleAction = async (action: 'apply' | 'submit') => {
    try {
      setApplying(true);
      
      const { wallet, accountAddress } = await getWalletAccount();
      const userCommitment = await sha256Hex(accountAddress);
      
      if (action === 'apply') {
        const profileCheck = await fetch(`/api/ipfs/get?type=profile&commitment=${userCommitment}`);
        const profileData = await profileCheck.json();
        
        if (!profileData.success || !profileData.profile_data) {
          throw new Error(`No profile found for account ${accountAddress}. 

You have two options:
1. Create a new profile with your current account: Go to /auth/did-verification
2. Switch to the account that already has a profile

Current account: ${accountAddress}
Generated commitment: ${userCommitment}`);
        }
        
        const hasFreelancerRole = profileData.blockchain_roles && profileData.blockchain_roles.includes(1);
        if (!hasFreelancerRole) {
          throw new Error('You need to have freelancer role to apply for jobs. Please update your profile to include freelancer role.');
        }
        
        const bannedCheck = await fetch(`/api/job/check-banned?job_id=${jobId}&worker_commitment=${userCommitment}`);
        const bannedData = await bannedCheck.json();
        
        if (bannedData.success && bannedData.is_banned) {
          throw new Error('You are banned from this job. You cannot apply again.');
        }
        
        const response = await fetch('/api/job/actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'apply',
            job_id: parseInt(jobId as string),
            user_address: accountAddress,
            user_commitment: userCommitment
          })
        });
        
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Failed to prepare application');
        }
        
        const tx = await wallet.signAndSubmitTransaction(data.payload);
        const hash = tx?.hash || '';
        
        toast.success(hash ? `Application submitted successfully! Transaction: ${hash}` : 'Application submitted successfully!');
        if (hash) window.location.reload();
        
      } else if (action === 'submit') {
        let milestoneIndex = parseInt(job.current_milestone);
        if (isNaN(milestoneIndex)) {
          milestoneIndex = parseInt(job.current_milestone || '0');
          if (isNaN(milestoneIndex)) {
            throw new Error('Invalid milestone index. Please refresh the page and try again.');
          }
        }
        
        const milestoneData = {
          milestone_index: milestoneIndex,
          description: `Milestone ${milestoneIndex + 1} submission`,
          timestamp: new Date().toISOString(),
          worker_commitment: job.worker_commitment
        };
        
        const uploadResponse = await fetch('/api/ipfs/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...milestoneData, type: 'milestone' })
        });
        
        const uploadData = await uploadResponse.json();
        if (!uploadData.success) {
          throw new Error(uploadData.error || 'Failed to upload milestone data');
        }
        
        const submitData = {
          action: 'submit',
          user_address: accountAddress,
          user_commitment: userCommitment,
          job_id: parseInt(jobId as string),
          milestone_index: milestoneIndex,
          cid: uploadData.ipfsHash
        };
        
        const response = await fetch('/api/job/actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitData)
        });
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to submit milestone');
        }
        
        const tx = await wallet.signAndSubmitTransaction(data.payload);
        const hash = tx?.hash || '';
        
        toast.success(hash ? `Milestone submitted successfully! Transaction: ${hash}` : 'Milestone submitted successfully!');
        if (hash) window.location.reload();
      }
      
    } catch (err: any) {
      toast.error(`${action === 'apply' ? 'Application' : 'Milestone submission'} failed: ${err.message}`);
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 pt-20">
          <Container>
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-text-secondary text-lg mt-4">Loading job details...</p>
            </div>
          </Container>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 pt-20">
          <Container>
            <div className="text-center py-12">
              <p className="text-red-500 text-lg">Error: {error}</p>
            </div>
          </Container>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 pt-20">
        <Container>
          <div className="mb-8">
            <button 
              onClick={() => window.history.back()}
              className="text-primary hover:text-primary/80 mb-4 flex items-center gap-2 transition-colors"
            >
              ← Back to Jobs
            </button>
            <h1 className="text-4xl lg:text-6xl font-bold text-text-primary mb-4 leading-tight">
              <span className="text-primary block">Job #{job?.id}</span>
            </h1>
          </div>

          {job && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200">
                  {jobDetails ? (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                          {jobDetails.title || 'Untitled Job'}
                        </h2>
                        <p className="text-gray-600">
                          {jobDetails.description || 'No description provided'}
                        </p>
                      </div>
                      {jobDetails.requirements && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">Requirements</h3>
                          <p className="text-gray-600">{jobDetails.requirements}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500">Job details not available</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Job Status</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Status:</span>
                      <span className={`font-medium ${
                        job.status === 'active' ? 'text-green-600' :
                        job.status === 'in_progress' ? 'text-blue-600' :
                        job.status === 'completed' ? 'text-gray-600' : 'text-yellow-600'
                      }`}>{job.status}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Budget:</span>
                      <span className="font-medium text-gray-900">{job.budget} APT</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Milestones:</span>
                      <span className="font-medium text-gray-900">{job.milestones?.length || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Worker:</span>
                      <span className={`font-medium ${job.worker_commitment ? 'text-green-600' : 'text-gray-600'}`}>
                        {job.worker_commitment ? 'Assigned' : 'Open'}
                      </span>
                    </div>
                  </div>
                </div>

                {job.milestones && job.milestones.length > 0 && (
                  <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Milestones</h3>
                    <div className="space-y-2">
                      {job.milestones.map((amount: number, index: number) => (
                        <div key={index} className="flex justify-between text-sm items-center">
                          <span className="text-gray-500">Milestone {index + 1}:</span>
                          <span className="font-medium text-gray-900">{(amount / 100_000_000).toFixed(2)} APT</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {milestoneExpired && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-red-600">
                      <span className="font-medium">Milestone Expired</span>
                    </div>
                    <p className="text-red-600 text-sm mt-1">
                      The current milestone deadline has passed. The job will be reset and reopened for new applications.
                    </p>
                  </div>
                )}

                {(job.status === 'active' || job.status === 'pending_approval') && !job.worker_commitment && (
                  <button 
                    onClick={() => handleAction('apply')}
                    disabled={applying}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-xl font-semibold text-lg shadow-lg border-2 border-blue-500 hover:shadow-xl hover:from-blue-700 hover:to-purple-700 hover:border-blue-600 transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {applying ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Applying...
                      </span>
                    ) : (
                      'Apply for Job'
                    )}
                  </button>
                )}

                {job.worker_commitment && job.status === 'in_progress' && (
                  <button 
                    onClick={() => handleAction('submit')}
                    disabled={applying}
                    className="w-full bg-gradient-to-r from-green-600 to-teal-600 text-white py-4 px-6 rounded-xl font-semibold text-lg shadow-lg border-2 border-green-500 hover:shadow-xl hover:from-green-700 hover:to-teal-700 hover:border-green-600 transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {applying ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Submitting...
                      </span>
                    ) : (
                      'Submit Milestone'
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </Container>
      </main>
      <Footer />
    </div>
  );
}