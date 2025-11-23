import { NextResponse } from "next/server";
import { ROLE_KIND, CONTRACT_ADDRESS } from "@/constants/contracts";
import { decryptCid } from '@/lib/encryption';
import { aptosFetch, APTOS_NODE_URL } from '@/lib/aptosClientCore';

const normalizeAddress = (addr?: string | null): string => {
	if (!addr) return '';
	const value = String(addr).toLowerCase();
	return value.startsWith('0x') ? value : `0x${value}`;
};

const resolveProfileCid = async (address: string, roleKind: number): Promise<string | null> => {
	const normalizedAddr = normalizeAddress(address);
	
	// Fetch directly from Aptos API with retry logic (via aptosFetch)
	try {
		const eventHandle = `${CONTRACT_ADDRESS}::role::RoleStore`;
		const encodedEventHandle = encodeURIComponent(eventHandle);
		const url = `${APTOS_NODE_URL}/v1/accounts/${CONTRACT_ADDRESS}/events/${encodedEventHandle}/role_registered_events?limit=200`;
		
		const res = await aptosFetch(url);
		if (!res.ok) {
			console.error('Failed to fetch role registered events:', res.status, res.statusText);
			return null;
		}
		const events = await res.json();
		
		const userEvents = events
			.filter((e: any) => {
				const eventAddr = normalizeAddress(e?.data?.address);
				const eventRoleKind = Number(e?.data?.role_kind || 0);
				return eventAddr === normalizedAddr && eventRoleKind === roleKind;
			})
			.sort((a: any, b: any) => {
				const timeA = Number(a?.data?.registered_at || 0);
				const timeB = Number(b?.data?.registered_at || 0);
				return timeB - timeA; // Latest first
			});
		
		if (userEvents.length === 0) return null;
		
		// Get CID from the latest event
		const latestEvent = userEvents[0];
		const cid = latestEvent?.data?.cid;
		
		// Handle Option<String> format (could be null, string, or { vec: [...] })
		if (!cid) return null;
		if (typeof cid === 'string') return cid;
		if (cid?.vec && Array.isArray(cid.vec) && cid.vec.length > 0) {
			return String(cid.vec[0]);
		}
		
		return null;
	} catch (error) {
		console.error('Error resolving profile CID:', error);
		return null;
	}
};

const fetchProfileMetadata = async (address: string, roleParam: 'poster' | 'freelancer') => {
	const roleKind = roleParam === 'poster' ? ROLE_KIND.POSTER : ROLE_KIND.FREELANCER;
	const cidOnChain = await resolveProfileCid(address, roleKind);
	if (!cidOnChain) return null;

	const decrypted = await decryptCid(cidOnChain);
	if (!decrypted) return null;

	const gateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs';
	const res = await fetch(`${gateway}/${decrypted}`, { method: 'GET' });
	if (!res.ok) {
		return { cid: decrypted, url: `${gateway}/${decrypted}`, data: null, role: roleParam };
	}

	const data = await res.json().catch(() => null);
	return {
		cid: decrypted,
		url: `${gateway}/${decrypted}`,
		data,
		role: roleParam,
	};
};

export async function GET(req: Request) {
	try {
		const { searchParams } = new URL(req.url);
		const address = searchParams.get('address');
		const roleParam = searchParams.get('role');

		if (!address) {
			return NextResponse.json({
				success: false,
				error: 'Tham số address là bắt buộc',
			}, { status: 400 });
		}

		const rolesToFetch: Array<'poster' | 'freelancer'> =
			roleParam === 'poster' || roleParam === 'freelancer'
				? [roleParam]
				: ['freelancer', 'poster'];

		const entries = await Promise.all(
			rolesToFetch.map(async (role) => {
				const meta = await fetchProfileMetadata(address, role);
				return [role, meta] as const;
			})
		);

		return NextResponse.json({
			success: true,
			address,
			profiles: Object.fromEntries(entries),
		});
	} catch (err: any) {
		return NextResponse.json({
			success: false,
			error: err?.message || 'Lỗi máy chủ nội bộ',
		}, { status: 500 });
	}
}

