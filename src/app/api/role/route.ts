import { NextRequest, NextResponse } from "next/server";
import { APTOS_NODE_URL, CONTRACT_ADDRESS, ROLE_KIND, ROLE } from "@/constants/contracts";
import { fetchContractResourceData, queryTableItem } from "@/app/api/onchain/_lib/tableClient";

const APTOS_API_KEY = process.env.APTOS_API_KEY || '';

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

export async function GET(request: NextRequest) {
		try {
			const url = new URL(request.url);
		const address = url.searchParams.get("address");
		const debugHandle = url.searchParams.get("handle");
		const key = url.searchParams.get("key");
		const keyType = url.searchParams.get("keyType");
		const valueType = url.searchParams.get("valueType");

		if (debugHandle && key && keyType && valueType) {
			const result = await queryTableItem({
				handle: debugHandle,
				keyType,
				valueType,
				key
			});
			return NextResponse.json({ handle: debugHandle, key, result });
		}

		if (!address) return NextResponse.json({ error: "Địa chỉ là bắt buộc" }, { status: 400 });

		const roleStore = await fetchContractResourceData("role::RoleStore");
		const handle = roleStore?.users?.handle || null;
		let finalHasFreelancer = false;
		let finalHasPoster = false;
		let finalHasReviewer = false;
		let userRoles: any = null;

		if (handle) {
			userRoles = await queryTableItem({
				handle,
				keyType: "address",
				valueType: `${CONTRACT_ADDRESS}::role::UserRoles`,
				key: address
			});
			
			if (userRoles?.roles?.handle) {
				const rolesHandle = userRoles.roles.handle;
				const [hasFreelancerRole, hasPosterRole, hasReviewerRole] = await Promise.all([
					queryTableItem({ handle: rolesHandle, keyType: "u8", valueType: "bool", key: ROLE_KIND.FREELANCER }),
					queryTableItem({ handle: rolesHandle, keyType: "u8", valueType: "bool", key: ROLE_KIND.POSTER }),
					queryTableItem({ handle: rolesHandle, keyType: "u8", valueType: "bool", key: ROLE_KIND.REVIEWER })
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
				const cidData = await queryTableItem({
					handle: userRoles.cids.handle,
					keyType: "u8",
					valueType: "0x1::string::String",
					key: ROLE_KIND.FREELANCER
				});
				cid = cidData || null;
			}
			roles.push({ name: "freelancer", cids: cid ? [cid] : [] });
		}
		if (finalHasPoster) {
			let cid: string | null = null;
			if (userRoles?.cids?.handle) {
				const cidData = await queryTableItem({
					handle: userRoles.cids.handle,
					keyType: "u8",
					valueType: "0x1::string::String",
					key: ROLE_KIND.POSTER
				});
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
