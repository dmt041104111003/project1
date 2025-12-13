import { NextRequest, NextResponse } from 'next/server';
import { APTOS_NODE_URL, CONTRACT_ADDRESS } from '@/constants/contracts';

const APTOS_API_KEY = process.env.APTOS_API_KEY;

const getHeaders = () => ({
  'Content-Type': 'application/json',
  ...(APTOS_API_KEY && { 'Authorization': `Bearer ${APTOS_API_KEY}` }),
});

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30_000;

async function getUTFromEvents(address: string): Promise<number> {
  try {
    const eventsUrl = `${APTOS_NODE_URL}/v1/accounts/${CONTRACT_ADDRESS}/events/${CONTRACT_ADDRESS}::reputation::RepStore/reputation_changed_events?limit=200`;
    const response = await fetch(eventsUrl, { headers: getHeaders() });
    
    if (!response.ok) return 0;
    
    const events = await response.json();
    const normalizedAddr = address.toLowerCase();
    
    let latestUT = 0;
    let latestSeq = -1;
    
    for (const event of events) {
      const eventAddr = String(event?.data?.address || '').toLowerCase();
      const seq = Number(event?.sequence_number || 0);
      
      if (eventAddr === normalizedAddr && seq > latestSeq) {
        latestSeq = seq;
        latestUT = Number(event?.data?.new_value || 0);
      }
    }
    
    return latestUT;
  } catch {
    return 0;
  }
}

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

    // Thử view function trước
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

    let ut = 0;
    
    if (response.ok) {
      const data = await response.json();
      ut = Number(data[0] || 0);
    } else {
      // Fallback: đọc từ events
      console.log(`View function failed for ${address}, falling back to events`);
      ut = await getUTFromEvents(address);
    }

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

