import { NextRequest, NextResponse } from "next/server";
import { APTOS_NODE_URL, CONTRACT_ADDRESS, APTOS_API_KEY } from "@/constants/contracts";
import { requireAuth } from '@/lib/auth/helpers';

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

export async function GET(req: NextRequest) {
	return requireAuth(req, async (request, user) => {
		try {
			const { searchParams } = new URL(request.url);
		const address = searchParams.get('address');
		
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
		
		return NextResponse.json({
			success: true,
			address,
			ut,
		});
		} catch (err: any) {
			return NextResponse.json({ 
				success: false, 
				error: err?.message || 'Lỗi máy chủ nội bộ' 
			}, { status: 500 });
		}
	});
}

