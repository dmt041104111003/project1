import { NextResponse } from "next/server";
import { DISPUTE } from "@/constants/contracts";

export async function POST(req: Request) {
	try {
		const body = await req.json();
		const { action, args = [], typeArgs = [] } = body ?? {};
		let fn: string | null = null;
		switch (action) {
			case "open": fn = DISPUTE.OPEN; break;
			case "set_milestone_index": fn = DISPUTE.SET_MILESTONE_INDEX; break;
			case "freelancer_response": fn = DISPUTE.FREELANCER_RESPONSE; break;
			case "reviewer_stake_and_vote": fn = DISPUTE.REVIEWER_STAKE_AND_VOTE; break;
			default: return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
		}
		return NextResponse.json({ function: fn, type_args: typeArgs, args });
	} catch (e: any) {
		return NextResponse.json({ error: e?.message ?? "Bad request" }, { status: 400 });
	}
}
