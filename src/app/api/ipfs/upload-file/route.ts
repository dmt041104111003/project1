import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/helpers';

const PINATA_JWT = process.env.PINATA_JWT;
const IPFS_GATEWAY = process.env.NEXT_PUBLIC_IPFS_GATEWAY;

async function getAesKey(): Promise<CryptoKey | null> {
  const secret = process.env.CID_SECRET_B64;
  if (!secret) return null;
  try {
    const raw = Buffer.from(secret, 'base64');
    return await crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt']);
  } catch {
    return null;
  }
}

async function encryptCid(cid: string): Promise<string | null> {
  const key = await getAesKey();
  if (!key) return null;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(cid);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data));
  const ivB64 = Buffer.from(iv).toString('base64');
  const ctB64 = Buffer.from(ct).toString('base64');
  return `enc:${ivB64}:${ctB64}`;
}

export async function POST(request: NextRequest) {
  return requireAuth(request, async (req, user) => {
    try {
      const formData = await req.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string || 'milestone_evidence';

    if (!file) {
      return NextResponse.json({ success: false, error: 'Không có file được cung cấp' }, { status: 400 });
    }

    const pinataFormData = new FormData();
    pinataFormData.append('file', file);
    pinataFormData.append('pinataOptions', JSON.stringify({ cidVersion: 1 }));
    pinataFormData.append('pinataMetadata', JSON.stringify({
      name: `${type}-${file.name}-${Date.now()}`,
      keyvalues: { type, filename: file.name }
    }));

    const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${PINATA_JWT}` },
      body: pinataFormData
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => res.statusText);
      throw new Error(`Pinata upload failed: ${res.status} ${errorText}`);
    }

    const pinataData = await res.json();
    const ipfsHash = pinataData.IpfsHash;
    
    if (!ipfsHash) {
      throw new Error('Pinata không trả về IPFS hash');
    }

    const encCid = await encryptCid(ipfsHash);

    return NextResponse.json({
      success: true,
      ipfsHash,
      encCid: encCid ?? ipfsHash,
      ipfsUrl: `${IPFS_GATEWAY}/${ipfsHash}`,
      filename: file.name,
      size: file.size,
      type: file.type
      });
    } catch (error: unknown) {
      return NextResponse.json(
        { success: false, error: (error as Error).message || 'Tải lên thất bại' },
        { status: 500 }
      );
    }
  });
}

