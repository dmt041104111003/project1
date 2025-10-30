"use client";

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/contexts/WalletContext';
import { useReputation } from './useReputation';
import { PointsCard } from '@/components/reputation/PointsCard';
import { ReputationChecker } from './ReputationChecker';

export const ReputationContent: React.FC = () => {
  const { account } = useWallet();
  const {
    loading,
    errorMsg,
    userRole,
    checkingRole,
    utrPoints,
    utfPoints,
    utpPoints,
    aptBalance,
    reputation,
    fetchUTRPoints,
    fetchUTFPoints,
    fetchUTPPoints,
    claimReviewerUTR,
    claimUTF,
    claimUTP,
    checkReputation,
    refresh,
  } = useReputation(account);

  if (checkingRole) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-blue-800 mb-2">Reputation & UTR</h1>
          <p className="text-lg text-gray-700">Checking user role...</p>
        </div>
        <Card variant="outlined" className="p-6 text-center">
          <div className="text-sm text-gray-700">Loading...</div>
        </Card>
      </div>
    );
  }

  if (!userRole || userRole === 'none') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-blue-800 mb-2">Reputation & UTR</h1>
          <p className="text-lg text-gray-700">Access required.</p>
        </div>
        <Card variant="outlined" className="p-6 text-center">
          <div className="text-sm text-gray-700">Please register as a Freelancer, Poster, or Reviewer to access this page.</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-blue-800 mb-2">Reputation & UTR</h1>
        <p className="text-lg text-gray-700">Manage your UTR points and check reputation scores.</p>
        <div className="mt-2 text-sm text-gray-600">
          Role: <span className="font-bold text-blue-800 capitalize">{userRole}</span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <PointsCard
          title="UTR Points (Reviewer)"
          points={utrPoints}
          aptBalance={aptBalance}
          loading={loading}
          onRefresh={fetchUTRPoints}
          onClaim={claimReviewerUTR}
          disabled={userRole !== 'reviewer'}
          disabledText="Only reviewers can claim UTR"
        />

        <PointsCard
          title="UTF Points (Freelancer)"
          points={utfPoints}
          aptBalance={aptBalance}
          loading={loading}
          onRefresh={fetchUTFPoints}
          onClaim={claimUTF}
          disabled={userRole !== 'freelancer'}
          disabledText="Only freelancers can claim UTF"
        />

        <PointsCard
          title="UTP Points (Poster)"
          points={utpPoints}
          aptBalance={aptBalance}
          loading={loading}
          onRefresh={fetchUTPPoints}
          onClaim={claimUTP}
          disabled={userRole !== 'poster'}
          disabledText="Only posters can claim UTP"
        />

        <ReputationChecker
          reputation={reputation}
          loading={loading}
          onCheckReputation={checkReputation}
        />
      </div>

      <Card variant="outlined" className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-blue-800">Actions</h2>
          <Button variant="outline" className="!bg-white !text-black !border-2 !border-black" onClick={refresh}>
            Refresh All
          </Button>
        </div>
        {errorMsg && <div className="p-3 bg-red-100 text-red-800 text-sm border border-red-300 mb-4">{errorMsg}</div>}
      </Card>
    </div>
  );
};
