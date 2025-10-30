import { NextResponse } from "next/server";
import { ROLE } from "@/constants/contracts";

export async function POST(req: Request) {
	try {
		const body = await req.json();
		const { action, args = [], typeArgs = [], about } = body ?? {};
		let fn: string | null = null;
		switch (action) {
			case "register_freelancer": fn = ROLE.REGISTER_FREELANCER; break;
			case "register_poster": fn = ROLE.REGISTER_POSTER; break;
			case "register_reviewer": fn = ROLE.REGISTER_REVIEWER; break;
			case "get_poster_cid_bytes": fn = ROLE.GET_POSTER_CID_BYTES; break;
			case "get_freelancer_cid_bytes": fn = ROLE.GET_FREELANCER_CID_BYTES; break;
			default: return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
		}

		if ((action === "register_freelancer" || action === "register_poster") && (!args[0] || String(args[0]).length === 0)) {
			if (!about) return NextResponse.json({ error: "about required when cid not provided" }, { status: 400 });
			const roles = action === "register_freelancer" ? ["freelancer"] : ["poster"];
			const res = await fetch("/api/ipfs/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "profile", about, roles }) });
			const data = await res.json();
			if (!res.ok || !data.success) return NextResponse.json({ error: data.error || "IPFS upload failed" }, { status: 500 });
			const cid = data.encCid || data.ipfsHash;
			args[0] = cid;
		}

		return NextResponse.json({ function: fn, type_args: typeArgs, args });
	} catch (e: any) {
		return NextResponse.json({ error: e?.message ?? "Bad request" }, { status: 400 });
	}
}
