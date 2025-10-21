import { NextRequest, NextResponse } from 'next/server';
import { JOB, APTOS_NODE_URL } from '@/constants/contracts';

export async function GET(request: NextRequest) {
  try {
    console.log('Fetching all jobs from contract...');
    
    const viewResponse = await fetch(`${APTOS_NODE_URL}/v1/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        function: JOB.GET_JOB_LATEST,
        type_arguments: [],
        arguments: []
      })
    });
    
    if (!viewResponse.ok) {
      throw new Error(`View function failed: ${viewResponse.statusText}`);
    }
    
    const jobViews = await viewResponse.json();
    console.log('Found jobs:', jobViews.length);
    
    const jobs = [];
    
    for (let i = 0; i < jobViews.length; i++) {
      const jobView = jobViews[i];
      
      // Extract job data from view
      const posterCommitment = jobView.poster_commitment || [];
      const cid = jobView.cid || [];
      const milestones = jobView.milestones || [];
      const workerCommitment = jobView.worker_commitment;
      const approved = jobView.approved || false;
      const active = jobView.active || false;
      const currentMilestone = jobView.current_milestone || 0;
      const escrowedAmount = jobView.escrowed_amount || 0;
      const completed = jobView.completed || false;
      const applicationDeadline = jobView.application_deadline || 0;
      const workerStake = jobView.worker_stake || 0;
      
      // Convert CID from hex to string
      let cidString = '';
      if (Array.isArray(cid)) {
        cidString = Buffer.from(cid).toString('utf8');
      } else if (typeof cid === 'string') {
        cidString = Buffer.from(cid.slice(2), 'hex').toString('utf8');
      }
      
      // Calculate total budget in APT
      const totalBudgetAPT = milestones.reduce((sum: number, amount: number) => sum + amount, 0) / 100_000_000;
      
      // Determine status
      let status = 'active';
      if (completed) {
        status = 'completed';
      } else if (workerCommitment && approved) {
        status = 'in_progress';
      } else if (workerCommitment && !approved) {
        status = 'pending_approval';
      }
      
      const job = {
        id: i,
        poster_commitment: posterCommitment,
        cid: cidString,
        milestones: milestones,
        worker_commitment: workerCommitment,
        approved,
        active,
        current_milestone: currentMilestone,
        escrowed_amount: escrowedAmount,
        completed,
        application_deadline: applicationDeadline,
        worker_stake: workerStake,
        budget: totalBudgetAPT,
        status,
        created_at: new Date().toISOString()
      };
      
      jobs.push(job);
    }
    
    return NextResponse.json({
      success: true,
      jobs,
      total: jobs.length
    });
    
  } catch (error: any) {
    console.error('Jobs list API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch jobs' 
      },
      { status: 500 }
    );
  }
}
