"use client";

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export interface DisputeData {
  jobId: number;
  milestoneIndex: number;
  status: 'open' | 'resolved_poster' | 'resolved_freelancer' | 'withdrawn';
  openedAt?: string;
  reason?: string;
}

export interface DisputeItemProps {
  dispute: DisputeData;
  resolvingKey: string | null;
  withdrawingKey: string | null;
  onResolvePoster: () => void;
  onResolveFreelancer: () => void;
  onWithdrawFees: () => void;
}

export const DisputeItem: React.FC<DisputeItemProps> = ({ dispute, resolvingKey, withdrawingKey, onResolvePoster, onResolveFreelancer, onWithdrawFees }) => {
  const key = `${dispute.jobId}:${dispute.milestoneIndex}`;
  return (
    <Card variant="outlined" className="p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-blue-800 font-bold">Job #{dispute.jobId} — Milestone {dispute.milestoneIndex}</div>
        <div className="text-xs text-gray-600">{dispute.openedAt || ''}</div>
      </div>
      <div className="text-sm text-gray-700 mb-2">Status: {dispute.status}</div>
      {dispute.reason && <div className="text-sm text-gray-700 mb-3">Reason: {dispute.reason}</div>}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          className="!bg-white !text-black !border-2 !border-black"
          size="sm"
          disabled={resolvingKey === key}
          onClick={onResolvePoster}
        >
          {resolvingKey === key ? 'Resolving...' : 'Resolve to Poster'}
        </Button>
        <Button
          variant="outline"
          className="!bg-white !text-black !border-2 !border-black"
          size="sm"
          disabled={resolvingKey === key}
          onClick={onResolveFreelancer}
        >
          {resolvingKey === key ? 'Resolving...' : 'Resolve to Freelancer'}
        </Button>
        <Button
          variant="outline"
          className="!bg-white !text-black !border-2 !border-black"
          size="sm"
          disabled={withdrawingKey === key}
          onClick={onWithdrawFees}
        >
          {withdrawingKey === key ? 'Withdrawing...' : 'Withdraw Fees'}
        </Button>
      </div>
    </Card>
  );
};


