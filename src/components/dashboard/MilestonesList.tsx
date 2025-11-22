"use client";

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import { useWallet } from '@/contexts/WalletContext';
import { MilestoneItem } from './MilestoneItem';
import { JobCancelActions } from './JobCancelActions';
import { MilestonesListProps } from '@/constants/escrow';
import { formatAddress, copyAddress } from '@/utils/addressUtils';
import { useMilestoneHandlers } from '@/hooks/useMilestoneHandlers';
import { useDisputeData } from '@/hooks/useDisputeData';
import { useMilestoneState } from '@/hooks/useMilestoneState';

const MILESTONES_PER_PAGE = 4;

export const MilestonesList: React.FC<MilestonesListProps> = ({
  jobId,
  milestones,
  poster,
  freelancer,
  jobState,
  mutualCancelRequestedBy,
  freelancerWithdrawRequestedBy,
  pendingFreelancer,
  onUpdate
}) => {
  const { account } = useWallet();
  const [evidenceCids, setEvidenceCids] = useState<Record<number, string>>({});
  const [disputeEvidenceCids, setDisputeEvidenceCids] = useState<Record<number, string>>({});
  const [milestonePage, setMilestonePage] = useState(0);

  const isPoster = Boolean(account?.toLowerCase() === poster?.toLowerCase());
  const isFreelancer = Boolean(account && freelancer && account.toLowerCase() === freelancer.toLowerCase());
  const canInteract = jobState === 'InProgress' || jobState === 'Posted' || jobState === 'Disputed';
  const isCancelled = jobState === 'Cancelled';

  const { hasDisputeId, disputeWinner, disputeVotesDone } = useDisputeData(jobId);
  const { hasWithdrawableMilestones, shouldHideCancelActions } = useMilestoneState(milestones, jobState, hasDisputeId);
  
  const {
    submittingId,
    confirmingId,
    rejectingId,
    claimingId,
    cancelling,
    withdrawing,
    acceptingCancel,
    rejectingCancel,
    acceptingWithdraw,
    rejectingWithdraw,
    openingDisputeId,
    submittingEvidenceId,
    unlockingNonDisputed,
    claimedMilestones,
    handleSubmitMilestone: handleSubmitMilestoneBase,
    handleConfirmMilestone,
    handleRejectMilestone,
    handleOpenDispute: handleOpenDisputeBase,
    handleSubmitEvidence: handleSubmitEvidenceBase,
    handleClaimDispute: handleClaimDisputeBase,
    handleClaimTimeout: handleClaimTimeoutBase,
    handleMutualCancel: handleMutualCancelBase,
    handleAcceptMutualCancel: handleAcceptMutualCancelBase,
    handleRejectMutualCancel,
    handleFreelancerWithdraw: handleFreelancerWithdrawBase,
    handleAcceptFreelancerWithdraw: handleAcceptFreelancerWithdrawBase,
    handleRejectFreelancerWithdraw,
    handleUnlockNonDisputedMilestones: handleUnlockNonDisputedMilestonesBase,
  } = useMilestoneHandlers(jobId, isPoster, isFreelancer, onUpdate);

  const globalActionLocked =
    submittingId !== null ||
    confirmingId !== null ||
    rejectingId !== null ||
    claimingId !== null ||
    openingDisputeId !== null ||
    submittingEvidenceId !== null ||
    cancelling ||
    withdrawing ||
    acceptingCancel ||
    rejectingCancel ||
    acceptingWithdraw ||
    rejectingWithdraw ||
    unlockingNonDisputed ||
    claimedMilestones.size > 0;

  const handleFileUploaded = (milestoneId: number, cid: string) => {
    setEvidenceCids(prev => ({ ...prev, [milestoneId]: cid }));
  };

  const handleDisputeFileUploaded = (milestoneId: number, cid: string) => {
    setDisputeEvidenceCids(prev => ({ ...prev, [milestoneId]: cid }));
  };

  const handleSubmitMilestone = async (milestoneId: number) => {
    const evidenceCid = evidenceCids[milestoneId] || '';
    const success = await handleSubmitMilestoneBase(milestoneId, evidenceCid);
    if (success) {
      setEvidenceCids(prev => {
        const updated = { ...prev };
        delete updated[milestoneId];
        return updated;
      });
    }
  };

  const handleOpenDispute = async (milestoneId: number) => {
    const evidenceCid = (disputeEvidenceCids[milestoneId] || '').trim();
    await handleOpenDisputeBase(milestoneId, evidenceCid);
  };

  const handleSubmitEvidence = async (milestoneId: number) => {
    const evidenceCid = (disputeEvidenceCids[milestoneId] || '').trim();
    await handleSubmitEvidenceBase(milestoneId, evidenceCid);
  };

  const handleClaimDispute = async (milestoneId: number) => {
    await handleClaimDisputeBase(milestoneId, disputeWinner);
  };

  const handleClaimTimeout = async (milestoneId: number) => {
    const milestone = milestones.find(m => Number(m.id) === milestoneId);
    const reviewDeadline = milestone?.review_deadline ? Number(milestone.review_deadline) : 0;
    const reviewTimeout = reviewDeadline > 0 && reviewDeadline * 1000 < Date.now();
    await handleClaimTimeoutBase(milestoneId, milestone, reviewTimeout);
  };

  const handleMutualCancel = async () => {
    await handleMutualCancelBase(jobState, hasDisputeId, disputeWinner);
  };

  const handleAcceptMutualCancel = async () => {
    await handleAcceptMutualCancelBase(jobState, hasDisputeId, disputeWinner);
  };

  const handleFreelancerWithdraw = async () => {
    await handleFreelancerWithdrawBase(jobState, hasDisputeId, disputeWinner);
  };

  const handleAcceptFreelancerWithdraw = async () => {
    await handleAcceptFreelancerWithdrawBase(jobState, hasDisputeId, disputeWinner);
  };

  const handleUnlockNonDisputedMilestones = async () => {
    await handleUnlockNonDisputedMilestonesBase(jobState);
  };


  if (!milestones || milestones.length === 0) {
    return null;
  }

  return (
    <Card variant="outlined" className="p-4 mt-4">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-md font-bold text-blue-800">Cột mốc ({milestones.length})</h4>
        <div className="flex gap-4 text-sm">
          {poster && (
            <div>
              <span className="text-gray-600">Người thuê: </span>
              <span 
                className="font-bold text-blue-600 cursor-pointer hover:text-blue-800 hover:underline"
                onClick={() => copyAddress(poster)}
              >
                {formatAddress(poster)}
              </span>
            </div>
          )}
          {freelancer && (
            <div>
              <span className="text-gray-600">Người làm: </span>
              <span 
                className="font-bold text-blue-600 cursor-pointer hover:text-blue-800 hover:underline"
                onClick={() => copyAddress(freelancer)}
              >
                {formatAddress(freelancer)}
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="space-y-3">
        {milestones
          .slice(milestonePage * MILESTONES_PER_PAGE, (milestonePage + 1) * MILESTONES_PER_PAGE)
          .map((milestone, pageIndex) => {
          const originalIndex = milestonePage * MILESTONES_PER_PAGE + pageIndex;
          const isFirstMilestone = originalIndex === 0;

          return (
            <MilestoneItem
              key={originalIndex}
              milestone={milestone}
              milestones={milestones}
              index={originalIndex}
              jobId={jobId}
              account={account}
              poster={poster}
              freelancer={freelancer}
              jobState={jobState}
              canInteract={canInteract}
              isCancelled={isCancelled}
              isFirstMilestone={isFirstMilestone}
              submitting={submittingId === Number(milestone.id)}
              confirming={confirmingId === Number(milestone.id)}
              rejecting={rejectingId === Number(milestone.id)}
              claiming={claimingId === Number(milestone.id)}
              evidenceCid={evidenceCids[Number(milestone.id)]}
              disputeEvidenceCid={disputeEvidenceCids[Number(milestone.id)]}
              openingDispute={openingDisputeId === Number(milestone.id)}
              submittingEvidence={submittingEvidenceId === Number(milestone.id)}
              hasDisputeId={hasDisputeId}
              votesCompleted={disputeVotesDone}
              onFileUploaded={handleFileUploaded}
              onDisputeFileUploaded={handleDisputeFileUploaded}
              onSubmitMilestone={handleSubmitMilestone}
              onConfirmMilestone={handleConfirmMilestone}
              onRejectMilestone={handleRejectMilestone}
              onClaimTimeout={(milestoneId: number) => handleClaimTimeout(milestoneId)}
              onOpenDispute={handleOpenDispute}
              onSubmitEvidence={handleSubmitEvidence}
              onClaimDispute={handleClaimDispute}
              disputeWinner={disputeWinner}
              isClaimed={claimedMilestones.has(Number(milestone.id))}
              interactionLocked={globalActionLocked}
            />
          );
        })}
        
        {milestones.length > MILESTONES_PER_PAGE && (
          <Pagination
            currentPage={milestonePage}
            totalPages={Math.ceil(milestones.length / MILESTONES_PER_PAGE)}
            onPageChange={setMilestonePage}
            showAutoPlay={false}
            showFirstLast={true}
          />
        )}

        
        {isPoster && jobState === 'Disputed' && (
          <div className="mt-4 p-3 bg-yellow-50 border-2 border-yellow-300 rounded">
            <p className="text-sm text-yellow-800 mb-2 font-bold">
              ⚠ Công việc đang có tranh chấp - Bạn có thể rút ký quỹ của các cột mốc không tranh chấp (chưa được thực hiện)
            </p>
            {hasWithdrawableMilestones ? (
              <button
                onClick={handleUnlockNonDisputedMilestones}
                disabled={unlockingNonDisputed}
                className="bg-yellow-100 text-black hover:bg-yellow-200 text-sm px-4 py-2 rounded border-2 border-yellow-300 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {unlockingNonDisputed ? 'Đang rút...' : 'Rút Ký quỹ Các Cột mốc Không Tranh Chấp'}
              </button>
            ) : (
              <p className="text-sm text-gray-600 font-bold">
                ✓ Đã rút hết ký quỹ của các cột mốc có thể rút
              </p>
            )}
          </div>
        )}

        {!shouldHideCancelActions && jobState !== 'PendingApproval' && !pendingFreelancer && (
          <JobCancelActions
            jobId={jobId}
            account={account}
            poster={poster}
            freelancer={freelancer}
            canInteract={canInteract}
            isCancelled={isCancelled}
            jobState={jobState}
            mutualCancelRequestedBy={mutualCancelRequestedBy || null}
            freelancerWithdrawRequestedBy={freelancerWithdrawRequestedBy || null}
            onMutualCancel={handleMutualCancel}
            onAcceptMutualCancel={handleAcceptMutualCancel}
            onRejectMutualCancel={handleRejectMutualCancel}
            onFreelancerWithdraw={handleFreelancerWithdraw}
            onAcceptFreelancerWithdraw={handleAcceptFreelancerWithdraw}
            onRejectFreelancerWithdraw={handleRejectFreelancerWithdraw}
            cancelling={cancelling}
            withdrawing={withdrawing}
            acceptingCancel={acceptingCancel}
            rejectingCancel={rejectingCancel}
            acceptingWithdraw={acceptingWithdraw}
            rejectingWithdraw={rejectingWithdraw}
          />
        )}
      </div>
    </Card>
  );
};
