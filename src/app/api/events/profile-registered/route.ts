import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const limitParam = searchParams.get('limit');
    if (!address) return NextResponse.json({ error: 'Missing address' }, { status: 400 });
    const limit = limitParam ? Number(limitParam) : 10;
    const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as string;
    const PROFILE_MODULE = process.env.NEXT_PUBLIC_PROFILE_MODULE as string;
    const APTOS_REST_URL = process.env.NEXT_PUBLIC_APTOS_REST_URL as string;
    const tag = `${CONTRACT_ADDRESS}::${PROFILE_MODULE}::Events`;
    const url = `${APTOS_REST_URL}/v1/accounts/${CONTRACT_ADDRESS}/events/${encodeURIComponent(tag)}/registered?limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) return NextResponse.json({ events: [] });
    const events = await res.json() as unknown[];
    const filtered = (events as unknown[]).filter((e) => {
      const event = e as Record<string, unknown>;
      const data = event?.data as Record<string, unknown>;
      return data?.user?.toString().toLowerCase() === address.toLowerCase();
    });
    return NextResponse.json({ events: filtered });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


