import { NextResponse } from "next/server";
import { getTableHandle, queryJobFromTable, parseState, parseOptionAddress, parseMilestoneStatus } from "../utils";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
	try {
        const { id } = await params;
        const jobId = id;
		
		if (!jobId) {
			return NextResponse.json({ error: "job_id required" }, { status: 400 });
		}

		const store = await getTableHandle();
		if (!store) {
			return NextResponse.json({ error: "EscrowStore not found" }, { status: 404 });
		}

		const jobData = await queryJobFromTable(store.handle, Number(jobId));
		if (!jobData) {
			return NextResponse.json({ error: "Job not found" }, { status: 404 });
		}

		const stateStr = parseState(jobData?.state);
		const freelancer = parseOptionAddress(jobData?.freelancer);
		const applyDeadline = jobData?.apply_deadline ? Number(jobData.apply_deadline) : undefined;
		const mutualCancelRequestedBy = parseOptionAddress(jobData?.mutual_cancel_requested_by);
		const freelancerWithdrawRequestedBy = parseOptionAddress(jobData?.freelancer_withdraw_requested_by);

		const parseEvidenceCid = (evidence: any): string | null => {
			if (!evidence) return null;
			if (typeof evidence === 'string') return evidence;
			if (evidence.vec && Array.isArray(evidence.vec) && evidence.vec.length > 0) {
				return evidence.vec[0];
			}
			return null;
		};

		const milestones = (jobData?.milestones || []).map((m: any) => {
			const statusStr = parseMilestoneStatus(m?.status);
			return {
				id: String(m?.id || 0),
				amount: String(m?.amount || 0),
				duration: String(m?.duration || 0),
				deadline: String(m?.deadline || 0),
				review_period: String(m?.review_period || 0),
				review_deadline: String(m?.review_deadline || 0),
				status: statusStr,
				evidence_cid: parseEvidenceCid(m?.evidence_cid)
			};
		});

		const parseOptionBool = (data: any): boolean | null => {
			if (!data) return null;
			if (typeof data === 'boolean') return data;
			if (data?.vec && Array.isArray(data.vec) && data.vec.length > 0) {
				return Boolean(data.vec[0]);
			}
			return null;
		};

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
			dispute_id: jobData?.dispute_id,
			dispute_winner: parseOptionBool(jobData?.dispute_winner),
			apply_deadline: applyDeadline,
			mutual_cancel_requested_by: mutualCancelRequestedBy,
			freelancer_withdraw_requested_by: freelancerWithdrawRequestedBy
		};

		return NextResponse.json({ job });
	} catch (error: any) {
		return NextResponse.json({ error: error?.message || "Failed to fetch job" }, { status: 500 });
	}
}

