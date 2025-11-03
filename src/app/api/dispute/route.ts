import { NextResponse } from "next/server";
import { DISPUTE, CONTRACT_ADDRESS, APTOS_NODE_URL, APTOS_API_KEY } from "@/constants/contracts";

// Helper to get DisputeStore table handle
const getDisputeStoreHandle = async (): Promise<string | null> => {
  try {
    const resourceType = `${CONTRACT_ADDRESS}::dispute::DisputeStore`;
    const res = await fetch(`${APTOS_NODE_URL}/v1/accounts/${CONTRACT_ADDRESS}/resource/${resourceType}`, { headers: { "x-api-key": APTOS_API_KEY, "Authorization": `Bearer ${APTOS_API_KEY}` } });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.table?.handle || null;
  } catch {
    return null;
  }
};

// Helper to query dispute by id
const queryDisputeFromTable = async (tableHandle: string, disputeId: number): Promise<any> => {
  try {
    const res = await fetch(`${APTOS_NODE_URL}/v1/tables/${tableHandle}/item`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": APTOS_API_KEY, "Authorization": `Bearer ${APTOS_API_KEY}` },
      body: JSON.stringify({
        key_type: "u64",
        value_type: `${CONTRACT_ADDRESS}::dispute::Dispute`,
        key: String(disputeId)
      })
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
};

const parseAddressVector = (data: any): string[] => {
  if (!data) return [];
  if (Array.isArray(data)) return data.filter(x => typeof x === 'string');
  if (typeof data === 'object' && data?.vec) return data.vec.filter((x: any) => typeof x === 'string');
  return [];
};

const parseOptionString = (data: any): string | null => {
  if (!data) return null;
  if (typeof data === 'string') return data;
  if (typeof data === 'object' && data?.vec && data.vec.length > 0) return data.vec[0];
  return null;
};

const parseVotedAddresses = (votes: any): string[] => {
  if (!Array.isArray(votes)) return [];
  const out: string[] = [];
  for (const v of votes) {
    if (!v) continue;
    if (typeof v === 'string') {
      out.push(v);
      continue;
    }
    if (Array.isArray(v) && v.length > 0) {
      const addr = v[0];
      if (typeof addr === 'string') out.push(addr);
      continue;
    }
    if (typeof v === 'object' && typeof v.reviewer === 'string') {
      out.push(v.reviewer);
      continue;
    }
  }
  return out;
};

const parseVoteCounts = (votes: any): { total: number; forFreelancer: number; forPoster: number } => {
  let total = 0;
  let forFreelancer = 0;
  if (!Array.isArray(votes)) return { total: 0, forFreelancer: 0, forPoster: 0 };
  for (const v of votes) {
    if (!v) continue;
    total += 1;
    // Common shapes: { reviewer: address, choice: bool } where true=freelancer
    if (typeof v === 'object' && typeof v.choice === 'boolean') {
      if (v.choice === true) forFreelancer += 1;
      continue;
    }
    // Alternate shapes: { vote_for_freelancer: bool }
    if (typeof v === 'object' && typeof v.vote_for_freelancer === 'boolean') {
      if (v.vote_for_freelancer === true) forFreelancer += 1;
      continue;
    }
    // If boolean directly
    if (typeof v === 'boolean') {
      if (v === true) forFreelancer += 1;
      continue;
    }
    // If array like [reviewer, bool]
    if (Array.isArray(v) && v.length > 1 && typeof v[1] === 'boolean') {
      if (v[1] === true) forFreelancer += 1;
      continue;
    }
  }
  const forPoster = total - forFreelancer;
  return { total, forFreelancer, forPoster };
};

export async function POST(req: Request) {
  try {
    const { action, job_id, milestone_id, evidence_cid, dispute_id, vote_choice } = await req.json();
    console.log('[API][dispute][POST]', { action, job_id, milestone_id, dispute_id, hasEvidence: !!evidence_cid, vote_choice });
    switch (action) {
      case 'open_dispute': {
        if (job_id === undefined || milestone_id === undefined || !evidence_cid) {
          return NextResponse.json({ error: 'job_id, milestone_id, evidence_cid required' }, { status: 400 });
        }
        console.log('[API][dispute][POST] prepare OPEN_DISPUTE');
        return NextResponse.json({
          function: DISPUTE.OPEN_DISPUTE,
          type_args: [],
          args: [job_id, milestone_id, evidence_cid]
        });
      }
      case 'add_evidence': {
        if (!dispute_id || !evidence_cid) {
          return NextResponse.json({ error: 'dispute_id, evidence_cid required' }, { status: 400 });
        }
        console.log('[API][dispute][POST] prepare ADD_EVIDENCE');
        return NextResponse.json({
          function: DISPUTE.ADD_EVIDENCE,
          type_args: [],
          args: [dispute_id, evidence_cid]
        });
      }
      case 'reviewer_vote': {
        if (!dispute_id || vote_choice === undefined) {
          return NextResponse.json({ error: 'dispute_id and vote_choice required' }, { status: 400 });
        }
        console.log('[API][dispute][POST] prepare REVIEWER_VOTE');
        return NextResponse.json({
          function: DISPUTE.REVIEWER_VOTE,
          type_args: [],
          args: [dispute_id, vote_choice === true || vote_choice === 'true']
        });
      }
      default:
        return NextResponse.json({ error: 'Invalid action. Use: open_dispute, add_evidence, reviewer_vote' }, { status: 400 });
    }
  } catch (e: any) {
    console.error('[API][dispute][POST] error', e);
    return NextResponse.json({ error: e?.message || 'Failed to prepare transaction' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const disputeIdParam = searchParams.get('dispute_id');
    console.log('[API][dispute][GET] query', { action, dispute_id: disputeIdParam });
    if (!action || !disputeIdParam) {
      return NextResponse.json({ error: 'action and dispute_id required' }, { status: 400 });
    }
    const disputeId = parseInt(disputeIdParam);
    const handle = await getDisputeStoreHandle();
    console.log('[API][dispute][GET] handle', handle);
    if (!handle) return NextResponse.json({ error: 'DisputeStore not found' }, { status: 404 });
    const dispute = await queryDisputeFromTable(handle, disputeId);
    try { console.log('[API][dispute][GET] dispute', JSON.stringify(dispute)); } catch {}
    if (!dispute) return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });

    switch (action) {
      case 'get_reviewers':
        {
          const reviewers = parseAddressVector(dispute?.selected_reviewers);
          console.log('[API][dispute][GET] selected_reviewers', reviewers);
          return NextResponse.json({ selected_reviewers: reviewers });
        }
      case 'get_evidence':
        {
          const poster = parseOptionString(dispute?.poster_evidence_cid) || '';
          const freelancer = parseOptionString(dispute?.freelancer_evidence_cid) || '';
          console.log('[API][dispute][GET] evidence', { poster, freelancer });
          return NextResponse.json({
            poster_evidence_cid: poster,
            freelancer_evidence_cid: freelancer
          });
        }
      case 'get_votes':
        {
          const voted = parseVotedAddresses(dispute?.votes || []);
          console.log('[API][dispute][GET] votes', voted);
          return NextResponse.json({ voted_reviewers: voted });
        }
      case 'get_summary':
        {
          const reviewers = parseAddressVector(dispute?.selected_reviewers);
          const voted = parseVotedAddresses(dispute?.votes || []);
          const counts = parseVoteCounts(dispute?.votes || []);
          let winner: null | boolean = null; // true=freelancer, false=poster
          if (counts.total >= 2) {
            if (counts.forFreelancer > counts.forPoster) winner = true;
            else if (counts.forPoster > counts.forFreelancer) winner = false;
          }
          console.log('[API][dispute][GET] summary', { counts, winner });
          return NextResponse.json({ reviewers, voted_reviewers: voted, counts, winner });
        }
      default:
        return NextResponse.json({ error: 'Invalid action. Use: get_reviewers, get_evidence' }, { status: 400 });
    }
  } catch (e: any) {
    console.error('[API][dispute][GET] error', e);
    return NextResponse.json({ error: e?.message || 'Failed to fetch dispute data' }, { status: 500 });
  }
}

 