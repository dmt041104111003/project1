import { NextRequest, NextResponse } from 'next/server';
import { APTOS_NODE_URL, CONTRACT_ADDRESS } from '@/constants/contracts';

const APTOS_API_KEY = process.env.APTOS_API_KEY;

const getHeaders = () => ({
  'Content-Type': 'application/json',
  ...(APTOS_API_KEY && { 'Authorization': `Bearer ${APTOS_API_KEY}` }),
});

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 15_000; 

async function getTableItem(tableHandle: string, keyType: string, valueType: string, key: any) {
  const response = await fetch(`${APTOS_NODE_URL}/v1/tables/${tableHandle}/item`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      key_type: keyType,
      value_type: valueType,
      key: key,
    }),
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

async function getEscrowStoreHandle(): Promise<string | null> {
  try {
    const response = await fetch(
      `${APTOS_NODE_URL}/v1/accounts/${CONTRACT_ADDRESS}/resource/${CONTRACT_ADDRESS}::escrow::EscrowStore`,
      { headers: getHeaders() }
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return data?.data?.table?.handle || null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const action = searchParams.get('action') || 'details';

    if (!jobId) {
      return NextResponse.json({ error: 'Missing jobId parameter' }, { status: 400 });
    }

    const cacheKey = `job:${jobId}:${action}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data);
    }

    const tableHandle = await getEscrowStoreHandle();
    if (!tableHandle) {
      return NextResponse.json({ error: 'Could not get EscrowStore handle' }, { status: 500 });
    }

    const jobData = await getTableItem(
      tableHandle,
      'u64',
      `${CONTRACT_ADDRESS}::escrow::Job`,
      jobId
    );

    if (!jobData) {
      return NextResponse.json({ error: 'Job not found', jobId }, { status: 404 });
    }

    const result = {
      id: Number(jobData.id || jobId),
      poster: jobData.poster,
      freelancer: jobData.freelancer?.vec?.[0] || null,
      pending_freelancer: jobData.pending_freelancer?.vec?.[0] || null,
      cid: jobData.cid,
      state: parseJobState(jobData.state),
      poster_stake: Number(jobData.poster_stake || 0),
      freelancer_stake: Number(jobData.freelancer_stake || 0),
      total_escrow: Number(jobData.total_escrow || 0),
      apply_deadline: Number(jobData.apply_deadline || 0),
      started_at: jobData.started_at?.vec?.[0] ? Number(jobData.started_at.vec[0]) : null,
      dispute_id: jobData.dispute_id?.vec?.[0] ? Number(jobData.dispute_id.vec[0]) : null,
      dispute_winner: jobData.dispute_winner?.vec?.[0] !== undefined 
        ? jobData.dispute_winner.vec[0] 
        : null,
      mutual_cancel_requested_by: jobData.mutual_cancel_requested_by?.vec?.[0] || null,
      freelancer_withdraw_requested_by: jobData.freelancer_withdraw_requested_by?.vec?.[0] || null,
      milestones: (jobData.milestones || []).map((m: any, idx: number) => ({
        id: Number(m.id ?? idx),
        amount: Number(m.amount || 0),
        duration: Number(m.duration || 0),
        deadline: Number(m.deadline || 0),
        review_period: Number(m.review_period || 0),
        review_deadline: Number(m.review_deadline || 0),
        status: parseMilestoneStatus(m.status),
        evidence_cid: m.evidence_cid?.vec?.[0] || null,
      })),
    };

    cache.set(cacheKey, { data: result, timestamp: Date.now() });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching job:', error);
    return NextResponse.json({ error: 'Failed to fetch job data' }, { status: 500 });
  }
}

function parseJobState(state: any): string {
  if (!state) return 'Unknown';
  
  if (typeof state === 'object') {
    const variant = Object.keys(state)[0];
    return variant || 'Unknown';
  }
  
  return String(state);
}

function parseMilestoneStatus(status: any): string {
  if (!status) return 'Pending';
  
  if (typeof status === 'object') {
    const variant = Object.keys(status)[0];
    return variant || 'Pending';
  }
  
  return String(status);
}

export async function DELETE() {
  cache.clear();
  return NextResponse.json({ success: true, message: 'Job cache cleared' });
}

