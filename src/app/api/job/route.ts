import { NextRequest, NextResponse } from "next/server";
import { getTableHandle, queryJobFromTable, parseState, parseOptionAddress, parseMilestoneStatus } from "./utils";

export async function GET(req: NextRequest) {
	try {
		const url = new URL(req.url);
		const jobId = url.searchParams.get("job_id");
		const list = url.searchParams.get("list");
		
		if (list === "true") {
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
		}

		if (!jobId) {
			return NextResponse.json({ error: "job_id là bắt buộc" }, { status: 400 });
		}

		const store = await getTableHandle();
		if (!store) {
			return NextResponse.json({ error: "Không tìm thấy EscrowStore" }, { status: 404 });
		}

		const jobData = await queryJobFromTable(store.handle, Number(jobId));
		if (!jobData) {
			return NextResponse.json({ error: "Không tìm thấy công việc" }, { status: 404 });
		}

		const stateStr = parseState(jobData?.state);
		const freelancer = parseOptionAddress(jobData?.freelancer);
		const applyDeadline = jobData?.apply_deadline ? Number(jobData.apply_deadline) : undefined;
		const mutualCancelRequestedBy = parseOptionAddress(jobData?.mutual_cancel_requested_by);
		const freelancerWithdrawRequestedBy = parseOptionAddress(jobData?.freelancer_withdraw_requested_by);

		const milestones = (jobData?.milestones || []).map((m: any) => {
			const statusStr = parseMilestoneStatus(m?.status);
			return {
				id: String(m?.id || 0),
				amount: String(m?.amount || 0),
				deadline: String(m?.deadline || 0),
				status: statusStr,
				evidence_cid: m?.evidence_cid || null
			};
		});

		const job = {
			id: Number(jobId),
			cid: jobData?.cid || "",
			total_amount: Number(jobData?.job_funds?.value || jobData?.total_escrow || 0),
			milestones_count: milestones.length,
			milestones: milestones,
			has_freelancer: !!freelancer,
			state: stateStr,
			poster: jobData?.poster,
			freelancer,
			apply_deadline: applyDeadline,
			mutual_cancel_requested_by: mutualCancelRequestedBy,
			freelancer_withdraw_requested_by: freelancerWithdrawRequestedBy
		};

		return NextResponse.json({ job });
	} catch (error: any) {
		return NextResponse.json({ error: error?.message || "Không thể lấy công việc" }, { status: 500 });
	}
}
