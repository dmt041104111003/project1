import { APTOS_NODE_URL, CONTRACT_ADDRESS, ROLE_KIND } from '@/constants/contracts';

const APTOS_API_KEY =
  process.env.NEXT_PUBLIC_APTOS_API_KEY ||
  process.env.APTOS_API_KEY ||
  '';

const withAptosHeaders = (init?: RequestInit): RequestInit => {
  const headers = new Headers(init?.headers);
  if (APTOS_API_KEY) {
    if (!headers.has('x-api-key')) {
      headers.set('x-api-key', APTOS_API_KEY);
    }
    if (!headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${APTOS_API_KEY}`);
    }
  }
  return {
    ...init,
    headers,
  };
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const MAX_RETRY = 3;
const CACHE_TTL = 30_000;

type CacheEntry<T> = {
  timestamp: number;
  data: T | null;
};

const resourceCache = new Map<string, CacheEntry<any>>();
const tableCache = new Map<string, CacheEntry<any>>();
const eventsCache = new Map<string, CacheEntry<any>>();
const inflightResourceRequests = new Map<string, Promise<any>>();
const inflightTableRequests = new Map<string, Promise<any>>();
const inflightEventsRequests = new Map<string, Promise<any>>();

const aptosFetch = async (input: RequestInfo | URL, init?: RequestInit, attempt = 0): Promise<Response> => {
  const response = await fetch(input, withAptosHeaders(init));
  if (response.status === 429 && attempt < MAX_RETRY) {
    const backoff = 300 * Math.pow(2, attempt);
    await sleep(backoff);
    return aptosFetch(input, init, attempt + 1);
  }
  return response;
};

const contractResource = (path: string) => `${CONTRACT_ADDRESS}::${path}`;


function normalizeKey(keyType: string, key: any) {
  if (!keyType) return key;
  if (keyType === 'address') return key;
  if (keyType === 'u8') {
    if (typeof key === 'number') return key;
    const num = Number(key);
    return isNaN(num) ? key : num;
  }
  if (keyType === 'u64') return String(key);
  if (keyType.startsWith('u')) return String(key);
  return key;
}

export async function fetchContractResource<T = any>(resourcePath: string): Promise<T | null> {
  const resourceType = contractResource(resourcePath);
  const cacheKey = resourceType;
  const cached = resourceCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  if (inflightResourceRequests.has(cacheKey)) {
    return inflightResourceRequests.get(cacheKey) as Promise<T | null>;
  }

  const promise = (async () => {
    try {
      const res = await aptosFetch(
        `${APTOS_NODE_URL}/v1/accounts/${CONTRACT_ADDRESS}/resource/${resourceType}`
      );
      if (!res.ok) {
        return null;
      }
      const responseText = await res.text();
      if (!responseText || responseText.trim() === '') {
        return null;
      }
      const payload = JSON.parse(responseText);
      const data = payload?.data ?? null;
      resourceCache.set(cacheKey, { timestamp: Date.now(), data });
      return data;
    } catch {
      return null;
    } finally {
      inflightResourceRequests.delete(cacheKey);
    }
  })();

  inflightResourceRequests.set(cacheKey, promise);
  return promise;
}


export async function queryTableItem<T = any>(params: {
  handle: string;
  keyType: string;
  valueType: string;
  key: any;
}): Promise<T | null> {
  const normalizedKey = normalizeKey(params.keyType, params.key);
  const cacheKey = `${params.handle}:${params.keyType}:${params.valueType}:${JSON.stringify(normalizedKey)}`;
  const cached = tableCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  if (inflightTableRequests.has(cacheKey)) {
    return inflightTableRequests.get(cacheKey) as Promise<T | null>;
  }

  const promise = (async () => {
    try {
      const requestBody = {
        key_type: params.keyType,
        value_type: params.valueType,
        key: normalizedKey,
      };
      
      const res = await aptosFetch(`${APTOS_NODE_URL}/v1/tables/${params.handle}/item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      
      if (!res.ok) {
        if (res.status === 404) return null;
        return null;
      }
      const responseText = await res.text();
      if (!responseText || responseText.trim() === '') {
        return null;
      }
      const data = JSON.parse(responseText) ?? null;
      tableCache.set(cacheKey, { timestamp: Date.now(), data });
      return data;
    } catch {
      return null;
    } finally {
      inflightTableRequests.delete(cacheKey);
    }
  })();

  inflightTableRequests.set(cacheKey, promise);
  return promise;
}


export function extractHandle(data: any, path: string[]): string | null {
  if (!data) return null;
  return path.reduce<any>((current, key) => {
    if (current && typeof current === 'object' && key in current) {
      return current[key];
    }
    return null;
  }, data) as string | null;
}


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
        const timeA = Number(a.data?.timestamp || 0);
        const timeB = Number(b.data?.timestamp || 0);
        return timeB - timeA;
      });
    
    let reputation = 0;
    for (const event of userEvents) {
      const change = Number(event.data?.change || 0);
      reputation += change;
    }
    
    return Math.max(0, reputation);
  } catch {
    return 0;
  }
}


export async function getProofData(address: string) {
  const roleStore = await fetchContractResource('role::RoleStore');
  const proofsHandle = roleStore?.proofs?.handle;
  
  if (!proofsHandle) return null;

  return queryTableItem({
    handle: proofsHandle,
    keyType: 'address',
    valueType: `${CONTRACT_ADDRESS}::role::CCCDProof`,
    key: address,
  });
}


async function queryEvents(eventHandle: string, fieldName: string, limit: number = 200) {
  const cacheKey = `${eventHandle}_${fieldName}_${limit}`;
  const cached = eventsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  if (inflightEventsRequests.has(cacheKey)) {
    return inflightEventsRequests.get(cacheKey) as Promise<any[]>;
  }

  const promise = (async () => {
    try {
      const encodedEventHandle = encodeURIComponent(eventHandle);
      const url = `${APTOS_NODE_URL}/v1/accounts/${CONTRACT_ADDRESS}/events/${encodedEventHandle}/${fieldName}?limit=${limit}`;
      const res = await aptosFetch(url);
      if (!res.ok) {
        if (res.status === 400) {
          console.error(`Failed to query events for ${eventHandle}/${fieldName}:`, res.status, res.statusText);
        }
        return [];
      }
      const data = await res.json();
      const events = Array.isArray(data) ? data : [];
      eventsCache.set(cacheKey, { timestamp: Date.now(), data: events });
      return events;
    } catch (error) {
      console.error(`Error querying events for ${eventHandle}/${fieldName}:`, error);
      return [];
    } finally {
      inflightEventsRequests.delete(cacheKey);
    }
  })();

  inflightEventsRequests.set(cacheKey, promise);
  return promise;
}

export async function getJobCreatedEvents(limit: number = 200) {
  const eventHandle = `${CONTRACT_ADDRESS}::escrow::EscrowStore`;
  return queryEvents(eventHandle, 'job_created_events', limit);
}

export async function getJobAppliedEvents(limit: number = 200) {
  const eventHandle = `${CONTRACT_ADDRESS}::escrow::EscrowStore`;
  return queryEvents(eventHandle, 'job_applied_events', limit);
}

export async function getJobStateChangedEvents(limit: number = 200) {
  const eventHandle = `${CONTRACT_ADDRESS}::escrow::EscrowStore`;
  return queryEvents(eventHandle, 'job_state_changed_events', limit);
}

export async function getMilestoneCreatedEvents(limit: number = 200) {
  const eventHandle = `${CONTRACT_ADDRESS}::escrow::EscrowStore`;
  return queryEvents(eventHandle, 'milestone_created_events', limit);
}

export async function getMilestoneSubmittedEvents(limit: number = 200) {
  const eventHandle = `${CONTRACT_ADDRESS}::escrow::EscrowStore`;
  return queryEvents(eventHandle, 'milestone_submitted_events', limit);
}

export async function getMilestoneAcceptedEvents(limit: number = 200) {
  const eventHandle = `${CONTRACT_ADDRESS}::escrow::EscrowStore`;
  return queryEvents(eventHandle, 'milestone_accepted_events', limit);
}

export async function getMilestoneRejectedEvents(limit: number = 200) {
  const eventHandle = `${CONTRACT_ADDRESS}::escrow::EscrowStore`;
  return queryEvents(eventHandle, 'milestone_rejected_events', limit);
}

export async function getClaimTimeoutEvents(limit: number = 200) {
  const eventHandle = `${CONTRACT_ADDRESS}::escrow::EscrowStore`;
  return queryEvents(eventHandle, 'claim_timeout_events', limit);
}

export async function getProofStoredEvents(limit: number = 200) {
  const eventHandle = `${CONTRACT_ADDRESS}::role::RoleStore`;
  return queryEvents(eventHandle, 'proof_stored_events', limit);
}

export async function getRoleRegisteredEvents(limit: number = 200) {
  const eventHandle = `${CONTRACT_ADDRESS}::role::RoleStore`;
  return queryEvents(eventHandle, 'role_registered_events', limit);
}

export function clearRoleEventsCache() {
  const eventHandle = `${CONTRACT_ADDRESS}::role::RoleStore`;
  const cacheKey = `${eventHandle}_role_registered_events_200`;
  eventsCache.delete(cacheKey);
}

export async function getReputationChangedEvents(limit: number = 200) {
  const eventHandle = `${CONTRACT_ADDRESS}::reputation::RepStore`;
  return queryEvents(eventHandle, 'reputation_changed_events', limit);
}

export async function getDisputeOpenedEvents(limit: number = 200) {
  const eventHandle = `${CONTRACT_ADDRESS}::dispute::DisputeStore`;
  return queryEvents(eventHandle, 'dispute_opened_events', limit);
}

export async function getDisputeVotedEvents(limit: number = 200) {
  const eventHandle = `${CONTRACT_ADDRESS}::dispute::DisputeStore`;
  return queryEvents(eventHandle, 'dispute_voted_events', limit);
}

export async function getEvidenceAddedEvents(limit: number = 200) {
  const eventHandle = `${CONTRACT_ADDRESS}::dispute::DisputeStore`;
  return queryEvents(eventHandle, 'evidence_added_events', limit);
}

export async function getDisputeResolvedEvents(limit: number = 200) {
  const eventHandle = `${CONTRACT_ADDRESS}::dispute::DisputeStore`;
  return queryEvents(eventHandle, 'dispute_resolved_events', limit);
}

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
  const [createdEvents, appliedEvents, stateEvents, milestoneCreatedEvents, milestoneSubmittedEvents, milestoneAcceptedEvents, milestoneRejectedEvents] = await Promise.all([
    getJobCreatedEvents(200),
    getJobAppliedEvents(200),
    getJobStateChangedEvents(200),
    getMilestoneCreatedEvents(200),
    getMilestoneSubmittedEvents(200),
    getMilestoneAcceptedEvents(200),
    getMilestoneRejectedEvents(200),
  ]);
  
  const jobEvent = createdEvents.find((e: any) => Number(e?.data?.job_id || 0) === jobId);
  if (!jobEvent) return null;

  const appliedEvent = appliedEvents.find((e: any) => Number(e?.data?.job_id || 0) === jobId);
  const freelancer = appliedEvent?.data?.freelancer || null;

  const stateEvent = stateEvents
    .filter((e: any) => Number(e?.data?.job_id || 0) === jobId)
    .sort((a: any, b: any) => Number(b?.data?.changed_at || 0) - Number(a?.data?.changed_at || 0))[0];
  const state = stateEvent?.data?.new_state || 'Posted';

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
    pending_freelancer: null,
    pending_stake: 0,
    pending_fee: 0,
    apply_deadline: jobEvent?.data?.apply_deadline ? Number(jobEvent.data.apply_deadline) : undefined,
    mutual_cancel_requested_by: null,
    freelancer_withdraw_requested_by: null,
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
  
  const disputeEvidences = evidenceEvents.filter((e: any) => Number(e?.data?.dispute_id || 0) === disputeId);
  
  let posterEvidenceCid = '';
  let freelancerEvidenceCid = '';
  
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

export async function getReviewerDisputeEvents(limit: number = 200) {
  const eventHandle = `${CONTRACT_ADDRESS}::dispute::DisputeStore`;
  return queryEvents(eventHandle, 'reviewer_events', limit);
}

export async function getDisputeData(disputeId: number) {
  const openedEvents = await getDisputeOpenedEvents(200);
  const disputeEvent = openedEvents.find((e: any) => Number(e?.data?.dispute_id || 0) === disputeId);
  
  if (!disputeEvent) return null;

  const reviewerEvents = await getReviewerDisputeEvents(200);
  const selectedReviewers = reviewerEvents
    .filter((e: any) => Number(e?.data?.dispute_id || 0) === disputeId)
    .map((e: any) => String(e?.data?.reviewer || ''))
    .filter((addr: string) => addr.length > 0);

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
    created_at: Number(disputeEvent?.data?.created_at || 0),
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

