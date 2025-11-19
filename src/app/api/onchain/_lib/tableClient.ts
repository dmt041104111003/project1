import { APTOS_NODE_URL, CONTRACT_ADDRESS } from '@/constants/contracts';

const APTOS_API_KEY = process.env.APTOS_API_KEY || '';

const AUTH_HEADERS: Record<string, string> = {};
if (APTOS_API_KEY) {
  AUTH_HEADERS['x-api-key'] = APTOS_API_KEY;
  AUTH_HEADERS.Authorization = `Bearer ${APTOS_API_KEY}`;
}

const JSON_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  ...AUTH_HEADERS,
};

const contractResource = (path: string) => `${CONTRACT_ADDRESS}::${path}`;

export async function fetchContractResourceData<T = any>(resourcePath: string): Promise<T | null> {
  try {
    const resourceType = contractResource(resourcePath);
    const res = await fetch(
      `${APTOS_NODE_URL}/v1/accounts/${CONTRACT_ADDRESS}/resource/${resourceType}`,
      {
        headers: AUTH_HEADERS,
      }
    );
    if (!res.ok) {
      await res.text().catch(() => null);
      return null;
    }
    const payload = await res.json().catch(() => null);
    return payload?.data ?? null;
  } catch {
    return null;
  }
}

export function extractHandle(data: any, path: Array<string>): string | null {
  if (!data) return null;
  return path.reduce<any>((current, key) => {
    if (current && typeof current === 'object' && key in current) {
      return current[key];
    }
    return null;
  }, data) as string | null;
}

const normalizeKey = (keyType: string, key: any) => {
  if (!keyType) return key;
  if (keyType === 'address') return key;
  // For u8, convert to number (works with number based on role query success)
  if (keyType === 'u8') {
    if (typeof key === 'number') {
      return key;
    }
    const num = Number(key);
    return isNaN(num) ? key : num;
  }
  // For u64 and other larger numeric types (u16, u32, u128, u256), Aptos API requires string format
  // Based on docs/ONCHAIN_RESOURCES.md, u64 keys should be strings like "1"
  if (keyType === 'u64') {
    return String(key);
  }
  // For other u* types, also use string format
  if (keyType.startsWith('u')) {
    return String(key);
  }
  return key;
};

export async function queryTableItem<T = any>(params: {
  handle: string;
  keyType: string;
  valueType: string;
  key: any;
}): Promise<T | null> {
  try {
    const normalizedKey = normalizeKey(params.keyType, params.key);
    const requestBody = {
      key_type: params.keyType,
      value_type: params.valueType,
      key: normalizedKey,
    };
    
    const res = await fetch(`${APTOS_NODE_URL}/v1/tables/${params.handle}/item`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(requestBody),
    });
    
    if (!res.ok) {
      if (res.status === 404) {
        return null;
      }
      const errorText = await res.text().catch(() => res.statusText);
      console.error(`[queryTableItem] Error ${res.status}:`, {
        handle: params.handle,
        keyType: params.keyType,
        valueType: params.valueType,
        key: params.key,
        normalizedKey,
        requestBody,
        error: errorText
      });
      return null;
    }
    const data = await res.json().catch(() => null);
    return data ?? null;
  } catch (error) {
    console.error('[queryTableItem] Exception:', {
      handle: params.handle,
      keyType: params.keyType,
      key: params.key,
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

export async function fetchContractTableHandle(
  resourcePath: string,
  path: Array<string>
): Promise<string | null> {
  const data = await fetchContractResourceData(resourcePath);
  if (!data) return null;
  const handle = extractHandle(data, path);
  return typeof handle === 'string' ? handle : null;
}

export { contractResource };

