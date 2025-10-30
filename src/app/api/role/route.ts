import { NextResponse } from "next/server";
import { ROLE, CONTRACT_ADDRESS, APTOS_NODE_URL } from "@/constants/contracts";

export async function POST(req: Request) {
	try {
		const body = await req.json();
		const { action, args = [], typeArgs = [], about } = body ?? {};
		let fn: string | null = null;
		switch (action) {
			case "register_freelancer": fn = ROLE.REGISTER_FREELANCER; break;
			case "register_poster": fn = ROLE.REGISTER_POSTER; break;
			case "register_reviewer": fn = ROLE.REGISTER_REVIEWER; break;
			case "get_role_info": fn = ROLE.GET_ROLE_INFO; break;
			case "get_poster_cid_bytes": fn = ROLE.GET_POSTER_CID_BYTES; break;
			case "get_freelancer_cid_bytes": fn = ROLE.GET_FREELANCER_CID_BYTES; break;
			case "has_freelancer": fn = ROLE.HAS_FREELANCER; break;
			case "has_poster": fn = ROLE.HAS_POSTER; break;
			case "get_all_roles": fn = "get_all_roles"; break;
			default: return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
		}

		if (action === "get_role_info") {
			const [address, kind] = args;
			const viewResp = await fetch(process.env.APTOS_NODE_URL || `${APTOS_NODE_URL}/v1/view`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ function: fn, type_arguments: [], arguments: [address, kind] })
			});
			const viewResult = await viewResp.json();
			let [role, cidRaw] = Array.isArray(viewResult) ? viewResult : ["", null];
			let cid = null as string | null;
			if (cidRaw && typeof cidRaw === "object" && Array.isArray(cidRaw.vec) && cidRaw.vec.length > 0) {
				cid = cidRaw.vec[0];
			} else if (typeof cidRaw === "string") {
				cid = cidRaw;
			}
			return NextResponse.json({ args: [role, cid] });
		}

		if (action === "get_all_roles") {
			const [address] = args;
			const res = await fetch(`${APTOS_NODE_URL}/v1/accounts/${address}/resource/${CONTRACT_ADDRESS}::role::Roles`);
			if (!res.ok) return NextResponse.json({ roles: [] });
			const data = await res.json();
			const entries = Array.isArray(data?.data?.entries) ? data.data.entries : [];
			const roles = entries.map((e: any) => {
				let cid: string | undefined;
				if (e?.cid?.vec && Array.isArray(e.cid.vec) && e.cid.vec.length > 0) cid = e.cid.vec[0];
				else if (typeof e?.cid === 'string') cid = e.cid;
				return { name: e?.role ?? "", cid };
			});
			return NextResponse.json({ roles });
		}

		if ((action === "register_freelancer" || action === "register_poster") && (!args[1] || String(args[1]).length === 0)) {
			if (!about) return NextResponse.json({ error: "about required when cid not provided" }, { status: 400 });
			const roleStr = action === "register_freelancer" ? "freelancer" : "poster";
			const res = await fetch("/api/ipfs/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "profile", about }) });
			const data = await res.json();
			if (!res.ok || !data.success) return NextResponse.json({ error: data.error || "IPFS upload failed" }, { status: 500 });
			const cid = data.encCid || data.ipfsHash;
			args[0] = roleStr;
			args[1] = cid;
		}

		return NextResponse.json({ function: fn, type_args: typeArgs, args });
	} catch (e: any) {
		return NextResponse.json({ error: e?.message ?? "Bad request" }, { status: 400 });
	}
}
