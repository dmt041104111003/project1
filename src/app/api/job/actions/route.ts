import { NextRequest, NextResponse } from 'next/server';
import { JOB } from '@/constants/contracts';

const createPayload = (action: string, jobId: number, userCommitment: string, milestoneIndex?: number, cid?: string, milestones?: unknown[], milestoneDurations?: unknown[], applicationDeadline?: number) => ({
  type: 'entry_function_payload',
  function: JOB.EXECUTE_JOB_ACTION,
  type_arguments: [],
  arguments: action === 'post' ? [
    JOB.ACTION_POST, 0, userCommitment, [], 0, [], jobId, milestones || [], milestoneDurations || [], applicationDeadline || 0
  ] : action === 'apply' ? [
    JOB.ACTION_APPLY, jobId, userCommitment, userCommitment, 0, [], [], [], [], 0
  ] : action === 'approve' ? [
    JOB.ACTION_APPROVE, jobId, userCommitment, [], 0, [], [], [], [], 0
  ] : action === 'submit' ? [
    JOB.ACTION_SUBMIT, jobId, userCommitment, [], milestoneIndex || 0, cid || '', [], [], [], 0
  ] : action === 'accept' ? [
    JOB.ACTION_ACCEPT, jobId, userCommitment, [], milestoneIndex || 0, cid || '', [], [], [], 0
  ] : action === 'complete' ? [
    JOB.ACTION_COMPLETE, jobId, userCommitment, [], 0, [], [], [], [], 0
  ] : action === 'claim' ? [
    JOB.ACTION_CLAIM, jobId, userCommitment, [], 0, [], [], [], [], 0
  ] : action === 'cancel' ? [
    JOB.ACTION_CANCEL, jobId, userCommitment, [], 0, [], [], [], [], 0
  ] : []
});

const validateParams = (params: Record<string, unknown>, required: string[]) => {
  const missing = required.filter(key => !params[key] && params[key] !== 0);
  if (missing.length) throw new Error(`Missing required parameters: ${missing.join(', ')}`);
};

const processMilestones = (milestones: unknown[]) => 
  milestones.map(m => typeof m === 'number' ? m : Math.floor(parseFloat((m as { amount?: string }).amount || '0') * 100_000_000));

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;
    
    const actions = ['post', 'apply', 'approve', 'submit', 'accept', 'complete', 'claim', 'cancel'];
    if (!actions.includes(action)) {
      return NextResponse.json({ success: false, error: `Invalid action. Must be: ${actions.join(', ')}` }, { status: 400 });
    }
    
    const { user_commitment, job_id, milestone_index, cid, milestones, milestone_durations, application_deadline } = params;
    
    if (action === 'post') {
      validateParams(params, ['user_address', 'user_commitment', 'job_details_cid', 'milestones', 'application_deadline']);
      const milestonesAmounts = processMilestones(milestones);
      const payload = createPayload('post', 0, user_commitment, undefined, undefined, milestonesAmounts, milestone_durations, application_deadline);
      return NextResponse.json({ success: true, message: 'Job posting transaction prepared', payload, instructions: 'Submit this payload to Aptos network using your wallet' });
    }
    
    if (['apply', 'approve', 'complete', 'claim', 'cancel'].includes(action)) {
      validateParams(params, ['user_address', 'user_commitment', 'job_id']);
      const payload = createPayload(action, job_id, user_commitment);
      return NextResponse.json({ success: true, message: `${action.charAt(0).toUpperCase() + action.slice(1)} transaction prepared`, payload, instructions: 'Submit this payload to Aptos network using your wallet' });
    }
    
    if (['submit', 'accept'].includes(action)) {
      validateParams(params, ['user_address', 'user_commitment', 'job_id', 'milestone_index', 'cid']);
      const payload = createPayload(action, job_id, user_commitment, milestone_index, cid);
      return NextResponse.json({ success: true, message: `Milestone ${action} transaction prepared`, payload, instructions: 'Submit this payload to Aptos network using your wallet' });
    }
    
    return NextResponse.json({ success: false, error: 'Unhandled action type' }, { status: 400 });
    
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: (error as Error).message || 'Failed to execute job action' }, { status: 500 });
  }
}