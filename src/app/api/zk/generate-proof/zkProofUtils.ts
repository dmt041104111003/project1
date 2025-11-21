import { fetchContractResource, queryTableItem } from '@/lib/aptosClient';
import { CONTRACT_ADDRESS } from '@/constants/contracts';

// ==================== Interfaces ====================
export interface CCCDData {
  id_number: string;
  name: string;
  date_of_birth: string;
  gender: string;
  nationality: string;
  date_of_expiry: string;
  face_verified: boolean;
}

export interface InputData {
  dob: number;
  expiry: number;
  id_hash: number;
  name_hash: number;
  today: number;
  min_age: number;
}

export interface SolidityCalldata {
  a: string[];
  b: string[][];
  c: string[];
  publicSignals: string[];
}

// ==================== Helper Functions ====================
export function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export function parseDateToYYYYMMDD(dateStr: string): number {
  let date: Date;
  
  if (dateStr.includes('-')) {
    date = new Date(dateStr);
  } else if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        date = new Date(`${parts[0]}-${parts[1]}-${parts[2]}`);
      } else {
        date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      }
    } else {
      throw new Error(`Invalid date format: ${dateStr}`);
    }
  } else if (dateStr.length === 8 && /^\d+$/.test(dateStr)) {
    return parseInt(dateStr);
  } else {
    date = new Date(dateStr);
  }
  
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateStr}`);
  }
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return parseInt(`${year}${month}${day}`);
}

export function getTodayYYYYMMDD(): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return parseInt(`${year}${month}${day}`);
}

export function encodeJsonToHex(data: any): string {
  const json = typeof data === 'string' ? data : JSON.stringify(data);
  const bytes = new TextEncoder().encode(json);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function decodeVectorU8(vec: any): any {
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
}

export function normalizePublicSignalsPayload(raw: any) {
  if (Array.isArray(raw)) {
    return {
      signals: raw,
      meta: null
    };
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
  throw new Error('Public signals không đúng định dạng.');
}

// ==================== Prepare Input Data ====================
export function prepareInputData(cccdData: CCCDData): InputData {
  const dob = parseDateToYYYYMMDD(cccdData.date_of_birth);
  const expiry = parseDateToYYYYMMDD(cccdData.date_of_expiry);
  const id_hash = simpleHash(cccdData.id_number);
  const name_hash = simpleHash(cccdData.name);
  const today = getTodayYYYYMMDD();
  const min_age = 18;

  return {
    dob,
    expiry,
    id_hash,
    name_hash,
    today,
    min_age
  };
}

// ==================== Duplicate Check ====================
export async function checkDuplicateProof(
  extendedPublicSignals: any,
  publicSignals: any,
  inputData: InputData,
  normalizedRequester: string
): Promise<{ isDuplicate: boolean; matchedAddress: string | null }> {
  try {
    const roleStore = await fetchContractResource('role::RoleStore');
    const proofHashesHandle = roleStore?.proof_hashes?.handle;
    const proofsHandle = roleStore?.proofs?.handle;
    
    if (!proofHashesHandle) {
      console.log('[ZK Proof] Không có proof_hashes table handle, tiếp tục');
      return { isDuplicate: false, matchedAddress: null };
    }

    const keyCandidates = [
      { hex: encodeJsonToHex(extendedPublicSignals), type: 'extended' },
      { hex: encodeJsonToHex(publicSignals), type: 'legacy' },
    ];

    let matchedAddress: string | null = null;
    let matchedType: string | null = null;

    for (const candidate of keyCandidates) {
      console.log(`[ZK Proof] Querying proof_hashes table with ${candidate.type} key...`);
      const data = await queryTableItem({
        handle: proofHashesHandle,
        keyType: 'vector<u8>',
        valueType: 'address',
        key: `0x${candidate.hex}`,
      });
      if (data) {
        matchedAddress = String(data).toLowerCase();
        matchedType = candidate.type;
        break;
      }
    }

    if (matchedAddress && matchedAddress !== normalizedRequester && proofsHandle) {
      if (matchedType !== 'legacy') {
        try {
          const existingProofStruct = await queryTableItem({
            handle: proofsHandle,
            keyType: 'address',
            valueType: `${CONTRACT_ADDRESS}::role::CCCDProof`,
            key: matchedAddress
          });
          if (existingProofStruct?.public_signals) {
            const existingRaw = decodeVectorU8(existingProofStruct.public_signals);
            if (existingRaw) {
              try {
                const normalizedExisting = normalizePublicSignalsPayload(existingRaw);
                const existingIdentity = normalizedExisting.meta?.identity_hash ?? null;
                if (existingIdentity !== null && existingIdentity === inputData.id_hash) {
                  return { isDuplicate: true, matchedAddress };
                }
              } catch {
                console.log('[ZK Proof] Legacy proof của địa chỉ', matchedAddress, 'không có identity hash.');
              }
            }
          }
        } catch (err) {
          console.warn('[ZK Proof] Không thể kiểm tra thông tin proof hiện có:', err);
        }
      }
    }

    return { isDuplicate: false, matchedAddress: null };
  } catch (error: any) {
    console.error('[ZK Proof] Lỗi khi kiểm tra duplicate proof:', error);
    return { isDuplicate: false, matchedAddress: null };
  }
}

