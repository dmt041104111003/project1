import { CONTRACT_ADDRESS } from '@/constants/contracts';

export const APTOS_NODE_URL = process.env.NEXT_PUBLIC_APTOS_NODE_URL || 'https://api.testnet.aptoslabs.com';

const APTOS_API_KEY =
  process.env.NEXT_PUBLIC_APTOS_API_KEY ||
  process.env.APTOS_API_KEY ||
  '';

const withAptosHeaders = (init?: RequestInit): RequestInit => {
  const headers = new Headers(init?.headers);
  if (APTOS_API_KEY) {
    headers.set('Authorization', `Bearer ${APTOS_API_KEY}`);
  }
  return {
    ...init,
    headers,
  };
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Global request queue to serialize API calls and prevent rate limiting
const requestQueue: Array<() => Promise<void>> = [];
let isProcessingQueue = false;
const MIN_DELAY_BETWEEN_REQUESTS = 200; // 200ms between each request

async function processQueue() {
  if (isProcessingQueue || requestQueue.length === 0) return;
  isProcessingQueue = true;
  
  while (requestQueue.length > 0) {
    const task = requestQueue.shift();
    if (task) {
      await task();
      await sleep(MIN_DELAY_BETWEEN_REQUESTS);
    }
  }
  
  isProcessingQueue = false;
}

function enqueueRequest<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    requestQueue.push(async () => {
      try {
        const result = await fn();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
    processQueue();
  });
}

const MAX_RETRY = 3;
const CACHE_TTL = 600_000; 

type CacheEntry<T> = {
  timestamp: number;
  data: T | null;
};

export const resourceCache = new Map<string, CacheEntry<any>>();
export const tableCache = new Map<string, CacheEntry<any>>();
export const eventsCache = new Map<string, CacheEntry<any>>();
export const inflightResourceRequests = new Map<string, Promise<any>>();
export const inflightTableRequests = new Map<string, Promise<any>>();
export const inflightEventsRequests = new Map<string, Promise<any>>();

const aptosFetchInternal = async (input: RequestInfo | URL, init?: RequestInit, attempt = 0): Promise<Response> => {
  const response = await fetch(input, withAptosHeaders(init));
  
  if (response.status === 429 && attempt < MAX_RETRY) {
    const backoff = 2000 * Math.pow(2, attempt);
    console.warn(`[Aptos] Rate limited (429), retrying in ${backoff}ms (attempt ${attempt + 1}/${MAX_RETRY})`);
    await sleep(backoff);
    return aptosFetchInternal(input, init, attempt + 1);
  }
  
  return response;
};

export const aptosFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  return enqueueRequest(() => aptosFetchInternal(input, init));
};

export const contractResource = (path: string) => `${CONTRACT_ADDRESS}::${path}`;

export function normalizeKey(keyType: string, key: any) {
  if (!keyType) return key;
  if (keyType === 'address') return key;
  if (keyType === 'u8') {
    if (typeof key === 'number') return key;
    const num = Number(key);
    return isNaN(num) ? key : num;
  }
  if (keyType === 'u64') return String(key);
  if (keyType.startsWith('u')) return String(key);
  return key;
}

export async function fetchContractResource<T = any>(resourcePath: string): Promise<T | null> {
  const resourceType = contractResource(resourcePath);
  const cacheKey = resourceType;
  const cached = resourceCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  if (inflightResourceRequests.has(cacheKey)) {
    return inflightResourceRequests.get(cacheKey) as Promise<T | null>;
  }

  const promise = (async () => {
    try {
      const res = await aptosFetch(
        `${APTOS_NODE_URL}/v1/accounts/${CONTRACT_ADDRESS}/resource/${resourceType}`
      );
      if (!res.ok) {
        return null;
      }
      const responseText = await res.text();
      if (!responseText || responseText.trim() === '') {
        return null;
      }
      const payload = JSON.parse(responseText);
      const data = payload?.data ?? null;
      resourceCache.set(cacheKey, { timestamp: Date.now(), data });
      return data;
    } catch {
      return null;
    } finally {
      inflightResourceRequests.delete(cacheKey);
    }
  })();

  inflightResourceRequests.set(cacheKey, promise);
  return promise;
}

export async function queryTableItem<T = any>(params: {
  handle: string;
  keyType: string;
  valueType: string;
  key: any;
}): Promise<T | null> {
  const normalizedKey = normalizeKey(params.keyType, params.key);
  const cacheKey = `${params.handle}:${params.keyType}:${params.valueType}:${JSON.stringify(normalizedKey)}`;
  const cached = tableCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  if (inflightTableRequests.has(cacheKey)) {
    return inflightTableRequests.get(cacheKey) as Promise<T | null>;
  }

  const promise = (async () => {
    try {
      const requestBody = {
        key_type: params.keyType,
        value_type: params.valueType,
        key: normalizedKey,
      };
      
      const res = await aptosFetch(`${APTOS_NODE_URL}/v1/tables/${params.handle}/item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      
      if (!res.ok) {
        if (res.status === 404) return null;
        return null;
      }
      const responseText = await res.text();
      if (!responseText || responseText.trim() === '') {
        return null;
      }
      const data = JSON.parse(responseText) ?? null;
      tableCache.set(cacheKey, { timestamp: Date.now(), data });
      return data;
    } catch {
      return null;
    } finally {
      inflightTableRequests.delete(cacheKey);
    }
  })();

  inflightTableRequests.set(cacheKey, promise);
  return promise;
}

export function extractHandle(data: any, path: string[]): string | null {
  if (!data) return null;
  return path.reduce<any>((current, key) => {
    if (current && typeof current === 'object' && key in current) {
      return current[key];
    }
    return null;
  }, data) as string | null;
}

export function clearJobTableCache() {
  const escrowStoreKey = contractResource('escrow::EscrowStore');
  resourceCache.delete(escrowStoreKey);
  tableCache.forEach((_, key) => {
    if (key.includes('escrow::Job')) {
      tableCache.delete(key);
    }
  });
}

export async function checkDisputeWinnerPendingClaim(jobId: number): Promise<{ hasPendingClaim: boolean; winnerIsFreelancer: boolean | null }> {
  try {
    const escrowStore = await fetchContractResource<any>('escrow::EscrowStore');
    if (!escrowStore?.table?.handle) {
      return { hasPendingClaim: false, winnerIsFreelancer: null };
    }

    const job = await queryTableItem<any>({
      handle: escrowStore.table.handle,
      keyType: 'u64',
      valueType: `${CONTRACT_ADDRESS}::escrow::Job`,
      key: jobId,
    });

    if (!job) {
      return { hasPendingClaim: false, winnerIsFreelancer: null };
    }

    const disputeWinner = job.dispute_winner;
    
    if (disputeWinner && disputeWinner.vec && disputeWinner.vec.length > 0) {
      const winnerIsFreelancer = disputeWinner.vec[0] === true || disputeWinner.vec[0] === 'true';
      return { hasPendingClaim: true, winnerIsFreelancer };
    }

    return { hasPendingClaim: false, winnerIsFreelancer: null };
  } catch (error) {
    console.error('[checkDisputeWinnerPendingClaim] Error:', error);
    return { hasPendingClaim: false, winnerIsFreelancer: null };
  }
}

