import { NextRequest, NextResponse } from 'next/server';
import { JOB, APTOS_NODE_URL } from '@/constants/contracts';

export async function GET(request: NextRequest) {
  try {
    console.log('Fetching all jobs from contract...');
    
    console.log('🔄 Calling blockchain view function:', JOB.GET_JOB_LATEST);
    console.log('🔄 Aptos node URL:', APTOS_NODE_URL);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const viewResponse = await fetch(`${APTOS_NODE_URL}/v1/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        function: JOB.GET_JOB_LATEST,
        type_arguments: [],
        arguments: []
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!viewResponse.ok) {
      throw new Error(`View function failed: ${viewResponse.statusText}`);
    }
    
    const jobViews = await viewResponse.json();
    console.log('🔍 Blockchain response:', jobViews);
    console.log('📊 Found jobs:', jobViews.length);
    
    // Debug first job if exists
    if (jobViews.length > 0) {
      console.log('🔍 First job data:', JSON.stringify(jobViews[0][0], null, 2));
    }
    
    const jobs = [];
    
    for (let i = 0; i < jobViews.length; i++) {
      const jobView = jobViews[i][0]; // Get first element from nested array
      console.log(`🔍 Processing job ${i}:`, jobView);
      
      // Extract job data from view - essential fields only
      const cid = jobView.cid || '';
      const milestones = jobView.milestones || [];
      const workerCommitment = jobView.worker_commitment;
      const approved = jobView.approved || false;
      const active = jobView.active || false;
      const completed = jobView.completed || false;
      const applicationDeadline = parseInt(jobView.application_deadline) || 0;
      
      console.log(`📊 Parsed job ${i}:`, {
        cid,
        milestones,
        approved,
        active,
        completed
      });
      
      // Convert CID from hex to string
      let cidString = '';
      if (typeof cid === 'string' && cid.startsWith('0x')) {
        // Remove 0x prefix and convert hex to string
        cidString = Buffer.from(cid.slice(2), 'hex').toString('utf8');
      } else if (Array.isArray(cid)) {
        cidString = Buffer.from(cid).toString('utf8');
      } else if (typeof cid === 'string') {
        cidString = cid;
      }
      
      console.log(`🔗 CID conversion: ${cid} -> ${cidString}`);
      
      // Calculate total budget in APT
      const milestonesNumbers = milestones.map((m: any) => parseInt(m) || 0);
      const totalBudgetAPT = milestonesNumbers.reduce((sum: number, amount: number) => sum + amount, 0) / 100_000_000;
      
      console.log(`💰 Budget calculation:`, {
        milestones,
        milestonesNumbers,
        totalBudgetAPT
      });
      
      // Determine status
      let status = 'active';
      if (completed) {
        status = 'completed';
      } else if (workerCommitment && approved) {
        status = 'in_progress';
      } else if (workerCommitment && !approved) {
        status = 'pending_approval';
      }
      
      // Parse worker commitment
      let workerCommitmentValue = null;
      if (workerCommitment && workerCommitment.vec && workerCommitment.vec.length > 0) {
        workerCommitmentValue = workerCommitment.vec;
      }
      
      console.log(`👤 Worker commitment:`, {
        raw: workerCommitment,
        parsed: workerCommitmentValue
      });
      
      const job = {
        id: i,
        // Core job data
        cid: cidString,
        milestones: milestonesNumbers,
        worker_commitment: workerCommitmentValue,
        
        // Status fields
        approved,
        active,
        completed,
        
        // Financial fields
        budget: totalBudgetAPT,
        
        // Timeline fields
        application_deadline: applicationDeadline,
        
        // Computed fields
        status,
        created_at: new Date().toISOString()
      };
      
      jobs.push(job);
    }
    
    console.log('✅ Processed jobs:', jobs.length);
    console.log('📋 Final jobs data:', jobs);
    
    return NextResponse.json({
      success: true,
      jobs,
      total: jobs.length,
      debug: {
        blockchain_response: jobViews,
        processed_count: jobs.length
      }
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
