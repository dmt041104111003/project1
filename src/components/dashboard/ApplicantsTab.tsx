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

export const ApplicantsTab: React.FC = () => {
  const { account } = useWallet();
  const [applicants, setApplicants] = useState<Job[]>([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  const [approvingJob, setApprovingJob] = useState<string | null>(null);

  const getUserCommitment = async () => sha256Hex(account!);
  const getHexEncodedCommitment = (commitment: string) => '0x' + Buffer.from(commitment, 'utf8').toString('hex');

  const fetchApplicants = async () => {
    if (!account) return;
    setLoadingApplicants(true);
    try {
      const { jobs } = await fetch('/api/job/list').then(r => r.json());
      const hexCommitment = getHexEncodedCommitment(await getUserCommitment());
      setApplicants(jobs.filter((job: Job) => 
        job.poster_commitment === hexCommitment && job.worker_commitment && !job.approved
      ));
    } catch (error) {
      console.error('Error fetching applicants:', error);
    } finally {
      setLoadingApplicants(false);
    }
  };

  const approveWorker = async (jobId: string) => {
    if (!account) return;
    setApprovingJob(jobId);
    try {
      const data = await fetch('/api/job/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', job_id: parseInt(jobId), user_address: account, user_commitment: await getUserCommitment() })
      }).then(r => r.json());
      
      if (data.success) {
        const tx = await (window as any).aptos.signAndSubmitTransaction(data.payload);
        alert(`Worker approved successfully! Transaction: ${tx.hash}`);
        fetchApplicants();
      } else {
        alert(`Failed to approve worker: ${data.error}`);
      }
    } catch (error) {
      console.error('Error approving worker:', error);
      alert('Error approving worker');
    } finally {
      setApprovingJob(null);
    }
  };

  useEffect(() => {
    if (account) fetchApplicants();
  }, [account]);

  return (
    <div className="max-w-4xl mx-auto">
      <Card variant="outlined" className="p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-blue-800 mb-2">Ứng Viên</h2>
          <p className="text-gray-700">Duyệt và phê duyệt ứng viên cho các dự án của bạn</p>
        </div>

        {loadingApplicants ? (
          <div className="text-center py-8">
            <p className="text-gray-700 text-lg">Đang tải ứng viên...</p>
          </div>
        ) : applicants.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Không có ứng viên nào đang chờ duyệt</p>
          </div>
        ) : (
          <div className="space-y-4">
            {applicants.map((job) => (
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
                    <p className="text-sm text-gray-700">
                      Worker Commitment: {job.worker_commitment ? job.worker_commitment[0]?.slice(0, 20) + '...' : 'None'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => approveWorker(job.id.toString())}
                      disabled={approvingJob === job.id.toString()}
                      variant="outline"
                      size="sm"
                      className="bg-white text-black border-2 border-black hover:bg-gray-100"
                    >
                      {approvingJob === job.id.toString() ? 'Approving...' : 'Approve Worker'}
                    </Button>
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
