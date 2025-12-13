import {
  getJobCreatedEvents,
  getJobAppliedEvents,
  getJobStateChangedEvents,
  getClaimTimeoutEvents,
  getMilestoneAcceptedEvents,
  getMilestoneSubmittedEvents,
  getMilestoneRejectedEvents,
} from './aptosEvents';

export interface FreelancerJobHistory {
  jobId: number;
  poster: string;
  cid: string;
  totalAmount: number;
  createdAt: number;
  appliedAt: number;
  status: 'completed' | 'claimed_timeout' | 'rejected' | 'cancelled' | 'in_progress' | 'pending_approval' | 'posted';
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

export async function getFreelancerJobHistory(freelancerAddress: string, limit: number = 200): Promise<FreelancerJobHistory[]> {
  const normalizedAddr = freelancerAddress.toLowerCase();
  
  const [createdEvents, appliedEvents, stateEvents, claimTimeoutEvents, milestoneAcceptedEvents, milestoneSubmittedEvents, milestoneRejectedEvents] = await Promise.all([
    getJobCreatedEvents(limit),
    getJobAppliedEvents(limit),
    getJobStateChangedEvents(limit),
    getClaimTimeoutEvents(limit),
    getMilestoneAcceptedEvents(limit),
    getMilestoneSubmittedEvents(limit),
    getMilestoneRejectedEvents(limit),
  ]);

  // Map các job mà freelancer đã apply
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

  // Map trạng thái mới nhất của job
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

  // Map các job bị claim timeout
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

  // Map thời gian hoàn thành milestone mới nhất
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

  // Map thông tin job được tạo
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

  // Map các milestone submitted
  const milestoneSubmittedMap = new Map<number, Array<{ milestone_id: number; submitted_at: number }>>();
  milestoneSubmittedEvents.forEach((evt: any) => {
    const jobId = Number(evt?.data?.job_id || 0);
    if (jobId > 0) {
      const existing = milestoneSubmittedMap.get(jobId) || [];
      existing.push({
        milestone_id: Number(evt?.data?.milestone_id || 0),
        submitted_at: Number(evt?.data?.submitted_at || 0),
      });
      milestoneSubmittedMap.set(jobId, existing);
    }
  });

  // Map các milestone accepted
  const milestoneAcceptedMap = new Map<number, Array<{ milestone_id: number; accepted_at: number }>>();
  milestoneAcceptedEvents.forEach((evt: any) => {
    const jobId = Number(evt?.data?.job_id || 0);
    if (jobId > 0) {
      const existing = milestoneAcceptedMap.get(jobId) || [];
      existing.push({
        milestone_id: Number(evt?.data?.milestone_id || 0),
        accepted_at: Number(evt?.data?.accepted_at || 0),
      });
      milestoneAcceptedMap.set(jobId, existing);
    }
  });

  // Map các milestone rejected
  const milestoneRejectedMap = new Map<number, Array<{ milestone_id: number; rejected_at: number }>>();
  milestoneRejectedEvents.forEach((evt: any) => {
    const jobId = Number(evt?.data?.job_id || 0);
    if (jobId > 0) {
      const existing = milestoneRejectedMap.get(jobId) || [];
      existing.push({
        milestone_id: Number(evt?.data?.milestone_id || 0),
        rejected_at: Number(evt?.data?.rejected_at || 0),
      });
      milestoneRejectedMap.set(jobId, existing);
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
    let cancelledAt: number | undefined;

    // Thu thập events cho job này
    const events: FreelancerJobHistory['events'] = [];

    // Event: Công việc được tạo
    events.push({
      type: 'created',
      timestamp: jobInfo.created_at,
      description: 'Công việc được tạo',
    });

    // Event: Ứng tuyển
    events.push({
      type: 'applied',
      timestamp: applied.applied_at,
      description: 'Bạn đã nhận việc',
    });

    // Event: Các lần submit milestone
    const submitted = milestoneSubmittedMap.get(jobId) || [];
    submitted.forEach((s) => {
      events.push({
        type: 'milestone_submitted',
        timestamp: s.submitted_at,
        description: `Nộp cột mốc #${s.milestone_id}`,
      });
    });

    // Event: Các lần milestone được chấp nhận
    const accepted = milestoneAcceptedMap.get(jobId) || [];
    accepted.forEach((a) => {
      events.push({
        type: 'milestone_accepted',
        timestamp: a.accepted_at,
        description: `Cột mốc #${a.milestone_id} được chấp nhận`,
      });
    });

    // Event: Các lần milestone bị từ chối
    const rejected = milestoneRejectedMap.get(jobId) || [];
    rejected.forEach((r) => {
      events.push({
        type: 'milestone_rejected',
        timestamp: r.rejected_at,
        description: `Cột mốc #${r.milestone_id} bị từ chối`,
      });
    });

    // Xác định trạng thái
    if (claimTimeout) {
      status = 'claimed_timeout';
      reason = 'Không hoàn thành cột mốc đúng hạn. Người thuê đã đòi tiền cọc.';
      claimedAt = claimTimeout.claimed_at;
      events.push({
        type: 'claimed_timeout',
        timestamp: claimTimeout.claimed_at,
        description: 'Người thuê đã đòi tiền cọc do quá hạn',
      });
    } else if (currentState === 'Completed') {
      status = 'completed';
      reason = 'Đã hoàn thành tất cả cột mốc.';
      completedAt = lastAcceptedAt;
      if (lastAcceptedAt) {
        events.push({
          type: 'completed',
          timestamp: lastAcceptedAt,
          description: 'Công việc hoàn thành',
        });
      }
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
      const cancelEvent = Array.from(stateEvents)
        .filter((e: any) => Number(e?.data?.job_id || 0) === jobId && (e?.data?.new_state === 'Cancelled' || e?.data?.new_state === 'CancelledByPoster'))
        .sort((a: any, b: any) => Number(b?.data?.changed_at || 0) - Number(a?.data?.changed_at || 0))[0];
      if (cancelEvent) {
        cancelledAt = Number((cancelEvent as any)?.data?.changed_at || 0);
        events.push({
          type: 'cancelled',
          timestamp: cancelledAt,
          description: reason,
        });
      }
    } else if (currentState === 'Posted') {
      const inProgressState = Array.from(stateEvents)
        .filter((e: any) => Number(e?.data?.job_id || 0) === jobId && e?.data?.new_state === 'InProgress')
        .sort((a: any, b: any) => Number(b?.data?.changed_at || 0) - Number(a?.data?.changed_at || 0))[0];
      
      if (inProgressState) {
        status = 'in_progress';
        reason = 'Đang làm việc.';
        events.push({
          type: 'in_progress',
          timestamp: Number((inProgressState as any)?.data?.changed_at || 0),
          description: 'Bắt đầu làm việc',
        });
      } else {
        const rejectedState = Array.from(stateEvents)
          .filter((e: any) => Number(e?.data?.job_id || 0) === jobId && e?.data?.old_state === 'PendingApproval' && e?.data?.new_state === 'Posted')
          .sort((a: any, b: any) => Number(b?.data?.changed_at || 0) - Number(a?.data?.changed_at || 0))[0];
        
        if (rejectedState) {
          status = 'rejected';
          reason = 'Ứng tuyển bị từ chối.';
          events.push({
            type: 'rejected',
            timestamp: Number((rejectedState as any)?.data?.changed_at || 0),
            description: 'Ứng tuyển bị từ chối',
          });
        } else {
          status = 'posted';
          reason = 'Đã nhận việc nhưng chưa được phê duyệt.';
        }
      }
    }

    // Sắp xếp events theo thời gian
    events.sort((a, b) => a.timestamp - b.timestamp);

    history.push({
      jobId,
      poster: jobInfo.poster,
      cid: jobInfo.cid,
      totalAmount: jobInfo.total_amount,
      createdAt: jobInfo.created_at,
      appliedAt: applied.applied_at,
      status,
      reason,
      completedAt,
      claimedAt,
      cancelledAt,
      events,
    });
  });

  return history.sort((a, b) => b.appliedAt - a.appliedAt);
}
