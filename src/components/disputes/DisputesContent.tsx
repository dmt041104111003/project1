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
    refresh,
    resolving,
    resolveToPoster,
    resolveToFreelancer,
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-blue-800 mb-2">Disputes</h1>
          <p className="text-lg text-gray-700">Only assigned reviewers can see and vote.</p>
        </div>
        <Button variant="outline" className="!bg-white !text-black !border-2 !border-black" onClick={refresh} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>
      {errorMsg && <div className="p-2 bg-red-100 text-red-800 text-sm border border-red-300">{errorMsg}</div>}

      <div className="space-y-3">
        {disputes.length === 0 ? (
          <Card variant="outlined" className="p-6 text-sm text-gray-700">No disputes available for review.</Card>
        ) : (
          disputes.map((d) => (
            <DisputeItem
              key={`${d.jobId}:${d.milestoneIndex}`}
              dispute={d}
              resolvingKey={resolving}
              onResolvePoster={() => resolveToPoster(d.disputeId)}
              onResolveFreelancer={() => resolveToFreelancer(d.disputeId)}
            />
          ))
        )}
      </div>
    </div>
  );
};
