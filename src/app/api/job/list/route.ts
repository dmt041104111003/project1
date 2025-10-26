import { NextRequest, NextResponse } from 'next/server';
import { JOB, APTOS_NODE_URL } from '@/constants/contracts';

const callView = async (fn: string, args: unknown[]) => {
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

const convertToString = (data: unknown): string => {
  if (typeof data === 'string' && data.startsWith('0x')) return Buffer.from(data.slice(2), 'hex').toString('utf8');
  if (Array.isArray(data)) return Buffer.from(data).toString('utf8');
  return String(data || '');
};

const processMilestones = (milestones: unknown[]) => {
  const numbers = milestones.map((m: unknown) => parseInt(String(m)) || 0);
  return { numbers, totalAPT: numbers.reduce((sum, amount) => sum + amount, 0) / 100_000_000 };
};

const getStatus = (completed: boolean, workerCommitment: unknown, approved: boolean) => {
  if (completed) return 'completed';
  if (workerCommitment && approved) return 'in_progress';
  if (workerCommitment && !approved) return 'pending_approval';
  return 'active';
};

const getWorkerCommitment = (workerCommitment: unknown) => 
  (workerCommitment as { vec?: unknown[] })?.vec?.length ? (workerCommitment as { vec: unknown[] }).vec : null;

export async function GET() {
  try {
    console.log('API: Calling GET_JOB_LATEST...');
    const jobViews = await callView(JOB.GET_JOB_LATEST, []);
    console.log('API: Raw jobViews response:', jobViews);
    console.log('API: jobViews length:', jobViews?.length);
    
    const flattenedJobs = Array.isArray(jobViews) && jobViews.length > 0 && Array.isArray(jobViews[0]) 
      ? jobViews[0] 
      : jobViews;
    console.log('API: Flattened jobs:', flattenedJobs);
    console.log('API: Flattened jobs length:', flattenedJobs?.length);
    
    const jobs = flattenedJobs.map((jobView: Record<string, unknown>, i: number) => {
      console.log(`API: Processing job ${i}:`, jobView);
      const cidString = convertToString(jobView.cid || '');
      const { numbers: milestonesNumbers, totalAPT } = processMilestones(Array.isArray(jobView.milestones) ? jobView.milestones : []);
      const status = getStatus(Boolean(jobView.completed), jobView.worker_commitment, Boolean(jobView.approved));
      const workerCommitmentValue = getWorkerCommitment(jobView.worker_commitment);
      
      console.log(`API: Job ${i} processed:`, {
        id: i,
        cid: cidString,
        cidRaw: jobView.cid,
        milestones: milestonesNumbers,
        totalAPT,
        status,
        worker_commitment: workerCommitmentValue
      });
      
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
        application_deadline: parseInt(String(jobView.application_deadline)) || 0,
        current_milestone: jobView.current_milestone,
        status,
        created_at: new Date().toISOString()
      };
    });
    
    return NextResponse.json({ success: true, jobs, total: jobs.length });
    
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: (error as Error).message || 'Failed to fetch jobs' }, { status: 500 });
  }
}