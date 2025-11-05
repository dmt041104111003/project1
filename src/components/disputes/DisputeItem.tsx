"use client";

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DisputeItemProps } from '@/constants/escrow';

export const DisputeItem: React.FC<DisputeItemProps> = ({ dispute, resolvingKey, onResolvePoster, onResolveFreelancer }) => {
  const key = `${dispute.jobId}:${dispute.milestoneIndex}`;
  return (
    <Card variant="outlined" className="p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-blue-800 font-bold">Job #{dispute.jobId} — Milestone {dispute.milestoneIndex}</div>
        <div className="text-xs text-gray-600">{dispute.openedAt || ''}</div>
      </div>
      <div className="text-sm text-gray-700 mb-2">Status: {dispute.status}</div>
      {dispute.reason && <div className="text-sm text-gray-700 mb-3">Reason: {dispute.reason}</div>}
      {(dispute.posterEvidenceCid || dispute.freelancerEvidenceCid) && (
        <div className="mb-3 text-xs text-gray-700">
          {dispute.posterEvidenceCid && (
            <div>
              Poster Evidence: <a className="text-blue-700 underline break-all" href={`https://ipfs.io/ipfs/${dispute.posterEvidenceCid.replace(/^enc:/,'')}`} target="_blank" rel="noreferrer">{dispute.posterEvidenceCid}</a>
            </div>
          )}
          {dispute.freelancerEvidenceCid && (
            <div>
              Freelancer Evidence: <a className="text-blue-700 underline break-all" href={`https://ipfs.io/ipfs/${dispute.freelancerEvidenceCid.replace(/^enc:/,'')}`} target="_blank" rel="noreferrer">{dispute.freelancerEvidenceCid}</a>
            </div>
          )}
        </div>
      )}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          className="!bg-white !text-black !border-2 !border-black"
          size="sm"
          disabled={dispute.votesCompleted || dispute.hasVoted || resolvingKey === `${dispute.disputeId}:poster`}
          onClick={onResolvePoster}
        >
          {resolvingKey === `${dispute.disputeId}:poster` ? 'Voting...' : 'Vote for Poster'}
        </Button>
        <Button
          variant="outline"
          className="!bg-white !text-black !border-2 !border-black"
          size="sm"
          disabled={dispute.votesCompleted || dispute.hasVoted || resolvingKey === `${dispute.disputeId}:freelancer`}
          onClick={onResolveFreelancer}
        >
          {resolvingKey === `${dispute.disputeId}:freelancer` ? 'Voting...' : 'Vote for Freelancer'}
        </Button>
        {dispute.votesCompleted ? (
          <span className="text-xs text-gray-600">Voting closed</span>
        ) : dispute.hasVoted ? (
          <span className="text-xs text-gray-600">You already voted</span>
        ) : null}
      </div>
    </Card>
  );
};


