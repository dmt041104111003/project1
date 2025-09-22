// Wallet signing helpers
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as string;
const PROFILE_MODULE = process.env.NEXT_PUBLIC_PROFILE_MODULE as string;
const DID_MODULE = process.env.NEXT_PUBLIC_DID_MODULE as string;

export async function registerDidOnChain(): Promise<string> {
  if (!(globalThis as any).aptos && !(globalThis as any).window?.aptos) {
    throw new Error('Petra wallet not connected');
  }
  const wallet = (globalThis as any).aptos || (globalThis as any).window.aptos;
  const payload = {
    type: 'entry_function_payload',
    function: `${CONTRACT_ADDRESS}::${DID_MODULE}::register_did`,
    type_arguments: [] as string[],
    arguments: [] as unknown[]
  } as const;
  const tx = await wallet.signAndSubmitTransaction(payload);
  return tx.hash as string;
}

export async function registerProfileOnBlockchain(verificationCid: string, profileCid: string, cvCid: string, avatarCid: string): Promise<string> {
  if (!(globalThis as any).aptos && !(globalThis as any).window?.aptos) {
    throw new Error('Petra wallet not connected');
  }
  const wallet = (globalThis as any).aptos || (globalThis as any).window.aptos;
  const payload = {
    type: 'entry_function_payload',
    function: `${CONTRACT_ADDRESS}::${PROFILE_MODULE}::register_profile`,
    type_arguments: [] as string[],
    arguments: [verificationCid, profileCid, cvCid, avatarCid]
  } as const;
  const tx = await wallet.signAndSubmitTransaction(payload);
  return tx.hash as string;
}

export async function updateProfileAssets(profileCid: string, cvCid: string, avatarCid: string): Promise<string> {
  if (!(globalThis as any).aptos && !(globalThis as any).window?.aptos) {
    throw new Error('Petra wallet not connected');
  }
  const wallet = (globalThis as any).aptos || (globalThis as any).window.aptos;
  const payload = {
    type: 'entry_function_payload',
    function: `${CONTRACT_ADDRESS}::${PROFILE_MODULE}::update_profile_assets`,
    type_arguments: [] as string[],
    arguments: [profileCid, cvCid, avatarCid]
  } as const;
  const tx = await wallet.signAndSubmitTransaction(payload);
  return tx.hash as string;
}

// IPFS helpers
export function cidToUrl(cid: string): string {
  const gatewayBase = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://ipfs.io/ipfs/';
  const clean = cid.startsWith('ipfs://') ? cid.slice(7) : cid;
  return `${gatewayBase.replace(/\/$/, '')}/${clean}`;
}

export async function fetchJsonFromCid<T = unknown>(cid: string): Promise<T | null> {
  try {
    const res = await fetch(cidToUrl(cid), { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (e) {
    console.error('fetchJsonFromCid error', e);
    return null;
  }
}

// Convenience client read: check if profile exists via API route
export async function checkProfileExists(address: string): Promise<boolean> {
  const res = await fetch(`/api/profile/${address}?select=exists`, { cache: 'no-store' });
  if (!res.ok) return false;
  const data = await res.json();
  return !!data.exists;
}


