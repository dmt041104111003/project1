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


