import { NextResponse } from "next/server";
import { ROLE, ROLE_KIND, APTOS_NODE_URL, CONTRACT_ADDRESS, APTOS_API_KEY } from "@/constants/contracts";

const _view = async (_functionName: string, _args: unknown[]): Promise<boolean> => {
	try {
		const res = await fetch(`${APTOS_NODE_URL}/v1/view`, {
			method: "POST",
			headers: { "Content-Type": "application/json", "x-api-key": APTOS_API_KEY, "Authorization": `Bearer ${APTOS_API_KEY}` },
			body: JSON.stringify({ function: _functionName, type_arguments: [], arguments: _args })
		});
		if (!res.ok) {
			await res.text().catch(() => res.statusText);
			return false;
		}
		const data = await res.json();
		const result = Array.isArray(data) ? data[0] === true : data === true;
		return result;
	} catch {
		return false;
	}
};

const _getCid = async (_address: string, _kind: number): Promise<string | null> => {
	try {
		const res = await fetch(`${APTOS_NODE_URL}/v1/view`, {
			method: "POST",
			headers: { "Content-Type": "application/json", "x-api-key": APTOS_API_KEY, "Authorization": `Bearer ${APTOS_API_KEY}` },
			body: JSON.stringify({ function: ROLE.GET_CID, type_arguments: [], arguments: [_address, _kind] })
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
		const res = await fetch(`${APTOS_NODE_URL}/v1/accounts/${CONTRACT_ADDRESS}/resource/${resourceType}`, { headers: { "x-api-key": APTOS_API_KEY, "Authorization": `Bearer ${APTOS_API_KEY}` } });
		if (!res.ok) {
			return null;
		}
		const data = await res.json();
		const handle = data?.data?.users?.handle || null;
		return handle;
	} catch {
		return null;
	}
};

const queryTableItem = async (handle: string, key: string | number, keyType: string, valueType: string): Promise<any> => {
	try {
		const url = `${APTOS_NODE_URL}/v1/tables/${handle}/item`;
		
		const formattedKey = keyType === "u8" || keyType === "u64" || keyType.startsWith("u") ? Number(key) : key;
		
		const res = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json", "x-api-key": APTOS_API_KEY, "Authorization": `Bearer ${APTOS_API_KEY}` },
			body: JSON.stringify({ key_type: keyType, value_type: valueType, key: formattedKey })
		});
		if (!res.ok) {
			await res.text().catch(() => "");
			return null;
		}
		const result = await res.json();
		return result;
	} catch {
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

		if (debugHandle && key && keyType && valueType) {
			const result = await queryTableItem(debugHandle, key, keyType, valueType);
			return NextResponse.json({ handle: debugHandle, key, result });
		}

		if (!address) return NextResponse.json({ error: "Địa chỉ là bắt buộc" }, { status: 400 });

		const handle = await getTableHandle();
		let finalHasFreelancer = false;
		let finalHasPoster = false;
		let finalHasReviewer = false;
		let userRoles: any = null;

		if (handle) {
			userRoles = await queryTableItem(
				handle,
				address,
				"address",
				`${CONTRACT_ADDRESS}::role::UserRoles`
			);
			
			if (userRoles?.roles?.handle) {
				const rolesHandle = userRoles.roles.handle;
				const [hasFreelancerRole, hasPosterRole, hasReviewerRole] = await Promise.all([
					queryTableItem(rolesHandle, ROLE_KIND.FREELANCER, "u8", "bool"),
					queryTableItem(rolesHandle, ROLE_KIND.POSTER, "u8", "bool"),
					queryTableItem(rolesHandle, ROLE_KIND.REVIEWER, "u8", "bool")
				]);
				finalHasFreelancer = hasFreelancerRole === true;
				finalHasPoster = hasPosterRole === true;
				finalHasReviewer = hasReviewerRole === true;
			}
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
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : "Không thể lấy vai trò";
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}
