import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, context: { params: Promise<{ address: string }> }) {
  try {
    const { address } = await context.params;
    if (!address) return NextResponse.json({ error: 'Missing address' }, { status: 400 });
    const searchParams = new URL(_req.url).searchParams;
    const select = searchParams.get('select');
    const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as string;
    const PROFILE_MODULE = process.env.NEXT_PUBLIC_PROFILE_MODULE as string;
    const APTOS_REST_URL = process.env.NEXT_PUBLIC_APTOS_REST_URL as string;
    const runView = async (func: string) => fetch(`${APTOS_REST_URL}/v1/view`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ function: func, type_arguments: [], arguments: [address] })
    });

    if (select === 'exists') {
      const res = await runView(`${CONTRACT_ADDRESS}::${PROFILE_MODULE}::has_profile`);
      if (!res.ok) return NextResponse.json({ exists: false });
      const data = await res.json() as unknown[];
      return NextResponse.json({ exists: Boolean(data[0]) });
    }

    if (select === 'cids') {
      const res = await runView(`${CONTRACT_ADDRESS}::${PROFILE_MODULE}::get_profile_cids_by_address`);
      if (!res.ok) return NextResponse.json({ cids: [] });
      const data = await res.json() as unknown[];
      return NextResponse.json({ cids: data[0] as string[] });
    }

    if (select === 'latest') {
      const res = await runView(`${CONTRACT_ADDRESS}::${PROFILE_MODULE}::get_latest_profile_cid_by_address`);
      if (!res.ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const data = await res.json() as unknown[];
      const cid = data[0] as string | undefined;
      if (!cid) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ cid });
    }

    if (select === 'verification') {
      const res = await runView(`${CONTRACT_ADDRESS}::${PROFILE_MODULE}::get_verification_cid_by_address`);
      if (!res.ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const data = await res.json() as unknown[];
      const cid = data[0] as string | undefined;
      if (!cid) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ cid });
    }

    // default: full profile
    const response = await runView(`${CONTRACT_ADDRESS}::${PROFILE_MODULE}::get_profile_by_address`);
    if (!response.ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const data = await response.json() as unknown[];
    const raw = data[0] as Record<string, unknown> | undefined;
    if (!raw) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({
      did_hash: raw.did_hash as string,
      verification_cid: (raw.verification_cid as string) || '',
      profile_cid: (raw.profile_cid as string) || '',
      cv_cid: (raw.cv_cid as string) || '',
      avatar_cid: (raw.avatar_cid as string) || '',
      created_at: Number(raw.created_at)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


