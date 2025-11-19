import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/api/auth/_lib/helpers';
import { getTableHandle, queryJobFromTable, parseOptionAddress } from '@/app/api/job/utils';
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

const parseEvidenceCid = (raw: any): string | null => {
	if (!raw) return null;
	if (typeof raw === 'string') return raw;
	if (raw?.vec && Array.isArray(raw.vec) && raw.vec.length > 0) {
		return raw.vec[0];
	}
	return null;
};

const findMilestoneByCid = async (
	store: { handle: string; nextJobId: number },
	targetCid: string,
	jobIdFilter?: number
): Promise<{ job: any; jobId: number; milestone: any; milestoneIndex: number } | null> => {
	const maxScan = Math.min(store.nextJobId, 200);
	const startId = jobIdFilter ? jobIdFilter : 1;
	const endId = jobIdFilter ? jobIdFilter : maxScan;

	for (let id = startId; id <= endId; id++) {
		const jobData = await queryJobFromTable(store.handle, id);
		if (!jobData) continue;

		const milestones = Array.isArray(jobData.milestones) ? jobData.milestones : [];
		for (let idx = 0; idx < milestones.length; idx++) {
			const evidenceCid = parseEvidenceCid(milestones[idx]?.evidence_cid);
			if (!evidenceCid) continue;
			const decrypted = await decryptCid(evidenceCid);
			if (decrypted === targetCid) {
				return { job: jobData, jobId: id, milestone: milestones[idx], milestoneIndex: idx };
			}
		}
	}

	return null;
};

export async function GET(request: NextRequest) {
	return requireAuth(request, async (req, user) => {
		const { searchParams } = new URL(req.url);
		const cidParam = searchParams.get('cid');
		const jobIdParam = searchParams.get('jobId');
		const decodeOnly = searchParams.get('decodeOnly') === 'true';
		
		if (!cidParam) {
			return NextResponse.json({ success: false, error: 'cid là bắt buộc' }, { status: 400 });
		}
		
		const decryptedRequested = await decryptCid(cidParam);
		
		const store = await getTableHandle();
		if (!store?.handle) {
			return NextResponse.json({ success: false, error: 'Không tìm thấy EscrowStore' }, { status: 404 });
		}
		
		let jobData: any = null;
		let jobId: number | null = null;
		let milestoneData: any = null;
		let milestoneIndex: number | null = null;
		
		let jobIdFilter: number | undefined;
		if (jobIdParam) {
			const parsedJobId = Number(jobIdParam);
			if (!parsedJobId || Number.isNaN(parsedJobId)) {
				return NextResponse.json({ success: false, error: 'jobId không hợp lệ' }, { status: 400 });
			}
			jobIdFilter = parsedJobId;
		}
		
		const match = await findMilestoneByCid(store, decryptedRequested, jobIdFilter);
		if (match) {
			jobData = match.job;
			jobId = match.jobId;
			milestoneData = match.milestone;
			milestoneIndex = match.milestoneIndex;
		}
		
		if (!jobData || !jobId || milestoneData === null || milestoneIndex === null) {
			return NextResponse.json({ success: false, error: 'Không tìm thấy milestone tương ứng với CID' }, { status: 404 });
		}
		
		const poster = typeof jobData.poster === 'string' ? jobData.poster.toLowerCase() : '';
		const freelancer = (parseOptionAddress(jobData.freelancer) || '').toLowerCase();
		const requester = user.address.toLowerCase();
		
		if (requester !== poster && requester !== freelancer) {
			return NextResponse.json({ success: false, error: 'Bạn không có quyền truy cập CID này' }, { status: 403 });
		}
		
		if (decodeOnly) {
			const gateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs';
			const ipfsUrl = `${gateway}/${decryptedRequested}`;
			return NextResponse.json({
				success: true,
				cid: decryptedRequested,
				url: ipfsUrl,
				jobId,
				milestoneId: milestoneData?.id ?? milestoneIndex + 1
			});
		}
		
		const gateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs';
		const res = await fetch(`${gateway}/${decryptedRequested}`, { method: 'GET' });
		if (!res.ok) return NextResponse.json({ success: false, error: 'Không tìm thấy' }, { status: 404 });
		
		const data = await res.json();
		
		return NextResponse.json({
			success: true,
			cid: decryptedRequested,
			data,
			jobId,
			milestoneId: milestoneData?.id ?? milestoneIndex + 1
		});
	});
}
