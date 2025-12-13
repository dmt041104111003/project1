import { NextRequest, NextResponse } from 'next/server';
import { CONTRACT_ADDRESS } from "@/constants/contracts";
import { fetchContractResource, queryTableItem } from '@/lib/aptosClient';
import { Contract, JsonRpcProvider } from 'ethers';
import { groth16 } from 'snarkjs';

const GROTH16_VERIFIER_ABI = [
  "function verifyProof(uint[2] _pA, uint[2][2] _pB, uint[2] _pC, uint[3] _pubSignals) view returns (bool)"
] as const;

let verifierContract: Contract | null = null;

const getVerifierContract = () => {
  if (verifierContract) {
    return verifierContract;
  }

  const rpcUrl = process.env.RPC_URL;
  const contractAddress = process.env.ZK_VERIFIER_CONTRACT;

  if (!rpcUrl || !contractAddress) {
    throw new Error('Địa chỉ RPC hoặc hợp đồng xác thực ZK chưa được cấu hình (RPC_URL, ZK_VERIFIER_CONTRACT).');
  }

  console.log('[Proof API] Verifier config', { rpcUrl, contractAddress });

  const provider = new JsonRpcProvider(rpcUrl);
  verifierContract = new Contract(contractAddress, GROTH16_VERIFIER_ABI, provider);
  return verifierContract;
};

const parseSolidityCallData = (calldataRaw: string) => {
  const parsed = JSON.parse(`[${calldataRaw}]`);
  return {
    a: parsed[0] as string[],
    b: parsed[1] as string[][],
    c: parsed[2] as string[],
    inputs: parsed[3] as string[],
  };
};

const formatHexField = (value: string): bigint => {
  const trimmed = value.trim();
  if (!trimmed) throw new Error('Giá trị hex trống.');
  return BigInt(trimmed);
};

const formatArrayField = (arr: string[]): [bigint, bigint] => {
  if (!Array.isArray(arr) || arr.length < 2) {
    throw new Error('Thiếu dữ liệu trường');
  }
  return [formatHexField(arr[0]), formatHexField(arr[1])];
};

const formatNestedField = (arr: string[][]): [[bigint, bigint], [bigint, bigint]] => {
  if (!Array.isArray(arr) || arr.length < 2) {
    throw new Error('Thiếu dữ liệu trường B');
  }
  return [
    formatArrayField(arr[0]),
    formatArrayField(arr[1]),
  ];
};

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
          bytes.push(parseInt(hexString.substring(i, i + 2), 16));
        }
        const jsonString = String.fromCharCode(...bytes).replace(/\0/g, '');
        return JSON.parse(jsonString);
      }
    }
  }
  
  return null;
};

const normalizePublicSignalsPayload = (raw: any) => {
  if (Array.isArray(raw)) {
    return { signals: raw, meta: null };
  }
  
  if (raw && typeof raw === 'object' && Array.isArray(raw.signals)) {
    return {
      signals: raw.signals,
      meta: {
        identity_hash: raw.identity_hash ?? raw?.meta?.identity_hash ?? null,
        name_hash: raw.name_hash ?? raw?.meta?.name_hash ?? null,
        owner: raw.owner ?? raw?.meta?.owner ?? null
      }
    };
  }
  
  throw new Error('Tín hiệu đầu ra không đúng định dạng');
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const shouldVerify = searchParams.get('verify') !== 'false';

    if (!address) {
      return NextResponse.json(
        { success: false, error: 'Địa chỉ là bắt buộc' },
        { status: 400 }
      );
    }

    const roleStore = await fetchContractResource('role::RoleStore');
    const proofsHandle = roleStore?.proofs?.handle;

    if (!proofsHandle) {
      return NextResponse.json({
        success: true,
        hasProof: false,
        verified: null,
        message: 'Địa chỉ chưa có chứng chỉ'
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
        hasProof: false,
        verified: null,
        message: 'Địa chỉ chưa có chứng chỉ'
      });
    }

    if (!shouldVerify) {
      return NextResponse.json({
        success: true,
        hasProof: true,
        verified: null,
        message: 'Có chứng chỉ nhưng chưa xác thực'
      }, { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } });
    }

    console.log('Proof struct:', JSON.stringify(proofStruct, null, 2));

    const proof = decodeVectorU8(proofStruct.proof);
    const publicSignalsRaw = decodeVectorU8(proofStruct.public_signals);
    const timestamp = proofStruct.timestamp ? Number(proofStruct.timestamp) : null;

    console.log('Giải mã chứng chỉ:', proof ? 'OK' : 'LỖI');
    console.log('Giải mã tín hiệu đầu ra:', publicSignalsRaw ? 'OK' : 'LỖI');

    if (!proof || !publicSignalsRaw) {
      console.error('Không thể giải mã:', {
        proofRaw: proofStruct.proof,
        publicSignalsRaw: proofStruct.public_signals
      });
      return NextResponse.json(
        { success: false, error: 'Không thể giải mã chứng chỉ' },
        { status: 500 }
      );
    }
    let normalizedSignals;
    try {
      normalizedSignals = normalizePublicSignalsPayload(publicSignalsRaw);
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: err?.message || 'Tín hiệu đầu ra không đúng định dạng' },
        { status: 500 }
      );
    }

    let solidityCallDataRaw: string;
    try {
      solidityCallDataRaw = await groth16.exportSolidityCallData(proof, normalizedSignals.signals);
    } catch (solidityErr) {
      console.error('[Proof API] Lỗi khi convert proof -> solidity calldata:', solidityErr);
      return NextResponse.json(
        { success: false, error: 'Không thể chuyển đổi chứng chỉ' },
        { status: 500 }
      );
    }

    const { a, b, c, inputs } = parseSolidityCallData(solidityCallDataRaw);

    if (inputs.length !== 3) {
      return NextResponse.json(
        { success: false, error: `Cần 3 tín hiệu đầu ra, nhận được ${inputs.length}` },
        { status: 500 }
      );
    }

    const formattedA = formatArrayField(a);
    const formattedB = formatNestedField(b);
    const formattedC = formatArrayField(c);
    const formattedInputs = inputs.map((item) => formatHexField(item)) as [bigint, bigint, bigint];

    const verifier = getVerifierContract();
    console.log('[Proof API] Calling verifyProof with', {
      a: formattedA.map((v) => v.toString()),
      b: formattedB.map((pair) => pair.map((v) => v.toString())),
      c: formattedC.map((v) => v.toString()),
      publicSignals: formattedInputs.map((v) => v.toString())
    });
    const verified = await verifier.verifyProof(
      formattedA,
      formattedB,
      formattedC,
      formattedInputs
    );
    console.log('[Proof API] Verifier returned', verified);

    return NextResponse.json({
      success: true,
      hasProof: true,
      verified: Boolean(verified),
      timestamp,
      identity_hash: normalizedSignals.meta?.identity_hash ?? null,
      message: Boolean(verified)
        ? 'Chứng chỉ hợp lệ - đã xác thực qua hợp đồng thông minh'
        : 'Chứng chỉ không hợp lệ. Vui lòng tạo lại'
    });

  } catch (error: any) {
    console.error('Lỗi khi lấy chứng chỉ:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Lỗi khi lấy chứng chỉ' },
      { status: 500 }
    );
  }
}

