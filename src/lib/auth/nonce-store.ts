declare global {
  var __nonceStore: Map<string, { nonce: string; timestamp: number }> | undefined;
}

const nonceStore = global.__nonceStore || new Map<string, { nonce: string; timestamp: number }>();

if (!global.__nonceStore) {
  global.__nonceStore = nonceStore;
  
  const CLEANUP_INTERVAL = 5 * 60 * 1000;
  setInterval(() => {
    const now = Date.now();
    for (const [address, data] of nonceStore.entries()) {
      if (now - data.timestamp > CLEANUP_INTERVAL) {
        nonceStore.delete(address);
      }
    }
  }, CLEANUP_INTERVAL);
}

export function setNonce(address: string, nonce: string): void {
  const normalizedAddress = address.toLowerCase();
  nonceStore.set(normalizedAddress, {
    nonce,
    timestamp: Date.now(),
  });
  console.log('Nonce set:', {
    address: normalizedAddress,
    nonce,
    storeSize: nonceStore.size,
    allAddresses: Array.from(nonceStore.keys()),
  });
}

export function getNonce(address: string): { nonce: string; timestamp: number } | undefined {
  const normalizedAddress = address.toLowerCase();
  const data = nonceStore.get(normalizedAddress);
  console.log('Nonce get:', {
    address: normalizedAddress,
    found: !!data,
    storeSize: nonceStore.size,
    allAddresses: Array.from(nonceStore.keys()),
  });
  return data;
}

export function deleteNonce(address: string): void {
  nonceStore.delete(address.toLowerCase());
}

