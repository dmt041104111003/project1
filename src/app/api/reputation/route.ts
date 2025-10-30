import { NextResponse } from "next/server";
import { REPUTATION } from "@/constants/contracts";

export async function POST(req: Request) {
	try {
		const body = await req.json();
		const { action, args = [], typeArgs = [] } = body ?? {};
		let fn: string | null = null;
		switch (action) {
			case "claim_reviewer_bonus": fn = REPUTATION.CLAIM_REVIEWER_BONUS; break;
			case "claim_freelancer_bonus": fn = REPUTATION.CLAIM_FREELANCER_BONUS; break;
			case "claim_poster_bonus": fn = REPUTATION.CLAIM_POSTER_BONUS; break;
			default: return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
		}
		return NextResponse.json({ function: fn, type_args: typeArgs, args });
	} catch (e: any) {
		return NextResponse.json({ error: e?.message ?? "Bad request" }, { status: 400 });
	}
}
