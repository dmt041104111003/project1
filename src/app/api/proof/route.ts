import { NextRequest, NextResponse } from 'next/server';
import { APTOS_NODE_URL, CONTRACT_ADDRESS } from "@/constants/contracts";

const APTOS_API_KEY = process.env.APTOS_API_KEY || '';
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

    // Query proof từ table thay vì view function
    // Lấy table handle từ RoleStore
    const resourceType = `${CONTRACT_ADDRESS}::role::RoleStore`;
    const resourceRes = await fetch(
      `${APTOS_NODE_URL}/v1/accounts/${CONTRACT_ADDRESS}/resource/${resourceType}`,
      {
        headers: {
          'x-api-key': APTOS_API_KEY,
          'Authorization': `Bearer ${APTOS_API_KEY}`
        }
      }
    );

    if (!resourceRes.ok) {
      return NextResponse.json(
        { success: false, error: 'Không thể lấy RoleStore resource' },
        { status: 500 }
      );
    }

    const resourceData = await resourceRes.json();
    const proofsHandle = resourceData?.data?.proofs?.handle;

    if (!proofsHandle) {
      return NextResponse.json({
        success: true,
        proof: null,
        message: 'Địa chỉ này chưa có proof'
      });
    }

    // Query proof từ table
    const tableRes = await fetch(`${APTOS_NODE_URL}/v1/tables/${proofsHandle}/item`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': APTOS_API_KEY,
        'Authorization': `Bearer ${APTOS_API_KEY}`
      },
      body: JSON.stringify({
        key_type: 'address',
        value_type: `${CONTRACT_ADDRESS}::role::CCCDProof`,
        key: address
      })
    });

    if (!tableRes.ok) {
      const errorText = await tableRes.text().catch(() => '');
      console.error('Table query error:', tableRes.status, errorText);
      // Nếu không tìm thấy (404 hoặc không có proof)
      return NextResponse.json({
        success: true,
        proof: null,
        message: 'Địa chỉ này chưa có proof'
      });
    }

    const proofStruct = await tableRes.json();
    
    if (!proofStruct) {
      return NextResponse.json({
        success: true,
        proof: null,
        message: 'Địa chỉ này chưa có proof'
      });
    }

    console.log('Proof struct:', JSON.stringify(proofStruct, null, 2));

    // Decode proof và public_signals từ vector<u8> về JSON
    const decodeVectorU8 = (vec: any): any => {
      if (!vec) return null;
      
      // Nếu là array of numbers (vector<u8>)
      if (Array.isArray(vec)) {
        try {
          const jsonString = String.fromCharCode(...vec).replace(/\0/g, '');
          return JSON.parse(jsonString);
        } catch {
          return null;
        }
      }
      
      // Nếu là string (hex hoặc base64)
      if (typeof vec === 'string') {
        try {
          // Thử parse trực tiếp nếu là JSON string
          return JSON.parse(vec);
        } catch {
          // Thử decode từ hex
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

