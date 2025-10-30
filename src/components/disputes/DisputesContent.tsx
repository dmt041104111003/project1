"use client";

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/contexts/WalletContext';
import { useDisputes } from './useDisputes';
import { DisputeItem } from './DisputeItem';

export const DisputesContent: React.FC = () => {
  const { account } = useWallet();
  const {
    loading,
    errorMsg,
    disputes,
    isReviewer,
    checkingRole,
    jobId,
    setJobId,
    milestoneIndex,
    setMilestoneIndex,
    openReason,
    setOpenReason,
    openDispute,
    refresh,
    resolving,
    withdrawing,
    resolveToPoster,
    resolveToFreelancer,
    withdrawFees,
  } = useDisputes(account);

  if (checkingRole) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-blue-800 mb-2">Disputes</h1>
          <p className="text-lg text-gray-700">Checking reviewer role...</p>
        </div>
        <Card variant="outlined" className="p-6 text-center">
          <div className="text-sm text-gray-700">Loading...</div>
        </Card>
      </div>
    );
  }

  if (!isReviewer) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-blue-800 mb-2">Disputes</h1>
          <p className="text-lg text-gray-700">Reviewer access required.</p>
        </div>
        <Card variant="outlined" className="p-6 text-center">
          <div className="text-sm text-gray-700">Only reviewers can access disputes. Please register as a reviewer first.</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-blue-800 mb-2">Disputes</h1>
        <p className="text-lg text-gray-700">Review and resolve dispute events.</p>
      </div>

      <Card variant="outlined" className="p-6 space-y-4">
        <div className="font-bold text-blue-800">Open Dispute</div>
        <div className="grid md:grid-cols-3 gap-3">
          <input className="w-full border border-gray-300 px-3 py-2" placeholder="Job ID" value={jobId} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setJobId(e.target.value)} />
          <input className="w-full border border-gray-300 px-3 py-2" placeholder="Milestone Index" value={milestoneIndex} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMilestoneIndex(e.target.value)} />
          <input className="w-full border border-gray-300 px-3 py-2" placeholder="Reason (optional)" value={openReason} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOpenReason(e.target.value)} />
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="!bg-white !text-black !border-2 !border-black" disabled={loading} onClick={openDispute}>
            {loading ? 'Opening...' : 'Open Dispute'}
          </Button>
          <Button variant="outline" className="!bg-white !text-black !border-2 !border-black" onClick={refresh}>Refresh</Button>
        </div>
        {errorMsg && <div className="p-2 bg-red-100 text-red-800 text-sm border border-red-300">{errorMsg}</div>}
      </Card>

      <div className="space-y-3">
        {disputes.length === 0 ? (
          <Card variant="outlined" className="p-6 text-sm text-gray-700">No disputes available for review.</Card>
        ) : (
          disputes.map((d) => (
            <DisputeItem
              key={`${d.jobId}:${d.milestoneIndex}`}
              dispute={d}
              resolvingKey={resolving}
              withdrawingKey={withdrawing}
              onResolvePoster={() => resolveToPoster(d.jobId, d.milestoneIndex)}
              onResolveFreelancer={() => resolveToFreelancer(d.jobId, d.milestoneIndex)}
              onWithdrawFees={() => withdrawFees(d.jobId, d.milestoneIndex)}
            />
          ))
        )}
      </div>
    </div>
  );
};
