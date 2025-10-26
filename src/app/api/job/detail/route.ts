import { NextRequest, NextResponse } from 'next/server';
import { JOB, APTOS_NODE_URL } from '@/constants/contracts';

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
  if (typeof data === 'string' && data.startsWith('0x')) return Buffer.from(data.slice(2), 'hex').toString('utf8');
  if (Array.isArray(data)) return Buffer.from(data).toString('utf8');
  return data || '';
};

const processMilestones = (milestones: any[]) => {
  const numbers = milestones.map((m: any) => parseInt(m) || 0);
  return { numbers, totalAPT: numbers.reduce((sum, amount) => sum + amount, 0) / 100_000_000 };
};

const getStatus = (jobView: any) => {
  if (jobView.completed) return 'completed';
  if (jobView.worker_commitment && jobView.approved) return 'in_progress';
  if (jobView.worker_commitment && !jobView.approved) return 'pending_approval';
  return 'active';
};

const getWorkerCommitment = (workerCommitment: any) => 
  workerCommitment?.vec?.length > 0 ? workerCommitment.vec : null;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('id');
    
    if (!jobId) return NextResponse.json({ success: false, error: 'Job ID is required' }, { status: 400 });
    
    const jobViewArray = await callView(JOB.GET_JOB_BY_ID, [jobId]);
    const jobView = jobViewArray[0];
    
    const cidString = convertToString(jobView.cid);
    const { numbers: milestonesNumbers, totalAPT } = processMilestones(jobView.milestones || []);
    const status = getStatus(jobView);
    const workerCommitmentValue = getWorkerCommitment(jobView.worker_commitment);
    
    const job = {
      id: parseInt(jobId),
      cid: cidString,
      milestones: milestonesNumbers,
      worker_commitment: workerCommitmentValue,
      approved: jobView.approved,
      active: jobView.active,
      completed: jobView.completed,
      application_deadline: parseInt(jobView.application_deadline) || 0,
      budget: totalAPT,
      status,
      current_milestone: jobView.current_milestone,
      created_at: new Date().toISOString()
    };
    
    return NextResponse.json({ success: true, job });
    
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch job detail' }, { status: 500 });
  }
}