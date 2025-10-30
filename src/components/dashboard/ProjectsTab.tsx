"use client";

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/contexts/WalletContext';
import { JobCard } from './projects/JobCard';
import { useJobs } from './projects/useJobs';

export const ProjectsTab: React.FC = () => {
  const { account } = useWallet();
  const {
    roleState,
    checkingRole,
    loading,
    errorMsg,
    jobs,
    posterIdHash,
    freelancerIdHash,
    currentPage,
    setCurrentPage,
    pageSize,
    scanAndFetchJobs,
    acceptingId,
    stakingJobId,
    submittingMilestone,
    approvingMilestone,
    disputingMilestone,
    acceptApplicant,
    stakeAndJoin,
    submitMilestone,
    approveMilestone,
    disputeMilestone,
  } = useJobs(account);

  return (
    <div className="max-w-3xl mx-auto">
      <Card variant="outlined" className="p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-blue-800 mb-2">Dự Án</h2>
          <p className="text-gray-700">Xem và quản lý dự án từ CID on-chain</p>
          {checkingRole ? (
            <div className="p-3 bg-blue-800 text-black border-2 border-blue-800 text-sm font-bold mt-4">Đang kiểm tra role...</div>
          ) : roleState === 'poster' ? (
            <div className="p-3 bg-blue-800 text-black border-2 border-blue-800 text-sm font-bold mt-4">Bạn đang ở chế độ Poster</div>
          ) : roleState === 'freelancer' ? (
            <div className="p-3 bg-blue-800 text-black border-2 border-blue-800 text-sm font-bold mt-4">Bạn đang ở chế độ Freelancer</div>
          ) : (
            <div className="p-3 bg-red-100 text-red-800 border border-red-300 text-sm font-bold mt-4">Chỉ Poster hoặc Freelancer mới truy cập được</div>
          )}
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm text-gray-700">
              {roleState === 'poster' ? (
                posterIdHash ? <span>Poster ID Hash: <strong>{posterIdHash}</strong></span> : <span className="text-red-800">Không tìm thấy poster_id_hash trong trình duyệt</span>
              ) : roleState === 'freelancer' ? (
                freelancerIdHash ? <span>Freelancer ID Hash: <strong>{freelancerIdHash}</strong></span> : <span className="text-red-800">Không tìm thấy freelancer_id_hash trong trình duyệt</span>
              ) : null}
            </div>
            <Button
              type="button"
              onClick={scanAndFetchJobs}
              variant="outline"
              disabled={loading || roleState === 'none' || roleState === 'unknown'}
              className="!bg-white !text-black !border-2 !border-black py-2 font-bold hover:!bg-gray-100"
            >
              {loading ? 'Đang tải...' : 'Làm mới'}
            </Button>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-100 text-red-800 border border-red-300 text-sm font-bold">{errorMsg}</div>
          )}

          <div className="space-y-4">
            {jobs.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(({ id, cid, meta, chainInfo }) => (
              <JobCard
                key={id}
                roleState={roleState as any}
                id={id}
                cid={cid}
                meta={meta}
                chainInfo={chainInfo}
                posterIdHash={posterIdHash}
                freelancerIdHash={freelancerIdHash}
                acceptingId={acceptingId}
                stakingJobId={stakingJobId}
                submittingMilestone={submittingMilestone}
                approvingMilestone={approvingMilestone}
                disputingMilestone={disputingMilestone}
                onAccept={acceptApplicant}
                onStake={stakeAndJoin}
                onSubmit={submitMilestone}
                onApprove={approveMilestone}
                onDispute={disputeMilestone}
              />
            ))}
            {jobs.length > 0 && (
              <div className="flex items-center justify-between gap-4 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="!bg-white !text-black !border-2 !border-black py-2 px-4"
                >
                  Trước
                </Button>
                <div className="text-sm text-gray-700">
                  Trang {currentPage} / {Math.max(1, Math.ceil(jobs.length / pageSize))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={currentPage >= Math.ceil(jobs.length / pageSize)}
                  onClick={() => setCurrentPage((p) => Math.min(Math.ceil(jobs.length / pageSize), p + 1))}
                  className="!bg-white !text-black !border-2 !border-black py-2 px-4"
                >
                  Sau
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};


