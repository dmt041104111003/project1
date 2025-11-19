import { NextResponse } from "next/server";
import { CONTRACT_ADDRESS, ROLE_KIND } from "@/constants/contracts";
import { fetchContractResourceData, queryTableItem } from "@/app/api/onchain/_lib/tableClient";

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

const resolveProfileCid = async (address: string, roleKind: number): Promise<string | null> => {
	const roleStoreData = await fetchContractResourceData("role::RoleStore");
	const roleStoreHandle = roleStoreData?.users?.handle || null;
	if (!roleStoreHandle) return null;

	const userRoles = await queryTableItem({
		handle: roleStoreHandle,
		keyType: 'address',
		valueType: `${CONTRACT_ADDRESS}::role::UserRoles`,
		key: address,
	});
	if (!userRoles?.cids?.handle) return null;

	const cidData = await queryTableItem({
		handle: userRoles.cids.handle,
		keyType: 'u8',
		valueType: '0x1::string::String',
		key: roleKind,
	});
	return normalizeCidValue(cidData);
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

