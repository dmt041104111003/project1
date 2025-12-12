import { CONTRACT_ADDRESS, ROLE_KIND } from '@/constants/contracts';
import {
  getReputationChangedEvents,
  getDisputeOpenedEvents,
  getDisputeVotedEvents,
  getEvidenceAddedEvents,
  getReviewerDisputeEvents,
  getRoleRegisteredEvents,
  getProofStoredEvents,
} from './aptosEvents';

export async function getUserRoles(address: string, limit: number = 200) {
  const normalizedAddr = address.toLowerCase();
  const events = await getRoleRegisteredEvents(limit);
  
  const roles: any[] = [];
  const seenRoles = new Set<string>();
  
  const userEvents = events
    .filter((e: any) => {
      const eventAddr = String(e.data?.address || '').toLowerCase();
      return eventAddr === normalizedAddr;
    })
    .sort((a: any, b: any) => {
      const timeA = Number(a.data?.registered_at || 0);
      const timeB = Number(b.data?.registered_at || 0);
      return timeB - timeA; 
    });
  
  for (const event of userEvents) {
    const roleKind = Number(event.data?.role_kind || 0);
    const roleKey = `${normalizedAddr}_${roleKind}`;
    
    if (seenRoles.has(roleKey)) continue;
    seenRoles.add(roleKey);
    
    let roleName = '';
    if (roleKind === ROLE_KIND.FREELANCER) roleName = 'freelancer';
    else if (roleKind === ROLE_KIND.POSTER) roleName = 'poster';
    else if (roleKind === ROLE_KIND.REVIEWER) roleName = 'reviewer';
    
    if (roleName) {
      const cid = event.data?.cid || null;
      roles.push({ 
        name: roleName, 
        cids: cid ? [cid] : [] 
      });
    }
  }
  
  return { roles };
}

export async function getReputationPoints(address: string, limit: number = 200): Promise<number> {
  try {
    const normalizedAddr = address.toLowerCase();
    const events = await getReputationChangedEvents(limit);
    
    const userEvents = events
      .filter((e: any) => {
        const eventAddr = String(e.data?.address || '').toLowerCase();
        return eventAddr === normalizedAddr;
      })
      .sort((a: any, b: any) => {
        const timeA = Number(a.data?.changed_at || a.data?.timestamp || 0);
        const timeB = Number(b.data?.changed_at || b.data?.timestamp || 0);
        return timeB - timeA;
      });
    
    if (userEvents.length === 0) {
      return 0;
    }
    
    const latestEvent = userEvents[0];
    const newValue = Number(latestEvent.data?.new_value || 0);
    
    return Math.max(0, newValue);
  } catch {
    return 0;
  }
}

export async function getProofData(address: string) {
  const normalizedAddr = address.toLowerCase();
  const events = await getProofStoredEvents(200);
  
  const userEvents = events
    .filter((e: any) => {
      const eventAddr = String(e.data?.address || '').toLowerCase();
      return eventAddr === normalizedAddr;
    })
    .sort((a: any, b: any) => {
      const timeA = Number(a.data?.timestamp || 0);
      const timeB = Number(b.data?.timestamp || 0);
      return timeB - timeA;
    });

  if (userEvents.length === 0) return null;

  const latestEvent = userEvents[0];
  return {
    address: latestEvent.data?.address || address,
    timestamp: latestEvent.data?.timestamp || null,
    proof_hash: latestEvent.data?.proof_hash || null,
  };
}

export async function getDisputeSummary(disputeId: number) {
  const openedEvents = await getDisputeOpenedEvents(200);
  const disputeEvent = openedEvents.find((e: any) => Number(e?.data?.dispute_id || 0) === disputeId);
  
  if (!disputeEvent) return null;

  const votedEvents = await getDisputeVotedEvents(200);
  const disputeVotes = votedEvents.filter((e: any) => Number(e?.data?.dispute_id || 0) === disputeId);
  
  const reviewers: string[] = [];
  const voted: string[] = [];
  let forFreelancer = 0;
  let forPoster = 0;
  
  disputeVotes.forEach((e: any) => {
    const reviewer = String(e?.data?.reviewer || '');
    if (reviewer && !voted.includes(reviewer)) {
      voted.push(reviewer);
      const vote = Boolean(e?.data?.vote_choice || false);
      if (vote) forFreelancer++;
      else forPoster++;
    }
  });

  let winner: null | boolean = null;
  const total = forFreelancer + forPoster;
  if (total >= 3) {
    if (forFreelancer >= 2) winner = true;
    else if (forPoster >= 2) winner = false;
  }

  return {
    reviewers,
    voted_reviewers: voted,
    counts: {
      total,
      forFreelancer,
      forPoster,
    },
    winner,
  };
}

export async function getDisputeEvidence(disputeId: number) {
  const [openedEvents, evidenceEvents] = await Promise.all([
    getDisputeOpenedEvents(200),
    getEvidenceAddedEvents(200),
  ]);
  
  const disputeEvent = openedEvents.find((e: any) => Number(e?.data?.dispute_id || 0) === disputeId);
  if (!disputeEvent) return null;
  
  const posterAddr = String(disputeEvent?.data?.poster || '').toLowerCase();
  const freelancerAddr = String(disputeEvent?.data?.freelancer || '').toLowerCase();
  const openedBy = String(disputeEvent?.data?.opened_by || '').toLowerCase();
  
  let posterEvidenceCid = '';
  let freelancerEvidenceCid = '';
  
  const initialEvidenceCid = disputeEvent?.data?.evidence_cid;
  if (initialEvidenceCid) {
    const initialCid = String(initialEvidenceCid);
    if (openedBy === posterAddr) {
      posterEvidenceCid = initialCid;
    } else if (openedBy === freelancerAddr) {
      freelancerEvidenceCid = initialCid;
    }
  }
  
  const disputeEvidences = evidenceEvents.filter((e: any) => Number(e?.data?.dispute_id || 0) === disputeId);
  
  disputeEvidences.forEach((e: any) => {
    const addedBy = String(e?.data?.added_by || '').toLowerCase();
    const cid = String(e?.data?.evidence_cid || '');
    if (addedBy === posterAddr) {
      posterEvidenceCid = cid;
    } else if (addedBy === freelancerAddr) {
      freelancerEvidenceCid = cid;
    }
  });

  return {
    poster_evidence_cid: posterEvidenceCid,
    freelancer_evidence_cid: freelancerEvidenceCid,
  };
}

export async function getDisputeData(disputeId: number) {
  const [openedEvents, reviewerEvents, votedEvents] = await Promise.all([
    getDisputeOpenedEvents(200),
    getReviewerDisputeEvents(200),
    getDisputeVotedEvents(200),
  ]);
  
  const disputeEvent = openedEvents.find((e: any) => Number(e?.data?.dispute_id || 0) === disputeId);
  if (!disputeEvent) return null;

  const created_at = Number(disputeEvent?.data?.created_at || 0);
  const initial_vote_deadline = created_at + 180 + 60;

  const selectedReviewers = reviewerEvents
    .filter((e: any) => Number(e?.data?.dispute_id || 0) === disputeId)
    .map((e: any) => String(e?.data?.reviewer || ''))
    .filter((addr: string) => addr.length > 0);

  const disputeVotes = votedEvents
    .filter((e: any) => Number(e?.data?.dispute_id || 0) === disputeId)
    .sort((a: any, b: any) => Number(b?.data?.voted_at || 0) - Number(a?.data?.voted_at || 0));
  
  const last_vote_time = disputeVotes.length > 0 
    ? Number(disputeVotes[0]?.data?.voted_at || 0) 
    : created_at;

  const reviewerEventsForDispute = reviewerEvents
    .filter((e: any) => Number(e?.data?.dispute_id || 0) === disputeId)
    .sort((a: any, b: any) => Number(b?.data?.timestamp || 0) - Number(a?.data?.timestamp || 0));
  
  const last_reselection_time = reviewerEventsForDispute.length > 0
    ? Number(reviewerEventsForDispute[0]?.data?.timestamp || 0)
    : 0;

  return {
    dispute_id: disputeId,
    job_id: Number(disputeEvent?.data?.job_id || 0),
    milestone_id: Number(disputeEvent?.data?.milestone_id || 0),
    poster: String(disputeEvent?.data?.poster || ''),
    freelancer: String(disputeEvent?.data?.freelancer || ''),
    opened_by: String(disputeEvent?.data?.opened_by || ''),
    evidence_cid: disputeEvent?.data?.evidence_cid || null,
    selected_reviewers: { vec: selectedReviewers },
    selected_reviewers_count: Number(disputeEvent?.data?.selected_reviewers_count || 0),
    created_at,
    initial_vote_deadline,
    last_vote_time,
    last_reselection_time,
  };
}

export async function getReviewerDisputeHistory(address: string, limit: number = 200) {
  if (!address) return [];
  const normalize = (addr: string) => {
    const lower = String(addr || '').toLowerCase();
    const noPrefix = lower.startsWith('0x') ? lower.slice(2) : lower;
    const trimmed = noPrefix.replace(/^0+/, '');
    return '0x' + (trimmed.length === 0 ? '0' : trimmed);
  };
  const normalized = normalize(address);
  const events = await getReviewerDisputeEvents(limit);
  return events
    .filter((evt: any) => {
      const reviewer = normalize(evt?.data?.reviewer || '');
      return reviewer === normalized;
    })
    .map((evt: any) => ({
      disputeId: Number(evt?.data?.dispute_id || evt?.data?.disputeId || 0),
      jobId: Number(evt?.data?.job_id || evt?.data?.jobId || 0),
      milestoneId: Number(evt?.data?.milestone_id || evt?.data?.milestoneId || 0),
      timestamp: Number(evt?.data?.timestamp || 0),
    }))
    .filter((item: any) => Number(item.disputeId) > 0);
}

