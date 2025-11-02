import { NextResponse } from "next/server";
import { ESCROW, CONTRACT_ADDRESS, APTOS_NODE_URL } from "@/constants/contracts";

const getTableHandle = async (): Promise<{ handle: string; nextJobId: number } | null> => {
	try {
		const resourceType = `${CONTRACT_ADDRESS}::escrow::EscrowStore`;
		console.log(`[API] Fetching EscrowStore from ${CONTRACT_ADDRESS}`);
		const res = await fetch(`${APTOS_NODE_URL}/v1/accounts/${CONTRACT_ADDRESS}/resource/${resourceType}`);
		if (!res.ok) {
			console.log(`[API] Failed to fetch EscrowStore: ${res.status} ${res.statusText}`);
			const text = await res.text();
			console.log(`[API] Response: ${text}`);
			return null;
		}
		const data = await res.json();
		const handle = data?.data?.table?.handle;
		const nextJobId = data?.data?.next_job_id || 0;
		console.log(`[API] EscrowStore data:`, JSON.stringify(data, null, 2));
		return {
			handle,
			nextJobId: Number(nextJobId)
		};
	} catch (err) {
		console.error(`[API] Error fetching EscrowStore:`, err);
		return null;
	}
};

const queryJobFromTable = async (tableHandle: string, jobId: number): Promise<any> => {
	try {
		const requestBody = {
			key_type: "u64",
			value_type: `${CONTRACT_ADDRESS}::escrow::Job`,
			key: String(jobId)  // Aptos API expects string for numeric keys
		};
		console.log(`[API] Querying job ${jobId} from table:`, JSON.stringify(requestBody, null, 2));
		
		const res = await fetch(`${APTOS_NODE_URL}/v1/tables/${tableHandle}/item`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(requestBody)
		});
		
		if (!res.ok) {
			if (res.status === 404) {
				// Job not found, this is normal
				console.log(`[API] Job ${jobId} not found (404)`);
				return null;
			}
			const errorText = await res.text();
			console.log(`[API] Failed to query job ${jobId}: ${res.status} ${res.statusText}`);
			console.log(`[API] Error response:`, errorText);
			return null;
		}
		const data = await res.json();
		console.log(`[API] Successfully queried job ${jobId}:`, JSON.stringify(data, null, 2).substring(0, 500));
		return data;
	} catch (err) {
		console.error(`[API] Error querying job ${jobId}:`, err);
		return null;
	}
};

// GET: Query job data from table
export async function GET(req: Request) {
	try {
		const url = new URL(req.url);
		const jobId = url.searchParams.get("job_id");
		const list = url.searchParams.get("list");
		
		// List all jobs
		if (list === "true") {
			console.log(`[API] Listing jobs from module address: ${CONTRACT_ADDRESS}`);
			const store = await getTableHandle();
			if (!store) {
				console.log(`[API] EscrowStore not found at ${CONTRACT_ADDRESS}`);
				return NextResponse.json({ error: "EscrowStore not found" }, { status: 404 });
			}

			console.log(`[API] Got table handle: ${store.handle}, next_job_id: ${store.nextJobId}`);
			const jobs = [];
			const maxScan = Math.min(store.nextJobId, 200);
			console.log(`[API] Scanning jobs from 1 to ${maxScan}`);
			
			for (let id = 1; id < maxScan; id++) {
				const jobData = await queryJobFromTable(store.handle, id);
				if (jobData) {
					// Parse state enum: Move enum can be { vec: ["VariantName"] }, { __variant__: "VariantName" }, or string
					let stateStr = "Posted";
					const stateData = jobData?.state;
					
					console.log(`[API] Raw state data for job ${id}:`, JSON.stringify(stateData));
					
					if (typeof stateData === 'string') {
						stateStr = stateData;
					} else if (stateData && typeof stateData === 'object') {
						if (stateData.vec && Array.isArray(stateData.vec) && stateData.vec.length > 0) {
							stateStr = String(stateData.vec[0]);
						} else if (stateData.__variant__) {
							stateStr = String(stateData.__variant__);
						} else if (stateData.__name__) {
							stateStr = String(stateData.__name__);
						} else {
							// Try to get first key as variant name
							const keys = Object.keys(stateData);
							if (keys.length > 0) {
								stateStr = String(keys[0]);
							}
						}
					}
					
					// Ensure stateStr is always a string
					stateStr = String(stateStr || "Posted");
					
					// Parse freelancer: Option<address> returns { vec: ["0x..."] } or null
					let freelancer = null;
					if (jobData?.freelancer) {
						if (typeof jobData.freelancer === 'object' && jobData.freelancer?.vec) {
							if (jobData.freelancer.vec.length > 0) {
								freelancer = jobData.freelancer.vec[0];
							}
						} else if (typeof jobData.freelancer === 'string') {
							freelancer = jobData.freelancer;
						}
					}
					
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
					console.log(`[API] Found job #${id}: state=${job.state}, cid=${job.cid.substring(0, 20)}...`);
				}
			}

			console.log(`[API] Returning ${jobs.length} jobs`);
			return NextResponse.json({ jobs });
		}

		// Query single job
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

		// Parse state enum: Move enum can be { vec: ["VariantName"] }, { __variant__: "VariantName" }, or string
		let stateStr = "Posted";
		const stateData = jobData?.state;
		
		console.log(`[API] Raw state data for job ${jobId}:`, JSON.stringify(stateData));
		
		if (typeof stateData === 'string') {
			stateStr = stateData;
		} else if (stateData && typeof stateData === 'object') {
			if (stateData.vec && Array.isArray(stateData.vec) && stateData.vec.length > 0) {
				stateStr = String(stateData.vec[0]);
			} else if (stateData.__variant__) {
				stateStr = String(stateData.__variant__);
			} else if (stateData.__name__) {
				stateStr = String(stateData.__name__);
			} else {
				// Try to get first key as variant name
				const keys = Object.keys(stateData);
				if (keys.length > 0) {
					stateStr = String(keys[0]);
				}
			}
		}
		
		// Ensure stateStr is always a string
		stateStr = String(stateStr || "Posted");
		
		// Parse freelancer: Option<address> returns { vec: ["0x..."] } or null
		let freelancer = null;
		if (jobData?.freelancer) {
			if (typeof jobData.freelancer === 'object' && jobData.freelancer?.vec) {
				if (jobData.freelancer.vec.length > 0) {
					freelancer = jobData.freelancer.vec[0];
				}
			} else if (typeof jobData.freelancer === 'string') {
				freelancer = jobData.freelancer;
			}
		}

		// Parse apply_deadline
		const applyDeadline = jobData?.apply_deadline ? Number(jobData.apply_deadline) : undefined;

		// Parse mutual_cancel_requested_by: Option<address>
		let mutualCancelRequestedBy = null;
		if (jobData?.mutual_cancel_requested_by) {
			if (typeof jobData.mutual_cancel_requested_by === 'object' && jobData.mutual_cancel_requested_by?.vec) {
				if (jobData.mutual_cancel_requested_by.vec.length > 0) {
					mutualCancelRequestedBy = jobData.mutual_cancel_requested_by.vec[0];
				}
			} else if (typeof jobData.mutual_cancel_requested_by === 'string') {
				mutualCancelRequestedBy = jobData.mutual_cancel_requested_by;
			}
		}

		// Parse freelancer_withdraw_requested_by: Option<address>
		let freelancerWithdrawRequestedBy = null;
		if (jobData?.freelancer_withdraw_requested_by) {
			if (typeof jobData.freelancer_withdraw_requested_by === 'object' && jobData.freelancer_withdraw_requested_by?.vec) {
				if (jobData.freelancer_withdraw_requested_by.vec.length > 0) {
					freelancerWithdrawRequestedBy = jobData.freelancer_withdraw_requested_by.vec[0];
				}
			} else if (typeof jobData.freelancer_withdraw_requested_by === 'string') {
				freelancerWithdrawRequestedBy = jobData.freelancer_withdraw_requested_by;
			}
		}

		// Parse milestones with their status
		const milestones = (jobData?.milestones || []).map((m: any) => {
			// Parse milestone status enum
			let statusStr = "Pending";
			const statusData = m?.status;
			if (typeof statusData === 'string') {
				statusStr = statusData;
			} else if (statusData && typeof statusData === 'object') {
				if (statusData.vec && Array.isArray(statusData.vec) && statusData.vec.length > 0) {
					statusStr = String(statusData.vec[0]);
				} else if (statusData.__variant__) {
					statusStr = String(statusData.__variant__);
				} else if (statusData.__name__) {
					statusStr = String(statusData.__name__);
				} else {
					const keys = Object.keys(statusData);
					if (keys.length > 0) {
						statusStr = String(keys[0]);
					}
				}
			}

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
		return NextResponse.json({ error: error?.message || "Failed to fetch job" }, { status: 500 });
	}
}

export async function POST(req: Request) {
	try {
		const body = await req.json();
		const { action, ...params } = body;

		switch (action) {
			case "post": // create_job
				return NextResponse.json({
					function: ESCROW.CREATE_JOB,
					type_args: [],
					args: [
						params.job_details_cid || params.cid,
						params.milestone_durations || params.milestone_deadlines || [],
						params.milestones || [],
						params.poster_deposit || (params.milestones || []).reduce((sum: number, m: number) => sum + m, 0)
					]
				});

			case "apply": // apply_job (now includes stake + fee automatically)
				return NextResponse.json({
					function: ESCROW.APPLY_JOB,
					type_args: [],
					args: [params.job_id]
				});

			case "submit_milestone": // submit_milestone
				return NextResponse.json({
					function: ESCROW.SUBMIT_MILESTONE,
					type_args: [],
					args: [
						params.job_id,
						params.milestone_id,
						params.evidence_cid || params.evidence_cid_string || ""
					]
				});

			case "confirm_milestone": // confirm_milestone
				return NextResponse.json({
					function: ESCROW.CONFIRM_MILESTONE,
					type_args: [],
					args: [params.job_id, params.milestone_id]
				});

			case "reject_milestone": // reject_milestone
				return NextResponse.json({
					function: ESCROW.REJECT_MILESTONE,
					type_args: [],
					args: [params.job_id, params.milestone_id]
				});

			case "claim_timeout": // claim_timeout
				return NextResponse.json({
					function: ESCROW.CLAIM_TIMEOUT,
					type_args: [],
					args: [params.job_id, params.milestone_id]
				});

			case "unlock": // unlock_non_disputed_milestones
				return NextResponse.json({
					function: ESCROW.UNLOCK_NON_DISPUTED_MILESTONES,
					type_args: [],
					args: [params.job_id]
				});

			case "mutual_cancel": // Poster requests mutual cancel
				return NextResponse.json({
					function: ESCROW.MUTUAL_CANCEL,
					type_args: [],
					args: [params.job_id]
				});

			case "accept_mutual_cancel": // Freelancer accepts mutual cancel
				return NextResponse.json({
					function: ESCROW.ACCEPT_MUTUAL_CANCEL,
					type_args: [],
					args: [params.job_id]
				});

			case "reject_mutual_cancel": // Freelancer rejects mutual cancel
				return NextResponse.json({
					function: ESCROW.REJECT_MUTUAL_CANCEL,
					type_args: [],
					args: [params.job_id]
				});

			case "freelancer_withdraw": // Freelancer requests to withdraw
				return NextResponse.json({
					function: ESCROW.FREELANCER_WITHDRAW,
					type_args: [],
					args: [params.job_id]
				});

			case "accept_freelancer_withdraw": // Poster accepts freelancer withdraw
				return NextResponse.json({
					function: ESCROW.ACCEPT_FREELANCER_WITHDRAW,
					type_args: [],
					args: [params.job_id]
				});

			case "reject_freelancer_withdraw": // Poster rejects freelancer withdraw
				return NextResponse.json({
					function: ESCROW.REJECT_FREELANCER_WITHDRAW,
					type_args: [],
					args: [params.job_id]
				});

			case "poster_withdraw_unfilled": // poster_withdraw_unfilled_job
				return NextResponse.json({
					function: ESCROW.POSTER_WITHDRAW_UNFILLED,
					type_args: [],
					args: [params.job_id]
				});

			default:
				return NextResponse.json({ error: "Invalid action" }, { status: 400 });
		}
	} catch (error: any) {
		return NextResponse.json({ error: error?.message || "Failed to prepare transaction" }, { status: 500 });
	}
}

