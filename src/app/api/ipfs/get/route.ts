import { NextRequest, NextResponse } from 'next/server';
import { getJobCreatedEvents, getJobAppliedEvents, getMilestoneSubmittedEvents } from '@/lib/aptosClient';
import { decryptCid } from '@/lib/encryption';

const normalizeAddress = (addr?: string | null): string => {
	if (!addr) return '';
	const value = String(addr).toLowerCase();
	return value.startsWith('0x') ? value : `0x${value}`;
};

const findMilestoneByCid = async (
	targetCid: string,
	jobIdFilter?: number
): Promise<{ jobId: number; milestoneId: number; poster: string; freelancer: string } | null> => {
	const milestoneEvents = await getMilestoneSubmittedEvents(200);
	
	const filteredEvents = jobIdFilter 
		? milestoneEvents.filter((e: any) => Number(e?.data?.job_id || 0) === jobIdFilter)
		: milestoneEvents;
	
	for (const event of filteredEvents) {
		const evidenceCid = String(event?.data?.evidence_cid || '');
		if (!evidenceCid) continue;
		
		const decrypted = await decryptCid(evidenceCid);
		if (decrypted === targetCid) {
			const jobId = Number(event?.data?.job_id || 0);
			const milestoneId = Number(event?.data?.milestone_id || 0);
			const freelancer = normalizeAddress(event?.data?.freelancer);
			
			const createdEvents = await getJobCreatedEvents(200);
			const jobCreatedEvent = createdEvents.find((e: any) => Number(e?.data?.job_id || 0) === jobId);
			const poster = normalizeAddress(jobCreatedEvent?.data?.poster || '');
			
			return { jobId, milestoneId, poster, freelancer };
		}
	}
	
	return null;
};

export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url);
		const cidParam = searchParams.get('cid');
		const jobIdParam = searchParams.get('jobId');
		const decodeOnly = searchParams.get('decodeOnly') === 'true';
	const requesterAddress = searchParams.get('address');
		
		if (!cidParam) {
			return NextResponse.json({ success: false, error: 'cid là bắt buộc' }, { status: 400 });
		}
		
		const decryptedRequested = await decryptCid(cidParam) || cidParam;
		
		if (decodeOnly) {
			const gateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs';
			const ipfsUrl = `${gateway}/${decryptedRequested}`;
			return NextResponse.json({
				success: true,
				cid: decryptedRequested,
				url: ipfsUrl
			});
		}
		
		let jobIdFilter: number | undefined;
		if (jobIdParam) {
			const parsedJobId = Number(jobIdParam);
			if (!parsedJobId || Number.isNaN(parsedJobId)) {
				return NextResponse.json({ success: false, error: 'jobId không hợp lệ' }, { status: 400 });
			}
			jobIdFilter = parsedJobId;
		}
		
		const match = await findMilestoneByCid(decryptedRequested, jobIdFilter);
		if (!match) {
			return NextResponse.json({ success: false, error: 'Không tìm thấy milestone tương ứng với CID' }, { status: 404 });
		}
		
		const { jobId, milestoneId, poster, freelancer } = match;
		const requester = normalizeAddress(requesterAddress);
	if (!requester) {
		return NextResponse.json({ success: false, error: 'Thiếu địa chỉ ví (address parameter)' }, { status: 400 });
	}
		
		if (requester !== poster && requester !== freelancer) {
			return NextResponse.json({ success: false, error: 'Bạn không có quyền truy cập CID này' }, { status: 403 });
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
			milestoneId
		});
}
