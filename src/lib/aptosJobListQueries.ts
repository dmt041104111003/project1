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

export async function getJobsList(maxJobs: number = 200) {
  const [createdEvents, appliedEvents, stateEvents, claimTimeoutEvents, milestoneCreatedEvents, milestoneSubmittedEvents, milestoneAcceptedEvents, milestoneRejectedEvents, disputeResolvedEvents] = await Promise.all([
    getJobCreatedEvents(maxJobs),
    getJobAppliedEvents(maxJobs),
    getJobStateChangedEvents(maxJobs),
    getClaimTimeoutEvents(maxJobs),
    getMilestoneCreatedEvents(maxJobs),
    getMilestoneSubmittedEvents(maxJobs),
    getMilestoneAcceptedEvents(maxJobs),
    getMilestoneRejectedEvents(maxJobs),
    getDisputeResolvedEvents(maxJobs),
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

  const disputeResolvedMap = new Map<string, number>();
  disputeResolvedEvents.forEach((evt: any) => {
    const jobId = Number(evt?.data?.job_id || 0);
    const milestoneId = Number(evt?.data?.milestone_id || 0);
    const key = `${jobId}:${milestoneId}`;
    const resolvedAt = Number(evt?.data?.resolved_at || 0);
    const existing = disputeResolvedMap.get(key);
    if (!existing || resolvedAt > existing) {
      disputeResolvedMap.set(key, resolvedAt);
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
      
      if (state === 'CancelledByPoster' || state === 'Cancelled') {
        freelancer = null;
        pendingFreelancer = null;
      } else if (claimTimeoutInfo && claimTimeoutAt > appliedAt) {
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

      const normalizeAddr = (addr: string | null | undefined): string => {
        if (!addr) return '';
        return String(addr).toLowerCase();
      };
      
      const posterAddr = normalizeAddr(evt?.data?.poster);
      const freelancerAddr = normalizeAddr(freelancer);

      const baseMilestones = (milestoneCreatedMap.get(jobId) || [])
        .sort((a, b) => a.id - b.id)
        .map((m, index) => {
          const key = `${jobId}:${m.id}`;
          const submitted = milestoneSubmittedMap.get(key);
          const accepted = milestoneAcceptedMap.get(key);
          const rejected = milestoneRejectedMap.get(key);
          const disputeResolved = disputeResolvedMap.get(key);
          const claimTimeout = claimTimeoutMilestoneMap.get(key);

          let status: any = { __variant__: 'Pending' };
          let deadline = m.deadline;
          let review_deadline = m.review_deadline;
          let evidence_cid: string | null = null;

          const claimTimeoutByFreelancer = claimTimeout && freelancerAddr && normalizeAddr(claimTimeout.claimed_by) === freelancerAddr;
          const claimTimeoutByPoster = claimTimeout && posterAddr && normalizeAddr(claimTimeout.claimed_by) === posterAddr;

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
            if (disputeResolved) {
              status = { __variant__: 'Accepted' };
            } else if (accepted) {
              if (rejected && rejected > accepted && !disputeResolved) {
                status = { __variant__: 'Locked' };
              } else {
                status = { __variant__: 'Accepted' };
              }
            } else if (claimTimeoutByFreelancer && submitted) {
              status = { __variant__: 'Accepted' };
            } else if (rejected) {
              status = { __variant__: 'Locked' };
            } else if (submitted && !claimTimeoutByPoster) {
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

      const finalMilestones = baseMilestones.map((m: any, index: number) => {
        if (index > 0) {
          const prevMilestone = baseMilestones[index - 1];
          const prevStatus = prevMilestone.status;
          const isPrevAccepted = prevStatus.__variant__ === 'Accepted';
          
          if (isPrevAccepted && m.deadline === 0 && state === 'InProgress') {
            const prevKey = `${jobId}:${prevMilestone.id}`;
            const prevSubmitted = milestoneSubmittedMap.get(prevKey);
            const prevAccepted = milestoneAcceptedMap.get(prevKey);
            const prevDisputeResolved = disputeResolvedMap.get(prevKey);
            const prevClaimTimeout = claimTimeoutMilestoneMap.get(prevKey);
            
            const claimTimeoutByFreelancer = prevClaimTimeout && freelancerAddr && normalizeAddr(prevClaimTimeout.claimed_by) === freelancerAddr;
            
            const resolvedAt = prevDisputeResolved || prevAccepted || (claimTimeoutByFreelancer && prevSubmitted ? prevSubmitted.submitted_at : null);
            
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
      
      const jobResult = {
        id: jobId,
        created_at: Number(evt?.data?.created_at || 0),
        poster: evt?.data?.poster || '',
        cid: evt?.data?.cid || '',
        total_amount: Number(evt?.data?.total_amount || 0),
        milestones_count: Number(evt?.data?.milestones_count || 0),
        milestones: finalMilestones,
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

