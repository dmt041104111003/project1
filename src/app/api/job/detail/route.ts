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
    
    console.log(`🔄 Fetching job ${jobId}...`);
    console.log(`🔄 Using function: ${JOB.GET_JOB_BY_ID}`);
    console.log(`🔄 Aptos node URL: ${APTOS_NODE_URL}`);
    
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
      console.error(`❌ View function failed: ${viewResponse.statusText}`);
      throw new Error(`View function failed: ${viewResponse.statusText}`);
    }
    
    const jobViewArray = await viewResponse.json();
    console.log('🔍 Job view response:', JSON.stringify(jobViewArray, null, 2));
    
    // Get first element from nested array (same as list API)
    const jobView = jobViewArray[0];
    console.log('🔍 Extracted job view:', JSON.stringify(jobView, null, 2));
    
    // Convert CID from hex to string
    let cidString = '';
    if (typeof jobView.cid === 'string' && jobView.cid.startsWith('0x')) {
      // Remove 0x prefix and convert hex to string
      cidString = Buffer.from(jobView.cid.slice(2), 'hex').toString('utf8');
    } else if (Array.isArray(jobView.cid)) {
      cidString = Buffer.from(jobView.cid).toString('utf8');
    } else if (typeof jobView.cid === 'string') {
      cidString = jobView.cid;
    }
    
    // Calculate total budget in APT
    const milestones = jobView.milestones || [];
    const milestonesNumbers = milestones.map((m: any) => parseInt(m) || 0);
    const totalBudgetAPT = milestonesNumbers.reduce((sum: number, amount: number) => sum + amount, 0) / 100_000_000;
    
    console.log('📊 Milestones processing:', {
      raw: milestones,
      parsed: milestonesNumbers,
      totalBudgetAPT
    });
    
    // Determine status
    let status = 'active';
    if (jobView.completed) {
      status = 'completed';
    } else if (jobView.worker_commitment && jobView.approved) {
      status = 'in_progress';
    } else if (jobView.worker_commitment && !jobView.approved) {
      status = 'pending_approval';
    }
    
    // Parse worker commitment
    let workerCommitmentValue = null;
    if (jobView.worker_commitment && jobView.worker_commitment.vec && jobView.worker_commitment.vec.length > 0) {
      workerCommitmentValue = jobView.worker_commitment.vec;
    }
    
    console.log('👤 Worker commitment processing:', {
      raw: jobView.worker_commitment,
      parsed: workerCommitmentValue
    });
    
    console.log('🔗 CID conversion:', {
      raw: jobView.cid,
      converted: cidString
    });

    const job = {
      id: parseInt(jobId),
      cid: cidString,
      milestones: milestonesNumbers,
      worker_commitment: workerCommitmentValue,
      approved: jobView.approved,
      active: jobView.active,
      completed: jobView.completed,
      application_deadline: parseInt(jobView.application_deadline) || 0,
      budget: totalBudgetAPT,
      status,
      created_at: new Date().toISOString()
    };
    
    console.log('✅ Final job object:', JSON.stringify(job, null, 2));
    
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
