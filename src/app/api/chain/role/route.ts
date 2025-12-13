import { NextRequest, NextResponse } from 'next/server';
import { APTOS_NODE_URL, CONTRACT_ADDRESS } from '@/constants/contracts';

const APTOS_API_KEY = process.env.APTOS_API_KEY;

const getHeaders = () => ({
  'Content-Type': 'application/json',
  ...(APTOS_API_KEY && { 'Authorization': `Bearer ${APTOS_API_KEY}` }),
});

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60_000; 

async function callViewFunction(functionName: string, args: any[]) {
  const payload = {
    function: `${CONTRACT_ADDRESS}::role::${functionName}`,
    type_arguments: [],
    arguments: args,
  };

  const response = await fetch(`${APTOS_NODE_URL}/v1/view`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const action = searchParams.get('action') || 'all';

    if (!address) {
      return NextResponse.json({ error: 'Missing address parameter' }, { status: 400 });
    }

    const normalizedAddr = address.toLowerCase();
    const cacheKey = `role:${normalizedAddr}:${action}`;
    
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data);
    }

    let result: any = { address };

    if (action === 'all' || action === 'roles') {
      const [hasFreelancer, hasPoster, hasReviewer, hasProof] = await Promise.all([
        callViewFunction('has_freelancer', [address]),
        callViewFunction('has_poster', [address]),
        callViewFunction('has_reviewer', [address]),
        callViewFunction('has_proof', [address]),
      ]);

      result.roles = {
        freelancer: hasFreelancer?.[0] === true,
        poster: hasPoster?.[0] === true,
        reviewer: hasReviewer?.[0] === true,
      };
      result.hasProof = hasProof?.[0] === true;
    }

    if (action === 'all' || action === 'cid') {
      const roleKind = searchParams.get('roleKind');
      if (roleKind) {
        const cidResult = await callViewFunction('get_cid', [address, parseInt(roleKind)]);
        result.cid = cidResult?.[0]?.vec?.[0] || null;
      }
    }

    if (action === 'proof') {
      const proofResult = await callViewFunction('has_proof', [address]);
      result.hasProof = proofResult?.[0] === true;
    }

    cache.set(cacheKey, { data: result, timestamp: Date.now() });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching role:', error);
    return NextResponse.json({ error: 'Failed to fetch role data' }, { status: 500 });
  }
}

export async function DELETE() {
  cache.clear();
  return NextResponse.json({ success: true, message: 'Role cache cleared' });
}

