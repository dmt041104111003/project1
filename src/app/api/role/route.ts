import { NextResponse } from "next/server";
import { ROLE, ROLE_KIND, APTOS_NODE_URL, CONTRACT_ADDRESS } from "@/constants/contracts";

const view = async (functionName: string, args: any[]): Promise<boolean> => {
	try {
		const res = await fetch(`${APTOS_NODE_URL}/v1/view`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ function: functionName, type_arguments: [], arguments: args })
		});
		if (!res.ok) {
			const errorText = await res.text().catch(() => res.statusText);
			console.error(`[API] View failed for ${functionName}:`, res.status, errorText);
			return false;
		}
		const data = await res.json();
		const result = Array.isArray(data) ? data[0] === true : data === true;
		console.log(`[API] View ${functionName}:`, { args, data, result });
		return result;
	} catch (err) {
		console.error(`[API] View error for ${functionName}:`, err);
		return false;
	}
};

const getCid = async (address: string, kind: number): Promise<string | null> => {
	try {
		const res = await fetch(`${APTOS_NODE_URL}/v1/view`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ function: ROLE.GET_CID, type_arguments: [], arguments: [address, kind] })
		});
		if (!res.ok) return null;
		const data = await res.json();
		return Array.isArray(data) && data[0] ? String(data[0]) : null;
	} catch {
		return null;
	}
};

const getTableHandle = async (): Promise<string | null> => {
	try {
		const resourceType = `${CONTRACT_ADDRESS}::role::RoleStore`;
		console.log(`[API] Fetching RoleStore resource from MODULE ADDRESS: ${CONTRACT_ADDRESS}`);
		const res = await fetch(`${APTOS_NODE_URL}/v1/accounts/${CONTRACT_ADDRESS}/resource/${resourceType}`);
		if (!res.ok) {
			console.log(`[API] Resource not found at module address ${CONTRACT_ADDRESS}`);
			return null;
		}
		const data = await res.json();
		const handle = data?.data?.users?.handle || null;
		console.log(`[API] Got table handle from MODULE ADDRESS ${CONTRACT_ADDRESS}: ${handle}`);
		return handle;
	} catch (err) {
		console.error(`[API] Error fetching from module address:`, err);
		return null;
	}
};

const queryTableItem = async (handle: string, key: string | number, keyType: string, valueType: string): Promise<any> => {
	try {
		const url = `${APTOS_NODE_URL}/v1/tables/${handle}/item`;
		console.log(`[API] Querying Table API: ${url}`);
		console.log(`[API]    Key: ${key}, KeyType: ${keyType}, ValueType: ${valueType}`);
		
		// For numeric types (u8, u64, etc), send as number; for others, send as string
		const formattedKey = keyType === "u8" || keyType === "u64" || keyType.startsWith("u") ? Number(key) : key;
		
		const res = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ key_type: keyType, value_type: valueType, key: formattedKey })
		});
		if (!res.ok) {
			const errorText = await res.text().catch(() => "");
			console.log(`[API] Table query failed: ${res.status}`, errorText);
			return null;
		}
		const result = await res.json();
		console.log(`[API] Table query successful`);
		return result;
	} catch (err) {
		console.error(`[API] Table query error:`, err);
		return null;
	}
};

export async function GET(req: Request) {
	try {
		const url = new URL(req.url);
		const address = url.searchParams.get("address");
		const debugHandle = url.searchParams.get("handle");
		const key = url.searchParams.get("key");
		const keyType = url.searchParams.get("keyType");
		const valueType = url.searchParams.get("valueType");

		// Debug: Query any table handle
		if (debugHandle && key && keyType && valueType) {
			const result = await queryTableItem(debugHandle, key, keyType, valueType);
			return NextResponse.json({ handle: debugHandle, key, result });
		}

		if (!address) return NextResponse.json({ error: "Address required" }, { status: 400 });

		// IMPORTANT: Data is stored at MODULE ADDRESS, not holder address
		console.log(`[API] ========================================`);
		console.log(`[API] Querying roles for HOLDER: ${address}`);
		console.log(`[API] Data is stored at MODULE ADDRESS: ${CONTRACT_ADDRESS}`);
		console.log(`[API] ========================================`);

		const handle = await getTableHandle();
		let finalHasFreelancer = false;
		let finalHasPoster = false;
		let finalHasReviewer = false;
		let userRoles: any = null;

		if (handle) {
			console.log(`[API] Got table handle: ${handle}`);
			console.log(`[API] Table location: MODULE ADDRESS ${CONTRACT_ADDRESS}`);
			console.log(`[API] Querying with KEY (holder address): ${address}`);
			
			userRoles = await queryTableItem(
				handle,
				address,
				"address",
				`${CONTRACT_ADDRESS}::role::UserRoles`
			);
			
			if (userRoles?.roles?.handle) {
				console.log(`[API] Found userRoles in table at MODULE ${CONTRACT_ADDRESS}`);
				console.log(`[API] Querying nested roles table with handle: ${userRoles.roles.handle}`);
				
				const rolesHandle = userRoles.roles.handle;
				const [hasFreelancerRole, hasPosterRole, hasReviewerRole] = await Promise.all([
					queryTableItem(rolesHandle, ROLE_KIND.FREELANCER, "u8", "bool"),
					queryTableItem(rolesHandle, ROLE_KIND.POSTER, "u8", "bool"),
					queryTableItem(rolesHandle, ROLE_KIND.REVIEWER, "u8", "bool")
				]);
				finalHasFreelancer = hasFreelancerRole === true;
				finalHasPoster = hasPosterRole === true;
				finalHasReviewer = hasReviewerRole === true;
				
				console.log(`[API] Results from MODULE ${CONTRACT_ADDRESS}:`, { 
					freelancer: finalHasFreelancer, 
					poster: finalHasPoster, 
					reviewer: finalHasReviewer 
				});
			} else {
				console.log(`[API] No userRoles found for holder ${address} in table at MODULE ${CONTRACT_ADDRESS}`);
			}
		} else {
			console.log(`[API] Failed to get table handle from MODULE ADDRESS ${CONTRACT_ADDRESS}`);
		}

		const roles = [];
		if (finalHasFreelancer) {
			let cid: string | null = null;
			if (userRoles?.cids?.handle) {
				const cidData = await queryTableItem(userRoles.cids.handle, ROLE_KIND.FREELANCER, "u8", "0x1::string::String");
				cid = cidData || null;
			}
			roles.push({ name: "freelancer", cids: cid ? [cid] : [] });
		}
		if (finalHasPoster) {
			let cid: string | null = null;
			if (userRoles?.cids?.handle) {
				const cidData = await queryTableItem(userRoles.cids.handle, ROLE_KIND.POSTER, "u8", "0x1::string::String");
				cid = cidData || null;
			}
			roles.push({ name: "poster", cids: cid ? [cid] : [] });
		}
		if (finalHasReviewer) {
			roles.push({ name: "reviewer", cids: [] });
		}

		return NextResponse.json({ roles });
	} catch (error: any) {
		console.error(`[API] Error:`, error);
		return NextResponse.json({ error: error?.message || "Failed to fetch roles" }, { status: 500 });
	}
}

export async function POST(req: Request) {
	try {
		const { action, about, cid } = await req.json();
		const kindMap: Record<string, number> = {
			register_freelancer: ROLE_KIND.FREELANCER,
			register_poster: ROLE_KIND.POSTER,
			register_reviewer: ROLE_KIND.REVIEWER
		};

		const kind = kindMap[action];
		if (!kind) return NextResponse.json({ error: "Invalid action" }, { status: 400 });

		let finalCid = cid || "";

		if ((kind === ROLE_KIND.FREELANCER || kind === ROLE_KIND.POSTER) && !finalCid && about) {
			const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
			const ipfsRes = await fetch(`${baseUrl}/api/ipfs/upload`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ type: "profile", about })
			});
			if (!ipfsRes.ok) {
				const error = await ipfsRes.json().catch(() => ({ error: "IPFS upload failed" }));
				return NextResponse.json({ error: error.error || "IPFS upload failed" }, { status: 500 });
			}
			const ipfsData = await ipfsRes.json();
			finalCid = ipfsData.encCid || ipfsData.ipfsHash || "";
		}

		if ((kind === ROLE_KIND.FREELANCER || kind === ROLE_KIND.POSTER) && !finalCid) {
			return NextResponse.json({ error: "CID required for freelancer and poster" }, { status: 400 });
		}

		return NextResponse.json({
			function: ROLE.REGISTER_ROLE,
			type_args: [],
			args: [kind, kind === ROLE_KIND.REVIEWER ? null : finalCid]
		});
	} catch (error: any) {
		return NextResponse.json({ error: error?.message || "Failed to prepare transaction" }, { status: 500 });
	}
}
