import { NextResponse } from "next/server";
import { ESCROW } from "@/constants/contracts";

export async function POST(req: Request) {
	try {
		const body = await req.json();
		const { action, job_id, milestone_id, evidence_cid } = body;

		if (!job_id || milestone_id === undefined) {
			return NextResponse.json({ error: "job_id and milestone_id required" }, { status: 400 });
		}

		switch (action) {
			case "submit":
				return NextResponse.json({
					function: ESCROW.SUBMIT_MILESTONE,
					type_args: [],
					args: [
						job_id,
						milestone_id,
						evidence_cid || evidence_cid || ""
					]
				});

			case "confirm":
				return NextResponse.json({
					function: ESCROW.CONFIRM_MILESTONE,
					type_args: [],
					args: [job_id, milestone_id]
				});

			case "reject":
				return NextResponse.json({
					function: ESCROW.REJECT_MILESTONE,
					type_args: [],
					args: [job_id, milestone_id]
				});

			case "claim_timeout":
				return NextResponse.json({
					function: ESCROW.CLAIM_TIMEOUT,
					type_args: [],
					args: [job_id, milestone_id]
				});

			default:
				return NextResponse.json({ error: "Invalid action. Use: submit, confirm, reject, claim_timeout" }, { status: 400 });
		}
	} catch (error: any) {
		return NextResponse.json({ error: error?.message || "Failed to prepare transaction" }, { status: 500 });
	}
}

