"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { ProjectApplicants } from './ProjectApplicants';
import { ProjectMilestones } from './ProjectMilestones';

export type RoleState = 'unknown' | 'poster' | 'freelancer' | 'none';

export interface ProjectJobCardProps {
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

export const ProjectJobCard: React.FC<ProjectJobCardProps> = ({ roleState, id, cid, meta, chainInfo, posterIdHash, freelancerIdHash, acceptingId, stakingJobId, submittingMilestone, approvingMilestone, disputingMilestone, onAccept, onStake, onSubmit, onApprove, onDispute }) => {
  return (
    <div className="border border-gray-400 bg-gray-50 p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold text-blue-800">Công việc #{id} — {meta.title || 'Không có tiêu đề'}</h3>
        <span className="text-xs text-gray-600 break-all">Mã định danh: {cid}</span>
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
        <div><span className="font-bold">Mã định danh Người thuê:</span> {meta.poster_id_hash || '-'}</div>
        <div><span className="font-bold">Người làm tự do đã chấp nhận:</span> {meta.freelancer_id_hash || '-'}</div>
        <div><span className="font-bold">Tổng số tiền:</span> {chainInfo?.totalAmount ? `${(Number(chainInfo.totalAmount) / 100_000_000).toFixed(2)} APT` : '-'}</div>
        <div><span className="font-bold">Cột mốc:</span> {chainInfo?.milestoneCount || 0}</div>
        <div><span className="font-bold">Trạng thái:</span> {chainInfo?.isLocked ? 'Đã khóa' : 'Mở'}</div>
        <div><span className="font-bold">Có Người làm tự do:</span> {chainInfo?.hasFreelancer ? 'Có' : 'Không'}</div>
      </div>

      <ProjectApplicants
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
            {stakingJobId === id ? 'Đang ký...' : 'Ký hợp đồng (Cọc)'}
          </Button>
        </div>
      )}

      <ProjectMilestones
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

