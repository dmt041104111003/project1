import { NextResponse } from "next/server";
import { JOB } from "@/constants/contracts";

export async function POST(req: Request) {
	try {
		const body = await req.json();
		const { action, args = [], typeArgs = [] } = body ?? {};
		let fn: string | null = null;
		switch (action) {
			case "create": fn = JOB.CREATE; break;
			case "join": fn = JOB.JOIN; break;
			case "submit": fn = JOB.SUBMIT; break;
			case "approve": fn = JOB.APPROVE; break;
			case "auto_approve_after_timeout": fn = JOB.AUTO_APPROVE_AFTER_TIMEOUT; break;
			case "miss_deadline_claim": fn = JOB.MISS_DEADLINE_CLAIM; break;
			case "open_dispute": fn = JOB.OPEN_DISPUTE; break;
			default: return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
		}
		return NextResponse.json({ function: fn, type_args: typeArgs, args });
	} catch (e: any) {
		return NextResponse.json({ error: e?.message ?? "Bad request" }, { status: 400 });
	}
}
