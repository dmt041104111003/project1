"use client";

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { useWallet } from '@/contexts/WalletContext';
import { toast } from 'sonner';
import { MilestoneItem } from './milestones/MilestoneItem';
import { JobCancelActions } from './milestones/JobCancelActions';
import { parseStatus } from './milestones/MilestoneUtils';
import { MilestonesListProps } from '@/constants/escrow';

const executeTransaction = async (payload: any): Promise<string> => {
  if (payload.error) throw new Error(payload.error);
  const wallet = (window as any).aptos;
  if (!wallet) throw new Error('Wallet not found');
  const tx = await wallet.signAndSubmitTransaction(payload);
  return tx?.hash || 'N/A';
};

export const MilestonesList: React.FC<MilestonesListProps> = ({
  jobId,
  milestones,
  poster,
  freelancer,
  jobState,
  mutualCancelRequestedBy,
  freelancerWithdrawRequestedBy,
  onUpdate
}) => {
  const { account } = useWallet();
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [acceptingCancel, setAcceptingCancel] = useState(false);
  const [rejectingCancel, setRejectingCancel] = useState(false);
  const [acceptingWithdraw, setAcceptingWithdraw] = useState(false);
  const [rejectingWithdraw, setRejectingWithdraw] = useState(false);
  const [evidenceCids, setEvidenceCids] = useState<Record<number, string>>({});
  const [disputeEvidenceCids, setDisputeEvidenceCids] = useState<Record<number, string>>({});
  const [openingDisputeId, setOpeningDisputeId] = useState<number | null>(null);
  const [submittingEvidenceId, setSubmittingEvidenceId] = useState<number | null>(null);
  const [hasDisputeId, setHasDisputeId] = useState<boolean>(false);
  const [disputeWinner, setDisputeWinner] = useState<boolean | null>(null); 
  const [disputeVotesDone, setDisputeVotesDone] = useState<boolean>(false); 
  const [unlockingNonDisputed, setUnlockingNonDisputed] = useState(false);

  const isPoster = account?.toLowerCase() === poster?.toLowerCase();
  const isFreelancer = account && freelancer && account.toLowerCase() === freelancer.toLowerCase();
  const canInteract = jobState === 'InProgress' || jobState === 'Posted' || jobState === 'Disputed';
  const isCancelled = jobState === 'Cancelled';
  
  const hasWithdrawableMilestones = milestones.some(m => {
    const status = parseStatus(m.status);
    return status === 'Pending' || status === 'Submitted';
  });

  const handleFileUploaded = (milestoneId: number, cid: string) => {
    setEvidenceCids(prev => ({ ...prev, [milestoneId]: cid }));
  };

  const handleDisputeFileUploaded = (milestoneId: number, cid: string) => {
    setDisputeEvidenceCids(prev => ({ ...prev, [milestoneId]: cid }));
  };

  React.useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/job/${jobId}`);
        const data = await res.json();
        const opt = data?.job?.dispute_id || data?.dispute_id;
        const exists = Array.isArray(opt?.vec) ? opt.vec.length > 0 : Boolean(opt);
        console.log('[MilestonesList] Dispute check:', {
          jobId,
          dispute_id: opt,
          exists,
          jobState: data?.job?.state,
          isPoster: account?.toLowerCase() === poster?.toLowerCase()
        });
        setHasDisputeId(!!exists);
        const did = exists ? (Array.isArray(opt?.vec) ? Number(opt.vec[0]) : Number(opt)) : 0;
        let finalWinner: boolean | null = null;
        if (did) {
          const sumRes = await fetch(`/api/dispute?action=get_summary&dispute_id=${did}`);
          if (sumRes.ok) {
            const sum = await sumRes.json();
            if (typeof sum?.winner === 'boolean') finalWinner = sum.winner;
            setDisputeVotesDone(Number(sum?.counts?.total || 0) >= 3);
          }
        }
        if (finalWinner === null) {
          const winner = (data?.job?.dispute_winner ?? null);
          if (typeof winner === 'boolean') finalWinner = winner;
        }
        if (typeof finalWinner === 'boolean') {
          setDisputeVotesDone(true);
        }
        setDisputeWinner(finalWinner);
      } catch {}
    };
    load();
  }, [jobId]);

  const handleSubmitMilestone = async (milestoneId: number) => {
    const evidenceCid = evidenceCids[milestoneId] || '';
    if (!account || !isFreelancer || !evidenceCid.trim()) {
      toast.error('Vui lòng upload file evidence trước');
      return;
    }

    try {
      setSubmittingId(milestoneId);
      const { escrowHelpers } = await import('@/utils/contractHelpers');
      const payload = escrowHelpers.submitMilestone(jobId, milestoneId, evidenceCid.trim());
      const txHash = await executeTransaction(payload);
      toast.success(`Submit milestone thành công! TX: ${txHash}`);
      setEvidenceCids(prev => {
        const updated = { ...prev };
        delete updated[milestoneId];
        return updated;
      });
      setTimeout(() => onUpdate?.(), 2000);
    } catch (err: any) {
      console.error('[MilestonesList] Submit error:', err);
      toast.error(`Lỗi: ${err?.message || 'Unknown error'}`);
    } finally {
      setSubmittingId(null);
    }
  };

  const handleConfirmMilestone = async (milestoneId: number) => {
    if (!account || !isPoster) return;
    try {
      setConfirmingId(milestoneId);
      // Check review deadline before confirming
      try {
        const jobRes = await fetch(`/api/job/${jobId}`);
        if (jobRes.ok) {
          const jobData = await jobRes.json();
          const milestone = jobData?.job?.milestones?.find((m: any) => Number(m.id) === milestoneId);
          if (milestone) {
            const reviewDeadline = Number(milestone.review_deadline || 0);
            const now = Math.floor(Date.now() / 1000);
            if (reviewDeadline > 0 && now > reviewDeadline) {
              throw new Error('Review deadline has passed. You can no longer confirm or reject this milestone. Freelancer can now claim timeout.');
            }
          }
        }
      } catch (err: any) {
        if (err.message.includes('Review deadline')) {
          throw err;
        }
      }
      
      const { escrowHelpers } = await import('@/utils/contractHelpers');
      const payload = escrowHelpers.confirmMilestone(jobId, milestoneId);
      const txHash = await executeTransaction(payload);
      toast.success(`Confirm milestone thành công! TX: ${txHash}`);
      setTimeout(() => onUpdate?.(), 2000);
    } catch (err: any) {
      console.error('[MilestonesList] Confirm error:', err);
      const errorMsg = err?.message || 'Unknown error';
      if (errorMsg.includes('Review deadline has passed')) {
        toast.error('Đã hết thời gian review. Bạn không thể confirm milestone này nữa. Freelancer có thể claim timeout.');
      } else {
        toast.error(`Lỗi: ${errorMsg}`);
      }
    } finally {
      setConfirmingId(null);
    }
  };

  const handleRejectMilestone = async (milestoneId: number) => {
    if (!account || !isPoster) return;
    toast.warning('Bạn có chắc muốn reject milestone này? Việc này sẽ mở dispute.', {
      action: {
        label: 'Xác nhận',
        onClick: async () => {
          try {
            setRejectingId(milestoneId);
            // Check review deadline before rejecting
            try {
              const jobRes = await fetch(`/api/job/${jobId}`);
              if (jobRes.ok) {
                const jobData = await jobRes.json();
                const milestone = jobData?.job?.milestones?.find((m: any) => Number(m.id) === milestoneId);
                if (milestone) {
                  const reviewDeadline = Number(milestone.review_deadline || 0);
                  const now = Math.floor(Date.now() / 1000);
                  if (reviewDeadline > 0 && now > reviewDeadline) {
                    throw new Error('Review deadline has passed. You can no longer confirm or reject this milestone. Freelancer can now claim timeout.');
                  }
                }
              }
            } catch (err: any) {
              if (err.message.includes('Review deadline')) {
                throw err;
              }
            }
            
            const { escrowHelpers } = await import('@/utils/contractHelpers');
            const payload = escrowHelpers.rejectMilestone(jobId, milestoneId);
            const txHash = await executeTransaction(payload);
            toast.success(`Reject milestone thành công! TX: ${txHash}`);
            setTimeout(() => onUpdate?.(), 2000);
          } catch (err: any) {
            console.error('[MilestonesList] Reject error:', err);
            const errorMsg = err?.message || 'Unknown error';
            if (errorMsg.includes('Review deadline has passed')) {
              toast.error('Đã hết thời gian review. Bạn không thể reject milestone này nữa. Freelancer có thể claim timeout.');
            } else {
              toast.error(`Lỗi: ${errorMsg}`);
            }
          } finally {
            setRejectingId(null);
          }
        }
      },
      cancel: { label: 'Hủy', onClick: () => {} },
      duration: 10000
    });
  };

  const handleOpenDispute = async (milestoneId: number) => {
    if (!account || (!isPoster && !isFreelancer)) return;
    const evidenceCid = (disputeEvidenceCids[milestoneId] || '').trim();
    if (!evidenceCid) {
      toast.error('Vui lòng upload CID evidence trước khi mở dispute');
      return;
    }
    try {
      setOpeningDisputeId(milestoneId);
      const { disputeHelpers } = await import('@/utils/contractHelpers');
      const payload = disputeHelpers.openDispute(jobId, milestoneId, evidenceCid);
      const txHash = await executeTransaction(payload);
      toast.success(`Mở dispute thành công! TX: ${txHash}`);
      setHasDisputeId(true);
      setTimeout(() => onUpdate?.(), 2000);
    } catch (err: any) {
      console.error('[MilestonesList] Open dispute error:', err);
      toast.error(`Lỗi: ${err?.message || 'Unknown error'}`);
    } finally {
      setOpeningDisputeId(null);
    }
  };

  const handleSubmitEvidence = async (milestoneId: number) => {
    if (!account) return;
    const evidenceCid = (disputeEvidenceCids[milestoneId] || '').trim();
    if (!evidenceCid) {
      toast.error('Vui lòng upload CID evidence trước khi gửi');
      return;
    }
    try {
      setSubmittingEvidenceId(milestoneId);
      // fetch dispute_id from job detail
      const jobRes = await fetch(`/api/job/${jobId}`);
      const jobData = await jobRes.json();
      const disputeOpt = jobData?.job?.dispute_id || jobData?.dispute_id;
      const disputeId = Array.isArray(disputeOpt?.vec) ? Number(disputeOpt.vec[0]) : Number(disputeOpt);
      if (!disputeId) throw new Error('Không tìm thấy dispute_id cho job này');

      const { disputeHelpers } = await import('@/utils/contractHelpers');
      const payload = disputeHelpers.addEvidence(disputeId, evidenceCid);
      const txHash = await executeTransaction(payload);
      toast.success(`Đã gửi evidence cho dispute! TX: ${txHash}`);
      setTimeout(() => onUpdate?.(), 1500);
    } catch (err: any) {
      console.error('[MilestonesList] Add evidence error:', err);
      toast.error(`Lỗi: ${err?.message || 'Unknown error'}`);
    } finally {
      setSubmittingEvidenceId(null);
    }
  };

  const handleClaimDispute = async (milestoneId: number) => {
    if (!account) return;
    if (disputeWinner === null) return;
    const isWinnerFreelancer = disputeWinner === true;
    if (isWinnerFreelancer && !isFreelancer) return;
    if (!isWinnerFreelancer && !isPoster) return;
    try {
      const { escrowHelpers } = await import('@/utils/contractHelpers');
      const payload = isWinnerFreelancer 
        ? escrowHelpers.claimDisputePayment(jobId, milestoneId)
        : escrowHelpers.claimDisputeRefund(jobId, milestoneId);
      const txHash = await executeTransaction(payload);
      toast.success(`Đã claim dispute ${isWinnerFreelancer ? 'payment' : 'refund'}! TX: ${txHash}`);
      setTimeout(() => onUpdate?.(), 1500);
    } catch (err: any) {
      console.error('[MilestonesList] Claim dispute error:', err);
      toast.error(`Lỗi: ${err?.message || 'Unknown error'}`);
    }
  };

  const handleClaimTimeout = async (milestoneId: number, isFreelancerClaiming?: boolean) => {
    if (!account) return;
    
    const milestone = milestones.find(m => Number(m.id) === milestoneId);
    const statusStr = milestone ? parseStatus(milestone.status) : '';
    const reviewDeadline = milestone?.review_deadline ? Number(milestone.review_deadline) : 0;
    const reviewTimeout = reviewDeadline > 0 && reviewDeadline * 1000 < Date.now();
    if (isPoster && statusStr === 'Pending') {
      toast.warning('Bạn có chắc muốn claim timeout? Freelancer sẽ mất stake và job sẽ mở lại cho người khác apply.', {
        action: {
          label: 'Xác nhận',
          onClick: async () => {
            try {
              setClaimingId(milestoneId);
              const { escrowHelpers } = await import('@/utils/contractHelpers');
              const payload = escrowHelpers.claimTimeout(jobId, milestoneId);
              const txHash = await executeTransaction(payload);
              toast.success(`Claim timeout thành công! TX: ${txHash}`);
              setTimeout(() => onUpdate?.(), 2000);
            } catch (err: any) {
              console.error('[MilestonesList] Claim timeout error:', err);
              toast.error(`Lỗi: ${err?.message || 'Unknown error'}`);
            } finally {
              setClaimingId(null);
            }
          }
        },
        cancel: { label: 'Hủy', onClick: () => {} },
        duration: 10000
      });
    } else if (isFreelancer && statusStr === 'Submitted' && reviewTimeout) {
      toast.warning('Bạn có chắc muốn claim timeout? Poster không phản hồi trong thời gian quy định, milestone sẽ tự động được accepted và bạn sẽ nhận payment.', {
        action: {
          label: 'Xác nhận',
          onClick: async () => {
            try {
              setClaimingId(milestoneId);
              const { escrowHelpers } = await import('@/utils/contractHelpers');
              const payload = escrowHelpers.claimTimeout(jobId, milestoneId);
              const txHash = await executeTransaction(payload);
              toast.success(`Claim timeout thành công! Milestone đã được accepted và payment đã được gửi. TX: ${txHash}`);
              setTimeout(() => onUpdate?.(), 2000);
            } catch (err: any) {
              console.error('[MilestonesList] Freelancer claim timeout error:', err);
              toast.error(`Lỗi: ${err?.message || 'Unknown error'}`);
            } finally {
              setClaimingId(null);
            }
          }
        },
        cancel: { label: 'Hủy', onClick: () => {} },
        duration: 10000
      });
    }
  };

  const handleMutualCancel = async () => {
    if (!account || !isPoster) return;
    if (jobState === 'Disputed' || hasDisputeId || disputeWinner !== null) {
      toast.error('Không thể yêu cầu hủy job khi đang có dispute. Vui lòng giải quyết dispute trước.');
      return;
    }
    toast.warning('Bạn có chắc muốn yêu cầu hủy job? Freelancer sẽ được thông báo để xác nhận.', {
      action: {
        label: 'Xác nhận',
        onClick: async () => {
          try {
            setCancelling(true);
            const { escrowHelpers } = await import('@/utils/contractHelpers');
            const payload = escrowHelpers.mutualCancel(jobId);
            const txHash = await executeTransaction(payload);
            toast.success(`Đã gửi yêu cầu hủy job! TX: ${txHash}`);
            setTimeout(() => onUpdate?.(), 2000);
          } catch (err: any) {
            console.error('[MilestonesList] Mutual cancel error:', err);
            toast.error(`Lỗi: ${err?.message || 'Unknown error'}`);
          } finally {
            setCancelling(false);
          }
        }
      },
      cancel: { label: 'Hủy', onClick: () => {} },
      duration: 10000
    });
  };

  const handleAcceptMutualCancel = async () => {
    if (!account || !isFreelancer) return;
    if (jobState === 'Disputed' || hasDisputeId || disputeWinner !== null) {
      toast.error('Không thể chấp nhận hủy job khi đang có dispute. Vui lòng giải quyết dispute trước.');
      return;
    }
    toast.warning('Bạn có chắc muốn chấp nhận hủy job? Poster sẽ nhận escrow, cả 2 stake sẽ về bạn.', {
      action: {
        label: 'Xác nhận',
        onClick: async () => {
          try {
            setAcceptingCancel(true);
            const { escrowHelpers } = await import('@/utils/contractHelpers');
            const payload = escrowHelpers.acceptMutualCancel(jobId);
            const txHash = await executeTransaction(payload);
            toast.success(`Chấp nhận hủy job thành công! TX: ${txHash}`);
            setTimeout(() => onUpdate?.(), 2000);
          } catch (err: any) {
            console.error('[MilestonesList] Accept mutual cancel error:', err);
            toast.error(`Lỗi: ${err?.message || 'Unknown error'}`);
          } finally {
            setAcceptingCancel(false);
          }
        }
      },
      cancel: { label: 'Hủy', onClick: () => {} },
      duration: 10000
    });
  };

  const handleRejectMutualCancel = async () => {
    if (!account || !isFreelancer) return;
    toast.warning('Bạn có chắc muốn từ chối hủy job? Job sẽ tiếp tục bình thường.', {
      action: {
        label: 'Xác nhận',
        onClick: async () => {
          try {
            setRejectingCancel(true);
            const { escrowHelpers } = await import('@/utils/contractHelpers');
            const payload = escrowHelpers.rejectMutualCancel(jobId);
            const txHash = await executeTransaction(payload);
            toast.success(`Đã từ chối hủy job. Job sẽ tiếp tục! TX: ${txHash}`);
            setTimeout(() => onUpdate?.(), 2000);
          } catch (err: any) {
            console.error('[MilestonesList] Reject mutual cancel error:', err);
            toast.error(`Lỗi: ${err?.message || 'Unknown error'}`);
          } finally {
            setRejectingCancel(false);
          }
        }
      },
      cancel: { label: 'Hủy', onClick: () => {} },
      duration: 10000
    });
  };

  const handleFreelancerWithdraw = async () => {
    if (!account || !isFreelancer) return;
    if (jobState === 'Disputed' || hasDisputeId || disputeWinner !== null) {
      toast.error('Không thể yêu cầu rút khi đang có dispute. Vui lòng giải quyết dispute trước.');
      return;
    }
    toast.warning('Bạn có chắc muốn yêu cầu rút? Poster sẽ được thông báo để xác nhận. Nếu được chấp nhận, bạn sẽ mất stake (1 APT) và job sẽ mở lại.', {
      action: {
        label: 'Xác nhận',
        onClick: async () => {
          try {
            setWithdrawing(true);
            const { escrowHelpers } = await import('@/utils/contractHelpers');
            const payload = escrowHelpers.freelancerWithdraw(jobId);
            const txHash = await executeTransaction(payload);
            toast.success(`Đã gửi yêu cầu rút! Đang chờ poster xác nhận. TX: ${txHash}`);
            setTimeout(() => onUpdate?.(), 2000);
          } catch (err: any) {
            console.error('[MilestonesList] Freelancer withdraw error:', err);
            toast.error(`Lỗi: ${err?.message || 'Unknown error'}`);
          } finally {
            setWithdrawing(false);
          }
        }
      },
      cancel: { label: 'Hủy', onClick: () => {} },
      duration: 10000
    });
  };

  const handleAcceptFreelancerWithdraw = async () => {
    if (!account || !isPoster) return;
    if (jobState === 'Disputed' || hasDisputeId || disputeWinner !== null) {
      toast.error('Không thể chấp nhận freelancer rút khi đang có dispute. Vui lòng giải quyết dispute trước.');
      return;
    }
    toast.warning('Bạn có chắc muốn chấp nhận freelancer rút? Freelancer sẽ mất stake (1 APT) về bạn và job sẽ mở lại.', {
      action: {
        label: 'Xác nhận',
        onClick: async () => {
          try {
            setAcceptingWithdraw(true);
            const { escrowHelpers } = await import('@/utils/contractHelpers');
            const payload = escrowHelpers.acceptFreelancerWithdraw(jobId);
            const txHash = await executeTransaction(payload);
            toast.success(`Chấp nhận freelancer rút thành công! TX: ${txHash}`);
            setTimeout(() => onUpdate?.(), 2000);
          } catch (err: any) {
            console.error('[MilestonesList] Accept freelancer withdraw error:', err);
            toast.error(`Lỗi: ${err?.message || 'Unknown error'}`);
          } finally {
            setAcceptingWithdraw(false);
          }
        }
      },
      cancel: { label: 'Hủy', onClick: () => {} },
      duration: 10000
    });
  };

  const handleRejectFreelancerWithdraw = async () => {
    if (!account || !isPoster) return;
    toast.warning('Bạn có chắc muốn từ chối freelancer rút? Job sẽ tiếp tục bình thường.', {
      action: {
        label: 'Xác nhận',
        onClick: async () => {
          try {
            setRejectingWithdraw(true);
            const { escrowHelpers } = await import('@/utils/contractHelpers');
            const payload = escrowHelpers.rejectFreelancerWithdraw(jobId);
            const txHash = await executeTransaction(payload);
            toast.success(`Đã từ chối freelancer rút. Job sẽ tiếp tục! TX: ${txHash}`);
            setTimeout(() => onUpdate?.(), 2000);
          } catch (err: any) {
            console.error('[MilestonesList] Reject freelancer withdraw error:', err);
            toast.error(`Lỗi: ${err?.message || 'Unknown error'}`);
          } finally {
            setRejectingWithdraw(false);
          }
        }
      },
      cancel: { label: 'Hủy', onClick: () => {} },
      duration: 10000
    });
  };

  const handleUnlockNonDisputedMilestones = async () => {
    if (!account || !isPoster) {
      toast.error('Chỉ poster mới có thể rút escrow');
      return;
    }
    if (jobState !== 'Disputed') {
      toast.error('Job phải ở trạng thái Disputed mới có thể rút escrow');
      return;
    }
    try {
      setUnlockingNonDisputed(true);
      const { escrowHelpers } = await import('@/utils/contractHelpers');
      const payload = escrowHelpers.unlockNonDisputedMilestones(jobId);
      const txHash = await executeTransaction(payload);
      toast.success(`Rút escrow các milestone không tranh chấp thành công! TX: ${txHash}`);
      setTimeout(() => onUpdate?.(), 2000);
    } catch (err: any) {
      console.error('[MilestonesList] Unlock non-disputed milestones error:', err);
      toast.error(`Lỗi: ${err?.message || 'Unknown error'}`);
    } finally {
      setUnlockingNonDisputed(false);
    }
  };

  if (!milestones || milestones.length === 0) {
    return null;
  }

  return (
    <Card variant="outlined" className="p-4 mt-4">
      <h4 className="text-md font-bold text-blue-800 mb-3">Milestones ({milestones.length})</h4>
      <div className="space-y-3">
        {milestones.map((milestone, index) => {
          const isFirstMilestone = index === 0;

          return (
            <MilestoneItem
              key={index}
              milestone={milestone}
              milestones={milestones}
              index={index}
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
            />
          );
        })}

        
        {isPoster && jobState === 'Disputed' && (
          <div className="mt-4 p-3 bg-yellow-50 border-2 border-yellow-300 rounded">
            <p className="text-sm text-yellow-800 mb-2 font-bold">
              ⚠ Job đang có dispute - Bạn có thể rút escrow của các milestone không tranh chấp (chưa được thực hiện)
            </p>
            {hasWithdrawableMilestones ? (
              <button
                onClick={handleUnlockNonDisputedMilestones}
                disabled={unlockingNonDisputed}
                className="bg-yellow-600 text-black hover:bg-yellow-700 text-sm px-4 py-2 rounded border-2 border-yellow-700 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {unlockingNonDisputed ? 'Đang rút...' : 'Rút Escrow Các Milestone Không Tranh Chấp'}
              </button>
            ) : (
              <p className="text-sm text-gray-600 font-bold">
                ✓ Đã rút hết escrow của các milestone có thể rút
              </p>
            )}
          </div>
        )}

        <JobCancelActions
          jobId={jobId}
          account={account}
          poster={poster}
          freelancer={freelancer}
          canInteract={canInteract}
          isCancelled={isCancelled}
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
      </div>
    </Card>
  );
};
