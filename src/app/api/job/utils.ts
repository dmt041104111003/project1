import { CONTRACT_ADDRESS, APTOS_NODE_URL } from "@/constants/contracts";

export const getTableHandle = async (): Promise<{ handle: string; nextJobId: number } | null> => {
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

export const queryJobFromTable = async (tableHandle: string, jobId: number): Promise<any> => {
	try {
		const requestBody = {
			key_type: "u64",
			value_type: `${CONTRACT_ADDRESS}::escrow::Job`,
			key: String(jobId)
		};
		console.log(`[API] Querying job ${jobId} from table:`, JSON.stringify(requestBody, null, 2));
		
		const res = await fetch(`${APTOS_NODE_URL}/v1/tables/${tableHandle}/item`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(requestBody)
		});
		
		if (!res.ok) {
			if (res.status === 404) {
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

export const parseState = (stateData: any): string => {
	if (typeof stateData === 'string') return stateData;
	if (stateData && typeof stateData === 'object') {
		if (stateData.vec && Array.isArray(stateData.vec) && stateData.vec.length > 0) {
			return String(stateData.vec[0]);
		}
		if (stateData.__variant__) return String(stateData.__variant__);
		if (stateData.__name__) return String(stateData.__name__);
		const keys = Object.keys(stateData);
		if (keys.length > 0) {
			return String(keys[0]);
		}
	}
	return "Posted";
};

export const parseOptionAddress = (data: any): string | null => {
	if (!data) return null;
	if (typeof data === 'string') return data;
	if (typeof data === 'object' && data?.vec) {
		if (data.vec.length > 0) {
			return data.vec[0];
		}
	}
	return null;
};

export const parseMilestoneStatus = (statusData: any): string => {
	if (typeof statusData === 'string') return statusData;
	if (statusData && typeof statusData === 'object') {
		if (statusData.vec && Array.isArray(statusData.vec) && statusData.vec.length > 0) {
			return String(statusData.vec[0]);
		}
		if (statusData.__variant__) return String(statusData.__variant__);
		if (statusData.__name__) return String(statusData.__name__);
		const keys = Object.keys(statusData);
		if (keys.length > 0) {
			return String(keys[0]);
		}
	}
	return "Pending";
};

