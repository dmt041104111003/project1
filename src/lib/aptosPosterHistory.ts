import {
  getJobCreatedEvents,
  getJobAppliedEvents,
  getJobStateChangedEvents,
  getClaimTimeoutEvents,
  getMilestoneAcceptedEvents,
  getMilestoneRejectedEvents,
} from './aptosEvents';

export interface PosterJobHistory {
  jobId: number;
  poster: string;
  cid: string;
  totalAmount: number;
  createdAt: number;
  status: 'completed' | 'claimed_timeout' | 'cancelled' | 'in_progress' | 'pending_approval' | 'posted' | 'expired';
  freelancer?: string | null;
  pendingFreelancer?: string | null;
  reason?: string;
  completedAt?: number;
  claimedAt?: number;
  cancelledAt?: number;
  events: Array<{
    type: string;
    timestamp: number;
    description: string;
  }>;
}

export async function getPosterJobHistory(posterAddress: string, limit: number = 200): Promise<PosterJobHistory[]> {
  const normalizedAddr = posterAddress.toLowerCase();
  
  const [createdEvents, appliedEvents, stateEvents, claimTimeoutEvents, milestoneAcceptedEvents, milestoneRejectedEvents] = await Promise.all([
    getJobCreatedEvents(limit),
    getJobAppliedEvents(limit),
    getJobStateChangedEvents(limit),
    getClaimTimeoutEvents(limit),
    getMilestoneAcceptedEvents(limit),
    getMilestoneRejectedEvents(limit),
  ]);

  const posterJobsMap = new Map<number, { poster: string; cid: string; total_amount: number; created_at: number }>();
  createdEvents.forEach((evt: any) => {
    const jobId = Number(evt?.data?.job_id || 0);
    const poster = String(evt?.data?.poster || '').toLowerCase();
    if (jobId > 0 && poster === normalizedAddr) {
      posterJobsMap.set(jobId, {
        poster: String(evt?.data?.poster || ''),
        cid: String(evt?.data?.cid || ''),
        total_amount: Number(evt?.data?.total_amount || 0),
        created_at: Number(evt?.data?.created_at || 0),
      });
    }
  });

  const appliedJobsMap = new Map<number, { freelancer: string; applied_at: number }>();
  appliedEvents.forEach((evt: any) => {
    const jobId = Number(evt?.data?.job_id || 0);
    if (jobId > 0 && posterJobsMap.has(jobId)) {
      appliedJobsMap.set(jobId, {
        freelancer: String(evt?.data?.freelancer || ''),
        applied_at: Number(evt?.data?.applied_at || 0),
      });
    }
  });

  const jobStateMap = new Map<number, Array<{ state: string; changed_at: number; old_state?: string }>>();
  stateEvents.forEach((evt: any) => {
    const jobId = Number(evt?.data?.job_id || 0);
    if (jobId > 0 && posterJobsMap.has(jobId)) {
      if (!jobStateMap.has(jobId)) {
        jobStateMap.set(jobId, []);
      }
      jobStateMap.get(jobId)!.push({
        state: String(evt?.data?.new_state || ''),
        changed_at: Number(evt?.data?.changed_at || 0),
        old_state: String(evt?.data?.old_state || ''),
      });
    }
  });

  const claimTimeoutMap = new Map<number, { claimed_at: number; milestone_id: number }>();
  claimTimeoutEvents.forEach((evt: any) => {
    const jobId = Number(evt?.data?.job_id || 0);
    if (jobId > 0 && posterJobsMap.has(jobId)) {
      claimTimeoutMap.set(jobId, {
        claimed_at: Number(evt?.data?.claimed_at || 0),
        milestone_id: Number(evt?.data?.milestone_id || 0),
      });
    }
  });

  const completedJobsMap = new Map<number, number>();
  milestoneAcceptedEvents.forEach((evt: any) => {
    const jobId = Number(evt?.data?.job_id || 0);
    if (jobId > 0 && posterJobsMap.has(jobId)) {
      const acceptedAt = Number(evt?.data?.accepted_at || 0);
      const existing = completedJobsMap.get(jobId);
      if (!existing || acceptedAt > existing) {
        completedJobsMap.set(jobId, acceptedAt);
      }
    }
  });

  const history: PosterJobHistory[] = [];

  posterJobsMap.forEach((jobInfo, jobId) => {
    const stateHistory = jobStateMap.get(jobId) || [];
    const sortedStates = stateHistory.sort((a, b) => b.changed_at - a.changed_at);
    const currentState = sortedStates[0]?.state || 'Posted';
    
    const applied = appliedJobsMap.get(jobId);
    const claimTimeout = claimTimeoutMap.get(jobId);
    const completedAt = completedJobsMap.get(jobId);

    let status: PosterJobHistory['status'] = 'posted';
    let reason: string | undefined;
    let freelancer: string | null = null;
    let pendingFreelancer: string | null = null;
    let claimedAt: number | undefined;
    let cancelledAt: number | undefined;

    const events: PosterJobHistory['events'] = [];

    events.push({
      type: 'created',
      timestamp: jobInfo.created_at,
      description: `Đã tạo công việc #${jobId}`,
    });

    if (applied) {
      events.push({
        type: 'applied',
        timestamp: applied.applied_at,
        description: `Có người apply: ${applied.freelancer.substring(0, 10)}...`,
      });
      pendingFreelancer = applied.freelancer;
    }

    sortedStates.forEach((stateChange) => {
      if (stateChange.state === 'InProgress') {
        events.push({
          type: 'approved',
          timestamp: stateChange.changed_at,
          description: `Đã phê duyệt ứng viên`,
        });
        freelancer = applied?.freelancer || null;
        pendingFreelancer = null;
      } else if (stateChange.old_state === 'PendingApproval' && stateChange.state === 'Posted') {
        events.push({
          type: 'rejected',
          timestamp: stateChange.changed_at,
          description: `Đã từ chối ứng viên`,
        });
        pendingFreelancer = null;
      } else if (stateChange.state === 'Completed') {
        events.push({
          type: 'completed',
          timestamp: stateChange.changed_at,
          description: `Đã hoàn thành tất cả milestones`,
        });
      } else if (stateChange.state === 'Cancelled' || stateChange.state === 'CancelledByPoster') {
        events.push({
          type: 'cancelled',
          timestamp: stateChange.changed_at,
          description: `Đã hủy công việc`,
        });
      } else if (stateChange.state === 'Expired') {
        events.push({
          type: 'expired',
          timestamp: stateChange.changed_at,
          description: `Công việc đã hết hạn`,
        });
      }
    });

    if (claimTimeout) {
      events.push({
        type: 'claimed_timeout',
        timestamp: claimTimeout.claimed_at,
        description: `Đã đòi quá hạn milestone #${claimTimeout.milestone_id}`,
      });
      claimedAt = claimTimeout.claimed_at;
    }

    if (currentState === 'Completed') {
      status = 'completed';
      reason = 'Đã hoàn thành tất cả milestones.';
    } else if (claimTimeout) {
      status = 'claimed_timeout';
      reason = `Đã đòi quá hạn milestone #${claimTimeout.milestone_id}. Job đã được mở lại.`;
    } else if (currentState === 'Cancelled' || currentState === 'CancelledByPoster') {
      status = 'cancelled';
      reason = currentState === 'CancelledByPoster' 
        ? 'Bạn đã hủy công việc.' 
        : 'Công việc đã bị hủy.';
      const cancelledState = sortedStates.find(s => s.state === 'Cancelled' || s.state === 'CancelledByPoster');
      cancelledAt = cancelledState?.changed_at;
    } else if (currentState === 'InProgress') {
      status = 'in_progress';
      reason = 'Đang trong quá trình thực hiện.';
    } else if (currentState === 'PendingApproval') {
      status = 'pending_approval';
      reason = 'Đang chờ bạn phê duyệt ứng viên.';
    } else if (currentState === 'Expired') {
      status = 'expired';
      reason = 'Công việc đã hết hạn apply.';
    } else {
      status = 'posted';
      reason = 'Đang chờ người apply.';
    }

    events.sort((a, b) => b.timestamp - a.timestamp);

    history.push({
      jobId,
      poster: jobInfo.poster,
      cid: jobInfo.cid,
      totalAmount: jobInfo.total_amount,
      createdAt: jobInfo.created_at,
      status,
      freelancer,
      pendingFreelancer,
      reason,
      completedAt,
      claimedAt,
      cancelledAt,
      events: events.slice(0, 10),
    });
  });

  return history.sort((a, b) => b.createdAt - a.createdAt);
}

