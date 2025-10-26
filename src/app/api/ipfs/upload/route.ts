import { NextRequest, NextResponse } from 'next/server';
import { DID, JOB, APTOS_NODE_URL } from '@/constants/contracts';

const PINATA_JWT = process.env.PINATA_JWT;
const IPFS_GATEWAY = process.env.NEXT_PUBLIC_IPFS_GATEWAY;

const callView = async (fn: string, args: any[]) => {
  const res = await fetch(`${APTOS_NODE_URL}/v1/view`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ function: fn, type_arguments: [], arguments: args })
  });
  if (!res.ok) throw new Error(`View failed: ${res.statusText}`);
  return res.json();
};

const getRoles = async (commitment: string): Promise<number[]> => {
  try {
    const result = await callView(DID.GET_ROLE_TYPES_BY_COMMITMENT, [commitment]);
    return result.flatMap((item: any) => 
      typeof item === 'number' ? [item] :
      typeof item === 'string' && item.startsWith('0x') && item.length > 2 ? 
        Array.from({ length: item.slice(2).length / 2 }, (_, i) => 
          parseInt(item.slice(2).slice(i * 2, i * 2 + 2), 16)) : []
    );
  } catch { return []; }
};

const uploadToPinata = async (metadata: any, fileName: string, type: string, title?: string) => {
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
    const { title, description, requirements, user_commitment, type = 'job' } = body;
    
    if (type === 'job') {
      if (!user_commitment) return NextResponse.json({ success: false, error: 'User commitment required' }, { status: 400 });
      
      const hexCommitment = '0x' + Buffer.from(user_commitment, 'utf8').toString('hex');
      const userRoles = await getRoles(hexCommitment);
      
      if (userRoles.length === 0) return NextResponse.json({ success: false, error: 'No DID profile found' }, { status: 403 });
      if (!userRoles.includes(2)) return NextResponse.json({ success: false, error: 'Poster role required' }, { status: 403 });
      
      body.userRoles = userRoles;
    } else if (type === 'profile') {
      const { roleTypes } = body;
      if (!roleTypes?.length) return NextResponse.json({ success: false, error: 'Role types required' }, { status: 400 });
      body.userRoles = roleTypes;
    }
    
    let metadata: any, fileName: string;
    
    if (type === 'job') {
      metadata = { title, description, requirements: Array.isArray(requirements) ? requirements : [requirements], created_at: new Date().toISOString(), version: "1.0.0", type: "job" };
      fileName = 'job-metadata.json';
    } else if (type === 'profile') {
      const { skills, about, experience, roleTypes, freelancerAbout, posterAbout } = body;
      metadata = { created_at: new Date().toISOString(), version: "1.0.0", type: "profile" };
      
      if (roleTypes?.includes(1)) Object.assign(metadata, { skills: skills || '', freelancerAbout: freelancerAbout || about || '', experience: experience || '' });
      if (roleTypes?.includes(2)) Object.assign(metadata, { posterAbout: posterAbout || about || '' });
      
      fileName = 'profile-metadata.json';
    } else if (type === 'milestone') {
      const { milestone_index, description, timestamp, worker_commitment } = body;
      metadata = { milestone_index, description, timestamp, worker_commitment, created_at: new Date().toISOString(), version: "1.0.0", type: "milestone" };
      fileName = 'milestone-metadata.json';
    } else {
      return NextResponse.json({ success: false, error: 'Invalid type' }, { status: 400 });
    }
    
    const result = await uploadToPinata(metadata, fileName, type, title);
    
    return NextResponse.json({
      success: true,
      ipfsHash: result.IpfsHash,
      ipfsUrl: `${IPFS_GATEWAY}/${result.IpfsHash}`,
      metadata,
      type,
      contractInfo: {
        didRegistry: { createProfile: DID.CREATE_PROFILE, updateProfile: DID.UPDATE_PROFILE, getProfileData: DID.GET_PROFILE_DATA_BY_COMMITMENT },
        escrow: { executeJobAction: JOB.EXECUTE_JOB_ACTION, getJobById: JOB.GET_JOB_BY_ID, getJobLatest: JOB.GET_JOB_LATEST, hasNoActiveJobs: JOB.HAS_NO_ACTIVE_JOBS }
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Upload failed' }, { status: 500 });
  }
}