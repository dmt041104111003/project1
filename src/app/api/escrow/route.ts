import { NextResponse } from "next/server";
import { ESCROW } from "@/constants/contracts";

export async function POST(req: Request) {
	try {
		const body = await req.json();
		const { action, args = [], typeArgs = [] } = body ?? {};
		let fn: string | null = null;
		switch (action) {
			case "create_job": fn = ESCROW.CREATE_JOB; break;
			case "join_as_freelancer": fn = ESCROW.JOIN_AS_FREELANCER; break;
			case "submit_milestone": fn = ESCROW.SUBMIT_MILESTONE; break;
			case "approve_milestone": fn = ESCROW.APPROVE_MILESTONE; break;
			case "auto_approve_if_poster_inactive": fn = ESCROW.AUTO_APPROVE_IF_POSTER_INACTIVE; break;
			case "claim_stake_on_miss_deadline": fn = ESCROW.CLAIM_STAKE_ON_MISS_DEADLINE; break;
			case "open_dispute": fn = ESCROW.OPEN_DISPUTE; break;
			case "unlock_non_disputed_to_poster": fn = ESCROW.UNLOCK_NON_DISPUTED_TO_POSTER; break;
			case "poster_request_cancel": fn = ESCROW.POSTER_REQUEST_CANCEL; break;
			case "freelancer_request_cancel": fn = ESCROW.FREELANCER_REQUEST_CANCEL; break;
			case "withdraw_dispute_fees": fn = ESCROW.WITHDRAW_DISPUTE_FEES; break;
			case "withdraw_all_dispute_fees": fn = ESCROW.WITHDRAW_ALL_DISPUTE_FEES; break;
			default: return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
		}
		return NextResponse.json({ function: fn, type_args: typeArgs, args });
	} catch (e: any) {
		return NextResponse.json({ error: e?.message ?? "Bad request" }, { status: 400 });
	}
}
