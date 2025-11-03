"use client";

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { useWallet } from '@/contexts/WalletContext';
import { toast } from 'sonner';
import { MilestoneItem } from './milestones/MilestoneItem';
import { JobCancelActions } from './milestones/JobCancelActions';
import { parseStatus } from './milestones/MilestoneUtils';

interface Milestone {
  id: string;
  amount: string;
  duration?: string;
  deadline: string;
  review_period?: string;
  review_deadline?: string;
  status: string;
  evidence_cid?: { vec?: string[] } | string | null;
}

interface MilestonesListProps {
  jobId: number;
  milestones: Milestone[];
  poster: string;
  freelancer: string | null;
  jobState: string;
  mutualCancelRequestedBy?: string | null;
  freelancerWithdrawRequestedBy?: string | null;
  onUpdate?: () => void;
}

const executeTransaction = async (payload: any): Promise<string> => {
  if (payload.error) throw new Error(payload.error);
  const wallet = (window as any).aptos;
  if (!wallet) throw new Error('Wallet not found');
  const tx = await wallet.signAndSubmitTransaction({
    type: "entry_function_payload",
    function: payload.function,
    type_arguments: payload.type_args || [],
    arguments: payload.args
  });
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

  const isPoster = account?.toLowerCase() === poster?.toLowerCase();
  const isFreelancer = account && freelancer && account.toLowerCase() === freelancer.toLowerCase();
  const canInteract = jobState === 'InProgress' || jobState === 'Posted';
  const isCancelled = jobState === 'Cancelled';

  const handleFileUploaded = (milestoneId: number, cid: string) => {
    setEvidenceCids(prev => ({ ...prev, [milestoneId]: cid }));
  };

  const handleSubmitMilestone = async (milestoneId: number) => {
    const evidenceCid = evidenceCids[milestoneId] || '';
    if (!account || !isFreelancer || !evidenceCid.trim()) {
      toast.error('Vui lòng upload file evidence trước');
      return;
    }

    try {
      setSubmittingId(milestoneId);
      const res = await fetch('/api/job/milestone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit',
          job_id: jobId,
          milestone_id: milestoneId,
          evidence_cid: evidenceCid.trim()
        })
      });
      const payload = await res.json();
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
      const res = await fetch('/api/job/milestone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm',
          job_id: jobId,
          milestone_id: milestoneId
        })
      });
      const payload = await res.json();
      const txHash = await executeTransaction(payload);
      toast.success(`Confirm milestone thành công! TX: ${txHash}`);
      setTimeout(() => onUpdate?.(), 2000);
    } catch (err: any) {
      console.error('[MilestonesList] Confirm error:', err);
      toast.error(`Lỗi: ${err?.message || 'Unknown error'}`);
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
            const res = await fetch('/api/job/milestone', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'reject',
                job_id: jobId,
                milestone_id: milestoneId
              })
            });
            const payload = await res.json();
            const txHash = await executeTransaction(payload);
            toast.success(`Reject milestone thành công! TX: ${txHash}`);
            setTimeout(() => onUpdate?.(), 2000);
          } catch (err: any) {
            console.error('[MilestonesList] Reject error:', err);
            toast.error(`Lỗi: ${err?.message || 'Unknown error'}`);
          } finally {
            setRejectingId(null);
          }
        }
      },
      cancel: { label: 'Hủy', onClick: () => {} },
      duration: 10000
    });
  };

  const handleClaimTimeout = async (milestoneId: number, isFreelancerClaiming?: boolean) => {
    if (!account) return;
    
    const milestone = milestones.find(m => Number(m.id) === milestoneId);
    const statusStr = milestone ? parseStatus(milestone.status) : '';
    const reviewDeadline = milestone?.review_deadline ? Number(milestone.review_deadline) : 0;
    const reviewTimeout = reviewDeadline > 0 && reviewDeadline * 1000 < Date.now();
    
    // Poster can claim when milestone is Pending and deadline passed
    // Freelancer can claim when milestone is Submitted and review deadline passed
    if (isPoster && statusStr === 'Pending') {
      toast.warning('Bạn có chắc muốn claim timeout? Freelancer sẽ mất stake và job sẽ mở lại cho người khác apply.', {
        action: {
          label: 'Xác nhận',
          onClick: async () => {
            try {
              setClaimingId(milestoneId);
              const res = await fetch('/api/job/milestone', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'claim_timeout',
                  job_id: jobId,
                  milestone_id: milestoneId
                })
              });
              const payload = await res.json();
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
              const res = await fetch('/api/job/milestone', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'claim_timeout',
                  job_id: jobId,
                  milestone_id: milestoneId
                })
              });
              const payload = await res.json();
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
    toast.warning('Bạn có chắc muốn yêu cầu hủy job? Freelancer sẽ được thông báo để xác nhận.', {
      action: {
        label: 'Xác nhận',
        onClick: async () => {
          try {
            setCancelling(true);
            const res = await fetch('/api/job/cancel', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'mutual_cancel',
                job_id: jobId
              })
            });
            const payload = await res.json();
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
    toast.warning('Bạn có chắc muốn chấp nhận hủy job? Poster sẽ nhận escrow, cả 2 stake sẽ về bạn.', {
      action: {
        label: 'Xác nhận',
        onClick: async () => {
          try {
            setAcceptingCancel(true);
            const res = await fetch('/api/job/cancel', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'accept_mutual_cancel',
                job_id: jobId
              })
            });
            const payload = await res.json();
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
            const res = await fetch('/api/job/cancel', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'reject_mutual_cancel',
                job_id: jobId
              })
            });
            const payload = await res.json();
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
    toast.warning('Bạn có chắc muốn yêu cầu rút? Poster sẽ được thông báo để xác nhận. Nếu được chấp nhận, bạn sẽ mất stake (1 APT) và job sẽ mở lại.', {
      action: {
        label: 'Xác nhận',
        onClick: async () => {
          try {
            setWithdrawing(true);
            const res = await fetch('/api/job/withdraw', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'freelancer_withdraw',
                job_id: jobId
              })
            });
            const payload = await res.json();
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
    toast.warning('Bạn có chắc muốn chấp nhận freelancer rút? Freelancer sẽ mất stake (1 APT) về bạn và job sẽ mở lại.', {
      action: {
        label: 'Xác nhận',
        onClick: async () => {
          try {
            setAcceptingWithdraw(true);
            const res = await fetch('/api/job/withdraw', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'accept_freelancer_withdraw',
                job_id: jobId
              })
            });
            const payload = await res.json();
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
            const res = await fetch('/api/job/withdraw', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'reject_freelancer_withdraw',
                job_id: jobId
              })
            });
            const payload = await res.json();
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

  if (!milestones || milestones.length === 0) {
    return null;
  }

  return (
    <Card variant="outlined" className="p-4 mt-4">
      <h4 className="text-md font-bold text-blue-800 mb-3">Milestones ({milestones.length})</h4>
      <div className="space-y-3">
        {milestones.map((milestone, index) => {
          const isFirstMilestone = index === 0;
          const prevMilestone = index > 0 ? milestones[index - 1] : null;
          const prevStatusStr = prevMilestone ? parseStatus(prevMilestone.status) : null;
          const prevMilestoneAccepted = prevStatusStr === 'Accepted';

          return (
            <MilestoneItem
              key={index}
              milestone={milestone}
              index={index}
              jobId={jobId}
              account={account}
              poster={poster}
              freelancer={freelancer}
              jobState={jobState}
              canInteract={canInteract}
              isCancelled={isCancelled}
              isFirstMilestone={isFirstMilestone}
              prevMilestoneAccepted={prevMilestoneAccepted}
              submitting={submittingId === Number(milestone.id)}
              confirming={confirmingId === Number(milestone.id)}
              rejecting={rejectingId === Number(milestone.id)}
              claiming={claimingId === Number(milestone.id)}
              evidenceCid={evidenceCids[Number(milestone.id)]}
              onFileUploaded={handleFileUploaded}
              onSubmitMilestone={handleSubmitMilestone}
              onConfirmMilestone={handleConfirmMilestone}
              onRejectMilestone={handleRejectMilestone}
              onClaimTimeout={(milestoneId: number) => handleClaimTimeout(milestoneId)}
            />
          );
        })}

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
