import {
  getJobCreatedEvents,
  getJobAppliedEvents,
  getJobStateChangedEvents,
  getMilestoneCreatedEvents,
  getMilestoneSubmittedEvents,
  getMilestoneAcceptedEvents,
  getMilestoneRejectedEvents,
  getClaimTimeoutEvents,
  getDisputeResolvedEvents,
} from './aptosEvents';

export async function getParsedJobData(jobId: number) {
  const [createdEvents, appliedEvents, stateEvents, milestoneCreatedEvents, milestoneSubmittedEvents, milestoneAcceptedEvents, milestoneRejectedEvents, claimTimeoutEvents, disputeResolvedEvents] = await Promise.all([
    getJobCreatedEvents(200),
    getJobAppliedEvents(200),
    getJobStateChangedEvents(200),
    getMilestoneCreatedEvents(200),
    getMilestoneSubmittedEvents(200),
    getMilestoneAcceptedEvents(200),
    getMilestoneRejectedEvents(200),
    getClaimTimeoutEvents(200),
    getDisputeResolvedEvents(200),
  ]);
  
  const jobEvent = createdEvents.find((e: any) => Number(e?.data?.job_id || 0) === jobId);
  if (!jobEvent) return null;

  const appliedEventsForJob = appliedEvents
    .filter((e: any) => Number(e?.data?.job_id || 0) === jobId)
    .sort((a: any, b: any) => Number(b?.data?.applied_at || 0) - Number(a?.data?.applied_at || 0));
  
  const latestAppliedEvent = appliedEventsForJob[0];
  const appliedFreelancer = latestAppliedEvent?.data?.freelancer || null;
  const appliedAt = latestAppliedEvent ? Number(latestAppliedEvent?.data?.applied_at || 0) : 0;

  const jobStateEvents = stateEvents
    .filter((e: any) => Number(e?.data?.job_id || 0) === jobId)
    .sort((a: any, b: any) => Number(b?.data?.changed_at || 0) - Number(a?.data?.changed_at || 0));

  const jobClaimTimeoutEvents = claimTimeoutEvents
    .filter((e: any) => Number(e?.data?.job_id || 0) === jobId)
    .sort((a: any, b: any) => Number(b?.data?.claimed_at || 0) - Number(a?.data?.claimed_at || 0));

  const latestClaimTimeout = jobClaimTimeoutEvents[0];
  const claimTimeoutAt = latestClaimTimeout ? Number(latestClaimTimeout?.data?.claimed_at || latestClaimTimeout?.data?.timestamp || 0) : 0;

  const latestStateEvent = jobStateEvents[0];
  const latestStateChangedAt = latestStateEvent ? Number(latestStateEvent?.data?.changed_at || 0) : 0;
  let state = latestStateEvent?.data?.new_state || 'Posted';
  const startedAt = state === 'InProgress' ? latestStateChangedAt : null;

  let freelancer: string | null = null;
  let pendingFreelancer: string | null = null;

  if (state === 'CancelledByPoster' || state === 'Cancelled') {
    freelancer = null;
    pendingFreelancer = null;
  } else if (latestClaimTimeout && claimTimeoutAt > appliedAt) {
    state = 'Posted';
    freelancer = null;
    pendingFreelancer = null;
  } else if (appliedFreelancer) {
    if (appliedAt > latestStateChangedAt) {
      pendingFreelancer = appliedFreelancer;
      state = 'PendingApproval';
    } else {
      const inProgressEvent = jobStateEvents.find((e: any) => e?.data?.new_state === 'InProgress');
      const approvedEvent = jobStateEvents.find((e: any) => 
        e?.data?.old_state === 'PendingApproval' && 
        e?.data?.new_state === 'InProgress' &&
        Number(e?.data?.changed_at || 0) > appliedAt
      );
      const rejectedEvent = jobStateEvents.find((e: any) => 
        e?.data?.old_state === 'PendingApproval' && 
        e?.data?.new_state === 'Posted' &&
        Number(e?.data?.changed_at || 0) > appliedAt
      );

      if (approvedEvent && inProgressEvent) {
        freelancer = appliedFreelancer;
        state = 'InProgress';
        pendingFreelancer = null;
      } else if (rejectedEvent) {
        pendingFreelancer = null;
        state = 'Posted';
      } else if (state === 'InProgress' && inProgressEvent && latestStateChangedAt > appliedAt) {
        freelancer = appliedFreelancer;
        pendingFreelancer = null;
      } else {
        pendingFreelancer = appliedFreelancer;
        if (state !== 'InProgress' && state !== 'Completed' && state !== 'Cancelled' && state !== 'CancelledByPoster') {
          state = 'PendingApproval';
        }
      }
    }
  }

  const baseMilestones = milestoneCreatedEvents
    .filter((e: any) => Number(e?.data?.job_id || 0) === jobId)
    .map((e: any) => {
      const milestoneId = Number(e?.data?.milestone_id || 0);
      const duration = Number(e?.data?.duration || 0);
      let deadline = Number(e?.data?.deadline || 0);
      let review_deadline = Number(e?.data?.review_deadline || 0);

      if (latestClaimTimeout && claimTimeoutAt > appliedAt) {
        deadline = 0;
        review_deadline = 0;
      } else if (deadline === 0 && state === 'InProgress' && startedAt && milestoneId === 0) {
        deadline = startedAt + duration;
      }
      
      return {
        id: milestoneId,
        amount: Number(e?.data?.amount || 0),
        duration: duration,
        deadline: deadline,
        review_period: Number(e?.data?.review_period || 0),
        review_deadline: review_deadline,
        status: { __variant__: 'Pending' },
        evidence_cid: null,
      };
    })
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

  const disputeResolvedMap = new Map<number, number>();
  disputeResolvedEvents
    .filter((e: any) => {
      const eventJobId = Number(e?.data?.job_id || 0);
      return eventJobId === jobId;
    })
    .forEach((e: any) => {
      const milestoneId = Number(e?.data?.milestone_id || 0);
      const resolvedAt = Number(e?.data?.resolved_at || 0);
      const existing = disputeResolvedMap.get(milestoneId);
      if (!existing || resolvedAt > existing) {
        disputeResolvedMap.set(milestoneId, resolvedAt);
      }
    });

  const claimTimeoutMap = new Map<number, { claimed_by: string; claimed_at: number; freelancer_stake_claimed: number }>();
  claimTimeoutEvents
    .filter((e: any) => Number(e?.data?.job_id || 0) === jobId)
    .forEach((e: any) => {
      const milestoneId = Number(e?.data?.milestone_id || 0);
      claimTimeoutMap.set(milestoneId, {
        claimed_by: String(e?.data?.claimed_by || ''),
        claimed_at: Number(e?.data?.claimed_at || 0),
        freelancer_stake_claimed: Number(e?.data?.freelancer_stake_claimed || 0),
      });
    });

  const milestones = baseMilestones.map((m: any, index: number) => {
    const submitted = submittedMap.get(m.id);
    const acceptedAt = acceptedMap.get(m.id);
    const rejectedAt = rejectedMap.get(m.id);
    const disputeResolvedAt = disputeResolvedMap.get(m.id);
    const claimTimeout = claimTimeoutMap.get(m.id);
    
    let status = m.status;
    let deadline = m.deadline;
    
    const normalizeAddr = (addr: string | null | undefined): string => {
      if (!addr) return '';
      return String(addr).toLowerCase();
    };
    
    const posterAddr = normalizeAddr(jobEvent?.data?.poster);
    const freelancerAddr = normalizeAddr(freelancer);
    const claimTimeoutByFreelancer = claimTimeout && freelancerAddr && normalizeAddr(claimTimeout.claimed_by) === freelancerAddr;
    const claimTimeoutByPoster = claimTimeout && posterAddr && normalizeAddr(claimTimeout.claimed_by) === posterAddr;
    
    if (latestClaimTimeout && claimTimeoutAt > appliedAt) {
      if (acceptedAt) {
        status = { __variant__: 'Accepted' };
      } else {
        status = { __variant__: 'Pending' };
        deadline = 0;
        m.review_deadline = 0;
        m.evidence_cid = null;
      }
    } else {
      if (disputeResolvedAt) {
        status = { __variant__: 'Accepted' };
      } else if (acceptedAt) {
        if (rejectedAt && rejectedAt > acceptedAt && !disputeResolvedAt) {
          status = { __variant__: 'Locked' };
        } else {
          status = { __variant__: 'Accepted' };
        }
      } else if (claimTimeoutByFreelancer && submitted) {
        status = { __variant__: 'Accepted' };
      } else if (rejectedAt) {
        status = { __variant__: 'Locked' };
      } else if (submitted && !claimTimeoutByPoster) {
        status = { __variant__: 'Submitted' };
        if (!m.review_deadline && submitted.submitted_at) {
          m.review_deadline = submitted.submitted_at + m.review_period;
        }
      } else {
        status = { __variant__: 'Pending' };
      }
    }

    return {
      ...m,
      deadline,
      status,
      evidence_cid: (latestClaimTimeout && claimTimeoutAt > appliedAt) && !acceptedAt ? null : (submitted?.evidence_cid || null),
      claim_timeout: claimTimeout || null,
    };
  });

  const finalMilestones = milestones.map((m: any, index: number) => {
    if (index > 0) {
      const prevMilestone = milestones[index - 1];
      const prevStatus = prevMilestone.status;
      const isPrevAccepted = prevStatus.__variant__ === 'Accepted';
      
      if (isPrevAccepted && m.deadline === 0 && state === 'InProgress') {
        const prevSubmitted = submittedMap.get(prevMilestone.id);
        const prevAcceptedAt = acceptedMap.get(prevMilestone.id);
        const prevDisputeResolvedAt = disputeResolvedMap.get(prevMilestone.id);
        const prevClaimTimeout = claimTimeoutMap.get(prevMilestone.id);
        
        const normalizeAddr = (addr: string | null | undefined): string => {
          if (!addr) return '';
          return String(addr).toLowerCase();
        };
        
        const freelancerAddr = normalizeAddr(freelancer);
        const claimTimeoutByFreelancer = prevClaimTimeout && freelancerAddr && normalizeAddr(prevClaimTimeout.claimed_by) === freelancerAddr;
        
        const resolvedAt = prevDisputeResolvedAt || prevAcceptedAt || (claimTimeoutByFreelancer && prevSubmitted ? prevSubmitted.submitted_at : null);
        
        const now = Math.floor(Date.now() / 1000);
        if (resolvedAt) {
          m.deadline = resolvedAt + m.duration;
        } else if (startedAt) {
          m.deadline = startedAt + m.duration;
        } else {
          m.deadline = now + m.duration;
        }
      }
    }
    
    return m;
  });

  return {
    id: jobId,
    cid: jobEvent?.data?.cid || '',
    total_amount: Number(jobEvent?.data?.total_amount || 0),
    milestones_count: Number(jobEvent?.data?.milestones_count || finalMilestones.length || 0),
    milestones: finalMilestones,
    has_freelancer: !!freelancer,
    state: state,
    poster: jobEvent?.data?.poster || '',
    freelancer: freelancer,
    pending_freelancer: pendingFreelancer,
    pending_stake: 0,
    pending_fee: 0,
    apply_deadline: jobEvent?.data?.apply_deadline ? Number(jobEvent.data.apply_deadline) : undefined,
    mutual_cancel_requested_by: null,
    freelancer_withdraw_requested_by: null,
  };
}

