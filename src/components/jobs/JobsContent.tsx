"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { CONTRACT_ADDRESS } from '@/constants/contracts';

export const JobsContent: React.FC = () => {
  const router = useRouter();
  const [jobs, setJobs] = useState<Array<{ id: number; cid: string; total_amount?: number; milestones_count?: number; has_freelancer?: boolean; locked?: boolean }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const scanJobsFromChain = async () => {
      try {
        setLoading(true);
        setError(null);
        const fn = `${CONTRACT_ADDRESS}::escrow::get_job_cid`;
        const fnTotal = `${CONTRACT_ADDRESS}::escrow::get_total_amount`;
        const fnMilestones = `${CONTRACT_ADDRESS}::escrow::get_milestone_count`;
        const fnHasFreelancer = `${CONTRACT_ADDRESS}::escrow::has_freelancer`;
        const fnLocked = `${CONTRACT_ADDRESS}::escrow::is_locked`;
        const maxScan = 200;
        const firstId = 1;
        const list: Array<{ id: number; cid: string; total_amount?: number; milestones_count?: number; has_freelancer?: boolean; locked?: boolean }> = [];
        for (let id = firstId; id < firstId + maxScan; id++) {
          try {
            const res = await fetch('/v1/view', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ function: fn, type_arguments: [], arguments: [id] })
            });
            if (!res.ok) continue;
            const out = await res.json();
            // Expect vector<u8> → base64 or hex depends on node; attempt to stringify
            const cidBytes = Array.isArray(out) ? out[0] : out;
            if (!cidBytes) continue;
            // Represent as hex string for list (no IPFS fetch here)
            const cid = typeof cidBytes === 'string' ? cidBytes : JSON.stringify(cidBytes);

            const [tRes, mRes, fRes, lRes] = await Promise.all([
              fetch('/v1/view', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ function: fnTotal, type_arguments: [], arguments: [id] }) }).catch(() => null),
              fetch('/v1/view', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ function: fnMilestones, type_arguments: [], arguments: [id] }) }).catch(() => null),
              fetch('/v1/view', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ function: fnHasFreelancer, type_arguments: [], arguments: [id] }) }).catch(() => null),
              fetch('/v1/view', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ function: fnLocked, type_arguments: [], arguments: [id] }) }).catch(() => null),
            ]);
            const totalOut = tRes && tRes.ok ? await tRes.json() : undefined;
            const milesOut = mRes && mRes.ok ? await mRes.json() : undefined;
            const hasFOut = fRes && fRes.ok ? await fRes.json() : undefined;
            const lockedOut = lRes && lRes.ok ? await lRes.json() : undefined;

            const total_amount = Array.isArray(totalOut) ? Number(totalOut[0]) : Number(totalOut);
            const milestones_count = Array.isArray(milesOut) ? Number(milesOut[0]) : Number(milesOut);
            const has_freelancer = Array.isArray(hasFOut) ? !!hasFOut[0] : !!hasFOut;
            const locked = Array.isArray(lockedOut) ? !!lockedOut[0] : !!lockedOut;

            list.push({ id, cid, total_amount, milestones_count, has_freelancer, locked });
          } catch (_) {
            // ignore individual failures
          }
        }
        setJobs(list);
      } catch {
        setError('Failed to fetch jobs from blockchain');
      } finally {
        setLoading(false);
      }
    };
    scanJobsFromChain();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-700 text-lg">Loading jobs...</p>
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
        <h1 className="text-3xl font-bold text-blue-800 mb-2">Find a Job</h1>
        <p className="text-lg text-gray-700">On-chain jobs (click to view details from CID)</p>
      </div>

      {jobs.length === 0 ? (
        <Card variant="outlined" className="p-8 text-center">
          <h3 className="text-lg font-bold text-blue-800 mb-2">No jobs found</h3>
          <p className="text-gray-700">Be the first to post a job and start earning!</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map((job) => (
            <div 
              key={job.id} 
              className="cursor-pointer"
              onClick={() => {
                console.log('Clicking job:', job.id);
                router.push(`/jobs/${job.id}`);
              }}
            >
              <Card 
                variant="outlined"
                className="p-6 hover:bg-gray-50"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-blue-800">Job #{job.id}</h3>
                    <p className="text-sm text-gray-700">
                      {(typeof job.total_amount === 'number') ? `${(job.total_amount / 100_000_000).toFixed(2)} APT` : '—'}
                      {typeof job.milestones_count === 'number' ? ` • ${job.milestones_count} milestones` : ''}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-bold border-2 bg-gray-100 text-gray-800 border-gray-300`}>
                    {job.locked ? 'In progress' : 'Active'}
                  </span>
                </div>
                
                <div className="space-y-3">
                  <div className="pt-2 border-t border-gray-400">
                    <p className="text-xs text-gray-600 break-all">CID bytes: {job.cid}</p>
                  </div>
                  {typeof job.has_freelancer === 'boolean' && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">Worker:</span>
                      <span className={`font-bold ${job.has_freelancer ? 'text-blue-800' : 'text-gray-600'}`}>
                        {job.has_freelancer ? 'Assigned' : 'Open'}
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}
    </>
  );
};
