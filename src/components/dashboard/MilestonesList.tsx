"use client";

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import { useWallet } from '@/contexts/WalletContext';
import { toast } from 'sonner';
import { MilestoneItem } from './milestones/MilestoneItem';
import { JobCancelActions } from './milestones/JobCancelActions';
import { parseStatus } from './milestones/MilestoneUtils';
import { MilestonesListProps } from '@/constants/escrow';
import { formatAddress, copyAddress } from '@/utils/addressUtils';

const MILESTONES_PER_PAGE = 4;

const executeTransaction = async (payload: unknown): Promise<string> => {
  if (payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string') {
    throw new Error(payload.error);
  }
  const wallet = (window as { aptos?: { signAndSubmitTransaction: (p: unknown) => Promise<{ hash?: string }> } }).aptos;
  if (!wallet) throw new Error('Không tìm thấy ví');
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
  const [claimedMilestones, setClaimedMilestones] = useState<Set<number>>(new Set());
  const [milestonePage, setMilestonePage] = useState(0);

  const isPoster = account?.toLowerCase() === poster?.toLowerCase();
  const isFreelancer = account && freelancer && account.toLowerCase() === freelancer.toLowerCase();
  const canInteract = jobState === 'InProgress' || jobState === 'Posted' || jobState === 'Disputed';
  const isCancelled = jobState === 'Cancelled';
  
  const nowMs = Date.now();

  const hasWithdrawableMilestones = milestones.some(m => {
    const status = parseStatus(m.status);
    return status === 'Pending' || status === 'Submitted';
  });

  const hasPendingConfirmMilestone = milestones.some(m => {
    const status = parseStatus(m.status);
    return status === 'Submitted';
  });

  const hasExpiredMilestone = milestones.some(m => {
    const deadline = Number(m.deadline || 0);
    if (!deadline) return false;
    const status = parseStatus(m.status);
    const isAccepted = status === 'Accepted';
    return deadline * 1000 < nowMs && !isAccepted;
  });

  const shouldHideCancelActions =
    hasPendingConfirmMilestone || hasDisputeId || jobState === 'Disputed' || hasExpiredMilestone;

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

  React.useEffect(() => {
    const load = async () => {
      try {
        const { getJobData, getDisputeSummary } = await import('@/lib/aptosClient');
        const { parseOptionBool } = await import('@/lib/aptosParsers');
        
        const rawJobData = await getJobData(Number(jobId));
        if (!rawJobData) return;
        
        const opt = rawJobData?.dispute_id;
        const exists = Array.isArray(opt?.vec) ? opt.vec.length > 0 : Boolean(opt);
        setHasDisputeId(!!exists);
        const did = exists ? (Array.isArray(opt?.vec) ? Number(opt.vec[0]) : Number(opt)) : 0;
        let finalWinner: boolean | null = null;
        let votesDone = false;
        
        const winnerFromJob = parseOptionBool(rawJobData?.dispute_winner);
        if (winnerFromJob !== null) {
          finalWinner = winnerFromJob;
          votesDone = true;
        }
        
        if (finalWinner === null && did) {
          const summary = await getDisputeSummary(did);
          if (summary) {
            if (typeof summary.winner === 'boolean') {
              finalWinner = summary.winner;
              votesDone = true;
            } else {
              const totalVotes = Number(summary.counts?.total || 0);
              votesDone = totalVotes >= 3;
            }
          }
        }
        
        setDisputeVotesDone(votesDone);
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
      toast.success(`Nộp cột mốc thành công! TX: ${txHash}`);
      setEvidenceCids(prev => {
        const updated = { ...prev };
        delete updated[milestoneId];
        return updated;
      });
      setTimeout(() => onUpdate?.(), 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Lỗi không xác định';
      toast.error(`Lỗi: ${errorMessage}`);
    } finally {
      setSubmittingId(null);
    }
  };

  const handleConfirmMilestone = async (milestoneId: number) => {
    if (!account || !isPoster) return;
      try {
        setConfirmingId(milestoneId);
        try {
          const { getParsedJobData } = await import('@/lib/aptosClient');
          const jobData = await getParsedJobData(Number(jobId));
          if (jobData) {
            const milestone = jobData?.milestones?.find((m: { id: string | number }) => Number(m.id) === milestoneId);
            if (milestone) {
              const reviewDeadline = Number(milestone.review_deadline || 0);
              const now = Math.floor(Date.now() / 1000);
              if (reviewDeadline > 0 && now > reviewDeadline) {
                throw new Error('Hạn đánh giá đã hết. Bạn không thể xác nhận hoặc từ chối cột mốc này nữa. Người làm tự do có thể yêu cầu hết hạn.');
              }
            }
          }
        } catch (err) {
          if (err instanceof Error && err.message.includes('Review deadline')) {
            throw err;
          }
        }
      
      const { escrowHelpers } = await import('@/utils/contractHelpers');
      const payload = escrowHelpers.confirmMilestone(jobId, milestoneId);
      const txHash = await executeTransaction(payload);
      toast.success(`Xác nhận cột mốc thành công! TX: ${txHash}`);
      setTimeout(() => onUpdate?.(), 2000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Lỗi không xác định';
      if (errorMsg.includes('Review deadline has passed')) {
        toast.error('Đã hết thời gian đánh giá. Bạn không thể xác nhận cột mốc này nữa. Người làm tự do có thể yêu cầu hết hạn.');
      } else {
        toast.error(`Lỗi: ${errorMsg}`);
      }
    } finally {
      setConfirmingId(null);
    }
  };

  const handleRejectMilestone = async (milestoneId: number) => {
    if (!account || !isPoster) return;
    toast.warning('Bạn có chắc muốn từ chối cột mốc này? Việc này sẽ mở tranh chấp.', {
      action: {
        label: 'Xác nhận',
        onClick: async () => {
          try {
            setRejectingId(milestoneId);
            try {
              const { getParsedJobData } = await import('@/lib/aptosClient');
              const jobData = await getParsedJobData(Number(jobId));
              if (jobData) {
                const milestone = jobData?.milestones?.find((m: { id: string | number }) => Number(m.id) === milestoneId);
                if (milestone) {
                  const reviewDeadline = Number(milestone.review_deadline || 0);
                  const now = Math.floor(Date.now() / 1000);
                  if (reviewDeadline > 0 && now > reviewDeadline) {
                    throw new Error('Hạn đánh giá đã hết. Bạn không thể xác nhận hoặc từ chối cột mốc này nữa. Người làm tự do có thể yêu cầu hết hạn.');
                  }
                }
              }
            } catch (err) {
              if (err instanceof Error && err.message.includes('Review deadline')) {
                throw err;
              }
            }
            
            const { escrowHelpers } = await import('@/utils/contractHelpers');
            const payload = escrowHelpers.rejectMilestone(jobId, milestoneId);
            const txHash = await executeTransaction(payload);
            toast.success(`Từ chối cột mốc thành công! TX: ${txHash}`);
            setTimeout(() => onUpdate?.(), 2000);
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Lỗi không xác định';
            if (errorMsg.includes('Review deadline has passed')) {
              toast.error('Đã hết thời gian đánh giá. Bạn không thể từ chối cột mốc này nữa. Người làm tự do có thể yêu cầu hết hạn.');
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
      toast.error('Vui lòng upload CID bằng chứng trước khi mở tranh chấp');
      return;
    }
    try {
      setOpeningDisputeId(milestoneId);
      const { disputeHelpers } = await import('@/utils/contractHelpers');
      const payload = disputeHelpers.openDispute(jobId, milestoneId, evidenceCid);
      const txHash = await executeTransaction(payload);
      toast.success(`Mở tranh chấp thành công! TX: ${txHash}`);
      setHasDisputeId(true);
      setTimeout(() => onUpdate?.(), 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Lỗi không xác định';
      toast.error(`Lỗi: ${errorMessage}`);
    } finally {
      setOpeningDisputeId(null);
    }
  };

  const handleSubmitEvidence = async (milestoneId: number) => {
    if (!account) return;
    const evidenceCid = (disputeEvidenceCids[milestoneId] || '').trim();
    if (!evidenceCid) {
      toast.error('Vui lòng upload CID bằng chứng trước khi gửi');
      return;
    }
    try {
      setSubmittingEvidenceId(milestoneId);
      const { getJobData } = await import('@/lib/aptosClient');
      const rawJobData = await getJobData(Number(jobId));
      if (!rawJobData) throw new Error('Không tìm thấy job');
      const disputeOpt = rawJobData?.dispute_id;
      const disputeId = Array.isArray(disputeOpt?.vec) ? Number(disputeOpt.vec[0]) : Number(disputeOpt);
      if (!disputeId) throw new Error('Không tìm thấy dispute_id cho job này');

      const { disputeHelpers } = await import('@/utils/contractHelpers');
      const payload = disputeHelpers.addEvidence(disputeId, evidenceCid);
      const txHash = await executeTransaction(payload);
      toast.success(`Đã gửi bằng chứng cho tranh chấp! TX: ${txHash}`);
      setTimeout(() => onUpdate?.(), 1500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Lỗi không xác định';
      toast.error(`Lỗi: ${errorMessage}`);
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
      setClaimedMilestones(prev => new Set(prev).add(milestoneId));
      
      const { escrowHelpers } = await import('@/utils/contractHelpers');
      const payload = isWinnerFreelancer 
        ? escrowHelpers.claimDisputePayment(jobId, milestoneId)
        : escrowHelpers.claimDisputeRefund(jobId, milestoneId);
      const txHash = await executeTransaction(payload);
      toast.success(`Đã yêu cầu tranh chấp ${isWinnerFreelancer ? 'thanh toán' : 'hoàn tiền'}! TX: ${txHash}`);
      setTimeout(() => {
        onUpdate?.();
        setClaimedMilestones(prev => {
          const newSet = new Set(prev);
          newSet.delete(milestoneId);
          return newSet;
        });
      }, 1500);
    } catch (err) {
      setClaimedMilestones(prev => {
        const newSet = new Set(prev);
        newSet.delete(milestoneId);
        return newSet;
      });
      const errorMessage = err instanceof Error ? err.message : 'Lỗi không xác định';
      toast.error(`Lỗi: ${errorMessage}`);
    }
  };

  const handleClaimTimeout = async (milestoneId: number) => {
    if (!account) return;
    
    const milestone = milestones.find(m => Number(m.id) === milestoneId);
    const statusStr = milestone ? parseStatus(milestone.status) : '';
    const reviewDeadline = milestone?.review_deadline ? Number(milestone.review_deadline) : 0;
    const reviewTimeout = reviewDeadline > 0 && reviewDeadline * 1000 < Date.now();
    if (isPoster && statusStr === 'Pending') {
      toast.warning('Bạn có chắc muốn yêu cầu hết hạn? Người làm tự do sẽ mất cọc và công việc sẽ mở lại cho người khác ứng tuyển.', {
        action: {
          label: 'Xác nhận',
          onClick: async () => {
            try {
              setClaimingId(milestoneId);
              const { escrowHelpers } = await import('@/utils/contractHelpers');
              const payload = escrowHelpers.claimTimeout(jobId, milestoneId);
              const txHash = await executeTransaction(payload);
              toast.success(`Yêu cầu hết hạn thành công! TX: ${txHash}`);
              setTimeout(() => onUpdate?.(), 2000);
            } catch (err) {
              const errorMessage = err instanceof Error ? err.message : 'Lỗi không xác định';
              toast.error(`Lỗi: ${errorMessage}`);
            } finally {
              setClaimingId(null);
            }
          }
        },
        cancel: { label: 'Hủy', onClick: () => {} },
        duration: 10000
      });
    } else if (isFreelancer && statusStr === 'Submitted' && reviewTimeout) {
      toast.warning('Bạn có chắc muốn yêu cầu hết hạn? Người thuê không phản hồi trong thời gian quy định, cột mốc sẽ tự động được chấp nhận và bạn sẽ nhận thanh toán.', {
        action: {
          label: 'Xác nhận',
          onClick: async () => {
            try {
              setClaimingId(milestoneId);
              const { escrowHelpers } = await import('@/utils/contractHelpers');
              const payload = escrowHelpers.claimTimeout(jobId, milestoneId);
              const txHash = await executeTransaction(payload);
              toast.success(`Yêu cầu hết hạn thành công! Cột mốc đã được chấp nhận và thanh toán đã được gửi. TX: ${txHash}`);
              setTimeout(() => onUpdate?.(), 2000);
            } catch (err) {
              const errorMessage = err instanceof Error ? err.message : 'Lỗi không xác định';
              toast.error(`Lỗi: ${errorMessage}`);
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
      toast.error('Không thể yêu cầu hủy công việc khi đang có tranh chấp. Vui lòng giải quyết tranh chấp trước.');
      return;
    }
    toast.warning('Bạn có chắc muốn yêu cầu hủy công việc? Người làm tự do sẽ được thông báo để xác nhận.', {
      action: {
        label: 'Xác nhận',
        onClick: async () => {
          try {
            setCancelling(true);
            const { escrowHelpers } = await import('@/utils/contractHelpers');
            const payload = escrowHelpers.mutualCancel(jobId);
            const txHash = await executeTransaction(payload);
            toast.success(`Đã gửi yêu cầu hủy công việc! TX: ${txHash}`);
            setTimeout(() => onUpdate?.(), 2000);
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Lỗi không xác định';
            toast.error(`Lỗi: ${errorMessage}`);
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
      toast.error('Không thể chấp nhận hủy công việc khi đang có tranh chấp. Vui lòng giải quyết tranh chấp trước.');
      return;
    }
    toast.warning('Bạn có chắc muốn chấp nhận hủy công việc? Người thuê sẽ nhận ký quỹ, cả 2 cọc sẽ về bạn.', {
      action: {
        label: 'Xác nhận',
        onClick: async () => {
          try {
            setAcceptingCancel(true);
            const { escrowHelpers } = await import('@/utils/contractHelpers');
            const payload = escrowHelpers.acceptMutualCancel(jobId);
            const txHash = await executeTransaction(payload);
            toast.success(`Chấp nhận hủy công việc thành công! TX: ${txHash}`);
            setTimeout(() => onUpdate?.(), 2000);
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Lỗi không xác định';
            toast.error(`Lỗi: ${errorMessage}`);
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
    toast.warning('Bạn có chắc muốn từ chối hủy công việc? Công việc sẽ tiếp tục bình thường.', {
      action: {
        label: 'Xác nhận',
        onClick: async () => {
          try {
            setRejectingCancel(true);
            const { escrowHelpers } = await import('@/utils/contractHelpers');
            const payload = escrowHelpers.rejectMutualCancel(jobId);
            const txHash = await executeTransaction(payload);
            toast.success(`Đã từ chối hủy công việc. Công việc sẽ tiếp tục! TX: ${txHash}`);
            setTimeout(() => onUpdate?.(), 2000);
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Lỗi không xác định';
            toast.error(`Lỗi: ${errorMessage}`);
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
      toast.error('Không thể yêu cầu rút khi đang có tranh chấp. Vui lòng giải quyết tranh chấp trước.');
      return;
    }
    toast.warning('Bạn có chắc muốn yêu cầu rút? Người thuê sẽ được thông báo để xác nhận. Nếu được chấp nhận, bạn sẽ mất cọc (1 APT) và công việc sẽ mở lại.', {
      action: {
        label: 'Xác nhận',
        onClick: async () => {
          try {
            setWithdrawing(true);
            const { escrowHelpers } = await import('@/utils/contractHelpers');
            const payload = escrowHelpers.freelancerWithdraw(jobId);
            const txHash = await executeTransaction(payload);
            toast.success(`Đã gửi yêu cầu rút! Đang chờ người thuê xác nhận. TX: ${txHash}`);
            setTimeout(() => onUpdate?.(), 2000);
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Lỗi không xác định';
            toast.error(`Lỗi: ${errorMessage}`);
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
      toast.error('Không thể chấp nhận người làm tự do rút khi đang có tranh chấp. Vui lòng giải quyết tranh chấp trước.');
      return;
    }
    toast.warning('Bạn có chắc muốn chấp nhận người làm tự do rút? Người làm tự do sẽ mất cọc (1 APT) về bạn và công việc sẽ mở lại.', {
      action: {
        label: 'Xác nhận',
        onClick: async () => {
          try {
            setAcceptingWithdraw(true);
            const { escrowHelpers } = await import('@/utils/contractHelpers');
            const payload = escrowHelpers.acceptFreelancerWithdraw(jobId);
            const txHash = await executeTransaction(payload);
            toast.success(`Chấp nhận người làm tự do rút thành công! TX: ${txHash}`);
            setTimeout(() => onUpdate?.(), 2000);
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Lỗi không xác định';
            toast.error(`Lỗi: ${errorMessage}`);
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
    toast.warning('Bạn có chắc muốn từ chối người làm tự do rút? Công việc sẽ tiếp tục bình thường.', {
      action: {
        label: 'Xác nhận',
        onClick: async () => {
          try {
            setRejectingWithdraw(true);
            const { escrowHelpers } = await import('@/utils/contractHelpers');
            const payload = escrowHelpers.rejectFreelancerWithdraw(jobId);
            const txHash = await executeTransaction(payload);
            toast.success(`Đã từ chối người làm tự do rút. Công việc sẽ tiếp tục! TX: ${txHash}`);
            setTimeout(() => onUpdate?.(), 2000);
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Lỗi không xác định';
            toast.error(`Lỗi: ${errorMessage}`);
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
      toast.error('Chỉ người thuê mới có thể rút ký quỹ');
      return;
    }
    if (jobState !== 'Disputed') {
      toast.error('Công việc phải ở trạng thái Tranh chấp mới có thể rút ký quỹ');
      return;
    }
    try {
      setUnlockingNonDisputed(true);
      const { escrowHelpers } = await import('@/utils/contractHelpers');
      const payload = escrowHelpers.unlockNonDisputedMilestones(jobId);
      const txHash = await executeTransaction(payload);
      toast.success(`Rút ký quỹ các cột mốc không tranh chấp thành công! TX: ${txHash}`);
      setTimeout(() => onUpdate?.(), 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Lỗi không xác định';
      toast.error(`Lỗi: ${errorMessage}`);
    } finally {
      setUnlockingNonDisputed(false);
    }
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

        {!shouldHideCancelActions && (
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
