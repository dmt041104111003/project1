import { NextResponse } from "next/server";
import { ESCROW } from "@/constants/contracts";
import { getTableHandle, queryJobFromTable, parseMilestoneStatus } from "../utils";

export async function POST(req: Request) {
	try {
		const body = await req.json();
		const { action, job_id, milestone_id, evidence_cid } = body;

		if (!job_id || milestone_id === undefined) {
			return NextResponse.json({ error: "job_id and milestone_id required" }, { status: 400 });
		}

		if (action === "confirm" || action === "reject") {
			try {
				const store = await getTableHandle();
				if (store) {
					const jobData = await queryJobFromTable(store.handle, Number(job_id));
					if (jobData?.milestones) {
						const milestones = jobData.milestones || [];
						const milestone = milestones.find((m: any) => Number(m?.id || 0) === Number(milestone_id));
						if (milestone) {
							const statusStr = parseMilestoneStatus(milestone?.status);
							if (statusStr === "Submitted") {
								const reviewDeadline = Number(milestone?.review_deadline || 0);
								const now = Math.floor(Date.now() / 1000);
								if (reviewDeadline > 0 && now > reviewDeadline) {
									return NextResponse.json({ 
										error: "Review deadline has passed. You can no longer confirm or reject this milestone. Freelancer can now claim timeout." 
									}, { status: 400 });
								}
							}
						}
					}
				}
			} catch (err) {
				console.error("[API] Error checking review deadline:", err);
			}
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

