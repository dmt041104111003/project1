"use client";

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/contexts/WalletContext';
import { Buffer } from 'buffer';

interface Job { id: string; status: string; budget: number; worker_commitment?: string[]; approved: boolean; poster_commitment: string; }

const sha256Hex = async (s: string) => {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return '0x' + Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
};

export const ManageJobsTab: React.FC = () => {
  const { account } = useWallet();
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [claimingJob, setClaimingJob] = useState<string | null>(null);

  const getUserCommitment = async () => sha256Hex(account!);
  const getHexEncodedCommitment = (commitment: string) => '0x' + Buffer.from(commitment, 'utf8').toString('hex');

  const fetchMyJobs = async () => {
    if (!account) return;
    setLoadingJobs(true);
    try {
      const { jobs } = await fetch('/api/job/list').then(r => r.json());
      const hexCommitment = getHexEncodedCommitment(await getUserCommitment());
      setMyJobs(jobs.filter((job: Job) => job.poster_commitment === hexCommitment));
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoadingJobs(false);
    }
  };

  const claimStake = async (jobId: string) => {
    if (!account) return;
    setClaimingJob(jobId);
    try {
      const userCommitment = await getUserCommitment();
      const expiryData = await fetch(`/api/job/check-expiry?job_id=${jobId}&milestone_index=0`).then(r => r.json());
      
      if (!expiryData.success || !expiryData.is_expired) {
        const deadline = new Date(expiryData.milestone_deadline * 1000);
        const timeLeft = Math.floor((deadline.getTime() - new Date(expiryData.current_time * 1000).getTime()) / 1000 / 60);
        alert(`Milestone not expired yet. Deadline: ${deadline.toLocaleString()}, Time left: ${timeLeft} minutes`);
        return;
      }
      
      const autoReturnData = await fetch('/api/job/auto-return-stake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId, user_address: account, user_commitment: userCommitment })
      }).then(r => r.json());
      
      if (autoReturnData.success) {
        const tx = await (window as any).aptos.signAndSubmitTransaction(autoReturnData.payload);
        alert(`Stake claimed successfully! Transaction: ${tx.hash}`);
        fetchMyJobs();
      } else {
        alert(`Failed to claim stake: ${autoReturnData.error}`);
      }
    } catch (error) {
      console.error('Error claiming stake:', error);
      alert('Error claiming stake');
    } finally {
      setClaimingJob(null);
    }
  };

  useEffect(() => {
    if (account) fetchMyJobs();
  }, [account]);

  return (
    <div className="max-w-4xl mx-auto">
      <Card variant="outlined" className="p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-blue-800 mb-2">Quản Lý Dự Án</h2>
          <p className="text-gray-700">Theo dõi và quản lý các dự án của bạn</p>
        </div>

        {loadingJobs ? (
          <div className="text-center py-8">
            <p className="text-gray-700 text-lg">Đang tải dự án...</p>
          </div>
        ) : myJobs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Bạn chưa có dự án nào</p>
          </div>
        ) : (
          <div className="space-y-4">
            {myJobs.map((job) => (
              <div key={job.id} className="border border-gray-400 bg-gray-50 p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-blue-800">Job #{job.id}</h3>
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span className={`px-2 py-1 text-xs font-bold rounded ${
                        job.status === 'active' ? 'bg-green-100 text-green-800' :
                        job.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                        job.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {job.status}
                      </span>
                      <span className={`px-2 py-1 text-xs font-bold rounded ${
                        job.worker_commitment ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        Worker: {job.worker_commitment ? 'Assigned' : 'None'}
                      </span>
                      <span className={`px-2 py-1 text-xs font-bold rounded ${
                        job.approved ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        Approved: {job.approved ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">Budget: {(job.budget || 0).toFixed(2)} APT</p>
                  </div>
                  <div className="flex gap-2">
                    {job.approved ? (
                      <Button
                        onClick={() => claimStake(job.id.toString())}
                        disabled={claimingJob === job.id.toString()}
                        variant="outline"
                        size="sm"
                        className="bg-white text-black border-2 border-black hover:bg-gray-100"
                      >
                        {claimingJob === job.id.toString() ? 'Claiming...' : 'Claim Stake'}
                      </Button>
                    ) : (
                      <span className="px-4 py-2 bg-yellow-100 text-yellow-800 border border-yellow-300 rounded cursor-not-allowed">
                        Waiting for Approval
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
