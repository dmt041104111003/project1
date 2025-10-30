import { NextRequest, NextResponse } from 'next/server';
import { APTOS_NODE_URL } from '@/constants/contracts';

const getIPFSJson = async (cid: string): Promise<Record<string, unknown> | null> => {
	if (!cid) return null;
	try {
		const gateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs';
		const res = await fetch(`${gateway}/${cid}`);
		return res.ok ? await res.json() : null;
	} catch { return null; }
};

const maybeDecryptCid = async (value: string): Promise<string> => {
  if (!value || !value.startsWith('enc:')) return value;
  const secret = process.env.CID_SECRET_B64;
  if (!secret) return value;
  try {
    const [, ivB64, ctB64] = value.split(':');
    const iv = Buffer.from(ivB64, 'base64');
    const ct = Buffer.from(ctB64, 'base64');
    const key = await crypto.subtle.importKey('raw', Buffer.from(secret, 'base64'), { name: 'AES-GCM' }, false, ['decrypt']);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(iv) }, key, ct);
    return new TextDecoder().decode(pt);
  } catch {
    return value;
  }
};

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const cid = searchParams.get('cid') || searchParams.get('jobId');
		const freelancersOnly = searchParams.get('freelancers') === 'true';
		const viewFn = searchParams.get('viewFn');
		let resolvedCid = cid ? await maybeDecryptCid(cid) : null;
		console.log('GET /api/ipfs/get - Requested CID from FE:', cid);
		console.log('GET /api/ipfs/get - After decrypt, resolvedCid:', resolvedCid);
		if (!resolvedCid && viewFn) {
			const jobId = searchParams.get('jobId');
			if (!jobId) return NextResponse.json({ success: false, error: 'jobId required for viewFn' }, { status: 400 });
			const res = await fetch(`${APTOS_NODE_URL}/v1/view`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ function: viewFn, type_arguments: [], arguments: [jobId] })
			});
			if (!res.ok) return NextResponse.json({ success: false, error: `view failed: ${res.status}` }, { status: res.status });
			const out = await res.json();
			const pick = Array.isArray(out) ? (out.find((x: any) => typeof x === 'string') ?? out[0]) : out;
			const toUtf8 = (val: any) => {
				if (typeof val === 'string') return val.startsWith('0x') ? Buffer.from(val.slice(2), 'hex').toString('utf8') : val;
				if (Array.isArray(val)) return Buffer.from(val).toString('utf8');
				return '';
			};
			resolvedCid = await maybeDecryptCid(toUtf8(pick));
		}
		if (!resolvedCid) return NextResponse.json({ success: false, error: 'cid required' }, { status: 400 });
		const data = await getIPFSJson(resolvedCid);
		if (!data) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
		if (freelancersOnly) {
			const applicants = Array.isArray((data as any)?.applicants) ? (data as any).applicants : [];
			return NextResponse.json({ success: true, cid: resolvedCid, applicants });
		}
		if (searchParams.get('mode') === 'profile') {
			const profile: Record<string,unknown> = {};
			for(const k of ['about','description','created_at']) if(data[k]) profile[k]=data[k];
			return NextResponse.json({ success:true, ...profile });
		}
		return NextResponse.json({ success: true, cid: resolvedCid, data });
	} catch (error: unknown) {
		return NextResponse.json({ success: false, error: (error as Error).message || 'Failed' }, { status: 500 });
	}
}