"use client";

import React from 'react';
import { Button } from '@/components/ui/button';

type RoleState = 'unknown' | 'poster' | 'freelancer' | 'none';

export interface ProjectMilestoneState {
  submitted?: boolean;
  approved?: boolean;
  disputed?: boolean;
}

export interface ProjectMilestonesProps {
  roleState: RoleState;
  jobId: number;
  posterIdHash?: string;
  freelancerIdHash?: string;
  acceptedIdHash?: string | null;
  milestoneCount?: number;
  milestones?: ProjectMilestoneState[];
  submittingMilestone: string | null;
  approvingMilestone: string | null;
  disputingMilestone: string | null;
  onSubmit: (jobId: number, index: number) => void;
  onApprove: (jobId: number, index: number) => void;
  onDispute: (jobId: number, index: number) => void;
}

export const ProjectMilestones: React.FC<ProjectMilestonesProps> = ({ roleState, jobId, posterIdHash, freelancerIdHash, acceptedIdHash, milestoneCount = 0, milestones = [], submittingMilestone, approvingMilestone, disputingMilestone, onSubmit, onApprove, onDispute }) => {
  if (!milestoneCount || milestoneCount <= 0) return null;
  const isPoster = roleState === 'poster' && !!posterIdHash;
  const isAcceptedFreelancer = roleState === 'freelancer' && acceptedIdHash === freelancerIdHash;

  return (
    <div className="mt-4">
      <h4 className="text-md font-bold text-blue-800 mb-2">Cột mốc</h4>
      <div className="space-y-2">
        {Array.from({ length: milestoneCount }, (_, index) => {
          const st = milestones[index] || {};
          return (
            <div key={index} className="flex items-center justify-between p-3 border border-gray-300 bg-white">
              <div className="flex-1">
                <div className="text-sm font-bold">Cột mốc {index + 1}</div>
                <div className="text-xs text-gray-600">
                  Trạng thái: {st.submitted ? 'Đã nộp' : 'Đang chờ'} | {st.approved ? 'Đã chấp nhận' : 'Chưa chấp nhận'} | {st.disputed ? 'Có tranh chấp' : 'Không có tranh chấp'}
                </div>
              </div>
              <div className="flex gap-2">
                {isAcceptedFreelancer && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="!bg-white !text-black !border-2 !border-black"
                    disabled={submittingMilestone === `${jobId}:${index}` || !!st.submitted}
                    onClick={() => onSubmit(jobId, index)}
                  >
                    {submittingMilestone === `${jobId}:${index}` ? 'Đang nộp...' : 'Nộp'}
                  </Button>
                )}
                {isPoster && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="!bg-white !text-black !border-2 !border-black"
                    disabled={approvingMilestone === `${jobId}:${index}` || !st.submitted || !!st.approved}
                    onClick={() => onApprove(jobId, index)}
                  >
                    {approvingMilestone === `${jobId}:${index}` ? 'Đang chấp nhận...' : 'Chấp nhận'}
                  </Button>
                )}
                {(isPoster || isAcceptedFreelancer) && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="!bg-blue-100 !text-blue-800 !border-2 !border-blue-300"
                    disabled={disputingMilestone === `${jobId}:${index}` || !!st.disputed}
                    onClick={() => onDispute(jobId, index)}
                  >
                    {disputingMilestone === `${jobId}:${index}` ? 'Đang tranh chấp...' : 'Tranh chấp'}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

