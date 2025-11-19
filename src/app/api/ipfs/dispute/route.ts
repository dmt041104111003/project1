import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/api/auth/_lib/helpers';
import { CONTRACT_ADDRESS } from '@/constants/contracts';
import { fetchContractResourceData, queryTableItem } from '@/app/api/onchain/_lib/tableClient';

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

const parseOptionString = (data: any): string | null => {
	if (!data) return null;
	if (typeof data === 'string') return data;
	if (typeof data === 'object' && data?.vec && data.vec.length > 0) return data.vec[0];
	return null;
};

const parseAddressVector = (data: any): string[] => {
	if (!data) return [];
	if (Array.isArray(data)) return data.filter((item) => typeof item === 'string');
	if (typeof data === 'object' && data?.vec && Array.isArray(data.vec)) {
		return data.vec.filter((item: any) => typeof item === 'string');
	}
	return [];
};

const normalizeAddress = (addr?: string | null): string => {
	if (!addr) return '';
	let value = addr.toLowerCase();
	if (!value.startsWith('0x')) {
		value = `0x${value}`;
	}
	return value;
};

export async function GET(request: NextRequest) {
	return requireAuth(request, async (req, user) => {
		const { searchParams } = new URL(req.url);
		const cidParam = searchParams.get('cid');
		const disputeIdParam = searchParams.get('disputeId');
		const role = (searchParams.get('role') || '').toLowerCase();
		const side = (searchParams.get('side') || '').toLowerCase();
		const decodeOnly = searchParams.get('decodeOnly') === 'true';

		if (!disputeIdParam) {
			return NextResponse.json({ success: false, error: 'disputeId là bắt buộc' }, { status: 400 });
		}

		const disputeId = Number(disputeIdParam);
		if (!Number.isFinite(disputeId) || disputeId <= 0) {
			return NextResponse.json({ success: false, error: 'disputeId không hợp lệ' }, { status: 400 });
		}

		const isReviewerRole = role === 'reviewer';

		if (role !== 'poster' && role !== 'freelancer' && !isReviewerRole) {
			return NextResponse.json(
				{ success: false, error: 'role phải là poster, freelancer hoặc reviewer' },
				{ status: 400 },
			);
		}

		if (isReviewerRole && side !== 'poster' && side !== 'freelancer') {
			return NextResponse.json(
				{ success: false, error: 'Reviewer cần chỉ định side=poster hoặc side=freelancer' },
				{ status: 400 },
			);
		}

		const disputeStore = await fetchContractResourceData('dispute::DisputeStore');
		const storeHandle = disputeStore?.table?.handle || null;
		if (!storeHandle) {
			return NextResponse.json({ success: false, error: 'Không tìm thấy DisputeStore' }, { status: 500 });
		}

		const dispute = await queryTableItem({
			handle: storeHandle,
			keyType: 'u64',
			valueType: `${CONTRACT_ADDRESS}::dispute::Dispute`,
			key: disputeId,
		});
		if (!dispute) {
			return NextResponse.json({ success: false, error: 'Không tìm thấy tranh chấp' }, { status: 404 });
		}

		const posterAddr = normalizeAddress(dispute?.poster);
		const freelancerAddr = normalizeAddress(dispute?.freelancer);
		const requester = normalizeAddress(user.address);

		let storedCid: string | null = null;

		if (role === 'poster') {
			if (requester !== posterAddr) {
				return NextResponse.json(
					{ success: false, error: 'Bạn không phải poster của tranh chấp này' },
					{ status: 403 },
				);
			}
			storedCid = parseOptionString(dispute?.poster_evidence_cid);
		} else if (role === 'freelancer') {
			if (requester !== freelancerAddr) {
				return NextResponse.json(
					{ success: false, error: 'Bạn không phải freelancer của tranh chấp này' },
					{ status: 403 },
				);
			}
			storedCid = parseOptionString(dispute?.freelancer_evidence_cid);
		} else {
			// reviewer
			const reviewers = parseAddressVector(dispute?.selected_reviewers).map(normalizeAddress);
			if (!reviewers.includes(requester)) {
				return NextResponse.json(
					{ success: false, error: 'Bạn không phải reviewer của tranh chấp này' },
					{ status: 403 },
				);
			}
			storedCid =
				side === 'poster'
					? parseOptionString(dispute?.poster_evidence_cid)
					: parseOptionString(dispute?.freelancer_evidence_cid);
		}

		if (!storedCid) {
			return NextResponse.json({ success: false, error: 'Không có evidence cho role này' }, { status: 404 });
		}

		if (cidParam && cidParam !== storedCid) {
			return NextResponse.json({ success: false, error: 'CID không khớp với tranh chấp này' }, { status: 403 });
		}

		const decryptedCid = await decryptCid(storedCid);

		if (decodeOnly) {
			const gateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs';
			const ipfsUrl = `${gateway}/${decryptedCid}`;
			return NextResponse.json({ success: true, cid: decryptedCid, url: ipfsUrl });
		}

		const gateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs';
		const res = await fetch(`${gateway}/${decryptedCid}`, { method: 'GET' });
		if (!res.ok) {
			return NextResponse.json({ success: false, error: 'Không tìm thấy' }, { status: 404 });
		}

		const data = await res.json();
		return NextResponse.json({ success: true, cid: decryptedCid, data });
	});
}

