import { useState } from 'react';
import { toast } from 'sonner';
import { useWallet } from '@/contexts/WalletContext';

const executeTransaction = async (payload: unknown): Promise<string> => {
  if (payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string') {
    throw new Error(payload.error);
  }
  const wallet = (window as { aptos?: { signAndSubmitTransaction: (p: unknown) => Promise<{ hash?: string }> } }).aptos;
  if (!wallet) throw new Error('Không tìm thấy ví');
  const tx = await wallet.signAndSubmitTransaction(payload);
  return tx?.hash || 'N/A';
};

export function useMilestoneHandlers(
  jobId: number,
  isPoster: boolean,
  isFreelancer: boolean,
  onUpdate?: () => void
) {
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
  const [openingDisputeId, setOpeningDisputeId] = useState<number | null>(null);
  const [submittingEvidenceId, setSubmittingEvidenceId] = useState<number | null>(null);
  const [unlockingNonDisputed, setUnlockingNonDisputed] = useState(false);
  const [claimedMilestones, setClaimedMilestones] = useState<Set<number>>(new Set());

  const handleSubmitMilestone = async (milestoneId: number, evidenceCid: string) => {
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
      window.dispatchEvent(new CustomEvent('jobsUpdated'));
      setTimeout(() => onUpdate?.(), 1000);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Lỗi không xác định';
      toast.error(`Lỗi: ${errorMessage}`);
      return false;
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
      window.dispatchEvent(new CustomEvent('jobsUpdated'));
      setTimeout(() => onUpdate?.(), 1000);
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
            window.dispatchEvent(new CustomEvent('jobsUpdated'));
            setTimeout(() => onUpdate?.(), 1000);
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

  const handleOpenDispute = async (milestoneId: number, evidenceCid: string) => {
    if (!account || (!isPoster && !isFreelancer)) return;
    if (!evidenceCid.trim()) {
      toast.error('Vui lòng upload CID bằng chứng trước khi mở tranh chấp');
      return;
    }
    try {
      setOpeningDisputeId(milestoneId);
      const { disputeHelpers } = await import('@/utils/contractHelpers');
      const payload = disputeHelpers.openDispute(jobId, milestoneId, evidenceCid);
      const txHash = await executeTransaction(payload);
      toast.success(`Mở tranh chấp thành công! TX: ${txHash}`);
      window.dispatchEvent(new CustomEvent('jobsUpdated'));
      setTimeout(() => onUpdate?.(), 1000);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Lỗi không xác định';
      toast.error(`Lỗi: ${errorMessage}`);
      return false;
    } finally {
      setOpeningDisputeId(null);
    }
  };

  const handleSubmitEvidence = async (milestoneId: number, evidenceCid: string) => {
    if (!account) return;
    if (!evidenceCid.trim()) {
      toast.error('Vui lòng upload CID bằng chứng trước khi gửi');
      return;
    }
    try {
      setSubmittingEvidenceId(milestoneId);
      const { getDisputeOpenedEvents } = await import('@/lib/aptosClient');
      const openedEvents = await getDisputeOpenedEvents(200);
      const disputeEvent = openedEvents.find((e: any) => Number(e?.data?.job_id || 0) === Number(jobId));
      if (!disputeEvent) throw new Error('Không tìm thấy dispute cho job này');
      const disputeId = Number(disputeEvent?.data?.dispute_id || 0);
      if (!disputeId) throw new Error('Không tìm thấy dispute_id cho job này');

      const { disputeHelpers } = await import('@/utils/contractHelpers');
      const payload = disputeHelpers.addEvidence(disputeId, evidenceCid);
      const txHash = await executeTransaction(payload);
      toast.success(`Đã gửi bằng chứng cho tranh chấp! TX: ${txHash}`);
      window.dispatchEvent(new CustomEvent('jobsUpdated'));
      setTimeout(() => onUpdate?.(), 1000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Lỗi không xác định';
      toast.error(`Lỗi: ${errorMessage}`);
    } finally {
      setSubmittingEvidenceId(null);
    }
  };

  const handleClaimDispute = async (milestoneId: number, disputeWinner: boolean | null) => {
    if (!account || disputeWinner === null) return;
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
      
      const { clearJobEventsCache, clearDisputeEventsCache } = await import('@/lib/aptosClient');
      const { clearJobTableCache } = await import('@/lib/aptosClientCore');
      clearJobEventsCache();
      clearDisputeEventsCache();
      clearJobTableCache();
      
      window.dispatchEvent(new CustomEvent('jobsUpdated'));
      setTimeout(() => {
        onUpdate?.();
        setClaimedMilestones(prev => {
          const newSet = new Set(prev);
          newSet.delete(milestoneId);
          return newSet;
        });
      }, 3000);
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

  const handleClaimTimeout = async (milestoneId: number, milestone: any, reviewTimeout: boolean) => {
    if (!account) return;
    
    if (isPoster && milestone) {
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
              window.dispatchEvent(new CustomEvent('jobsUpdated'));
              setTimeout(() => onUpdate?.(), 1000);
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
    } else if (isFreelancer && reviewTimeout) {
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
              window.dispatchEvent(new CustomEvent('jobsUpdated'));
              setTimeout(() => onUpdate?.(), 1000);
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

  const handleMutualCancel = async (jobState: string, hasDisputeId: boolean, disputeWinner: boolean | null) => {
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
            window.dispatchEvent(new CustomEvent('jobsUpdated'));
            setTimeout(() => onUpdate?.(), 1000);
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

  const handleAcceptMutualCancel = async (jobState: string, hasDisputeId: boolean, disputeWinner: boolean | null) => {
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
            window.dispatchEvent(new CustomEvent('jobsUpdated'));
            setTimeout(() => onUpdate?.(), 1000);
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
            window.dispatchEvent(new CustomEvent('jobsUpdated'));
            setTimeout(() => onUpdate?.(), 1000);
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

  const handleFreelancerWithdraw = async (jobState: string, hasDisputeId: boolean, disputeWinner: boolean | null) => {
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
            window.dispatchEvent(new CustomEvent('jobsUpdated'));
            setTimeout(() => onUpdate?.(), 1000);
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

  const handleAcceptFreelancerWithdraw = async (jobState: string, hasDisputeId: boolean, disputeWinner: boolean | null) => {
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
            window.dispatchEvent(new CustomEvent('jobsUpdated'));
            setTimeout(() => onUpdate?.(), 1000);
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
            window.dispatchEvent(new CustomEvent('jobsUpdated'));
            setTimeout(() => onUpdate?.(), 1000);
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

  const handleUnlockNonDisputedMilestones = async (jobState: string) => {
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
      
      const { clearJobEventsCache } = await import('@/lib/aptosClient');
      const { clearJobTableCache } = await import('@/lib/aptosClientCore');
      clearJobEventsCache();
      clearJobTableCache();
      
      window.dispatchEvent(new CustomEvent('jobsUpdated'));
      setTimeout(() => onUpdate?.(), 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Lỗi không xác định';
      toast.error(`Lỗi: ${errorMessage}`);
    } finally {
      setUnlockingNonDisputed(false);
    }
  };

  return {
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
    handleSubmitMilestone,
    handleConfirmMilestone,
    handleRejectMilestone,
    handleOpenDispute,
    handleSubmitEvidence,
    handleClaimDispute,
    handleClaimTimeout,
    handleMutualCancel,
    handleAcceptMutualCancel,
    handleRejectMutualCancel,
    handleFreelancerWithdraw,
    handleAcceptFreelancerWithdraw,
    handleRejectFreelancerWithdraw,
    handleUnlockNonDisputedMilestones,
  };
}

