import { NextRequest, NextResponse } from 'next/server';
import { CONTRACT_ADDRESS } from "@/constants/contracts";
import { fetchContractResourceData, queryTableItem } from "@/app/api/onchain/_lib/tableClient";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { success: false, error: 'Địa chỉ là bắt buộc' },
        { status: 400 }
      );
    }

    const roleStore = await fetchContractResourceData('role::RoleStore');
    const proofsHandle = roleStore?.proofs?.handle;

    if (!proofsHandle) {
      return NextResponse.json({
        success: true,
        proof: null,
        message: 'Địa chỉ này chưa có proof'
      });
    }

    const proofStruct = await queryTableItem({
      handle: proofsHandle,
      keyType: 'address',
      valueType: `${CONTRACT_ADDRESS}::role::CCCDProof`,
      key: address
    });

    if (!proofStruct) {
      return NextResponse.json({
        success: true,
        proof: null,
        message: 'Địa chỉ này chưa có proof'
      });
    }

    console.log('Proof struct:', JSON.stringify(proofStruct, null, 2));

    const decodeVectorU8 = (vec: any): any => {
      if (!vec) return null;
      
      if (Array.isArray(vec)) {
        try {
          const jsonString = String.fromCharCode(...vec).replace(/\0/g, '');
          return JSON.parse(jsonString);
        } catch {
          return null;
        }
      }
      
      if (typeof vec === 'string') {
        try {
          return JSON.parse(vec);
        } catch {
          if (vec.startsWith('0x')) {
            const hexString = vec.slice(2);
            const bytes: number[] = [];
            for (let i = 0; i < hexString.length; i += 2) {
              bytes.push(parseInt(hexString.substr(i, 2), 16));
            }
            const jsonString = String.fromCharCode(...bytes).replace(/\0/g, '');
            return JSON.parse(jsonString);
          }
        }
      }
      
      return null;
    };

    const proof = decodeVectorU8(proofStruct.proof);
    const publicSignals = decodeVectorU8(proofStruct.public_signals);
    const timestamp = proofStruct.timestamp ? Number(proofStruct.timestamp) : null;

    console.log('Decoded proof:', proof ? 'OK' : 'FAILED');
    console.log('Decoded public_signals:', publicSignals ? 'OK' : 'FAILED');

    if (!proof || !publicSignals) {
      console.error('Failed to decode:', {
        proofRaw: proofStruct.proof,
        publicSignalsRaw: proofStruct.public_signals
      });
      return NextResponse.json(
        { success: false, error: 'Không thể decode proof data. Vui lòng kiểm tra console log.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      proof: {
        proof,
        public_signals: publicSignals,
        timestamp
      }
    });

  } catch (error: any) {
    console.error('Error fetching proof:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Lỗi khi lấy proof' },
      { status: 500 }
    );
  }
}