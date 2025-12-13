import { NextRequest, NextResponse } from 'next/server';
import { APTOS_NODE_URL, CONTRACT_ADDRESS } from '@/constants/contracts';

const APTOS_API_KEY = process.env.APTOS_API_KEY;

const getHeaders = () => ({
  'Content-Type': 'application/json',
  ...(APTOS_API_KEY && { 'Authorization': `Bearer ${APTOS_API_KEY}` }),
});

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30_000;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json({ error: 'Missing address parameter' }, { status: 400 });
    }

    const cacheKey = `reputation:${address.toLowerCase()}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data);
    }

    const payload = {
      function: `${CONTRACT_ADDRESS}::reputation::get`,
      type_arguments: [],
      arguments: [address],
    };

    const response = await fetch(`${APTOS_NODE_URL}/v1/view`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const result = { address, ut: 0 };
      cache.set(cacheKey, { data: result, timestamp: Date.now() });
      return NextResponse.json(result);
    }

    const data = await response.json();
    const ut = Number(data[0] || 0);

    const result = { address, ut };
    cache.set(cacheKey, { data: result, timestamp: Date.now() });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching reputation:', error);
    return NextResponse.json({ error: 'Failed to fetch reputation' }, { status: 500 });
  }
}

export async function DELETE() {
  cache.clear();
  return NextResponse.json({ success: true, message: 'Cache cleared' });
}

