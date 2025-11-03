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
			case "freelancer_withdraw":
				return NextResponse.json({
					function: ESCROW.FREELANCER_WITHDRAW,
					type_args: [],
					args: [job_id]
				});

			case "accept_freelancer_withdraw":
				return NextResponse.json({
					function: ESCROW.ACCEPT_FREELANCER_WITHDRAW,
					type_args: [],
					args: [job_id]
				});

			case "reject_freelancer_withdraw":
				return NextResponse.json({
					function: ESCROW.REJECT_FREELANCER_WITHDRAW,
					type_args: [],
					args: [job_id]
				});

			case "poster_withdraw_unfilled":
				return NextResponse.json({
					function: ESCROW.POSTER_WITHDRAW_UNFILLED,
					type_args: [],
					args: [job_id]
				});

			default:
				return NextResponse.json({ error: "Invalid action. Use: freelancer_withdraw, accept_freelancer_withdraw, reject_freelancer_withdraw, poster_withdraw_unfilled" }, { status: 400 });
		}
	} catch (error: any) {
		return NextResponse.json({ error: error?.message || "Failed to prepare transaction" }, { status: 500 });
	}
}

