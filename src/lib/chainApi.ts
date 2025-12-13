
const BASE_URL = '/api/chain';
export interface ReputationData {
  address: string;
  ut: number;
}

export async function getReputation(address: string): Promise<ReputationData> {
  const res = await fetch(`${BASE_URL}/reputation?address=${encodeURIComponent(address)}`);
  if (!res.ok) {
    throw new Error('Failed to fetch reputation');
  }
  return res.json();
}

export async function getReputationBatch(addresses: string[]): Promise<Map<string, number>> {
  const results = await Promise.all(
    addresses.map(addr => getReputation(addr).catch(() => ({ address: addr, ut: 0 })))
  );
  
  const map = new Map<string, number>();
  results.forEach(r => map.set(r.address.toLowerCase(), r.ut));
  return map;
}

export interface RoleData {
  address: string;
  roles: {
    freelancer: boolean;
    poster: boolean;
    reviewer: boolean;
  };
  hasProof: boolean;
  cid?: string | null;
}

export async function getRoles(address: string): Promise<RoleData> {
  const res = await fetch(`${BASE_URL}/role?address=${encodeURIComponent(address)}&action=all`);
  if (!res.ok) {
    throw new Error('Failed to fetch roles');
  }
  return res.json();
}

export async function hasProof(address: string): Promise<boolean> {
  const res = await fetch(`${BASE_URL}/role?address=${encodeURIComponent(address)}&action=proof`);
  if (!res.ok) return false;
  const data = await res.json();
  return data.hasProof === true;
}

export async function getRoleCid(address: string, roleKind: number): Promise<string | null> {
  const res = await fetch(
    `${BASE_URL}/role?address=${encodeURIComponent(address)}&action=cid&roleKind=${roleKind}`
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.cid || null;
}

export interface MilestoneData {
  id: number;
  amount: number;
  duration: number;
  deadline: number;
  review_period: number;
  review_deadline: number;
  status: string;
  evidence_cid: string | null;
}

export interface JobData {
  id: number;
  poster: string;
  freelancer: string | null;
  pending_freelancer: string | null;
  cid: string;
  state: string;
  poster_stake: number;
  freelancer_stake: number;
  total_escrow: number;
  apply_deadline: number;
  started_at: number | null;
  dispute_id: number | null;
  dispute_winner: boolean | null;
  mutual_cancel_requested_by: string | null;
  freelancer_withdraw_requested_by: string | null;
  milestones: MilestoneData[];
}

export async function getJob(jobId: number): Promise<JobData | null> {
  const res = await fetch(`${BASE_URL}/job?jobId=${jobId}`);
  if (!res.ok) return null;
  return res.json();
}

export async function getJobBatch(jobIds: number[]): Promise<Map<number, JobData>> {
  const results = await Promise.all(
    jobIds.map(id => getJob(id).catch(() => null))
  );
  
  const map = new Map<number, JobData>();
  results.forEach((job, idx) => {
    if (job) map.set(jobIds[idx], job);
  });
  return map;
}


export interface VoteData {
  reviewer: string;
  choice: boolean; // true = freelancer, false = poster
}

export interface DisputeData {
  id: number;
  job_id: number;
  milestone_id: number;
  poster: string;
  freelancer: string;
  poster_evidence_cid: string | null;
  freelancer_evidence_cid: string | null;
  status: string;
  selected_reviewers: string[];
  votes: VoteData[];
  created_at: number;
  last_reselection_time: number;
  last_reselection_by: string | null;
  last_vote_time: number;
  initial_vote_deadline: number;
}

export async function getDispute(disputeId: number): Promise<DisputeData | null> {
  const res = await fetch(`${BASE_URL}/dispute?disputeId=${disputeId}`);
  if (!res.ok) return null;
  return res.json();
}

export async function getReviewerLoad(reviewerAddress: string): Promise<number> {
  const res = await fetch(
    `${BASE_URL}/dispute?action=reviewer_load&reviewer=${encodeURIComponent(reviewerAddress)}`
  );
  if (!res.ok) return 0;
  const data = await res.json();
  return data.load || 0;
}

export async function getDisputeBatch(disputeIds: number[]): Promise<Map<number, DisputeData>> {
  const results = await Promise.all(
    disputeIds.map(id => getDispute(id).catch(() => null))
  );
  
  const map = new Map<number, DisputeData>();
  results.forEach((dispute, idx) => {
    if (dispute) map.set(disputeIds[idx], dispute);
  });
  return map;
}

export async function clearReputationCache(): Promise<void> {
  await fetch(`${BASE_URL}/reputation`, { method: 'DELETE' });
}

export async function clearRoleCache(): Promise<void> {
  await fetch(`${BASE_URL}/role`, { method: 'DELETE' });
}

export async function clearJobCache(): Promise<void> {
  await fetch(`${BASE_URL}/job`, { method: 'DELETE' });
}

export async function clearDisputeCache(): Promise<void> {
  await fetch(`${BASE_URL}/dispute`, { method: 'DELETE' });
}

export async function clearAllChainCache(): Promise<void> {
  await Promise.all([
    clearReputationCache(),
    clearRoleCache(),
    clearJobCache(),
    clearDisputeCache(),
  ]);
}

