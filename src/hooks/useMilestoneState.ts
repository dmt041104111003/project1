import { useMemo } from 'react';
import { parseStatus } from '@/components/dashboard/MilestoneUtils';

export function useMilestoneState(
  milestones: any[],
  jobState: string,
  hasDisputeId: boolean
) {
  const nowMs = Date.now();

  const hasWithdrawableMilestones = useMemo(() => {
    return milestones.some(m => {
      const status = parseStatus(m.status);
      return status === 'Pending' || status === 'Submitted';
    });
  }, [milestones]);

  const hasPendingConfirmMilestone = useMemo(() => {
    return milestones.some(m => {
      const status = parseStatus(m.status);
      return status === 'Submitted';
    });
  }, [milestones]);

  const hasExpiredMilestone = useMemo(() => {
    return milestones.some(m => {
      const deadline = Number(m.deadline || 0);
      if (!deadline) return false;
      const status = parseStatus(m.status);
      const isAccepted = status === 'Accepted';
      return deadline * 1000 < nowMs && !isAccepted;
    });
  }, [milestones, nowMs]);

  const shouldHideCancelActions = useMemo(() => {
    return hasPendingConfirmMilestone || hasDisputeId || jobState === 'Disputed';
  }, [hasPendingConfirmMilestone, hasDisputeId, jobState]);

  return {
    hasWithdrawableMilestones,
    hasPendingConfirmMilestone,
    hasExpiredMilestone,
    shouldHideCancelActions,
  };
}

