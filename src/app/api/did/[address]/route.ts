import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, context: { params: Promise<{ address: string }> }) {
  try {
    const { address } = await context.params;
    if (!address) return NextResponse.json({ error: 'Missing address' }, { status: 400 });
    const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as string;
    const DID_MODULE = process.env.NEXT_PUBLIC_DID_MODULE as string;
    const PROFILE_MODULE = process.env.NEXT_PUBLIC_PROFILE_MODULE as string;
    const APTOS_REST_URL = process.env.NEXT_PUBLIC_APTOS_REST_URL as string;

    const profileRes = await fetch(`${APTOS_REST_URL}/v1/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        function: `${CONTRACT_ADDRESS}::${PROFILE_MODULE}::get_profile_by_address`,
        type_arguments: [],
        arguments: [address]
      })
    });
    if (!profileRes.ok) return NextResponse.json({ hasVerified: false, didHash: '0x', controller: '' });
    const profileJson = await profileRes.json() as unknown[];
    const didHash = (profileJson?.[0] as Record<string, unknown>)?.did_hash as string | undefined;
    if (!didHash) return NextResponse.json({ hasVerified: false, didHash: '0x', controller: '' });

    const ctrlRes = await fetch(`${APTOS_REST_URL}/v1/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        function: `${CONTRACT_ADDRESS}::${DID_MODULE}::resolve_controller_by_hash`,
        type_arguments: [],
        arguments: [didHash]
      })
    });
    const controller = ctrlRes.ok ? ((await ctrlRes.json() as unknown[])[0] as string) : '';
    const hasVerified = !!controller && controller.toLowerCase() === address.toLowerCase();
    return NextResponse.json({ hasVerified, didHash, controller });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


