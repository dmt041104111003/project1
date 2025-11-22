import { CONTRACT_ADDRESS } from '@/constants/contracts';
import { fetchContractResource, queryTableItem } from './aptosClientCore';
import {
  getJobCreatedEvents,
  getJobAppliedEvents,
  getJobStateChangedEvents,
  getMilestoneCreatedEvents,
  getMilestoneSubmittedEvents,
  getMilestoneAcceptedEvents,
  getMilestoneRejectedEvents,
} from './aptosEvents';

export async function getJobsList(maxJobs: number = 200) {
  const [createdEvents, appliedEvents, stateEvents] = await Promise.all([
    getJobCreatedEvents(maxJobs),
    getJobAppliedEvents(maxJobs),
    getJobStateChangedEvents(maxJobs),
  ]);
  
  if (createdEvents.length === 0) {
    return { jobs: [] };
  }

  const appliedMap = new Map<number, string>();
  appliedEvents.forEach((evt: any) => {
    const jobId = Number(evt?.data?.job_id || 0);
    const freelancer = String(evt?.data?.freelancer || '');
    if (jobId > 0 && freelancer) {
      appliedMap.set(jobId, freelancer);
    }
  });

  const stateMap = new Map<number, string>();
  stateEvents.forEach((evt: any) => {
    const jobId = Number(evt?.data?.job_id || 0);
    const newState = String(evt?.data?.new_state || '');
    if (jobId > 0 && newState) {
      stateMap.set(jobId, newState);
    }
  });

  const jobs = createdEvents
    .map((evt: any) => {
      const jobId = Number(evt?.data?.job_id || 0);
      const freelancer = appliedMap.get(jobId) || null;
      const state = stateMap.get(jobId) || 'Posted';
      
      return {
        id: jobId,
        created_at: Number(evt?.data?.created_at || 0),
        poster: evt?.data?.poster || '',
        cid: evt?.data?.cid || '',
        total_amount: Number(evt?.data?.total_amount || 0),
        milestones_count: Number(evt?.data?.milestones_count || 0),
        apply_deadline: Number(evt?.data?.apply_deadline || 0),
        has_freelancer: !!freelancer,
        pending_freelancer: null,
        state: state,
        freelancer: freelancer,
      };
    })
    .filter((e: any) => e.id > 0)
    .sort((a: any, b: any) => b.created_at - a.created_at)
    .slice(0, maxJobs);

  return { jobs };
}

export async function getJobData(jobId: number) {
  const escrowStore = await fetchContractResource('escrow::EscrowStore');
  const tableHandle = escrowStore?.table?.handle;
  
  if (!tableHandle) return null;

  return queryTableItem({
    handle: tableHandle,
    keyType: 'u64',
    valueType: `${CONTRACT_ADDRESS}::escrow::Job`,
    key: jobId,
  });
}

export async function getParsedJobData(jobId: number) {
  const [createdEvents, appliedEvents, stateEvents, milestoneCreatedEvents, milestoneSubmittedEvents, milestoneAcceptedEvents, milestoneRejectedEvents, jobData] = await Promise.all([
    getJobCreatedEvents(200),
    getJobAppliedEvents(200),
    getJobStateChangedEvents(200),
    getMilestoneCreatedEvents(200),
    getMilestoneSubmittedEvents(200),
    getMilestoneAcceptedEvents(200),
    getMilestoneRejectedEvents(200),
    getJobData(jobId),
  ]);
  
  const jobEvent = createdEvents.find((e: any) => Number(e?.data?.job_id || 0) === jobId);
  if (!jobEvent) return null;

  const appliedEvent = appliedEvents.find((e: any) => Number(e?.data?.job_id || 0) === jobId);
  const freelancer = appliedEvent?.data?.freelancer || null;

  let state = 'Posted';
  if (jobData?.state) {
    if (typeof jobData.state === 'string') {
      state = jobData.state;
    } else if (jobData.state?.__variant__) {
      state = jobData.state.__variant__;
    } else if (jobData.state?.vec && Array.isArray(jobData.state.vec) && jobData.state.vec.length > 0) {
      state = jobData.state.vec[0];
    }
  } else {
    const stateEvent = stateEvents
      .filter((e: any) => Number(e?.data?.job_id || 0) === jobId)
      .sort((a: any, b: any) => Number(b?.data?.changed_at || 0) - Number(a?.data?.changed_at || 0))[0];
    state = stateEvent?.data?.new_state || 'Posted';
  }

  let pendingFreelancer: string | null = null;
  if (jobData?.pending_freelancer) {
    if (typeof jobData.pending_freelancer === 'string') {
      pendingFreelancer = jobData.pending_freelancer;
    } else if (jobData.pending_freelancer?.vec && Array.isArray(jobData.pending_freelancer.vec) && jobData.pending_freelancer.vec.length > 0) {
      pendingFreelancer = jobData.pending_freelancer.vec[0];
    }
  }
  
  if (pendingFreelancer && state === 'Posted') {
    state = 'PendingApproval';
  }

  const baseMilestones = milestoneCreatedEvents
    .filter((e: any) => Number(e?.data?.job_id || 0) === jobId)
    .map((e: any) => ({
      id: Number(e?.data?.milestone_id || 0),
      amount: Number(e?.data?.amount || 0),
      duration: Number(e?.data?.duration || 0),
      deadline: Number(e?.data?.deadline || 0),
      review_period: Number(e?.data?.review_period || 0),
      review_deadline: Number(e?.data?.review_deadline || 0),
      status: { __variant__: 'Pending' },
      evidence_cid: null,
    }))
    .sort((a: any, b: any) => a.id - b.id);

  const submittedMap = new Map<number, { evidence_cid: string; submitted_at: number }>();
  milestoneSubmittedEvents
    .filter((e: any) => Number(e?.data?.job_id || 0) === jobId)
    .forEach((e: any) => {
      const milestoneId = Number(e?.data?.milestone_id || 0);
      submittedMap.set(milestoneId, {
        evidence_cid: String(e?.data?.evidence_cid || ''),
        submitted_at: Number(e?.data?.submitted_at || 0),
      });
    });

  const acceptedMap = new Map<number, number>();
  milestoneAcceptedEvents
    .filter((e: any) => Number(e?.data?.job_id || 0) === jobId)
    .forEach((e: any) => {
      const milestoneId = Number(e?.data?.milestone_id || 0);
      acceptedMap.set(milestoneId, Number(e?.data?.accepted_at || 0));
    });

  const rejectedMap = new Map<number, number>();
  milestoneRejectedEvents
    .filter((e: any) => Number(e?.data?.job_id || 0) === jobId)
    .forEach((e: any) => {
      const milestoneId = Number(e?.data?.milestone_id || 0);
      rejectedMap.set(milestoneId, Number(e?.data?.rejected_at || 0));
    });

  const milestones = baseMilestones.map((m: any) => {
    const submitted = submittedMap.get(m.id);
    const accepted = acceptedMap.get(m.id);
    const rejected = rejectedMap.get(m.id);
    
    let status = m.status;
    if (accepted) {
      status = { __variant__: 'Accepted' };
    } else if (rejected) {
      status = { __variant__: 'Locked' };
    } else if (submitted) {
      status = { __variant__: 'Submitted' };
    }

    return {
      ...m,
      status,
      evidence_cid: submitted?.evidence_cid || null,
    };
  });

  let mutualCancelRequestedBy: string | null = null;
  let freelancerWithdrawRequestedBy: string | null = null;
  if (jobData?.mutual_cancel_requested_by) {
    if (typeof jobData.mutual_cancel_requested_by === 'string') {
      mutualCancelRequestedBy = jobData.mutual_cancel_requested_by;
    } else if (jobData.mutual_cancel_requested_by?.vec && Array.isArray(jobData.mutual_cancel_requested_by.vec) && jobData.mutual_cancel_requested_by.vec.length > 0) {
      mutualCancelRequestedBy = jobData.mutual_cancel_requested_by.vec[0];
    }
  }
  if (jobData?.freelancer_withdraw_requested_by) {
    if (typeof jobData.freelancer_withdraw_requested_by === 'string') {
      freelancerWithdrawRequestedBy = jobData.freelancer_withdraw_requested_by;
    } else if (jobData.freelancer_withdraw_requested_by?.vec && Array.isArray(jobData.freelancer_withdraw_requested_by.vec) && jobData.freelancer_withdraw_requested_by.vec.length > 0) {
      freelancerWithdrawRequestedBy = jobData.freelancer_withdraw_requested_by.vec[0];
    }
  }

  return {
    id: jobId,
    cid: jobEvent?.data?.cid || '',
    total_amount: Number(jobEvent?.data?.total_amount || 0),
    milestones_count: Number(jobEvent?.data?.milestones_count || milestones.length || 0),
    milestones: milestones,
    has_freelancer: !!freelancer,
    state: state,
    poster: jobEvent?.data?.poster || '',
    freelancer: freelancer,
    pending_freelancer: pendingFreelancer,
    pending_stake: jobData?.pending_stake ? Number(jobData.pending_stake) : 0,
    pending_fee: jobData?.pending_fee ? Number(jobData.pending_fee) : 0,
    apply_deadline: jobEvent?.data?.apply_deadline ? Number(jobEvent.data.apply_deadline) : undefined,
    mutual_cancel_requested_by: mutualCancelRequestedBy,
    freelancer_withdraw_requested_by: freelancerWithdrawRequestedBy,
  };
}

