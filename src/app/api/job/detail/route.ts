import { NextRequest, NextResponse } from 'next/server';
import { JOB, APTOS_NODE_URL } from '@/constants/contracts';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('id');
    
    if (!jobId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Job ID is required' 
        },
        { status: 400 }
      );
    }
    
    console.log(`Fetching job ${jobId}...`);
    
    const viewResponse = await fetch(`${APTOS_NODE_URL}/v1/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        function: JOB.GET_JOB_BY_ID,
        type_arguments: [],
        arguments: [jobId]
      })
    });
    
    if (!viewResponse.ok) {
      throw new Error(`View function failed: ${viewResponse.statusText}`);
    }
    
    const jobView = await viewResponse.json();
    
    // Convert CID from hex to string
    let cidString = '';
    if (Array.isArray(jobView.cid)) {
      cidString = Buffer.from(jobView.cid).toString('utf8');
    } else if (typeof jobView.cid === 'string') {
      cidString = Buffer.from(jobView.cid.slice(2), 'hex').toString('utf8');
    }
    
    // Calculate total budget in APT
    const totalBudgetAPT = jobView.milestones.reduce((sum: number, amount: number) => sum + amount, 0) / 100_000_000;
    
    // Determine status
    let status = 'active';
    if (jobView.completed) {
      status = 'completed';
    } else if (jobView.worker_commitment && jobView.approved) {
      status = 'in_progress';
    } else if (jobView.worker_commitment && !jobView.approved) {
      status = 'pending_approval';
    }
    
    const job = {
      id: parseInt(jobId),
      poster_commitment: jobView.poster_commitment,
      cid: cidString,
      milestones: jobView.milestones,
      worker_commitment: jobView.worker_commitment,
      approved: jobView.approved,
      active: jobView.active,
      current_milestone: jobView.current_milestone,
      escrowed_amount: jobView.escrowed_amount,
      completed: jobView.completed,
      application_deadline: jobView.application_deadline,
      worker_stake: jobView.worker_stake,
      budget: totalBudgetAPT,
      status,
      created_at: new Date().toISOString()
    };
    
    return NextResponse.json({
      success: true,
      job
    });
    
  } catch (error: any) {
    console.error('Job detail API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch job detail' 
      },
      { status: 500 }
    );
  }
}
