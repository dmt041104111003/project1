import { NextRequest, NextResponse } from 'next/server';
import { CONTRACT_ADDRESS, APTOS_NODE_URL } from '@/constants/contracts';
import { aptosFetch } from '@/lib/aptosClientCore';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const eventType = searchParams.get('type'); 
  const limit = parseInt(searchParams.get('limit') || '200', 10);

  if (!eventType || (eventType !== 'role_registered' && eventType !== 'proof_stored')) {
    return NextResponse.json(
      { error: 'Invalid event type. Must be "role_registered" or "proof_stored"' },
      { status: 400 }
    );
  }

  try {
    const eventHandle = `${CONTRACT_ADDRESS}::role::RoleStore`;
    const fieldName = eventType === 'role_registered' 
      ? 'role_registered_events' 
      : 'proof_stored_events';
    
    const encodedEventHandle = encodeURIComponent(eventHandle);
    const url = `${APTOS_NODE_URL}/v1/accounts/${CONTRACT_ADDRESS}/events/${encodedEventHandle}/${fieldName}?limit=${limit}`;
    
    const res = await aptosFetch(url);
    
    if (!res.ok) {
      if (res.status === 429) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: `Failed to fetch events: ${res.status} ${res.statusText}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    const events = Array.isArray(data) ? data : [];

    return NextResponse.json({ events });
  } catch (error: any) {
    console.error(`Error fetching ${eventType} events:`, error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


