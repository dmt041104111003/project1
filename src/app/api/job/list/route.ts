import { NextResponse } from "next/server";
import { getTableHandle, queryJobFromTable, parseState, parseOptionAddress } from "../utils";

export async function GET(req: Request) {
	try {
		console.log(`[API] Listing jobs`);
		const store = await getTableHandle();
		if (!store) {
			return NextResponse.json({ error: "EscrowStore not found" }, { status: 404 });
		}

		const jobs = [];
		const maxScan = Math.min(store.nextJobId, 200);
		
		for (let id = 1; id < maxScan; id++) {
			const jobData = await queryJobFromTable(store.handle, id);
			if (jobData) {
				const stateStr = parseState(jobData?.state);
				const freelancer = parseOptionAddress(jobData?.freelancer);
				const milestones = jobData?.milestones || [];
				
				const job = {
					id,
					cid: jobData?.cid || "",
					total_amount: Number(jobData?.total_escrow || 0),
					milestones_count: milestones.length,
					has_freelancer: !!freelancer,
					state: stateStr,
					poster: jobData?.poster,
					freelancer,
					apply_deadline: jobData?.apply_deadline ? Number(jobData.apply_deadline) : undefined
				};
				jobs.push(job);
			}
		}

		return NextResponse.json({ jobs });
	} catch (error: any) {
		return NextResponse.json({ error: error?.message || "Failed to fetch jobs" }, { status: 500 });
	}
}

