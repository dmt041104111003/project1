 //AES-GCM 


async function getAesKey(): Promise<CryptoKey | null> {
  const secret = process.env.CID_SECRET_B64;
  if (!secret) return null;
  try {
    const raw = Buffer.from(secret, 'base64');
    return await crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  } catch {
    return null;
  }
}

export async function encryptCid(cid: string): Promise<string | null> {
  const key = await getAesKey();
  if (!key) return null;
  
  try {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = new TextEncoder().encode(cid);
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data));
    
    const ivB64 = Buffer.from(iv).toString('base64');
    const ctB64 = Buffer.from(ct).toString('base64');
    return `enc:${ivB64}:${ctB64}`;
  } catch (error) {
    console.error('[Encryption] Lỗi khi mã hóa CID:', error);
    return null;
  }
}

export async function decryptCid(encryptedCid: string | null): Promise<string | null> {
  if (!encryptedCid || !encryptedCid.startsWith('enc:')) {
    return encryptedCid;
  }

  const key = await getAesKey();
  if (!key) return encryptedCid;

  try {
    const parts = encryptedCid.split(':');
    if (parts.length !== 3 || parts[0] !== 'enc') {
      return encryptedCid; 
    }

    const iv = Buffer.from(parts[1], 'base64');
    const ct = Buffer.from(parts[2], 'base64');

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      key,
      new Uint8Array(ct)
    );

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('[Encryption] Lỗi khi giải mã CID:', error);
    return encryptedCid;
  }
}


export function isEncryptedCid(cid: string | null): boolean {
  return cid ? cid.startsWith('enc:') : false;
}

