import { NextResponse } from "next/server";
import { ESCROW } from "@/constants/contracts";

export async function POST(req: Request) {
	try {
		const body = await req.json();
		const { job_id } = body;

		if (!job_id) {
			return NextResponse.json({ error: "job_id required" }, { status: 400 });
		}

		return NextResponse.json({
			function: ESCROW.APPLY_JOB,
			type_args: [],
			args: [job_id]
		});
	} catch (error: any) {
		return NextResponse.json({ error: error?.message || "Failed to prepare transaction" }, { status: 500 });
	}
}

