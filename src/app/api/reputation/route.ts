import { NextResponse } from "next/server";
import { CONTRACT_ADDRESS } from "@/constants/contracts";
import { fetchContractResourceData, queryTableItem } from "@/app/api/onchain/_lib/tableClient";

const getReputationPoints = async (address: string): Promise<number | null> => {
	try {
		const repStore = await fetchContractResourceData("reputation::RepStore");
		const handle = repStore?.table?.handle || null;
		if (!handle) {
			return 0;
		}
		
		const data = await queryTableItem({
			handle,
			keyType: "address",
			valueType: `${CONTRACT_ADDRESS}::reputation::Rep`,
			key: address
		});
		
		if (!data) {
			return 0;
		}
		
		const ut = Number(data?.ut || 0);
		
		return ut;
	} catch (err: any) {
		if (err?.message?.includes('not found') || err?.message?.includes('ECONNREFUSED')) {
			return 0;
		}
		return null;
	}
};

export async function GET(req: Request) {
	try {
		const { searchParams } = new URL(req.url);
		const address = searchParams.get('address');
		
		if (!address) {
			return NextResponse.json({ 
				success: false, 
				error: 'Tham số address là bắt buộc' 
			}, { status: 400 });
		}

		const ut = await getReputationPoints(address);
		
		if (ut === null) {
			return NextResponse.json({ 
				success: false, 
				error: 'Không thể lấy điểm danh tiếng' 
			}, { status: 500 });
		}
		
		return NextResponse.json({
			success: true,
			address,
			ut,
		});
	} catch (err: any) {
		return NextResponse.json({ 
			success: false, 
			error: err?.message || 'Lỗi máy chủ nội bộ' 
		}, { status: 500 });
	}
}

