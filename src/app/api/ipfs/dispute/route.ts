import { NextRequest, NextResponse } from 'next/server';
import { getDisputeOpenedEvents, getReviewerDisputeEvents, getEvidenceAddedEvents } from '@/lib/aptosClient';
import { decryptCid } from '@/lib/encryption';


const normalizeAddress = (addr?: string | null): string => {
	if (!addr) return '';
	const value = String(addr).toLowerCase();
	const noPrefix = value.startsWith('0x') ? value.slice(2) : value;
	const trimmed = noPrefix.replace(/^0+/, '');
	return '0x' + (trimmed.length === 0 ? '0' : trimmed);
};

export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url);
	const cidParam = searchParams.get('cid');
	const disputeIdParam = searchParams.get('disputeId');
	const role = (searchParams.get('role') || '').toLowerCase();
	const side = (searchParams.get('side') || '').toLowerCase();
	const decodeOnly = searchParams.get('decodeOnly') === 'true';
	const requesterAddress = searchParams.get('address');

	if (!disputeIdParam) {
		return NextResponse.json({ success: false, error: 'Thiếu mã tranh chấp' }, { status: 400 });
	}

	const disputeId = Number(disputeIdParam);
	if (!Number.isFinite(disputeId) || disputeId <= 0) {
		return NextResponse.json({ success: false, error: 'Mã tranh chấp không hợp lệ' }, { status: 400 });
	}

	const isReviewerRole = role === 'reviewer';

	if (role !== 'poster' && role !== 'freelancer' && !isReviewerRole) {
		return NextResponse.json(
			{ success: false, error: 'role phải là người thuê, người làm tự do hoặc người đánh giá' },
			{ status: 400 },
		);
	}

	if (isReviewerRole && side !== 'poster' && side !== 'freelancer') {
		return NextResponse.json(
			{ success: false, error: 'Người đánh giá cần chỉ định side=người thuê hoặc side=người làm tự do' },
			{ status: 400 },
		);
	}

	const [openedEvents, reviewerEvents, evidenceEvents] = await Promise.all([
		getDisputeOpenedEvents(200),
		getReviewerDisputeEvents(200),
		getEvidenceAddedEvents(200),
	]);

	const disputeOpenedEvent = openedEvents.find((e: any) => Number(e?.data?.dispute_id || 0) === disputeId);
	if (!disputeOpenedEvent) {
		return NextResponse.json({ success: false, error: 'Không tìm thấy tranh chấp' }, { status: 404 });
	}

	const posterAddr = normalizeAddress(disputeOpenedEvent?.data?.poster);
	const freelancerAddr = normalizeAddress(disputeOpenedEvent?.data?.freelancer);
	const requester = normalizeAddress(requesterAddress);
	if (!requester) {
		return NextResponse.json({ success: false, error: 'Thiếu địa chỉ ví (address parameter)' }, { status: 400 });
	}

	const disputeReviewerEvents = reviewerEvents.filter((e: any) => Number(e?.data?.dispute_id || 0) === disputeId);
	const reviewers = disputeReviewerEvents.map((e: any) => normalizeAddress(e?.data?.reviewer));

	const parseCidFromData = (cid: unknown): string => {
		if (!cid) return '';
		if (typeof cid === 'string') return cid;
		if (typeof cid === 'object' && cid !== null && 'vec' in cid) {
			const vec = (cid as {vec: unknown[]}).vec;
			if (Array.isArray(vec) && vec.length > 0) return String(vec[0]);
		}
		return '';
	};

	const openedBy = normalizeAddress(disputeOpenedEvent?.data?.opened_by);
	const initialEvidenceCid = parseCidFromData(disputeOpenedEvent?.data?.evidence_cid);
	
	let posterEvidenceCid: string | null = null;
	let freelancerEvidenceCid: string | null = null;

	if (initialEvidenceCid) {
		if (openedBy === posterAddr) {
			posterEvidenceCid = initialEvidenceCid;
		} else if (openedBy === freelancerAddr) {
			freelancerEvidenceCid = initialEvidenceCid;
		}
	}

	const disputeEvidenceEvents = evidenceEvents.filter((e: any) => Number(e?.data?.dispute_id || 0) === disputeId);
	disputeEvidenceEvents.forEach((e: any) => {
		const addedBy = normalizeAddress(e?.data?.added_by);
		const evidenceCid = parseCidFromData(e?.data?.evidence_cid);
		if (addedBy === posterAddr && evidenceCid) {
			posterEvidenceCid = evidenceCid;
		} else if (addedBy === freelancerAddr && evidenceCid) {
			freelancerEvidenceCid = evidenceCid;
		}
	});

	let storedCid: string | null = null;

	if (role === 'poster') {
		if (requester !== posterAddr) {
			return NextResponse.json(
				{ success: false, error: 'Bạn không phải người thuê của tranh chấp này' },
				{ status: 403 },
			);
		}
		storedCid = posterEvidenceCid;
	} else if (role === 'freelancer') {
		if (requester !== freelancerAddr) {
			return NextResponse.json(
				{ success: false, error: 'Bạn không phải người làm tự do của tranh chấp này' },
				{ status: 403 },
			);
		}
		storedCid = freelancerEvidenceCid;
	} else {
		// reviewer
		if (!reviewers.includes(requester)) {
			return NextResponse.json(
				{ success: false, error: 'Bạn không phải người đánh giá của tranh chấp này' },
				{ status: 403 },
			);
		}
		storedCid = side === 'poster' ? posterEvidenceCid : freelancerEvidenceCid;
	}

		if (!storedCid) {
		return NextResponse.json({ success: false, error: 'Không có bằng chứng cho vai trò này' }, { status: 404 });
	}

	if (cidParam && cidParam !== storedCid) {
		return NextResponse.json({ success: false, error: 'Mã định danh không khớp với tranh chấp này' }, { status: 403 });
	}

	try {
		const decryptedCid = await decryptCid(storedCid);
		
		if (!decryptedCid || decryptedCid.startsWith('enc:')) {
			console.error('[API/dispute] Không thể giải mã CID:', storedCid);
			return NextResponse.json({ 
				success: false, 
				error: 'Không thể giải mã bằng chứng. Vui lòng kiểm tra biến môi trường CID_SECRET_B64.' 
			}, { status: 500 });
		}

		const gateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs';
		const ipfsUrl = `${gateway}/${decryptedCid}`;

		if (decodeOnly) {
			return NextResponse.json({ success: true, cid: decryptedCid, url: ipfsUrl });
		}

		const res = await fetch(ipfsUrl, { method: 'GET' });
		if (!res.ok) {
			console.error('[API/dispute] Không thể fetch từ IPFS:', res.status, res.statusText);
			return NextResponse.json({ success: false, error: 'Không thể tải bằng chứng từ hệ thống lưu trữ' }, { status: 404 });
		}

		const data = await res.json();
		return NextResponse.json({ success: true, cid: decryptedCid, data });
	} catch (error) {
		console.error('[API/dispute] Lỗi khi xử lý evidence:', error);
		return NextResponse.json({ 
			success: false, 
			error: 'Lỗi server khi xử lý bằng chứng' 
		}, { status: 500 });
	}
}

