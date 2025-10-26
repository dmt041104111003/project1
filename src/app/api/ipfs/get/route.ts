import { NextRequest, NextResponse } from 'next/server';
import { DID, JOB, APTOS_NODE_URL } from '@/constants/contracts';

const callView = async (fn: string, args: any[]) => {
  const res = await fetch(`${APTOS_NODE_URL}/v1/view`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ function: fn, type_arguments: [], arguments: args })
  });
  if (!res.ok) throw new Error(`View failed: ${res.statusText}`);
  return res.json();
};

const convertToString = (data: any): string => {
  if (Array.isArray(data)) return Buffer.from(data).toString('utf8');
  if (typeof data === 'string') return data.startsWith('0x') ? Buffer.from(data.slice(2), 'hex').toString('utf8') : data;
  return '';
};

const getRoles = async (commitment: string): Promise<number[]> => {
  try {
    const result = await callView(DID.GET_ROLE_TYPES_BY_COMMITMENT, [commitment]);
    return result.flatMap((item: any) => 
      typeof item === 'number' ? [item] :
      typeof item === 'string' && item.startsWith('0x') ? 
        Array.from({ length: item.slice(2).length / 2 }, (_, i) => 
          parseInt(item.slice(2).slice(i * 2, i * 2 + 2), 16)) : []
    );
  } catch { return []; }
};

const getIPFSData = async (cid: string): Promise<any> => {
  if (!cid) return null;
  try {
    const gateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs';
    const res = await fetch(`${gateway}/${cid}`);
    return res.ok ? await res.json() : null;
  } catch { return null; }
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const commitment = searchParams.get('commitment');
    const jobId = searchParams.get('jobId');

    if (!type) return NextResponse.json({ success: false, error: 'Type required' }, { status: 400 });
    
    if (type === 'profile') {
      if (!commitment) return NextResponse.json({ success: false, error: 'Commitment required' }, { status: 400 });
      
      const processedCommitment = '0x' + Buffer.from(commitment, 'utf8').toString('hex');
      const result = await callView(DID.GET_PROFILE_DATA_BY_COMMITMENT, [processedCommitment]);
      
      if (Array.isArray(result) && result.length === 2 && result[0] === '0x' && result[1] === '0x') {
        return NextResponse.json({ success: false, error: 'No profile found' }, { status: 404 });
      }
      
      const [didCommitment, profileCid] = result;
      const cidString = convertToString(profileCid);
      const [roles, profileData] = await Promise.all([getRoles(processedCommitment), getIPFSData(cidString)]);
      
      return NextResponse.json({
        success: true,
        data: { type: 'profile', commitment, did_commitment: didCommitment, profile_cid: cidString, blockchain_roles: roles, profile_data: profileData, ...profileData }
      });
    }
    
    if (type === 'job') {
      if (!jobId) return NextResponse.json({ success: false, error: 'Job ID required' }, { status: 400 });
      
      const jobData = await callView(JOB.GET_JOB_BY_ID, [jobId]);
      const cidString = convertToString(jobData.cid || []);
      
      return NextResponse.json({
        success: true,
        data: { type: 'job', job_id: jobId, cid: cidString, ...jobData }
      });
    }
    
    return NextResponse.json({ success: false, error: 'Invalid type' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed' }, { status: 500 });
  }
}