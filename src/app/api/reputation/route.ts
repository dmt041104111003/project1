import { NextResponse } from "next/server";
import { REPUTATION, APTOS_NODE_URL, CONTRACT_ADDRESS, APTOS_API_KEY } from "@/constants/contracts";

/**
 * Get RepStore table handle from contract
 */
const getRepStoreHandle = async (): Promise<string | null> => {
	try {
		const resourceType = `${CONTRACT_ADDRESS}::reputation::RepStore`;
		console.log(`[API] Fetching RepStore from ${CONTRACT_ADDRESS}`);
		const res = await fetch(`${APTOS_NODE_URL}/v1/accounts/${CONTRACT_ADDRESS}/resource/${resourceType}`, {
			headers: { "x-api-key": APTOS_API_KEY, "Authorization": `Bearer ${APTOS_API_KEY}` }
		});
		if (!res.ok) {
			console.log(`[API] Failed to fetch RepStore: ${res.status} ${res.statusText}`);
			return null;
		}
		const data = await res.json();
		const handle = data?.data?.table?.handle;
		console.log(`[API] RepStore table handle: ${handle}`);
		return handle;
	} catch (err) {
		console.error(`[API] Error fetching RepStore:`, err);
		return null;
	}
};

/**
 * Query reputation points for an address from table
 * Returns: ut (single reputation point)
 */
const getReputationPoints = async (address: string): Promise<number | null> => {
	try {
		const handle = await getRepStoreHandle();
		if (!handle) {
			console.log(`[API] RepStore not found, returning zero`);
			return 0;
		}
		
		console.log(`[API] Querying reputation for address: ${address}`);
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
				console.log(`[API] User has no reputation data yet (404), returning zero`);
				return 0;
			}
			const errorText = await res.text().catch(() => res.statusText);
			console.error(`[API] Reputation query failed for ${address}:`, res.status, errorText);
			return null;
		}
		
		const data = await res.json();
		console.log(`[API] Reputation data received:`, data);
		
		// Parse Rep struct: { ut }
		const ut = Number(data?.ut || 0);
		
		return ut;
	} catch (err: any) {
		console.error(`[API] Reputation get error for ${address}:`, err);
		// If it's a network error, return zero (user has no reputation yet)
		if (err?.message?.includes('not found') || err?.message?.includes('ECONNREFUSED')) {
			console.log(`[API] Treating error as no reputation data, returning zero`);
			return 0;
		}
		return null;
	}
};

export async function GET(req: Request) {
	try {
		console.log('[API] Reputation GET called');
		const { searchParams } = new URL(req.url);
		const address = searchParams.get('address');
		
		console.log('[API] Reputation GET - address:', address);
		
		if (!address) {
			console.log('[API] Reputation GET - no address provided');
			return NextResponse.json({ 
				success: false, 
				error: 'address parameter is required' 
			}, { status: 400 });
		}

		console.log('[API] Reputation GET - calling getReputationPoints');
		const ut = await getReputationPoints(address);
		console.log('[API] Reputation GET - getReputationPoints returned:', ut);
		
		if (ut === null) {
			console.log('[API] Reputation GET - getReputationPoints returned null');
			return NextResponse.json({ 
				success: false, 
				error: 'Failed to fetch reputation points' 
			}, { status: 500 });
		}
		
		console.log('[API] Reputation GET - returning success:', { ut });
		
		return NextResponse.json({
			success: true,
			address,
			ut,
		});
	} catch (err: any) {
		console.error('[API] Reputation GET error:', err);
		console.error('[API] Reputation GET error stack:', err?.stack);
		return NextResponse.json({ 
			success: false, 
			error: err?.message || 'Internal server error' 
		}, { status: 500 });
	}
}

