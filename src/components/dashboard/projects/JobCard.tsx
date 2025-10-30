"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Applicants } from './Applicants';
import { Milestones } from './Milestones';

export type RoleState = 'unknown' | 'poster' | 'freelancer' | 'none';

export interface JobCardProps {
  roleState: RoleState;
  id: number;
  cid: string;
  meta: { title?: string; description?: string; requirements?: string[]; poster_id_hash?: string; freelancer_id_hash?: string; applicants?: any[] };
  chainInfo?: { totalAmount?: string; milestoneCount?: number; isLocked?: boolean; hasFreelancer?: boolean; milestones?: any[] };
  posterIdHash?: string;
  freelancerIdHash?: string;
  acceptingId: string | null;
  stakingJobId: number | null;
  submittingMilestone: string | null;
  approvingMilestone: string | null;
  disputingMilestone: string | null;
  onAccept: (jobId: number, cid: string, applicantIdHash: string) => void;
  onStake: (jobId: number) => void;
  onSubmit: (jobId: number, index: number) => void;
  onApprove: (jobId: number, index: number) => void;
  onDispute: (jobId: number, index: number) => void;
}

export const JobCard: React.FC<JobCardProps> = ({ roleState, id, cid, meta, chainInfo, posterIdHash, freelancerIdHash, acceptingId, stakingJobId, submittingMilestone, approvingMilestone, disputingMilestone, onAccept, onStake, onSubmit, onApprove, onDispute }) => {
  return (
    <div className="border border-gray-400 bg-gray-50 p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold text-blue-800">Job #{id} — {meta.title || 'Không có tiêu đề'}</h3>
        <span className="text-xs text-gray-600 break-all">CID: {cid}</span>
      </div>
      <p className="text-sm text-gray-700 mb-2">{meta.description || 'Không có mô tả'}</p>
      <div className="mb-2">
        <span className="text-sm font-bold text-gray-900">Kỹ năng:</span>
        <div className="flex flex-wrap gap-2 mt-2">
          {(meta.requirements || []).map((s, i) => (
            <span key={i} className="inline-flex items-center gap-2 px-3 py-1 bg-blue-800 text-black text-sm">{s}</span>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-700">
        <div><span className="font-bold">Poster ID Hash:</span> {meta.poster_id_hash || '-'}</div>
        <div><span className="font-bold">Accepted Freelancer:</span> {meta.freelancer_id_hash || '-'}</div>
        <div><span className="font-bold">Total Amount:</span> {chainInfo?.totalAmount ? `${(Number(chainInfo.totalAmount) / 100_000_000).toFixed(2)} APT` : '-'}</div>
        <div><span className="font-bold">Milestones:</span> {chainInfo?.milestoneCount || 0}</div>
        <div><span className="font-bold">Status:</span> {chainInfo?.isLocked ? 'Locked' : 'Open'}</div>
        <div><span className="font-bold">Has Freelancer:</span> {chainInfo?.hasFreelancer ? 'Yes' : 'No'}</div>
      </div>

      <Applicants
        roleState={roleState}
        jobId={id}
        cid={cid}
        acceptedIdHash={meta.freelancer_id_hash}
        applicants={meta.applicants || []}
        acceptingId={acceptingId}
        onAccept={onAccept}
      />

      {roleState === 'freelancer' && freelancerIdHash && meta.freelancer_id_hash === freelancerIdHash && (
        <div className="mt-3">
          <Button
            type="button"
            variant="outline"
            className="!bg-white !text-black !border-2 !border-black"
            disabled={stakingJobId === id}
            onClick={() => onStake(id)}
          >
            {stakingJobId === id ? 'Đang ký...' : 'Ký hợp đồng (Stake)'}
          </Button>
        </div>
      )}

      <Milestones
        roleState={roleState}
        jobId={id}
        posterIdHash={posterIdHash}
        freelancerIdHash={freelancerIdHash}
        acceptedIdHash={meta.freelancer_id_hash}
        milestoneCount={chainInfo?.milestoneCount}
        milestones={chainInfo?.milestones as any}
        submittingMilestone={submittingMilestone}
        approvingMilestone={approvingMilestone}
        disputingMilestone={disputingMilestone}
        onSubmit={onSubmit}
        onApprove={onApprove}
        onDispute={onDispute}
      />
    </div>
  );
};


