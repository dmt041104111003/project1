import { NextResponse } from "next/server";
import { ESCROW } from "@/constants/contracts";

export async function POST(req: Request) {
	try {
		const body = await req.json();
		const { action, job_id } = body;

		if (!job_id) {
			return NextResponse.json({ error: "job_id required" }, { status: 400 });
		}

		switch (action) {
			case "mutual_cancel":
				return NextResponse.json({
					function: ESCROW.MUTUAL_CANCEL,
					type_args: [],
					args: [job_id]
				});

			case "accept_mutual_cancel":
				return NextResponse.json({
					function: ESCROW.ACCEPT_MUTUAL_CANCEL,
					type_args: [],
					args: [job_id]
				});

			case "reject_mutual_cancel":
				return NextResponse.json({
					function: ESCROW.REJECT_MUTUAL_CANCEL,
					type_args: [],
					args: [job_id]
				});

			default:
				return NextResponse.json({ error: "Invalid action. Use: mutual_cancel, accept_mutual_cancel, reject_mutual_cancel" }, { status: 400 });
		}
	} catch (error: any) {
		return NextResponse.json({ error: error?.message || "Failed to prepare transaction" }, { status: 500 });
	}
}

