import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

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
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=60' },
      body: JSON.stringify({ function: func, type_arguments: [], arguments: [address] }),
      cache: 'force-cache'
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


export async function PUT(req: Request, context: { params: Promise<{ address: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session as any).address) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { address } = await context.params;
    const sessionAddress = (session as any).address as string;
    if (!address || sessionAddress.toLowerCase() !== address.toLowerCase()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const data: any = {};
    if (typeof body.headline === 'string') data.headline = body.headline;
    if (typeof body.summary === 'string') data.summary = body.summary;
    if (Array.isArray(body.skills)) data.skills = body.skills.map((s: unknown) => String(s));
    if (typeof body.experience === 'string') data.experience = body.experience;
    if (typeof body.education === 'string') data.education = body.education;
    if (Array.isArray(body.links)) data.links = body.links.map((l: unknown) => String(l));

    if (typeof body.verificationCid === 'string') data.verificationCid = body.verificationCid;
    if (typeof body.profileCid === 'string') data.profileCid = body.profileCid;
    if (typeof body.cvCid === 'string') data.cvCid = body.cvCid;
    if (typeof body.avatarCid === 'string') data.avatarCid = body.avatarCid;
    if (typeof body.didHash === 'string') data.didHash = body.didHash;
    if (typeof body.isVerifiedDid === 'boolean') data.isVerifiedDid = body.isVerifiedDid;

    const updated = await prisma.user.update({
      where: { address: sessionAddress },
      data,
      select: {
        address: true,
        role: true,
        headline: true,
        summary: true,
        skills: true,
        experience: true,
        education: true,
        links: true,
        verificationCid: true,
        profileCid: true,
        cvCid: true,
        avatarCid: true,
        didHash: true,
        isVerifiedDid: true,
        updatedAt: true,
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


