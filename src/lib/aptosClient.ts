/**
 * Client-side Aptos blockchain query utilities
 * Thay thế các API routes chỉ đọc dữ liệu từ blockchain
 */

import { APTOS_NODE_URL, CONTRACT_ADDRESS, ROLE_KIND } from '@/constants/contracts';

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
  try {
    const resourceType = contractResource(resourcePath);
    const res = await fetch(
      `${APTOS_NODE_URL}/v1/accounts/${CONTRACT_ADDRESS}/resource/${resourceType}`
    );
    if (!res.ok) {
      return null;
    }
    const responseText = await res.text();
    if (!responseText || responseText.trim() === '') {
      return null;
    }
    try {
      const payload = JSON.parse(responseText);
      return payload?.data ?? null;
    } catch {
      return null;
    }
  } catch {
    return null;
  }
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
  try {
    const normalizedKey = normalizeKey(params.keyType, params.key);
    const requestBody = {
      key_type: params.keyType,
      value_type: params.valueType,
      key: normalizedKey,
    };
    
    const res = await fetch(`${APTOS_NODE_URL}/v1/tables/${params.handle}/item`, {
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
    try {
      const data = JSON.parse(responseText);
      return data ?? null;
    } catch {
      return null;
    }
  } catch {
    return null;
  }
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
export async function getUserRoles(address: string) {
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
 * Get list of jobs (parsed)
 */
export async function getJobsList(maxJobs: number = 200) {
  const store = await getEscrowStore();
  if (!store) return { jobs: [] };

  const jobs: any[] = [];
  const maxScan = Math.min(store.nextJobId, maxJobs);

  // Import parsers
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

/**
 * Get parsed job data
 */
export async function getParsedJobData(jobId: number) {
  const jobData = await getJobData(jobId);
  if (!jobData) return null;

  const { parseState, parseOptionAddress, parseMilestoneStatus } = await import('./aptosParsers');

  const stateStr = parseState(jobData?.state);
  const freelancer = parseOptionAddress(jobData?.freelancer);
  const pendingFreelancer = parseOptionAddress(jobData?.pending_freelancer);
  const pendingStake = jobData?.pending_stake ? Number(jobData.pending_stake) : 0;
  const pendingFee = jobData?.pending_fee ? Number(jobData.pending_fee) : 0;
  const applyDeadline = jobData?.apply_deadline ? Number(jobData.apply_deadline) : undefined;
  const mutualCancelRequestedBy = parseOptionAddress(jobData?.mutual_cancel_requested_by);
  const freelancerWithdrawRequestedBy = parseOptionAddress(jobData?.freelancer_withdraw_requested_by);

  const milestones = (jobData?.milestones || []).map((m: any) => {
    const statusStr = parseMilestoneStatus(m?.status);
    return {
      id: String(m?.id || 0),
      amount: String(m?.amount || 0),
      deadline: String(m?.deadline || 0),
      status: statusStr,
      evidence_cid: m?.evidence_cid || null,
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
    const res = await fetch(url);
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

