"use client";

import React from 'react';
import { Button } from '@/components/ui/button';

type RoleState = 'unknown' | 'poster' | 'freelancer' | 'none';

export interface ProjectApplicantsProps {
  roleState: RoleState;
  jobId: number;
  cid: string;
  acceptedIdHash?: string | null;
  posterIdHash?: string;
  applicants: any[];
  acceptingId: string | null;
  onAccept: (jobId: number, cid: string, applicantIdHash: string) => void;
}

export const ProjectApplicants: React.FC<ProjectApplicantsProps> = ({ roleState, jobId, cid, acceptedIdHash, applicants, acceptingId, onAccept }) => {
  const list = Array.isArray(applicants) ? applicants : [];
  return (
    <div className="mt-3">
      <h4 className="text-md font-bold text-blue-800 mb-2">Người làm tự do</h4>
      {list.length > 0 ? (
        <div className="space-y-2">
          {list.map((a: any, idx: number) => {
            const idHash = typeof a === 'string' ? a : (a?.freelancer_id_hash || a?.id_hash || '');
            return (
              <div key={idx} className="flex items-center justify-between px-3 py-2 border border-gray-300 bg-white text-sm">
                <span>{idHash}</span>
                {roleState === 'poster' && !acceptedIdHash && idHash && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="!bg-white !text-black !border-2 !border-black"
                    disabled={acceptingId === `${jobId}:${idHash}`}
                    onClick={() => onAccept(jobId, cid, idHash)}
                  >
                    {acceptingId === `${jobId}:${idHash}` ? 'Đang chấp nhận...' : 'Chấp nhận'}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-sm text-gray-700">Chưa có người làm tự do</div>
      )}
    </div>
  );
};

