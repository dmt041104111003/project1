import { NextRequest, NextResponse } from 'next/server';
import { APTOS_NODE_URL, CONTRACT_ADDRESS } from '@/constants/contracts';

const decryptCid = async (value: string): Promise<string> => {
	if (!value?.startsWith('enc:')) return value;
	try {
		const [, ivB64, ctB64] = value.split(':');
		const key = await crypto.subtle.importKey('raw', Buffer.from(process.env.CID_SECRET_B64!, 'base64'), { name: 'AES-GCM' }, false, ['decrypt']);
		const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: Buffer.from(ivB64, 'base64') }, key, Buffer.from(ctB64, 'base64'));
		return new TextDecoder().decode(pt);
	} catch {
		return value;
	}
};

export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url);
	const cid = searchParams.get('cid');
	const jobId = searchParams.get('jobId');
	const mode = searchParams.get('mode');
	
	let resolvedCid = cid ? await decryptCid(cid) : null;
	
	if (!resolvedCid && jobId) {
		const res = await fetch(`${APTOS_NODE_URL}/v1/view`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ function: `${CONTRACT_ADDRESS}::escrow::get_job_info`, type_arguments: [], arguments: [CONTRACT_ADDRESS, jobId] })
		});
		if (res.ok) {
			const [cidBytes] = await res.json();
			const cidString = Array.isArray(cidBytes) ? String.fromCharCode(...cidBytes).replace(/\0/g, '') : cidBytes?.startsWith('0x') ? Buffer.from(cidBytes.slice(2), 'hex').toString('utf8') : cidBytes;
			resolvedCid = cidString ? await decryptCid(cidString) : null;
		}
	}
	
	if (!resolvedCid) return NextResponse.json({ success: false, error: 'cid required' }, { status: 400 });
	
	const gateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs';
	const res = await fetch(`${gateway}/${resolvedCid}`, { method: 'GET' });
	if (!res.ok) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
	
	const data = await res.json();
	
	if (searchParams.get('freelancers') === 'true') {
		return NextResponse.json({ success: true, cid: resolvedCid, applicants: data?.applicants || [] });
	}
	
	if (mode === 'profile') {
		return NextResponse.json({ success: true, about: data?.about, description: data?.description, created_at: data?.created_at });
	}
	
	return NextResponse.json({ success: true, cid: resolvedCid, data });
}
