import { fetchContractResource, queryTableItem } from '@/lib/aptosClient';

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

export function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export function parseDateToYYYYMMDD(dateStr: string): number {
  if (dateStr.length === 8 && /^\d+$/.test(dateStr)) {
    return parseInt(dateStr);
  }

  let date: Date;
  
  if (dateStr.includes('-')) {
    date = new Date(dateStr);
  } else if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length !== 3) {
      throw new Error(`Invalid date format: ${dateStr}`);
    }
    const isYearFirst = parts[0].length === 4;
    date = isYearFirst 
      ? new Date(`${parts[0]}-${parts[1]}-${parts[2]}`)
      : new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
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
          bytes.push(parseInt(hexString.substring(i, i + 2), 16));
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
  
  throw new Error('Public signals không đúng định dạng.');
}

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

// ============ BYPASS MODE FOR TESTING ============
const BYPASS_DUPLICATE_CHECK = true;
// =================================================

export async function checkDuplicateProof(
  extendedPublicSignals: any,
  publicSignals: any,
  inputData: InputData,
  normalizedRequester: string
): Promise<{ isDuplicate: boolean; matchedAddress: string | null }> {
  // ========== BYPASS MODE ==========
  if (BYPASS_DUPLICATE_CHECK) {
    console.log('[ZK Proof] ⚠️  BYPASS MODE: Bỏ qua kiểm tra duplicate!');
    return { isDuplicate: false, matchedAddress: null };
  }
  // =================================
  
  try {
    const roleStore = await fetchContractResource('role::RoleStore');
    const identityHashesHandle = roleStore?.identity_hashes?.handle;
    
    if (!identityHashesHandle) {
      console.log('[ZK Proof] Không có identity_hashes table handle, tiếp tục');
      return { isDuplicate: false, matchedAddress: null };
    }

    console.log(`[ZK Proof] Querying identity_hashes table với identity_hash: ${inputData.id_hash}...`);
    const matchedAddress = await queryTableItem({
      handle: identityHashesHandle,
      keyType: 'u64',
      valueType: 'address',
      key: inputData.id_hash,
    });

    if (matchedAddress) {
      const normalizedMatched = String(matchedAddress).toLowerCase();
      if (normalizedMatched !== normalizedRequester) {
        console.log(`[ZK Proof] Phát hiện duplicate: identity_hash ${inputData.id_hash} đã được dùng bởi ${normalizedMatched}`);
        return { isDuplicate: true, matchedAddress: normalizedMatched };
      }
    }

    return { isDuplicate: false, matchedAddress: null };
  } catch (error: any) {
    console.error('[ZK Proof] Lỗi khi kiểm tra duplicate proof:', error);
    return { isDuplicate: false, matchedAddress: null };
  }
}

