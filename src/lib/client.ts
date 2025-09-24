// Wallet signing helpers
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as string;
const PROFILE_MODULE = process.env.NEXT_PUBLIC_PROFILE_MODULE as string;
const DID_MODULE = process.env.NEXT_PUBLIC_DID_MODULE as string;

type EntryFunctionPayload = {
  type: 'entry_function_payload';
  function: string;
  type_arguments: string[];
  arguments: unknown[];
};

type AptosWallet = {
  signAndSubmitTransaction: (
    payload: EntryFunctionPayload
  ) => Promise<{ hash: string }>;
};

function getAptosWallet(): AptosWallet {
  const g = globalThis as unknown as {
    aptos?: AptosWallet;
    window?: { aptos?: AptosWallet };
  };
  const wallet = g.aptos ?? g.window?.aptos;
  if (!wallet) {
    throw new Error('Petra wallet not connected');
  }
  return wallet;
}

export async function registerDidOnChain(): Promise<string> {
  const wallet = getAptosWallet();
  const payload: EntryFunctionPayload = {
    type: 'entry_function_payload',
    function: `${CONTRACT_ADDRESS}::${DID_MODULE}::register_did`,
    type_arguments: [],
    arguments: []
  };
  const tx = await wallet.signAndSubmitTransaction(payload);
  return tx.hash;
}

export async function registerProfileOnBlockchain(
  verificationCid: string,
  profileCid: string,
  cvCid: string,
  avatarCid: string
): Promise<string> {
  const wallet = getAptosWallet();
  const payload: EntryFunctionPayload = {
    type: 'entry_function_payload',
    function: `${CONTRACT_ADDRESS}::${PROFILE_MODULE}::register_profile`,
    type_arguments: [],
    arguments: [verificationCid, profileCid, cvCid, avatarCid]
  };
  const tx = await wallet.signAndSubmitTransaction(payload);
  return tx.hash;
}

export async function updateProfileAssets(
  profileCid: string,
  cvCid: string,
  avatarCid: string
): Promise<string> {
  const wallet = getAptosWallet();
  const payload: EntryFunctionPayload = {
    type: 'entry_function_payload',
    function: `${CONTRACT_ADDRESS}::${PROFILE_MODULE}::update_profile_assets`,
    type_arguments: [],
    arguments: [profileCid, cvCid, avatarCid]
  };
  const tx = await wallet.signAndSubmitTransaction(payload);
  return tx.hash;
}


const DEFAULT_GATEWAYS = [
  typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_IPFS_GATEWAY : undefined,
  'https://cloudflare-ipfs.com/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://gateway.pinata.cloud/ipfs/'
].filter(Boolean) as string[];

function normalizeCid(cid: string): string {
  return cid.startsWith('ipfs://') ? cid.slice(7) : cid;
}

export function cidToUrl(cid: string, gateway?: string): string {
  const base = (gateway || DEFAULT_GATEWAYS[0] || 'https://ipfs.io/ipfs/').replace(/\/$/, '');
  return `${base}/${normalizeCid(cid)}`;
}

const cidCache = new Map<string, { ts: number; data: unknown }>();
const CID_TTL_MS = 5 * 60 * 1000;

async function fetchWithTimeout(resource: string, ms: number, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(resource, { ...(init || {}), signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

export async function fetchJsonFromCid<T = unknown>(cid: string): Promise<T | null> {
  const key = normalizeCid(cid);
  const now = Date.now();
  const cached = cidCache.get(key);
  if (cached && now - cached.ts < CID_TTL_MS) {
    return cached.data as T;
  }

  const gateways = DEFAULT_GATEWAYS.length ? DEFAULT_GATEWAYS : ['https://ipfs.io/ipfs/'];
  for (const gw of gateways) {
    try {
      const url = cidToUrl(key, gw);
      const res = await fetchWithTimeout(url, 7000, { cache: 'force-cache' });
      if (!res.ok) continue;
      const data = (await res.json()) as T;
      cidCache.set(key, { ts: now, data });
      return data;
    } catch (e) {
      continue;
    }
  }
  return null;
}

export async function checkProfileExists(address: string): Promise<boolean> {
  const res = await fetch(`/api/profile/${address}?select=exists`, { cache: 'no-store' });
  if (!res.ok) return false;
  const data = await res.json();
  return !!data.exists;
}


