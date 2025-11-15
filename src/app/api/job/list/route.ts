import { NextResponse } from "next/server";
import { getTableHandle, queryJobFromTable, parseState, parseOptionAddress } from "../utils";

export async function GET(_req: Request) {
	try {
		const store = await getTableHandle();
		if (!store) {
			return NextResponse.json({ error: "Không tìm thấy EscrowStore" }, { status: 404 });
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
		return NextResponse.json({ error: error?.message || "Không thể lấy danh sách công việc" }, { status: 500 });
	}
}

