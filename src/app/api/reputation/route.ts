import { NextResponse } from "next/server";
import { APTOS_NODE_URL, CONTRACT_ADDRESS } from "@/constants/contracts";

const APTOS_API_KEY = process.env.APTOS_API_KEY || '';
import { ROLE_KIND } from "@/constants/contracts";

const getRepStoreHandle = async (): Promise<string | null> => {
	try {
		const resourceType = `${CONTRACT_ADDRESS}::reputation::RepStore`;
		const res = await fetch(`${APTOS_NODE_URL}/v1/accounts/${CONTRACT_ADDRESS}/resource/${resourceType}`, {
			headers: { "x-api-key": APTOS_API_KEY, "Authorization": `Bearer ${APTOS_API_KEY}` }
		});
		if (!res.ok) {
			return null;
		}
		const data = await res.json();
		const handle = data?.data?.table?.handle;
		return handle;
	} catch {
		return null;
	}
};

const getReputationPoints = async (address: string): Promise<number | null> => {
	try {
		const handle = await getRepStoreHandle();
		if (!handle) {
			return 0;
		}
		
		const res = await fetch(`${APTOS_NODE_URL}/v1/tables/${handle}/item`, {
			method: "POST",
			headers: { 
				"Content-Type": "application/json", 
				"x-api-key": APTOS_API_KEY, 
				"Authorization": `Bearer ${APTOS_API_KEY}` 
			},
			body: JSON.stringify({
				key_type: "address",
				value_type: `${CONTRACT_ADDRESS}::reputation::Rep`,
				key: address
			})
		});
		
		if (!res.ok) {
			if (res.status === 404) {
				return 0;
			}
			await res.text().catch(() => res.statusText);
			return null;
		}
		
		const data = await res.json();
		
		const ut = Number(data?.ut || 0);
		
		return ut;
	} catch (err: any) {
		if (err?.message?.includes('not found') || err?.message?.includes('ECONNREFUSED')) {
			return 0;
		}
		return null;
	}
};

const decryptCid = async (value: string | null): Promise<string | null> => {
	if (!value || !value.startsWith('enc:')) return value;
	try {
		const [, ivB64, ctB64] = value.split(':');
		const key = await crypto.subtle.importKey(
			'raw',
			Buffer.from(process.env.CID_SECRET_B64!, 'base64'),
			{ name: 'AES-GCM' },
			false,
			['decrypt']
		);
		const pt = await crypto.subtle.decrypt(
			{ name: 'AES-GCM', iv: Buffer.from(ivB64, 'base64') },
			key,
			Buffer.from(ctB64, 'base64')
		);
		return new TextDecoder().decode(pt);
	} catch {
		return value;
	}
};

const decodeHexString = (value: string): string => {
	try {
		const hex = value.startsWith('0x') ? value.slice(2) : value;
		return Buffer.from(hex, 'hex').toString('utf8').replace(/\0/g, '');
	} catch {
		return value;
	}
};

const normalizeCidValue = (value: any): string | null => {
	if (!value) return null;
	if (typeof value === 'string') {
		return value.startsWith('0x') ? decodeHexString(value) : value;
	}
	if (Array.isArray(value)) {
		try {
			return String.fromCharCode(...value).replace(/\0/g, '');
		} catch {
			return null;
		}
	}
	if (value?.vec && Array.isArray(value.vec) && value.vec.length > 0) {
		return normalizeCidValue(value.vec[0]);
	}
	if (typeof value === 'object' && typeof value.value === 'string') {
		return normalizeCidValue(value.value);
	}
	return String(value);
};

const getRoleStoreHandle = async (): Promise<string | null> => {
	try {
		const resourceType = `${CONTRACT_ADDRESS}::role::RoleStore`;
		const res = await fetch(`${APTOS_NODE_URL}/v1/accounts/${CONTRACT_ADDRESS}/resource/${resourceType}`, {
			headers: { "x-api-key": APTOS_API_KEY, "Authorization": `Bearer ${APTOS_API_KEY}` }
		});
		if (!res.ok) {
			return null;
		}
		const data = await res.json();
		return data?.data?.users?.handle || null;
	} catch {
		return null;
	}
};

const queryTableItem = async (
	handle: string,
	key: any,
	keyType: string,
	valueType: string,
): Promise<any> => {
	try {
		const res = await fetch(`${APTOS_NODE_URL}/v1/tables/${handle}/item`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': APTOS_API_KEY,
				Authorization: `Bearer ${APTOS_API_KEY}`,
			},
			body: JSON.stringify({ key_type: keyType, value_type: valueType, key }),
		});
		if (!res.ok) {
			return null;
		}
		return res.json();
	} catch {
		return null;
	}
};

const resolveProfileCid = async (address: string, roleKind: number): Promise<string | null> => {
	const roleStoreHandle = await getRoleStoreHandle();
	if (!roleStoreHandle) return null;

	const userRoles = await queryTableItem(
		roleStoreHandle,
		address,
		'address',
		`${CONTRACT_ADDRESS}::role::UserRoles`,
	);
	if (!userRoles?.cids?.handle) return null;

	const cidData = await queryTableItem(
		userRoles.cids.handle,
		roleKind,
		'u8',
		'0x1::string::String',
	);
	return normalizeCidValue(cidData);
};

const fetchProfileMetadata = async (address: string, roleParam: string) => {
	const roleKey = roleParam.toLowerCase();
	const roleKind = roleKey === 'poster' ? ROLE_KIND.POSTER : ROLE_KIND.FREELANCER;
	const cidOnChain = await resolveProfileCid(address, roleKind);
	if (!cidOnChain) return null;

	const decrypted = await decryptCid(cidOnChain);
	if (!decrypted) return null;

	const gateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs';
	const res = await fetch(`${gateway}/${decrypted}`, { method: 'GET' });
	if (!res.ok) return { cid: decrypted, url: `${gateway}/${decrypted}`, data: null, role: roleKey };

	const data = await res.json().catch(() => null);
	return {
		cid: decrypted,
		url: `${gateway}/${decrypted}`,
		data,
		role: roleKey,
	};
};

const fetchProfilesForAddress = async (address: string) => {
	const roles: Array<'freelancer' | 'poster'> = ['freelancer', 'poster'];
	const entries = await Promise.all(
		roles.map(async (role) => {
			const meta = await fetchProfileMetadata(address, role);
			return [role, meta] as const;
		})
	);
	return Object.fromEntries(entries);
};

export async function GET(req: Request) {
	try {
		const { searchParams } = new URL(req.url);
		const address = searchParams.get('address');
		const includeProfile = searchParams.get('profile') === 'true';
		
		if (!address) {
			return NextResponse.json({ 
				success: false, 
				error: 'Tham số address là bắt buộc' 
			}, { status: 400 });
		}

		const ut = await getReputationPoints(address);
		
		if (ut === null) {
			return NextResponse.json({ 
				success: false, 
				error: 'Không thể lấy điểm danh tiếng' 
			}, { status: 500 });
		}
		
		const profiles = includeProfile ? await fetchProfilesForAddress(address) : null;

		return NextResponse.json({
			success: true,
			address,
			ut,
			profiles,
		});
	} catch (err: any) {
		return NextResponse.json({ 
			success: false, 
			error: err?.message || 'Lỗi máy chủ nội bộ' 
		}, { status: 500 });
	}
}

