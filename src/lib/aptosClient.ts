/**
 * Client-side Aptos blockchain query utilities
 * Thay thế các API routes chỉ đọc dữ liệu từ blockchain
 */

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
const CACHE_TTL = 30_000; // 30 seconds for server-side

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

/**
 * Normalize key theo type (giống tableClient.ts)
 */
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

/**
 * Fetch contract resource data từ Aptos node
 */
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

/**
 * Query table item từ Aptos
 */
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

/**
 * Extract handle từ resource data
 */
export function extractHandle(data: any, path: string[]): string | null {
  if (!data) return null;
  return path.reduce<any>((current, key) => {
    if (current && typeof current === 'object' && key in current) {
      return current[key];
    }
    return null;
  }, data) as string | null;
}

/**
 * Get user roles từ blockchain
 */
/**
 * Get user roles - có thể dùng events để optimize nhưng vẫn query table để lấy CID
 */
export async function getUserRoles(address: string) {
  const normalizedAddr = address.toLowerCase();
  
  // Query table để lấy full data (bao gồm CID)
  const roleStore = await fetchContractResource('role::RoleStore');
  const handle = roleStore?.users?.handle || null;
  
  if (!handle) return { roles: [] };

  const userRoles = await queryTableItem({
    handle,
    keyType: 'address',
    valueType: `${CONTRACT_ADDRESS}::role::UserRoles`,
    key: address,
  });

  if (!userRoles?.roles?.handle) {
    return { roles: [] };
  }

  const rolesHandle = userRoles.roles.handle;
  const [hasFreelancer, hasPoster, hasReviewer] = await Promise.all([
    queryTableItem({ handle: rolesHandle, keyType: 'u8', valueType: 'bool', key: ROLE_KIND.FREELANCER }),
    queryTableItem({ handle: rolesHandle, keyType: 'u8', valueType: 'bool', key: ROLE_KIND.POSTER }),
    queryTableItem({ handle: rolesHandle, keyType: 'u8', valueType: 'bool', key: ROLE_KIND.REVIEWER }),
  ]);

  const roles: any[] = [];

  if (hasFreelancer === true) {
    let cid: string | null = null;
    if (userRoles?.cids?.handle) {
      const cidData = await queryTableItem({
        handle: userRoles.cids.handle,
        keyType: 'u8',
        valueType: '0x1::string::String',
        key: ROLE_KIND.FREELANCER,
      });
      cid = cidData || null;
    }
    roles.push({ name: 'freelancer', cids: cid ? [cid] : [] });
  }

  if (hasPoster === true) {
    let cid: string | null = null;
    if (userRoles?.cids?.handle) {
      const cidData = await queryTableItem({
        handle: userRoles.cids.handle,
        keyType: 'u8',
        valueType: '0x1::string::String',
        key: ROLE_KIND.POSTER,
      });
      cid = cidData || null;
    }
    roles.push({ name: 'poster', cids: cid ? [cid] : [] });
  }

  if (hasReviewer === true) {
    roles.push({ name: 'reviewer', cids: [] });
  }

  return { roles };
}

/**
 * Get user roles từ events (nhanh hơn, nhưng không có CID)
 * Dùng để check role nhanh, sau đó query table nếu cần CID
 */
export async function getUserRolesFromEvents(address: string, limit: number = 200) {
  const normalizedAddr = address.toLowerCase();
  const events = await getRoleRegisteredEvents(limit);
  
  const roles: any[] = [];
  const seenRoles = new Set<string>();
  
  // Lọc events của user này, lấy role mới nhất cho mỗi role_kind
  const userEvents = events
    .filter((e: any) => {
      const eventAddr = String(e.data?.address || '').toLowerCase();
      return eventAddr === normalizedAddr;
    })
    .sort((a: any, b: any) => {
      const timeA = Number(a.data?.registered_at || 0);
      const timeB = Number(b.data?.registered_at || 0);
      return timeB - timeA; // Mới nhất trước
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

/**
 * Get reputation points từ blockchain
 */
export async function getReputationPoints(address: string): Promise<number> {
  try {
    const repStore = await fetchContractResource('reputation::RepStore');
    const handle = repStore?.table?.handle || null;
    
    if (!handle) return 0;

    const data = await queryTableItem({
      handle,
      keyType: 'address',
      valueType: `${CONTRACT_ADDRESS}::reputation::Rep`,
      key: address,
    });

    if (!data) return 0;
    return Number(data?.ut || 0);
  } catch {
    return 0;
  }
}

/**
 * Get job data từ blockchain
 */
export async function getJobData(jobId: number) {
  const escrowStore = await fetchContractResource('escrow::EscrowStore');
  if (!escrowStore?.table?.handle) {
    return null;
  }

  return queryTableItem({
    handle: escrowStore.table.handle,
    keyType: 'u64',
    valueType: `${CONTRACT_ADDRESS}::escrow::Job`,
    key: jobId,
  });
}

/**
 * Get dispute data từ blockchain
 */
export async function getDisputeData(disputeId: number) {
  const disputeStore = await fetchContractResource('dispute::DisputeStore');
  const handle = disputeStore?.table?.handle || null;
  
  if (!handle) return null;

  return queryTableItem({
    handle,
    keyType: 'u64',
    valueType: `${CONTRACT_ADDRESS}::dispute::Dispute`,
    key: disputeId,
  });
}

/**
 * Get proof data từ blockchain
 */
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

/**
 * Get EscrowStore table handle và nextJobId
 */
export async function getEscrowStore() {
  const escrowStore = await fetchContractResource('escrow::EscrowStore');
  if (!escrowStore?.table?.handle) {
    return null;
  }
  return {
    handle: escrowStore.table.handle,
    nextJobId: Number(escrowStore?.next_job_id || 0),
  };
}

/**
 * Generic function để query events từ Aptos (với cache)
 */
async function queryEvents(eventType: string, limit: number = 200) {
  const cacheKey = `${eventType}_${limit}`;
  const cached = eventsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  if (inflightEventsRequests.has(cacheKey)) {
    return inflightEventsRequests.get(cacheKey) as Promise<any[]>;
  }

  const promise = (async () => {
    try {
      const url = `${APTOS_NODE_URL}/v1/accounts/${CONTRACT_ADDRESS}/events/${eventType}?limit=${limit}`;
      const res = await aptosFetch(url);
      if (!res.ok) {
        return [];
      }
      const data = await res.json();
      const events = Array.isArray(data) ? data : [];
      eventsCache.set(cacheKey, { timestamp: Date.now(), data: events });
      return events;
    } catch {
      return [];
    } finally {
      inflightEventsRequests.delete(cacheKey);
    }
  })();

  inflightEventsRequests.set(cacheKey, promise);
  return promise;
}

/**
 * Query JobCreatedEvent từ Aptos (với cache)
 */
export async function getJobCreatedEvents(limit: number = 200) {
  const eventType = `${CONTRACT_ADDRESS}::escrow::JobCreatedEvent`;
  return queryEvents(eventType, limit);
}

/**
 * Query ProofStoredEvent từ Aptos
 */
export async function getProofStoredEvents(limit: number = 200) {
  const eventType = `${CONTRACT_ADDRESS}::role::ProofStoredEvent`;
  return queryEvents(eventType, limit);
}

/**
 * Query RoleRegisteredEvent từ Aptos
 */
export async function getRoleRegisteredEvents(limit: number = 200) {
  const eventType = `${CONTRACT_ADDRESS}::role::RoleRegisteredEvent`;
  return queryEvents(eventType, limit);
}

/**
 * Query ReputationChangedEvent từ Aptos
 */
export async function getReputationChangedEvents(limit: number = 200) {
  const eventType = `${CONTRACT_ADDRESS}::reputation::ReputationChangedEvent`;
  return queryEvents(eventType, limit);
}

/**
 * Query DisputeOpenedEvent từ Aptos
 */
export async function getDisputeOpenedEvents(limit: number = 200) {
  const eventType = `${CONTRACT_ADDRESS}::dispute::DisputeOpenedEvent`;
  return queryEvents(eventType, limit);
}

/**
 * Query DisputeVotedEvent từ Aptos
 */
export async function getDisputeVotedEvents(limit: number = 200) {
  const eventType = `${CONTRACT_ADDRESS}::dispute::DisputeVotedEvent`;
  return queryEvents(eventType, limit);
}

/**
 * Query EvidenceAddedEvent từ Aptos
 */
export async function getEvidenceAddedEvents(limit: number = 200) {
  const eventType = `${CONTRACT_ADDRESS}::dispute::EvidenceAddedEvent`;
  return queryEvents(eventType, limit);
}

/**
 * Query DisputeResolvedEvent từ Aptos
 */
export async function getDisputeResolvedEvents(limit: number = 200) {
  const eventType = `${CONTRACT_ADDRESS}::dispute::DisputeResolvedEvent`;
  return queryEvents(eventType, limit);
}

/**
 * Get list of jobs (parsed) - optimized using events
 */
export async function getJobsList(maxJobs: number = 200) {
  // Query events để lấy job IDs
  const events = await getJobCreatedEvents(maxJobs);
  
  if (events.length === 0) {
    // Fallback: nếu không có events, dùng cách cũ (scan table)
    const store = await getEscrowStore();
    if (!store) return { jobs: [] };

    const jobs: any[] = [];
    const maxScan = Math.min(store.nextJobId, maxJobs);
    const { parseState, parseOptionAddress } = await import('./aptosParsers');

    for (let id = 1; id < maxScan; id++) {
      const jobData = await getJobData(id);
      if (jobData) {
        const stateStr = parseState(jobData?.state);
        const freelancer = parseOptionAddress(jobData?.freelancer);
        const milestones = jobData?.milestones || [];
        const pendingFreelancer = parseOptionAddress(jobData?.pending_freelancer);

        jobs.push({
          id,
          cid: jobData?.cid || '',
          total_amount: Number(jobData?.total_escrow || 0),
          milestones_count: milestones.length,
          has_freelancer: !!freelancer,
          pending_freelancer: pendingFreelancer,
          state: stateStr,
          poster: jobData?.poster,
          freelancer,
          apply_deadline: jobData?.apply_deadline ? Number(jobData.apply_deadline) : undefined,
        });
      }
    }
    return { jobs };
  }

  // Extract job IDs từ events và sort theo created_at (mới nhất trước)
  const jobEvents = events
    .map((evt: any) => ({
      job_id: Number(evt?.data?.job_id || 0),
      created_at: Number(evt?.data?.created_at || 0),
      poster: evt?.data?.poster || '',
      cid: evt?.data?.cid || '',
      total_amount: Number(evt?.data?.total_amount || 0),
      milestones_count: Number(evt?.data?.milestones_count || 0),
      apply_deadline: Number(evt?.data?.apply_deadline || 0),
    }))
    .filter((e: any) => e.job_id > 0)
    .sort((a: any, b: any) => b.created_at - a.created_at) // Mới nhất trước
    .slice(0, maxJobs);

  // Import parsers
  const { parseState, parseOptionAddress } = await import('./aptosParsers');

  // Query job details từ table (parallel batch - 15 at a time)
  const jobIds = jobEvents.map((e: any) => e.job_id);
  const jobDetails: any[] = [];
  
  // Batch process để tránh rate limit
  const BATCH_SIZE = 15;
  for (let i = 0; i < jobIds.length; i += BATCH_SIZE) {
    const batch = jobIds.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (id: number) => {
        const jobData = await getJobData(id);
        if (!jobData) return null;
        
        const stateStr = parseState(jobData?.state);
        const freelancer = parseOptionAddress(jobData?.freelancer);
        const milestones = jobData?.milestones || [];
        const pendingFreelancer = parseOptionAddress(jobData?.pending_freelancer);

        // Merge event data với table data
        const eventData = jobEvents.find((e: any) => e.job_id === id);
        
        return {
          id,
          cid: eventData?.cid || jobData?.cid || '',
          total_amount: eventData?.total_amount || Number(jobData?.total_escrow || 0),
          milestones_count: eventData?.milestones_count || milestones.length,
          has_freelancer: !!freelancer,
          pending_freelancer: pendingFreelancer,
          state: stateStr,
          poster: eventData?.poster || jobData?.poster,
          freelancer,
          apply_deadline: eventData?.apply_deadline || (jobData?.apply_deadline ? Number(jobData.apply_deadline) : undefined),
          created_at: eventData?.created_at,
        };
      })
    );
    jobDetails.push(...batchResults.filter((j) => j !== null));
  }

  // Sort lại theo created_at (mới nhất trước)
  const jobs = jobDetails.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));

  return { jobs };
}

/**
 * Get parsed job data
 */
export async function getParsedJobData(jobId: number) {
  const jobData = await getJobData(jobId);
  if (!jobData) return null;

  const {
    parseState,
    parseOptionAddress,
    parseMilestoneStatus,
    parseOptionString,
  } = await import('./aptosParsers');

  const stateStr = parseState(jobData?.state);
  const freelancer = parseOptionAddress(jobData?.freelancer);
  const pendingFreelancer = parseOptionAddress(jobData?.pending_freelancer);
  const pendingStake = jobData?.pending_stake ? Number(jobData.pending_stake) : 0;
  const pendingFee = jobData?.pending_fee ? Number(jobData.pending_fee) : 0;
  const applyDeadline = jobData?.apply_deadline ? Number(jobData.apply_deadline) : undefined;
  const mutualCancelRequestedBy = parseOptionAddress(jobData?.mutual_cancel_requested_by);
  const freelancerWithdrawRequestedBy = parseOptionAddress(jobData?.freelancer_withdraw_requested_by);

  const toNumber = (value: any) => {
    if (value === null || value === undefined) return 0;
    const num = Number(value);
    return Number.isNaN(num) ? 0 : num;
  };

  const milestones = (jobData?.milestones || []).map((m: any) => {
    const statusStr = parseMilestoneStatus(m?.status);
    return {
      id: toNumber(m?.id),
      amount: toNumber(m?.amount),
      duration: toNumber(m?.duration),
      review_period: toNumber(m?.review_period),
      deadline: toNumber(m?.deadline),
      review_deadline: toNumber(m?.review_deadline),
      status: statusStr,
      evidence_cid: parseOptionString(m?.evidence_cid) || null,
    };
  });

  return {
    id: jobId,
    cid: jobData?.cid || '',
    total_amount: Number(jobData?.job_funds?.value || jobData?.total_escrow || 0),
    milestones_count: milestones.length,
    milestones: milestones,
    has_freelancer: !!freelancer,
    state: stateStr,
    poster: jobData?.poster,
    freelancer,
    pending_freelancer: pendingFreelancer,
    pending_stake: pendingStake,
    pending_fee: pendingFee,
    apply_deadline: applyDeadline,
    mutual_cancel_requested_by: mutualCancelRequestedBy,
    freelancer_withdraw_requested_by: freelancerWithdrawRequestedBy,
  };
}

/**
 * Get parsed dispute data với các actions
 */
export async function getDisputeSummary(disputeId: number) {
  const dispute = await getDisputeData(disputeId);
  if (!dispute) return null;

  const {
    parseAddressVector,
    parseOptionString,
    parseVotedAddresses,
    parseVoteCounts,
    parseDisputeStatus,
  } = await import('./aptosParsers');

  const reviewers = parseAddressVector(dispute?.selected_reviewers);
  const voted = parseVotedAddresses(dispute?.votes || []);
  const counts = parseVoteCounts(dispute?.votes || []);
  let winner: null | boolean = null;
  if (counts.total >= 3) {
    if (counts.forFreelancer >= 2) winner = true;
    else if (counts.forPoster >= 2) winner = false;
  }

  return {
    reviewers,
    voted_reviewers: voted,
    counts,
    winner,
  };
}

export async function getDisputeEvidence(disputeId: number) {
  const dispute = await getDisputeData(disputeId);
  if (!dispute) return null;

  const { parseOptionString } = await import('./aptosParsers');

  return {
    poster_evidence_cid: parseOptionString(dispute?.poster_evidence_cid) || '',
    freelancer_evidence_cid: parseOptionString(dispute?.freelancer_evidence_cid) || '',
  };
}

/**
 * Fetch reviewer assignment events
 */
export async function getReviewerDisputeEvents(limit: number = 200) {
  try {
    const url = `${APTOS_NODE_URL}/v1/accounts/${CONTRACT_ADDRESS}/events/${CONTRACT_ADDRESS}::dispute::DisputeStore/reviewer_events?limit=${limit}`;
    const res = await aptosFetch(url);
    if (!res.ok) {
      return [];
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/**
 * Get dispute history for a reviewer (filtered client-side)
 */
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

