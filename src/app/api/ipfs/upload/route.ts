import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { requireAuth } from '@/app/api/auth/_lib/helpers';
import { APTOS_NODE_URL, CONTRACT_ADDRESS, ROLE_KIND } from '@/constants/contracts';
import { getTableHandle as getEscrowTableHandle, queryJobFromTable, parseOptionAddress } from '@/app/api/job/utils';

const PINATA_JWT = process.env.PINATA_JWT;
const IPFS_GATEWAY = process.env.NEXT_PUBLIC_IPFS_GATEWAY;
const ALLOWED_METADATA_TYPES = new Set(['job', 'dispute', 'apply', 'finalize', 'profile']);
const ALLOWED_FILE_TYPES = new Set(['milestone_evidence', 'dispute_evidence', 'profile_attachment']);
const MAX_TEXT_LENGTH = 2000;
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
const APTOS_API_KEY = process.env.APTOS_API_KEY || '';

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

const uploadFileToPinata = async (file: File, type: string) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('pinataOptions', JSON.stringify({ cidVersion: 1 }));
  formData.append('pinataMetadata', JSON.stringify({
    name: `${type}-${file.name}-${Date.now()}`,
    keyvalues: { type, filename: file.name }
  }));

  const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${PINATA_JWT}` },
    body: formData
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => res.statusText);
    throw new Error(`Pinata upload failed: ${res.status} ${errorText}`);
  }

  const data = await res.json();
  const ipfsHash = data?.IpfsHash;
  if (!ipfsHash) {
    throw new Error('Pinata không trả về IPFS hash');
  }

  return ipfsHash;
};

const sanitizeText = (value: unknown, fallback = '', max = MAX_TEXT_LENGTH): string => {
  if (typeof value !== 'string') return fallback;
  return value.trim().slice(0, max);
};

const normalizeStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeText(item, '', 256))
      .filter((item) => item.length > 0);
  }
  const single = sanitizeText(value, '', 256);
  return single ? [single] : [];
};

const requireStringField = (value: unknown, field: string, max = MAX_TEXT_LENGTH): string => {
  const sanitized = sanitizeText(value, '', max);
  if (!sanitized) {
    throw new Error(`${field} là bắt buộc`);
  }
  return sanitized;
};

const fetchJobMetadata = async (jobCid: string) => {
  const gateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs';
  const res = await fetch(`${gateway}/${jobCid}`);
  if (!res.ok) {
    throw new Error('CID công việc không hợp lệ');
  }
  return res.json();
};

const ROLE_USERS_HANDLE_CACHE: { handle: string | null; fetchedAt: number } = {
  handle: null,
  fetchedAt: 0,
};

const ROLE_CACHE_TTL = 5 * 60 * 1000;

const normalizeAddress = (addr?: string | null): string => {
  if (!addr) return '';
  let value = addr.toLowerCase();
  if (!value.startsWith('0x')) {
    value = `0x${value}`;
  }
  return value;
};

const queryRoleTableItem = async (
  handle: string,
  key: string | number,
  keyType: string,
  valueType: string,
) => {
  try {
    const formattedKey =
      keyType === 'u8' || keyType === 'u64' || keyType.startsWith('u') ? Number(key) : key;
    const res = await fetch(`${APTOS_NODE_URL}/v1/tables/${handle}/item`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': APTOS_API_KEY,
        Authorization: `Bearer ${APTOS_API_KEY}`,
      },
      body: JSON.stringify({
        key_type: keyType,
        value_type: valueType,
        key: formattedKey,
      }),
    });
    if (!res.ok) {
      await res.text().catch(() => '');
      return null;
    }
    return res.json();
  } catch {
    return null;
  }
};

const getRoleUsersHandle = async (): Promise<string | null> => {
  const now = Date.now();
  if (ROLE_USERS_HANDLE_CACHE.handle && now - ROLE_USERS_HANDLE_CACHE.fetchedAt < ROLE_CACHE_TTL) {
    return ROLE_USERS_HANDLE_CACHE.handle;
  }

  try {
    const resourceType = `${CONTRACT_ADDRESS}::role::RoleStore`;
    const res = await fetch(
      `${APTOS_NODE_URL}/v1/accounts/${CONTRACT_ADDRESS}/resource/${resourceType}`,
      {
        headers: { 'x-api-key': APTOS_API_KEY, Authorization: `Bearer ${APTOS_API_KEY}` },
      },
    );
    if (!res.ok) {
      await res.text().catch(() => '');
      ROLE_USERS_HANDLE_CACHE.handle = null;
      ROLE_USERS_HANDLE_CACHE.fetchedAt = now;
      return null;
    }
    const data = await res.json();
    const handle = data?.data?.users?.handle || null;
    ROLE_USERS_HANDLE_CACHE.handle = handle;
    ROLE_USERS_HANDLE_CACHE.fetchedAt = now;
    return handle;
  } catch {
    ROLE_USERS_HANDLE_CACHE.handle = null;
    ROLE_USERS_HANDLE_CACHE.fetchedAt = now;
    return null;
  }
};

const hasRole = async (address: string, roleKind: number): Promise<boolean> => {
  const usersHandle = await getRoleUsersHandle();
  if (!usersHandle) return false;

  const userRoles = await queryRoleTableItem(
    usersHandle,
    address,
    'address',
    `${CONTRACT_ADDRESS}::role::UserRoles`,
  );
  if (!userRoles?.roles?.handle) return false;

  const roleValue = await queryRoleTableItem(userRoles.roles.handle, roleKind, 'u8', 'bool');
  return roleValue === true;
};

const fetchEscrowJob = async (jobId: number) => {
  const table = await getEscrowTableHandle();
  if (!table?.handle) return null;
  return queryJobFromTable(table.handle, jobId);
};

export async function POST(request: NextRequest) {
  return requireAuth(request, async (req, user) => {
    try {
      if (!PINATA_JWT || !IPFS_GATEWAY) {
        return NextResponse.json({ success: false, error: 'Thiếu cấu hình IPFS' }, { status: 500 });
      }

      const contentType = req.headers.get('content-type') || '';
      if (contentType.includes('multipart/form-data')) {
        const formData = await req.formData();
        return handleFileUpload(formData, user.address);
      }

      let body: any;
      try {
        body = await req.json();
      } catch {
        return NextResponse.json({ success: false, error: 'Payload không hợp lệ' }, { status: 400 });
      }

      const { type } = body ?? {};
      if (!ALLOWED_METADATA_TYPES.has(type)) {
        return NextResponse.json({ success: false, error: 'Loại metadata không hợp lệ' }, { status: 400 });
      }

      const roleCheckCache = new Map<number, boolean>();
      const ensureRole = async (roleKind: number) => {
        if (!roleCheckCache.has(roleKind)) {
          roleCheckCache.set(roleKind, await hasRole(user.address, roleKind));
        }
        return roleCheckCache.get(roleKind)!;
      };
      const callerAddress = normalizeAddress(user.address);

      let metadata: Record<string, unknown> = { created_at: new Date().toISOString(), version: '1.0.0' };
    let fileName = 'metadata.json';
      let responseExtras: Record<string, unknown> = {};

    if (type === 'job') {
        if (!(await ensureRole(ROLE_KIND.POSTER))) {
          return NextResponse.json(
            { success: false, error: 'Bạn cần role Poster để đăng metadata job' },
            { status: 403 },
          );
        }
        const title = requireStringField(body?.title, 'title', 200);
        const description = requireStringField(body?.description, 'description');
        const requirements = normalizeStringArray(body?.requirements);
        if (requirements.length === 0) {
          return NextResponse.json({ success: false, error: 'requirements phải có ít nhất 1 mục' }, { status: 400 });
        }

        const poster_id_hash = '0x' + randomBytes(32).toString('hex');
        const freelancer_id_hash = '0x' + randomBytes(32).toString('hex');
      metadata = {
        ...metadata,
        type: 'job',
        title,
        description,
          requirements,
        poster_id_hash,
        freelancer_id_hash,
        applicants: []
      };
      fileName = 'job-metadata.json';
    } else if (type === 'dispute') {
        const escrow_id = requireStringField(body?.escrow_id, 'escrow_id', 128);
        const milestone_index = Number(body?.milestone_index);
        if (!Number.isFinite(milestone_index)) {
          return NextResponse.json({ success: false, error: 'milestone_index không hợp lệ' }, { status: 400 });
        }
        const reason = requireStringField(body?.reason, 'reason');
      metadata = {
        ...metadata,
        type: 'dispute',
        escrow_id,
        milestone_index,
        reason,
          poster_evidence: sanitizeText(body?.poster_evidence),
          freelancer_evidence: sanitizeText(body?.freelancer_evidence)
      };
      fileName = 'dispute-evidence.json';
      } else if (type === 'apply') {
        const job_cid = requireStringField(body?.job_cid, 'job_cid', 200);
        const freelancer_address_input = requireStringField(
          body?.freelancer_address,
          'freelancer_address',
          128,
        );
        const freelancer_address = normalizeAddress(freelancer_address_input);
        if (callerAddress !== freelancer_address) {
          return NextResponse.json(
            { success: false, error: 'Bạn chỉ có thể apply bằng chính ví của mình' },
            { status: 403 },
          );
        }
        if (!(await ensureRole(ROLE_KIND.FREELANCER))) {
          return NextResponse.json(
            { success: false, error: 'Bạn cần role Freelancer để apply job' },
            { status: 403 },
          );
        }

        let jobMeta: any;
        try {
          jobMeta = await fetchJobMetadata(job_cid);
        } catch (err: any) {
          return NextResponse.json({ success: false, error: err?.message || 'CID công việc không hợp lệ' }, { status: 400 });
        }
        const apply_id_hash = '0x' + randomBytes(32).toString('hex');
        const applicants = Array.isArray(jobMeta?.applicants) ? jobMeta.applicants : [];
        applicants.push({
          freelancer_address,
          freelancer_id_hash: apply_id_hash,
          applied_at: new Date().toISOString(),
          status: 'pending'
        });
      metadata = { ...jobMeta, applicants };
      fileName = 'job-metadata.json';
        responseExtras.freelancer_id_hash = apply_id_hash;

        const result = await uploadToPinata(metadata, fileName, 'job', jobMeta?.title || 'job');
        const encCid = await encryptCid(result.IpfsHash);
        return NextResponse.json({
          success: true,
          ipfsHash: result.IpfsHash,
          encCid: encCid ?? null,
          ipfsUrl: `${IPFS_GATEWAY}/${result.IpfsHash}`,
          ...responseExtras,
          metadata
        });
      } else if (type === 'finalize') {
        if (!(await ensureRole(ROLE_KIND.POSTER))) {
          return NextResponse.json(
            { success: false, error: 'Bạn cần role Poster để finalize job' },
            { status: 403 },
          );
        }
        const job_cid = requireStringField(body?.job_cid, 'job_cid', 200);
        const freelancer_id_hash = requireStringField(body?.freelancer_id_hash, 'freelancer_id_hash', 128);

        let jobMeta: any;
        try {
          jobMeta = await fetchJobMetadata(job_cid);
        } catch (err: any) {
          return NextResponse.json({ success: false, error: err?.message || 'CID công việc không hợp lệ' }, { status: 400 });
        }
        const applicants = Array.isArray(jobMeta?.applicants) ? jobMeta.applicants : [];
        const chosen = applicants.find(
          (a: any) => (a?.freelancer_id_hash || '').toLowerCase() === freelancer_id_hash.toLowerCase()
        );
        const accepted = chosen
          ? { ...chosen, status: 'accepted' }
          : { freelancer_address: '', freelancer_id_hash, applied_at: new Date().toISOString(), status: 'accepted' };
        metadata = { ...jobMeta, applicants: [accepted], freelancer_id_hash };
      fileName = 'job-metadata.json';

        const result = await uploadToPinata(metadata, fileName, 'job', jobMeta?.title || 'job');
        const encCid = await encryptCid(result.IpfsHash);
        return NextResponse.json({
          success: true,
          ipfsHash: result.IpfsHash,
          encCid: encCid ?? null,
          ipfsUrl: `${IPFS_GATEWAY}/${result.IpfsHash}`,
          metadata
        });
      } else if (type === 'profile') {
        const hasPosterRole = await ensureRole(ROLE_KIND.POSTER);
        const hasFreelancerRole = hasPosterRole ? true : await ensureRole(ROLE_KIND.FREELANCER);
        if (!hasPosterRole && !hasFreelancerRole) {
          return NextResponse.json(
            { success: false, error: 'Bạn cần role Poster hoặc Freelancer để cập nhật profile' },
            { status: 403 },
          );
        }
        const skills = normalizeStringArray(body?.skills);
        const about = sanitizeText(body?.about);
        metadata = { ...metadata, type: 'profile', skills, about };
      fileName = 'profile-metadata.json';
      }

      const safeTitle =
        type === 'job' && typeof (metadata as Record<string, unknown>)['title'] === 'string'
          ? (metadata as Record<string, unknown>)['title'] as string
          : undefined;
      const result = await uploadToPinata(metadata, fileName, type, safeTitle);
    const encCid = await encryptCid(result.IpfsHash);
      return NextResponse.json({
        success: true,
        ipfsHash: result.IpfsHash,
        encCid: encCid ?? null,
        ipfsUrl: `${IPFS_GATEWAY}/${result.IpfsHash}`,
        metadata,
        type,
        ...responseExtras
      });
    } catch (error: unknown) {
      return NextResponse.json({ success: false, error: (error as Error).message || 'Tải lên thất bại' }, { status: 500 });
    }
  });
}

async function handleFileUpload(formData: FormData, userAddress: string) {
  const file = formData.get('file') as File;
  const typeInput = (formData.get('type') as string) || 'milestone_evidence';
  const type = ALLOWED_FILE_TYPES.has(typeInput) ? typeInput : null;
  let jobId: number | null = null;
  const normalizedUser = normalizeAddress(userAddress);

  if (!file) {
    return NextResponse.json({ success: false, error: 'Không có file được cung cấp' }, { status: 400 });
  }

  if (!type) {
    return NextResponse.json({ success: false, error: 'Loại file không hợp lệ' }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ success: false, error: 'File vượt quá giới hạn 15MB' }, { status: 400 });
  }

  let jobData: any = null;
  if (type === 'milestone_evidence' || type === 'dispute_evidence') {
    const jobIdRaw = formData.get('jobId');
    if (!jobIdRaw) {
      return NextResponse.json({ success: false, error: 'jobId là bắt buộc khi upload file cho job' }, { status: 400 });
    }
    jobId = Number(jobIdRaw);
    if (!Number.isFinite(jobId) || jobId <= 0) {
      return NextResponse.json({ success: false, error: 'jobId không hợp lệ' }, { status: 400 });
    }
    jobData = await fetchEscrowJob(jobId);
    if (!jobData) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy job tương ứng' }, { status: 404 });
    }
    const posterAddr = normalizeAddress(typeof jobData.poster === 'string' ? jobData.poster : '');
    const freelancerAddr = normalizeAddress(parseOptionAddress(jobData.freelancer));

    if (type === 'milestone_evidence') {
      if (!freelancerAddr || normalizedUser !== freelancerAddr) {
        return NextResponse.json(
          { success: false, error: 'Chỉ freelancer của job mới được upload bằng chứng milestone' },
          { status: 403 },
        );
      }
    }
    if (type === 'dispute_evidence') {
      if (normalizedUser !== freelancerAddr && normalizedUser !== posterAddr) {
        return NextResponse.json(
          { success: false, error: 'Chỉ poster hoặc freelancer của job mới được upload bằng chứng tranh chấp' },
          { status: 403 },
        );
      }
    }
  }

  const ipfsHash = await uploadFileToPinata(file, type);
  const encCid = await encryptCid(ipfsHash);

  return NextResponse.json({
    success: true,
    ipfsHash,
    encCid: encCid ?? ipfsHash,
    ipfsUrl: `${IPFS_GATEWAY}/${ipfsHash}`,
    filename: file.name,
    size: file.size,
    type: file.type || type
  });
}