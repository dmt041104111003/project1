import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

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

const uploadToPinata = async (metadata: Record<string, unknown>, fileName: string, type: string, title?: string) => {
  const formData = new FormData();
  formData.append('file', new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' }), fileName);
  formData.append('pinataOptions', JSON.stringify({ cidVersion: 1 }));
  formData.append('pinataMetadata', JSON.stringify({
    name: `${type}-${type === 'job' ? title : 'profile'}-${Date.now()}`,
    keyvalues: { type: `${type}-metadata`, title: type === 'job' ? title : 'profile' }
  }));

  const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${PINATA_JWT}` },
    body: formData
  });

  if (!res.ok) throw new Error(`Pinata upload failed: ${res.statusText}`);
  return res.json();
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, title, description } = body ?? {};

    if (!type) return NextResponse.json({ success: false, error: 'type required' }, { status: 400 });

    let metadata: Record<string, unknown> = { created_at: new Date().toISOString(), version: '1.0.0' };
    let fileName = 'metadata.json';

    if (type === 'job') {
      const { requirements } = body;
      const poster_id_hash = '0x' + randomBytes(32).toString('hex');
      const freelancer_id_hash = '0x' + randomBytes(32).toString('hex');
      metadata = {
        ...metadata,
        type: 'job',
        title,
        description,
        requirements: Array.isArray(requirements) ? requirements : [requirements],
        poster_id_hash,
        freelancer_id_hash,
        applicants: []
      };
      fileName = 'job-metadata.json';
    } else if (type === 'dispute') {
      const { escrow_id, milestone_index, reason, poster_evidence, freelancer_evidence } = body;
      metadata = {
        ...metadata,
        type: 'dispute',
        escrow_id,
        milestone_index,
        reason,
        poster_evidence: poster_evidence ?? '',
        freelancer_evidence: freelancer_evidence ?? ''
      };
      fileName = 'dispute-evidence.json';
    } else if (type === 'apply') {
      const { job_cid, freelancer_address } = body;
      if (!job_cid || !freelancer_address) {
        return NextResponse.json({ success: false, error: 'job_cid and freelancer_address required' }, { status: 400 });
      }
      const gateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs';
      const res = await fetch(`${gateway}/${job_cid}`);
      if (!res.ok) return NextResponse.json({ success: false, error: 'Invalid job cid' }, { status: 400 });
      const jobMeta = await res.json();
      const apply_id_hash = '0x' + randomBytes(32).toString('hex');
      const applicants = Array.isArray(jobMeta?.applicants) ? jobMeta.applicants : [];
      applicants.push({ freelancer_address, freelancer_id_hash: apply_id_hash, applied_at: new Date().toISOString(), status: 'pending' });
      metadata = { ...jobMeta, applicants };
      fileName = 'job-metadata.json';
      const result = await uploadToPinata(metadata, fileName, 'job', jobMeta?.title || 'job');
      const encCid = await encryptCid(result.IpfsHash);
      return NextResponse.json({ success: true, ipfsHash: result.IpfsHash, encCid: encCid ?? null, ipfsUrl: `${IPFS_GATEWAY}/${result.IpfsHash}`, freelancer_id_hash: apply_id_hash, metadata });
    } else if (type === 'finalize') {
      const { job_cid, freelancer_id_hash } = body;
      if (!job_cid || !freelancer_id_hash) {
        return NextResponse.json({ success: false, error: 'job_cid and freelancer_id_hash required' }, { status: 400 });
      }
      const gateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs';
      const res = await fetch(`${gateway}/${job_cid}`);
      if (!res.ok) return NextResponse.json({ success: false, error: 'Invalid job cid' }, { status: 400 });
      const jobMeta = await res.json();
      const applicants = Array.isArray(jobMeta?.applicants) ? jobMeta.applicants : [];
      const chosen = applicants.find((a: any) => (a?.freelancer_id_hash || '').toLowerCase() === (freelancer_id_hash as string).toLowerCase());
      const accepted = chosen ? { ...chosen, status: 'accepted' } : { freelancer_address: '', freelancer_id_hash, applied_at: new Date().toISOString(), status: 'accepted' };
      metadata = { ...jobMeta, applicants: [accepted], freelancer_id_hash: freelancer_id_hash };
      fileName = 'job-metadata.json';
      const result = await uploadToPinata(metadata, fileName, 'job', jobMeta?.title || 'job');
      const encCid = await encryptCid(result.IpfsHash);
      return NextResponse.json({ success: true, ipfsHash: result.IpfsHash, encCid: encCid ?? null, ipfsUrl: `${IPFS_GATEWAY}/${result.IpfsHash}`, metadata });
    } else if (type === 'profile') {
      const { skills, about } = body;
      metadata = { ...metadata, type: 'profile', skills: skills || '', about: about || '' };
      fileName = 'profile-metadata.json';
    } else {
      return NextResponse.json({ success: false, error: 'invalid type' }, { status: 400 });
    }

    const result = await uploadToPinata(metadata, fileName, type, title);
    const encCid = await encryptCid(result.IpfsHash);
    return NextResponse.json({ success: true, ipfsHash: result.IpfsHash, encCid: encCid ?? null, ipfsUrl: `${IPFS_GATEWAY}/${result.IpfsHash}`, metadata, type });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: (error as Error).message || 'upload failed' }, { status: 500 });
  }
}