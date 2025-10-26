"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

const sha256Hex = async (s: string): Promise<string> => {
  const enc = new TextEncoder();
  const data = enc.encode(s);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const bytes = Array.from(new Uint8Array(hash));
  return '0x' + bytes.map(b => b.toString(16).padStart(2, '0')).join('');
};

const getWalletAccount = async () => {
  const wallet = (window as { aptos: { 
    account: () => Promise<string | { address: string }>;
    signAndSubmitTransaction: (payload: unknown) => Promise<{ hash?: string }>;
  } }).aptos;
  if (!wallet) throw new Error('Wallet not found. Please connect your wallet first.');
  const account = await wallet.account();
  if (!account) throw new Error('Please connect your wallet first.');
  const accountAddress = typeof account === 'string' ? account : account.address;
  if (!accountAddress) throw new Error('Invalid account format. Please reconnect your wallet.');
  return { wallet, accountAddress };
};

export const JobDetailContent: React.FC = () => {
  const params = useParams();
  const jobId = params.id;
  
  const [job, setJob] = useState<{
    id: number;
    cid: string;
    milestones: number[];
    worker_commitment: unknown;
    poster_commitment?: unknown;
    approved: boolean;
    active: boolean;
    completed: boolean;
    application_deadline: number;
    budget: number;
    status: string;
    current_milestone: number;
    created_at: string;
  } | null>(null);
  const [jobDetails, setJobDetails] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [milestoneExpired, setMilestoneExpired] = useState(false);
  const [showBlockchainInfo, setShowBlockchainInfo] = useState(false);

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
          } catch {
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
          } catch {
            // Handle IPFS fetch errors silently
          }
        }
        
      } catch (err: unknown) {
        setError((err as Error).message || 'Failed to fetch job details');
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
        if (!job) throw new Error('Job not found');
        let milestoneIndex = typeof job.current_milestone === 'string' ? parseInt(job.current_milestone) : job.current_milestone;
        if (isNaN(milestoneIndex)) {
          milestoneIndex = 0;
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
      
    } catch (err: unknown) {
      toast.error(`${action === 'apply' ? 'Application' : 'Milestone submission'} failed: ${(err as Error).message}`);
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
        <h1 className="text-3xl font-bold text-blue-800 mb-2">Job #{job?.id}</h1>
      </div>

      {job && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          <div className="lg:col-span-2 space-y-6">
            <Card variant="outlined" className="p-8">
              {jobDetails ? (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-blue-800 mb-2">
                      {String(jobDetails.title) || 'Untitled Job'}
                    </h2>
                    <p className="text-gray-700">
                      {String(jobDetails.description) || 'No description provided'}
                    </p>
                  </div>
                  {!!jobDetails.requirements && (
                    <div>
                      <h3 className="text-lg font-bold text-blue-800 mb-2">Requirements</h3>
                      <p className="text-gray-700">{String(jobDetails.requirements)}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600">Job details not available</p>
                </div>
              )}
            </Card>

            {/* Blockchain Information */}
            <Card variant="outlined" className="p-6">
              <div 
                className="flex justify-between items-center cursor-pointer mb-4"
                onClick={() => setShowBlockchainInfo(!showBlockchainInfo)}
              >
                <h3 className="text-lg font-bold text-blue-800">Blockchain Information</h3>
                <span className="text-blue-800 text-lg">
                  {showBlockchainInfo ? '−' : '+'}
                </span>
              </div>
              {showBlockchainInfo && (
                <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Job ID:</span>
                  <span className="font-bold text-gray-900">#{job.id}</span>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="text-gray-700 text-sm">Contract Address:</span>
                  <span className="font-mono text-xs text-gray-600 break-all bg-gray-50 p-2 rounded">
                    {process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0xebad4f97504c15dfbc9fe1a2a393bfcc99e57eb8ef1c47d8d9ff93fd373f2ffa'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Network:</span>
                  <span className="font-bold text-gray-900">Aptos Testnet</span>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="text-gray-700 text-sm">IPFS CID:</span>
                  <span className="font-mono text-xs text-gray-600 break-all bg-gray-50 p-2 rounded">
                    {job.cid || 'N/A'}
                  </span>
                </div>
                {!!job.poster_commitment && (
                  <div className="flex flex-col space-y-1">
                    <span className="text-gray-700 text-sm">Poster Commitment:</span>
                    <span className="font-mono text-xs text-gray-600 break-all bg-gray-50 p-2 rounded">
                      {String(job.poster_commitment)}
                    </span>
                  </div>
                )}
                {!!job.worker_commitment && (
                  <div className="flex flex-col space-y-1">
                    <span className="text-gray-700 text-sm">Worker Commitment:</span>
                    <span className="font-mono text-xs text-gray-600 break-all bg-gray-50 p-2 rounded">
                      {String(job.worker_commitment)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Application Deadline:</span>
                  <span className="font-bold text-gray-900">
                    {job.application_deadline ? new Date(job.application_deadline * 1000).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Current Milestone:</span>
                  <span className="font-bold text-gray-900">{job.current_milestone || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Approved:</span>
                  <span className={`font-bold ${job.approved ? 'text-green-600' : 'text-red-600'}`}>
                    {job.approved ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Active:</span>
                  <span className={`font-bold ${job.active ? 'text-green-600' : 'text-red-600'}`}>
                    {job.active ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Completed:</span>
                  <span className={`font-bold ${job.completed ? 'text-green-600' : 'text-red-600'}`}>
                    {job.completed ? 'Yes' : 'No'}
                  </span>
                </div>
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-6">
            <Card variant="outlined" className="p-6">
              <h3 className="text-lg font-bold text-blue-800 mb-4">Job Status</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Status:</span>
                  <span className={`font-bold ${
                    job.status === 'active' ? 'text-blue-800' :
                    job.status === 'in_progress' ? 'text-blue-800' :
                    job.status === 'completed' ? 'text-blue-800' : 'text-blue-800'
                  }`}>{job.status}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Budget:</span>
                  <span className="font-bold text-gray-900">{job.budget} APT</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Milestones:</span>
                  <span className="font-bold text-gray-900">{job.milestones?.length || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Worker:</span>
                  <span className={`font-bold ${job.worker_commitment ? 'text-blue-800' : 'text-gray-600'}`}>
                    {job.worker_commitment ? 'Assigned' : 'Open'}
                  </span>
                </div>
              </div>
            </Card>

            {job.milestones && job.milestones.length > 0 && (
              <Card variant="outlined" className="p-6">
                <h3 className="text-lg font-bold text-blue-800 mb-4">Milestones</h3>
                <div className="space-y-2">
                  {job.milestones.map((amount: number, index: number) => (
                    <div key={index} className="flex justify-between text-sm items-center">
                      <span className="text-gray-700">Milestone {index + 1}:</span>
                      <span className="font-bold text-gray-900">{(amount / 100_000_000).toFixed(2)} APT</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {milestoneExpired && (
              <Card variant="outlined" className="p-4 border-2 border-red-500 bg-red-50">
                <div className="flex items-center gap-2 text-red-600">
                  <span className="font-bold">Milestone Expired</span>
                </div>
                <p className="text-red-600 text-sm mt-1">
                  The current milestone deadline has passed. The job will be reset and reopened for new applications.
                </p>
              </Card>
            )}

            {(job.status === 'active' || job.status === 'pending_approval') && !job.worker_commitment && (
              <Button 
                onClick={() => handleAction('apply')}
                disabled={applying}
                size="lg"
                variant="outline"
                className="w-full !bg-white !text-black !border-2 !border-black py-4 text-lg font-bold hover:!bg-gray-100"
              >
                {applying ? (
                  'Applying...'
                ) : (
                  'Apply for Job'
                )}
              </Button>
            )}

            {!!job.worker_commitment && job.status === 'in_progress' && (
              <Button 
                onClick={() => handleAction('submit')}
                disabled={applying}
                size="lg"
                variant="outline"
                className="w-full !bg-white !text-black !border-2 !border-black py-4 text-lg font-bold hover:!bg-gray-100"
              >
                {applying ? (
                  'Submitting...'
                ) : (
                  'Submit Milestone'
                )}
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );
};
