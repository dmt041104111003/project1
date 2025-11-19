import { CONTRACT_ADDRESS } from "@/constants/contracts";
import { fetchContractResourceData, queryTableItem } from "@/app/api/onchain/_lib/tableClient";

export const getTableHandle = async (): Promise<{ handle: string; nextJobId: number } | null> => {
	try {
		const data = await fetchContractResourceData("escrow::EscrowStore");
		if (!data?.table?.handle) {
			return null;
		}
		return {
			handle: data.table.handle,
			nextJobId: Number(data?.next_job_id || 0)
		};
	} catch {
		return null;
	}
};

export const queryJobFromTable = async (tableHandle: string, jobId: number): Promise<any> => {
	return queryTableItem({
		handle: tableHandle,
		keyType: "u64",
		valueType: `${CONTRACT_ADDRESS}::escrow::Job`,
		key: jobId
	});
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

