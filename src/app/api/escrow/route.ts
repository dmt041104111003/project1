import { NextResponse } from "next/server";
import { ESCROW } from "@/constants/contracts";

export async function POST(req: Request) {
	try {
		const body = await req.json();
		const { action, args = [], typeArgs = [] } = body ?? {};
		let fn: string | null = null;
		switch (action) {
			case "create_job": fn = ESCROW.CREATE_JOB; break;
			case "submit_milestone": fn = ESCROW.SUBMIT_MILESTONE; break;
			case "confirm_milestone": fn = ESCROW.CONFIRM_MILESTONE; break;
			case "reject_milestone": fn = ESCROW.REJECT_MILESTONE; break;
			case "claim_timeout": fn = ESCROW.CLAIM_TIMEOUT; break;
			case "unlock_non_disputed_milestones": fn = ESCROW.UNLOCK_NON_DISPUTED_MILESTONES; break;
			case "claim_dispute_payment": fn = ESCROW.CLAIM_DISPUTE_PAYMENT; break;
			case "claim_dispute_refund": fn = ESCROW.CLAIM_DISPUTE_REFUND; break;
			default: return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
		}
		return NextResponse.json({ function: fn, type_args: typeArgs, args });
	} catch (e: any) {
		return NextResponse.json({ error: e?.message ?? "Bad request" }, { status: 400 });
	}
}
