import { NextRequest, NextResponse } from 'next/server';
import { JOB, APTOS_NODE_URL } from '@/constants/contracts';

const callView = async (fn: string, args: any[]) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  
  const res = await fetch(`${APTOS_NODE_URL}/v1/view`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ function: fn, type_arguments: [], arguments: args }),
    signal: controller.signal
  });
  
  clearTimeout(timeoutId);
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

const getStatus = (completed: boolean, workerCommitment: any, approved: boolean) => {
  if (completed) return 'completed';
  if (workerCommitment && approved) return 'in_progress';
  if (workerCommitment && !approved) return 'pending_approval';
  return 'active';
};

const getWorkerCommitment = (workerCommitment: any) => 
  workerCommitment?.vec?.length > 0 ? workerCommitment.vec : null;

export async function GET(request: NextRequest) {
  try {
    const jobViews = await callView(JOB.GET_JOB_LATEST, []);
    const jobs = jobViews.map((jobView: any, i: number) => {
      const cidString = convertToString(jobView.cid || '');
      const { numbers: milestonesNumbers, totalAPT } = processMilestones(jobView.milestones || []);
      const status = getStatus(jobView.completed, jobView.worker_commitment, jobView.approved);
      const workerCommitmentValue = getWorkerCommitment(jobView.worker_commitment);
      
      return {
        id: i,
        cid: cidString,
        milestones: milestonesNumbers,
        worker_commitment: workerCommitmentValue,
        poster_commitment: jobView.poster_commitment,
        approved: jobView.approved || false,
        active: jobView.active || false,
        completed: jobView.completed || false,
        budget: totalAPT,
        application_deadline: parseInt(jobView.application_deadline) || 0,
        current_milestone: jobView.current_milestone,
        status,
        created_at: new Date().toISOString()
      };
    });
    
    return NextResponse.json({ success: true, jobs, total: jobs.length });
    
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch jobs' }, { status: 500 });
  }
}