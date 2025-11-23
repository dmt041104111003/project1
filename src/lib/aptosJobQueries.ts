import {
  getJobCreatedEvents,
  getJobAppliedEvents,
  getJobStateChangedEvents,
  getMilestoneCreatedEvents,
  getMilestoneSubmittedEvents,
  getMilestoneAcceptedEvents,
  getMilestoneRejectedEvents,
  getClaimTimeoutEvents,
} from './aptosEvents';

export async function getJobsList(maxJobs: number = 200) {
  const [createdEvents, appliedEvents, stateEvents, claimTimeoutEvents, milestoneCreatedEvents, milestoneSubmittedEvents, milestoneAcceptedEvents, milestoneRejectedEvents] = await Promise.all([
    getJobCreatedEvents(maxJobs),
    getJobAppliedEvents(maxJobs),
    getJobStateChangedEvents(maxJobs),
    getClaimTimeoutEvents(maxJobs),
    getMilestoneCreatedEvents(maxJobs),
    getMilestoneSubmittedEvents(maxJobs),
    getMilestoneAcceptedEvents(maxJobs),
    getMilestoneRejectedEvents(maxJobs),
  ]);
  
  if (createdEvents.length === 0) {
    return { jobs: [] };
  }

  const appliedMap = new Map<number, { freelancer: string; applied_at: number }>();
  appliedEvents.forEach((evt: any) => {
    const jobId = Number(evt?.data?.job_id || 0);
    const freelancer = String(evt?.data?.freelancer || '');
    const appliedAt = Number(evt?.data?.applied_at || 0);
    if (jobId > 0 && freelancer) {
      const existing = appliedMap.get(jobId);
      if (!existing || appliedAt > existing.applied_at) {
        appliedMap.set(jobId, { freelancer, applied_at: appliedAt });
      }
    }
  });

  const stateMap = new Map<number, { state: string; changed_at: number }>();
  stateEvents.forEach((evt: any) => {
    const jobId = Number(evt?.data?.job_id || 0);
    const newState = String(evt?.data?.new_state || '');
    const changedAt = Number(evt?.data?.changed_at || 0);
    if (jobId > 0 && newState) {
      const existing = stateMap.get(jobId);
      if (!existing || changedAt > existing.changed_at) {
        stateMap.set(jobId, { state: newState, changed_at: changedAt });
      }
    }
  });

  const claimTimeoutMap = new Map<number, { timestamp: number }>();
  claimTimeoutEvents.forEach((evt: any) => {
    const jobId = Number(evt?.data?.job_id || 0);
    const timestamp = Number(evt?.data?.claimed_at || evt?.data?.timestamp || 0);
    if (jobId > 0) {
      const existing = claimTimeoutMap.get(jobId);
      if (!existing || timestamp > existing.timestamp) {
        claimTimeoutMap.set(jobId, { timestamp });
      }
    }
  });

  const milestoneCreatedMap = new Map<number, Array<{ id: number; amount: number; duration: number; review_period: number; deadline: number; review_deadline: number }>>();
  milestoneCreatedEvents.forEach((evt: any) => {
    const jobId = Number(evt?.data?.job_id || 0);
    if (jobId > 0) {
      if (!milestoneCreatedMap.has(jobId)) {
        milestoneCreatedMap.set(jobId, []);
      }
      const milestones = milestoneCreatedMap.get(jobId)!;
      milestones.push({
        id: Number(evt?.data?.milestone_id || 0),
        amount: Number(evt?.data?.amount || 0),
        duration: Number(evt?.data?.duration || 0),
        review_period: Number(evt?.data?.review_period || 0),
        deadline: Number(evt?.data?.deadline || 0),
        review_deadline: Number(evt?.data?.review_deadline || 0),
      });
    }
  });

  const milestoneSubmittedMap = new Map<string, { evidence_cid: string; submitted_at: number }>();
  milestoneSubmittedEvents.forEach((evt: any) => {
    const jobId = Number(evt?.data?.job_id || 0);
    const milestoneId = Number(evt?.data?.milestone_id || 0);
    const key = `${jobId}:${milestoneId}`;
    const submittedAt = Number(evt?.data?.submitted_at || 0);
    const existing = milestoneSubmittedMap.get(key);
    if (!existing || submittedAt > existing.submitted_at) {
      milestoneSubmittedMap.set(key, {
        evidence_cid: String(evt?.data?.evidence_cid || ''),
        submitted_at: submittedAt,
      });
    }
  });

  const milestoneAcceptedMap = new Map<string, number>();
  milestoneAcceptedEvents.forEach((evt: any) => {
    const jobId = Number(evt?.data?.job_id || 0);
    const milestoneId = Number(evt?.data?.milestone_id || 0);
    const key = `${jobId}:${milestoneId}`;
    const acceptedAt = Number(evt?.data?.accepted_at || 0);
    const existing = milestoneAcceptedMap.get(key);
    if (!existing || acceptedAt > existing) {
      milestoneAcceptedMap.set(key, acceptedAt);
    }
  });

  const milestoneRejectedMap = new Map<string, number>();
  milestoneRejectedEvents.forEach((evt: any) => {
    const jobId = Number(evt?.data?.job_id || 0);
    const milestoneId = Number(evt?.data?.milestone_id || 0);
    const key = `${jobId}:${milestoneId}`;
    const rejectedAt = Number(evt?.data?.rejected_at || 0);
    const existing = milestoneRejectedMap.get(key);
    if (!existing || rejectedAt > existing) {
      milestoneRejectedMap.set(key, rejectedAt);
    }
  });

  const claimTimeoutMilestoneMap = new Map<string, { claimed_by: string; claimed_at: number; freelancer_stake_claimed: number }>();
  claimTimeoutEvents.forEach((evt: any) => {
    const jobId = Number(evt?.data?.job_id || 0);
    const milestoneId = Number(evt?.data?.milestone_id || 0);
    const key = `${jobId}:${milestoneId}`;
    claimTimeoutMilestoneMap.set(key, {
      claimed_by: String(evt?.data?.claimed_by || ''),
      claimed_at: Number(evt?.data?.claimed_at || 0),
      freelancer_stake_claimed: Number(evt?.data?.freelancer_stake_claimed || 0),
    });
  });

  const jobs = createdEvents
    .map((evt: any) => {
      const jobId = Number(evt?.data?.job_id || 0);
      const appliedInfo = appliedMap.get(jobId);
      const stateInfo = stateMap.get(jobId);
      
      let freelancer: string | null = null;
      let pendingFreelancer: string | null = null;
      let state = stateInfo?.state || 'Posted';
      const stateChangedAt = stateInfo?.changed_at || 0;
      const appliedAt = appliedInfo?.applied_at || 0;
      
      const claimTimeoutInfo = claimTimeoutMap.get(jobId);
      const claimTimeoutAt = claimTimeoutInfo?.timestamp || 0;
      
      if (claimTimeoutInfo && claimTimeoutAt > appliedAt) {
        state = 'Posted';
        freelancer = null;
        pendingFreelancer = null;
      } else if (appliedInfo) {
        const appliedFreelancer = appliedInfo.freelancer;
        
        if (appliedAt > stateChangedAt) {
          pendingFreelancer = appliedFreelancer;
          state = 'PendingApproval';
        } else {
          const inProgressEvent = stateEvents.find((e: any) => 
            Number(e?.data?.job_id || 0) === jobId && e?.data?.new_state === 'InProgress'
          );
          const approvedEvent = stateEvents.find((e: any) => 
            e?.data?.old_state === 'PendingApproval' && 
            e?.data?.new_state === 'InProgress' &&
            Number(e?.data?.changed_at || 0) > appliedAt
          );
          const rejectedEvent = stateEvents.find((e: any) => 
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
          } else if (state === 'InProgress' && inProgressEvent && stateChangedAt > appliedAt) {
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

      const inProgressEvent = stateEvents.find((e: any) => 
        Number(e?.data?.job_id || 0) === jobId && e?.data?.new_state === 'InProgress'
      );
      const startedAt = inProgressEvent ? Number(inProgressEvent?.data?.changed_at || 0) : null;

      const baseMilestones = (milestoneCreatedMap.get(jobId) || [])
        .sort((a, b) => a.id - b.id)
        .map((m) => {
          const key = `${jobId}:${m.id}`;
          const submitted = milestoneSubmittedMap.get(key);
          const accepted = milestoneAcceptedMap.get(key);
          const rejected = milestoneRejectedMap.get(key);
          const claimTimeout = claimTimeoutMilestoneMap.get(key);

          let status: any = { __variant__: 'Pending' };
          let deadline = m.deadline;
          let review_deadline = m.review_deadline;
          let evidence_cid: string | null = null;

          if (claimTimeoutInfo && claimTimeoutAt > appliedAt) {
            if (accepted) {
              status = { __variant__: 'Accepted' };
            } else {
              status = { __variant__: 'Pending' };
              deadline = 0;
              review_deadline = 0;
              evidence_cid = null;
            }
          } else {
            if (accepted) {
              status = { __variant__: 'Accepted' };
            } else if (rejected) {
              status = { __variant__: 'Locked' };
            } else if (submitted) {
              status = { __variant__: 'Submitted' };
              evidence_cid = submitted.evidence_cid;
              if (!review_deadline && submitted.submitted_at) {
                review_deadline = submitted.submitted_at + m.review_period;
              }
            } else {
              status = { __variant__: 'Pending' };
            }
          }

          if (deadline === 0 && state === 'InProgress' && startedAt && m.id === 0) {
            deadline = startedAt + m.duration;
          }

          return {
            id: m.id,
            amount: m.amount,
            duration: m.duration,
            deadline,
            review_period: m.review_period,
            review_deadline,
            status,
            evidence_cid,
            claim_timeout: claimTimeout || null,
          };
        });
      
      const jobResult = {
        id: jobId,
        created_at: Number(evt?.data?.created_at || 0),
        poster: evt?.data?.poster || '',
        cid: evt?.data?.cid || '',
        total_amount: Number(evt?.data?.total_amount || 0),
        milestones_count: Number(evt?.data?.milestones_count || 0),
        milestones: baseMilestones,
        apply_deadline: Number(evt?.data?.apply_deadline || 0),
        has_freelancer: !!freelancer && !(claimTimeoutInfo && claimTimeoutAt > appliedAt),
        pending_freelancer: pendingFreelancer,
        state: state,
        freelancer: freelancer,
      };
      
      return jobResult;
    })
    .filter((e: any) => e.id > 0)
    .sort((a: any, b: any) => b.created_at - a.created_at)
    .slice(0, maxJobs);

  return { jobs };
}

export async function getParsedJobData(jobId: number) {
  const [createdEvents, appliedEvents, stateEvents, milestoneCreatedEvents, milestoneSubmittedEvents, milestoneAcceptedEvents, milestoneRejectedEvents, claimTimeoutEvents] = await Promise.all([
    getJobCreatedEvents(200),
    getJobAppliedEvents(200),
    getJobStateChangedEvents(200),
    getMilestoneCreatedEvents(200),
    getMilestoneSubmittedEvents(200),
    getMilestoneAcceptedEvents(200),
    getMilestoneRejectedEvents(200),
    getClaimTimeoutEvents(200),
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

  if (latestClaimTimeout && claimTimeoutAt > appliedAt) {
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

  const milestones = baseMilestones.map((m: any) => {
    const submitted = submittedMap.get(m.id);
    const accepted = acceptedMap.get(m.id);
    const rejected = rejectedMap.get(m.id);
    const claimTimeout = claimTimeoutMap.get(m.id);
    
    let status = m.status;
    
    if (latestClaimTimeout && claimTimeoutAt > appliedAt) {
      if (accepted) {
        status = { __variant__: 'Accepted' };
      } else {
        status = { __variant__: 'Pending' };
        m.deadline = 0;
        m.review_deadline = 0;
        m.evidence_cid = null;
      }
    } else {
      if (accepted) {
        status = { __variant__: 'Accepted' };
      } else if (rejected) {
        status = { __variant__: 'Locked' };
      } else if (submitted) {
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
      status,
      evidence_cid: (latestClaimTimeout && claimTimeoutAt > appliedAt) && !accepted ? null : (submitted?.evidence_cid || null),
      claim_timeout: claimTimeout || null,
    };
  });

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
    pending_stake: 0,
    pending_fee: 0,
    apply_deadline: jobEvent?.data?.apply_deadline ? Number(jobEvent.data.apply_deadline) : undefined,
    mutual_cancel_requested_by: null,
    freelancer_withdraw_requested_by: null,
  };
}

