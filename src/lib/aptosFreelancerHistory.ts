import {
  getJobCreatedEvents,
  getJobAppliedEvents,
  getJobStateChangedEvents,
  getClaimTimeoutEvents,
  getMilestoneAcceptedEvents,
} from './aptosEvents';

export interface FreelancerJobHistory {
  jobId: number;
  poster: string;
  cid: string;
  totalAmount: number;
  appliedAt: number;
  status: 'completed' | 'claimed_timeout' | 'rejected' | 'cancelled' | 'in_progress' | 'pending_approval' | 'posted';
  reason?: string;
  completedAt?: number;
  claimedAt?: number;
}

export async function getFreelancerJobHistory(freelancerAddress: string, limit: number = 200): Promise<FreelancerJobHistory[]> {
  const normalizedAddr = freelancerAddress.toLowerCase();
  
  const [createdEvents, appliedEvents, stateEvents, claimTimeoutEvents, milestoneAcceptedEvents] = await Promise.all([
    getJobCreatedEvents(limit),
    getJobAppliedEvents(limit),
    getJobStateChangedEvents(limit),
    getClaimTimeoutEvents(limit),
    getMilestoneAcceptedEvents(limit),
  ]);

  const appliedJobsMap = new Map<number, { freelancer: string; applied_at: number }>();
  appliedEvents.forEach((evt: any) => {
    const jobId = Number(evt?.data?.job_id || 0);
    const freelancer = String(evt?.data?.freelancer || '').toLowerCase();
    if (jobId > 0 && freelancer === normalizedAddr) {
      appliedJobsMap.set(jobId, {
        freelancer: String(evt?.data?.freelancer || ''),
        applied_at: Number(evt?.data?.applied_at || 0),
      });
    }
  });

  const jobStateMap = new Map<number, { state: string; changed_at: number }>();
  stateEvents.forEach((evt: any) => {
    const jobId = Number(evt?.data?.job_id || 0);
    const newState = String(evt?.data?.new_state || '');
    const changedAt = Number(evt?.data?.changed_at || 0);
    if (jobId > 0 && newState) {
      const existing = jobStateMap.get(jobId);
      if (!existing || changedAt > existing.changed_at) {
        jobStateMap.set(jobId, { state: newState, changed_at: changedAt });
      }
    }
  });

  const claimTimeoutMap = new Map<number, { claimed_at: number; claimed_by: string }>();
  claimTimeoutEvents.forEach((evt: any) => {
    const jobId = Number(evt?.data?.job_id || 0);
    if (jobId > 0) {
      claimTimeoutMap.set(jobId, {
        claimed_at: Number(evt?.data?.claimed_at || 0),
        claimed_by: String(evt?.data?.claimed_by || ''),
      });
    }
  });

  const completedJobsMap = new Map<number, number>();
  milestoneAcceptedEvents.forEach((evt: any) => {
    const jobId = Number(evt?.data?.job_id || 0);
    const acceptedAt = Number(evt?.data?.accepted_at || 0);
    if (jobId > 0) {
      const existing = completedJobsMap.get(jobId);
      if (!existing || acceptedAt > existing) {
        completedJobsMap.set(jobId, acceptedAt);
      }
    }
  });

  const jobCreatedMap = new Map<number, { poster: string; cid: string; total_amount: number; created_at: number }>();
  createdEvents.forEach((evt: any) => {
    const jobId = Number(evt?.data?.job_id || 0);
    if (jobId > 0) {
      jobCreatedMap.set(jobId, {
        poster: String(evt?.data?.poster || ''),
        cid: String(evt?.data?.cid || ''),
        total_amount: Number(evt?.data?.total_amount || 0),
        created_at: Number(evt?.data?.created_at || 0),
      });
    }
  });

  const history: FreelancerJobHistory[] = [];

  appliedJobsMap.forEach((applied, jobId) => {
    const jobInfo = jobCreatedMap.get(jobId);
    if (!jobInfo) return;

    const stateInfo = jobStateMap.get(jobId);
    const currentState = stateInfo?.state || 'Posted';
    const claimTimeout = claimTimeoutMap.get(jobId);
    const lastAcceptedAt = completedJobsMap.get(jobId);

    let status: FreelancerJobHistory['status'] = 'posted';
    let reason: string | undefined;
    let completedAt: number | undefined;
    let claimedAt: number | undefined;

    if (claimTimeout) {
      status = 'claimed_timeout';
      reason = 'Không hoàn thành milestone đúng hạn. Người thuê đã claim tiền cọc.';
      claimedAt = claimTimeout.claimed_at;
    } else if (currentState === 'Completed') {
      status = 'completed';
      reason = 'Đã hoàn thành tất cả milestones.';
      completedAt = lastAcceptedAt;
    } else if (currentState === 'InProgress') {
      status = 'in_progress';
      reason = 'Đang làm việc.';
    } else if (currentState === 'PendingApproval') {
      status = 'pending_approval';
      reason = 'Đang chờ người thuê phê duyệt.';
    } else if (currentState === 'Cancelled' || currentState === 'CancelledByPoster') {
      status = 'cancelled';
      reason = currentState === 'CancelledByPoster' 
        ? 'Người thuê đã hủy công việc.' 
        : 'Công việc đã bị hủy.';
    } else if (currentState === 'Posted') {
      const inProgressState = Array.from(stateEvents)
        .filter((e: any) => Number(e?.data?.job_id || 0) === jobId && e?.data?.new_state === 'InProgress')
        .sort((a: any, b: any) => Number(b?.data?.changed_at || 0) - Number(a?.data?.changed_at || 0))[0];
      
      if (inProgressState) {
        status = 'in_progress';
        reason = 'Đang làm việc.';
      } else {
        const rejectedState = Array.from(stateEvents)
          .filter((e: any) => Number(e?.data?.job_id || 0) === jobId && e?.data?.old_state === 'PendingApproval' && e?.data?.new_state === 'Posted')
          .sort((a: any, b: any) => Number(b?.data?.changed_at || 0) - Number(a?.data?.changed_at || 0))[0];
        
        if (rejectedState) {
          status = 'rejected';
          reason = 'Ứng tuyển bị từ chối.';
        } else {
          status = 'posted';
          reason = 'Đã apply nhưng chưa được phê duyệt hoặc job đã bị đòi quá hạn.';
        }
      }
    }

    history.push({
      jobId,
      poster: jobInfo.poster,
      cid: jobInfo.cid,
      totalAmount: jobInfo.total_amount,
      appliedAt: applied.applied_at,
      status,
      reason,
      completedAt,
      claimedAt,
    });
  });

  return history.sort((a, b) => b.appliedAt - a.appliedAt);
}

