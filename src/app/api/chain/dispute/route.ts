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

async function getDisputeStoreHandle(): Promise<{ tableHandle: string; loadHandle: string } | null> {
  try {
    const response = await fetch(
      `${APTOS_NODE_URL}/v1/accounts/${CONTRACT_ADDRESS}/resource/${CONTRACT_ADDRESS}::dispute::DisputeStore`,
      { headers: getHeaders() }
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return {
      tableHandle: data?.data?.table?.handle || null,
      loadHandle: data?.data?.reviewer_load?.handle || null,
    };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const disputeId = searchParams.get('disputeId');
    const action = searchParams.get('action') || 'details';
    const reviewerAddress = searchParams.get('reviewer');

    // Action: get reviewer load
    if (action === 'reviewer_load' && reviewerAddress) {
      const cacheKey = `reviewer_load:${reviewerAddress}`;
      const cached = cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return NextResponse.json(cached.data);
      }

      const handles = await getDisputeStoreHandle();
      if (!handles?.loadHandle) {
        return NextResponse.json({ reviewer: reviewerAddress, load: 0 });
      }

      const loadData = await getTableItem(
        handles.loadHandle,
        'address',
        'u64',
        reviewerAddress
      );

      const result = {
        reviewer: reviewerAddress,
        load: loadData ? Number(loadData) : 0,
      };

      cache.set(cacheKey, { data: result, timestamp: Date.now() });
      return NextResponse.json(result);
    }

    if (!disputeId) {
      return NextResponse.json({ error: 'Missing disputeId parameter' }, { status: 400 });
    }

    const cacheKey = `dispute:${disputeId}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data);
    }

    const handles = await getDisputeStoreHandle();
    if (!handles?.tableHandle) {
      return NextResponse.json({ error: 'Could not get DisputeStore handle' }, { status: 500 });
    }

    const disputeData = await getTableItem(
      handles.tableHandle,
      'u64',
      `${CONTRACT_ADDRESS}::dispute::Dispute`,
      disputeId
    );

    if (!disputeData) {
      return NextResponse.json({ error: 'Dispute not found', disputeId }, { status: 404 });
    }

    const result = {
      id: Number(disputeData.id || disputeId),
      job_id: Number(disputeData.job_id || 0),
      milestone_id: Number(disputeData.milestone_id || 0),
      poster: disputeData.poster,
      freelancer: disputeData.freelancer,
      poster_evidence_cid: disputeData.poster_evidence_cid?.vec?.[0] || null,
      freelancer_evidence_cid: disputeData.freelancer_evidence_cid?.vec?.[0] || null,
      status: parseDisputeStatus(disputeData.status),
      selected_reviewers: disputeData.selected_reviewers || [],
      votes: (disputeData.votes || []).map((v: any) => ({
        reviewer: v.reviewer,
        choice: v.choice, // true = freelancer, false = poster
      })),
      created_at: Number(disputeData.created_at || 0),
      last_reselection_time: Number(disputeData.last_reselection_time || 0),
      last_reselection_by: disputeData.last_reselection_by?.vec?.[0] || null,
      last_vote_time: Number(disputeData.last_vote_time || 0),
      initial_vote_deadline: Number(disputeData.initial_vote_deadline || 0),
    };

    cache.set(cacheKey, { data: result, timestamp: Date.now() });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching dispute:', error);
    return NextResponse.json({ error: 'Failed to fetch dispute data' }, { status: 500 });
  }
}

function parseDisputeStatus(status: any): string {
  if (!status) return 'Open';
  
  if (typeof status === 'object') {
    const variant = Object.keys(status)[0];
    return variant || 'Open';
  }
  
  return String(status);
}

export async function DELETE() {
  cache.clear();
  return NextResponse.json({ success: true, message: 'Dispute cache cleared' });
}

